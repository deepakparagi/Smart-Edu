package edu.smartstudy.material;

import java.nio.file.Path;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MaterialProcessor {
    private final MaterialRepository materials;
    private final MaterialChunkRepository chunkRepo;
    private final WebClient ml;
    private final ObjectMapper json;
    private final Path uploadDir;
    private final String mlInternalToken;

    public MaterialProcessor(MaterialRepository materials, MaterialChunkRepository chunkRepo,
                             @Value("${app.ml-url}") String mlUrl,
                             @Value("${app.ml-internal-token}") String mlInternalToken,
                             @Value("${app.upload-dir}") String dir,
                             ObjectMapper json) {
        this.materials = materials;
        this.chunkRepo = chunkRepo;
        this.ml = WebClient.builder()
                .baseUrl(mlUrl)
                .defaultHeader("X-Internal-Token", mlInternalToken)
                .build();
        this.json = json;
        this.uploadDir = Path.of(dir).toAbsolutePath().normalize();
        this.mlInternalToken = mlInternalToken;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void resumeProcessingAfterRestart() {
        materials.findByStatus("PROCESSING").forEach(m ->
                java.util.concurrent.CompletableFuture.runAsync(() -> processNow(m.getId(), uploadDir.resolve(m.storageKey())))
        );
    }

    public void process(Long id, Path file) {
        processNow(id, file);
    }

    private void processNow(Long id, Path file) {
        Material material = materials.findById(id).orElse(null);
        if (material == null) return;
        try {
            String fileName = material.getFileName();
            byte[] fileBytes = java.nio.file.Files.readAllBytes(file);

            System.err.println("[MaterialProcessor] Uploading file: " + fileName + " from path: " + file);
            System.err.println("[MaterialProcessor] File size: " + fileBytes.length);

            // Extract text and chunks using WebClient
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("file", new ByteArrayResource(fileBytes) {
                @Override
                public String getFilename() {
                    return fileName;
                }
            }).filename(fileName);

            Map<?, ?> extracted = ml.post()
                    .uri("/ml/v1/extract")
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            System.err.println("[MaterialProcessor] Extract response: " + extracted);

            String text = Objects.toString(extracted.get("text"), "");

            // Persist chunks
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> chunks = (List<Map<String, Object>>) extracted.get("chunks");
            if (chunks != null) {
                persistChunks(id, chunks);
            }

            // Summarize
            Map<?, ?> summary = ml.post()
                    .uri("/ml/v1/summarize")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("text", text))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Topics
            Map<?, ?> topics = ml.post()
                    .uri("/ml/v1/topics")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("text", text))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Keywords
            Map<?, ?> keywords = ml.post()
                    .uri("/ml/v1/keywords")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(Map.of("text", text))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            material.complete(text,
                    Objects.toString(summary.get("summary"), ""),
                    json.writeValueAsString(topics.get("topics")),
                    json.writeValueAsString(keywords.get("keywords")));
            materials.save(material);
        } catch (Exception e) {
            System.err.println("[MaterialProcessor] Error processing material " + id + ": " + e.getMessage());
            e.printStackTrace(System.err);
            material.fail("Processing could not be completed: " + e.getMessage());
            materials.save(material);
        }
    }

    private void persistChunks(Long materialId, List<Map<String, Object>> chunks) {
        // Delete existing chunks for this material
        chunkRepo.deleteByMaterialId(materialId);

        List<MaterialChunk> entities = new ArrayList<>();
        for (Map<String, Object> chunk : chunks) {
            Integer ordinal = (Integer) chunk.get("ordinal");
            if (ordinal == null) {
                // Fallback: assign sequential ordinal
                ordinal = entities.size();
            }
            Integer page = (Integer) chunk.get("page");
            String heading = (String) chunk.get("heading");
            String text = Objects.toString(chunk.get("text"), "");
            Integer tokenCount = (Integer) chunk.get("token_count");
            if (tokenCount == null) {
                tokenCount = text.length() / 4; // rough estimate
            }

            MaterialChunk entity = new MaterialChunk(materialId, ordinal, page, heading, text, tokenCount);
            entities.add(entity);
        }
        chunkRepo.saveAll(entities);
    }
}