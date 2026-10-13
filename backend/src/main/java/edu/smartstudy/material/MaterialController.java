package edu.smartstudy.material;

import edu.smartstudy.user.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.nio.file.*;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/materials")
public class MaterialController {
    private static final Set<String> ALLOWED = Set.of("pdf", "txt", "docx");
    private static final int MAX_UPLOAD_MB = 20;
    private static final int MAX_DOCX_ENTRIES = 1000;
    private static final long MAX_DOCX_UNCOMPRESSED_MB = 50;

    private final MaterialRepository repo;
    private final UserRepository users;
    private final MaterialChunkRepository chunkRepo;
    private final Path uploadDir;
    private final MaterialProcessor processor;
    private final int maxUploadMb;
    private final long userStorageQuotaMb;

    public MaterialController(MaterialRepository repo, UserRepository users, MaterialChunkRepository chunkRepo,
                              MaterialProcessor processor,
                              @Value("${app.upload-dir}") String dir,
                              @Value("${app.max-upload-mb:20}") int maxUploadMb,
                              @Value("${app.user-storage-quota-mb:500}") long userStorageQuotaMb) {
        this.repo = repo;
        this.users = users;
        this.chunkRepo = chunkRepo;
        this.processor = processor;
        this.uploadDir = Path.of(dir).toAbsolutePath().normalize();
        this.maxUploadMb = maxUploadMb;
        this.userStorageQuotaMb = userStorageQuotaMb;
    }

    private Long owner(Authentication a) {
        return users.findByEmailIgnoreCase(a.getName()).orElseThrow().getId();
    }

    @GetMapping
    public Page<Material> list(Authentication a,
                               @RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "20") int size,
                               @RequestParam(defaultValue = "createdAt,desc") String sort) {
        page = Math.max(0, page);
        size = Math.min(100, Math.max(1, size));
        String[] sortParts = sort.split(",");
        Sort.Direction dir = sortParts.length > 1 && sortParts[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(dir, sortParts[0]));
        return repo.findByOwnerIdOrderByCreatedAtDesc(owner(a), pageable);
    }

    @GetMapping("/search")
    public Page<Material> search(Authentication a,
                                 @RequestParam String q,
                                 @RequestParam(defaultValue = "0") int page,
                                 @RequestParam(defaultValue = "20") int size) {
        page = Math.max(0, page);
        size = Math.min(100, Math.max(1, size));
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return repo.searchByOwnerAndQuery(owner(a), q, pageable);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id, Authentication a) {
        return repo.findByIdAndOwnerId(id, owner(a))
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/text")
    public ResponseEntity<?> getText(@PathVariable Long id, Authentication a,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "50") int size) {
        Material m = repo.findByIdAndOwnerId(id, owner(a)).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();
        if (!"COMPLETED".equals(m.getStatus()) || m.getExtractedText() == null) {
            return ResponseEntity.status(409).body(Map.of("error", "Material not yet processed"));
        }
        page = Math.max(0, page);
        size = Math.min(200, Math.max(1, size));
        int totalPages = (int) Math.ceil((double) m.getExtractedText().length() / size);
        int start = page * size;
        int end = Math.min(start + size, m.getExtractedText().length());
        String text = (start < end) ? m.getExtractedText().substring(start, end) : "";
        return ResponseEntity.ok(Map.of(
                "text", text,
                "page", page,
                "size", size,
                "totalPages", totalPages,
                "hasMore", end < m.getExtractedText().length()
        ));
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id, Authentication a) {
        Material m = repo.findByIdAndOwnerId(id, owner(a)).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();
        Path file = uploadDir.resolve(m.storageKey()).normalize();
        if (!file.startsWith(uploadDir) || !Files.isRegularFile(file)) {
            return ResponseEntity.status(410).build();
        }
        Resource resource = new FileSystemResource(file);
        String filename = m.getFileName();
        long contentLength;
        try {
            contentLength = Files.size(file);
        } catch (IOException e) {
            contentLength = -1;
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, m.getMimeType())
                .header("X-Content-Type-Options", "nosniff")
                .contentLength(contentLength)
                .body(resource);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile f, Authentication a) throws Exception {
        Long userId = owner(a);

        // Check user storage quota
        long currentUsage = repo.findByOwnerIdAndStatusIn(userId, List.of("UPLOADED", "PROCESSING", "COMPLETED"))
                .stream().mapToLong(Material::getFileSize).sum();
        long maxBytes = userStorageQuotaMb * 1024L * 1024L;
        if (currentUsage + f.getSize() > maxBytes) {
            return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
                    .body(Map.of("error", "Storage quota exceeded. Delete old materials to free space."));
        }

        String original = StringUtils.cleanPath(Objects.requireNonNullElse(f.getOriginalFilename(), "upload"));
        String ext = original.contains(".") ? original.substring(original.lastIndexOf('.') + 1).toLowerCase() : "";
        if (!ALLOWED.contains(ext) || !hasExpectedSignature(f, ext)) {
            return ResponseEntity.status(415).body(Map.of("error", "The file type does not match a supported PDF, TXT or DOCX document"));
        }
        if (f.isEmpty() || f.getSize() > (long) maxUploadMb * 1024 * 1024) {
            return ResponseEntity.badRequest().body(Map.of("error", "Choose a non-empty file smaller than " + maxUploadMb + " MB"));
        }

        String key = UUID.randomUUID().toString();
        Files.createDirectories(uploadDir);
        Path dest = uploadDir.resolve(key).normalize();
        if (!dest.startsWith(uploadDir)) return ResponseEntity.badRequest().build();

        f.transferTo(dest);

        Material m = new Material(userId, original.replaceFirst("(?i)\\.[^.]+$", ""), original, key,
                Objects.requireNonNullElse(f.getContentType(), "application/octet-stream"), f.getSize());
        m.processing();
        Material saved = repo.save(m);
        processor.process(saved.getId(), dest);
        return ResponseEntity.accepted().body(saved);
    }

    private boolean hasExpectedSignature(MultipartFile file, String ext) throws Exception {
        byte[] prefix;
        try (var input = file.getInputStream()) {
            prefix = input.readNBytes(8);
        }
        if (ext.equals("pdf")) {
            return prefix.length >= 5 && prefix[0] == '%' && prefix[1] == 'P' && prefix[2] == 'D' && prefix[3] == 'F' && prefix[4] == '-';
        }
        if (ext.equals("docx")) {
            // Check PK header
            if (!(prefix.length >= 4 && prefix[0] == 'P' && prefix[1] == 'K' && prefix[2] == 3 && prefix[3] == 4)) {
                return false;
            }
            // Additional OOXML validation: check for [Content_Types].xml and word/document.xml
            try (var zipIn = new ZipInputStream(file.getInputStream())) {
                int entryCount = 0;
                boolean hasContentTypes = false;
                boolean hasDocumentXml = false;
                long uncompressedSize = 0;
                ZipEntry entry;
                while ((entry = zipIn.getNextEntry()) != null) {
                    entryCount++;
                    if (entryCount > MAX_DOCX_ENTRIES) return false;
                    uncompressedSize += entry.getSize();
                    if (uncompressedSize > MAX_DOCX_UNCOMPRESSED_MB * 1024 * 1024) return false;
                    String name = entry.getName();
                    if ("[Content_Types].xml".equals(name)) hasContentTypes = true;
                    if ("word/document.xml".equals(name)) hasDocumentXml = true;
                }
                return hasContentTypes && hasDocumentXml;
            }
        }
        // TXT: validate UTF-8
        try {
            var decoder = java.nio.charset.StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(java.nio.charset.CodingErrorAction.REPORT);
            decoder.decode(java.nio.ByteBuffer.wrap(file.getBytes()));
            return true;
        } catch (java.nio.charset.CharacterCodingException e) {
            return false;
        }
    }

    @PostMapping("/{id}/process")
    public ResponseEntity<?> retry(@PathVariable Long id, Authentication a) {
        Long userId = owner(a);
        Material m = repo.findByIdAndOwnerId(id, userId).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();
        if (!"FAILED".equals(m.getStatus())) {
            return ResponseEntity.status(409).body(Map.of("error", "Only failed processing can be retried"));
        }
        Path file = uploadDir.resolve(m.storageKey()).normalize();
        if (!file.startsWith(uploadDir) || !Files.isRegularFile(file)) {
            return ResponseEntity.status(410).body(Map.of("error", "The uploaded file is no longer available"));
        }
        m.processing();
        Material saved = repo.save(m);
        processor.process(id, file);
        return ResponseEntity.accepted().body(saved);
    }

    @DeleteMapping("/{id}")
    @org.springframework.transaction.annotation.Transactional
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication a) {
        Long userId = owner(a);
        Material m = repo.findByIdAndOwnerId(id, userId).orElse(null);
        if (m == null) return ResponseEntity.notFound().build();

        // Delete stored file
        Path file = uploadDir.resolve(m.storageKey()).normalize();
        if (file.startsWith(uploadDir) && Files.isRegularFile(file)) {
            try {
                Files.delete(file);
            } catch (IOException ignored) {
                // Log but continue with DB cleanup
            }
        }

        // Delete chunks (cascade not set on material_chunks, so explicit delete)
        chunkRepo.deleteByMaterialId(id);

        // Delete material (cascades to quizzes, flashcards via FK)
        repo.delete(m);
        return ResponseEntity.ok(Map.of("message", "Material deleted"));
    }
}