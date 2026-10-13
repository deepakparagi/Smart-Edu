package edu.smartstudy.flashcards;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.smartstudy.material.*;
import edu.smartstudy.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/v1/flashcards")
public class FlashcardController {
    private final FlashcardRepository cards;
    private final FlashcardReviewRepository reviews;
    private final MaterialRepository materials;
    private final UserRepository users;
    private final ObjectMapper json;
    private final RestClient ml;

    public FlashcardController(FlashcardRepository cards, FlashcardReviewRepository reviews,
                               MaterialRepository materials, UserRepository users,
                               ObjectMapper json,
                               @Value("${app.ml-url}") String mlUrl,
                               @Value("${app.ml-internal-token}") String mlInternalToken) {
        this.cards = cards;
        this.reviews = reviews;
        this.materials = materials;
        this.users = users;
        this.json = json;
        this.ml = RestClient.builder()
                .baseUrl(mlUrl)
                .defaultHeader("X-Internal-Token", mlInternalToken)
                .build();
    }

    private Long owner(Authentication a) {
        return users.findByEmailIgnoreCase(a.getName()).orElseThrow().getId();
    }

    public record CreateCard(
            @NotBlank @Size(max = 4000) String front,
            @NotBlank @Size(max = 10000) String back,
            @Positive Long materialId,
            String sourceReference
    ) {}

    public record UpdateCard(
            @NotBlank @Size(max = 4000) String front,
            @NotBlank @Size(max = 10000) String back,
            String sourceReference
    ) {}

    public record Review(
            @Min(0) @Max(5) int quality
    ) {}

    public record MaterialRequest(
            @Positive Long materialId
    ) {}

    public record GenerateRequest(
            Long materialId,
            String topic,
            Integer count
    ) {}

    @GetMapping
    public List<Flashcard> list(Authentication a,
                                @RequestParam(required = false) Long materialId,
                                @RequestParam(required = false) Boolean dueOnly,
                                @RequestParam(required = false) String search) {
        Long userId = owner(a);
        if (materialId != null) {
            return cards.findByOwnerIdAndMaterialIdOrderByNextReviewAsc(userId, materialId);
        }
        if (Boolean.TRUE.equals(dueOnly)) {
            return cards.findByOwnerIdAndNextReviewLessThanEqualOrderByNextReviewAsc(userId, java.time.LocalDate.now());
        }
        if (search != null && !search.isBlank()) {
            return cards.searchByOwnerAndFront(userId, search);
        }
        return cards.findTop100ByOwnerIdOrderByNextReviewAsc(userId);
    }

    @GetMapping("/due-count")
    public Map<String, Long> dueCount(Authentication a) {
        Long userId = owner(a);
        long due = cards.countByOwnerIdAndNextReviewLessThanEqual(userId, java.time.LocalDate.now());
        long total = cards.countByOwnerId(userId);
        return Map.of("due", due, "total", total);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id, Authentication a) {
        return cards.findByIdAndOwnerId(id, owner(a))
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody @Valid CreateCard input, Authentication a) {
        Long student = owner(a);
        if (input.materialId() != null && materials.findByIdAndOwnerId(input.materialId(), student).isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Flashcard card = new Flashcard(student, input.materialId(), input.front().trim(), input.back().trim(),
                input.sourceReference() != null ? input.sourceReference() : "manual");
        return ResponseEntity.status(201).body(cards.save(card));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody @Valid UpdateCard input, Authentication a) {
        return cards.findByIdAndOwnerId(id, owner(a))
                .map(c -> {
                    c.setFront(input.front().trim());
                    c.setBack(input.back().trim());
                    if (input.sourceReference() != null) {
                        c.setSourceReference(input.sourceReference());
                    }
                    return ResponseEntity.ok(cards.save(c));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication a) {
        return cards.findByIdAndOwnerId(id, owner(a))
                .map(c -> {
                    cards.delete(c);
                    return ResponseEntity.ok(Map.of("message", "Flashcard deleted"));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping("/generate")
    public ResponseEntity<?> generate(
            @RequestBody GenerateRequest input,
            @RequestHeader(value = "X-Groq-Api-Key", required = false) String clientGroqApiKey,
            Authentication a
    ) throws Exception {
        Long student = owner(a);

        String topicName = input.topic() != null ? input.topic().trim() : "";
        Long targetMaterialId = input.materialId();
        Material material = null;

        if (targetMaterialId != null && targetMaterialId > 0) {
            material = materials.findByIdAndOwnerId(targetMaterialId, student).orElse(null);
            if (material == null) return ResponseEntity.notFound().build();
            if (!"COMPLETED".equals(material.getStatus()) || material.getExtractedText() == null) {
                return ResponseEntity.status(409).body(Map.of("error", "Wait until this material has finished processing."));
            }
        } else if (!topicName.isBlank()) {
            final String finalTopicName = topicName;
            material = materials.findTop100ByOwnerIdOrderByCreatedAtDesc(student).stream()
                    .filter(m -> finalTopicName.equalsIgnoreCase(m.getTitle()))
                    .findFirst()
                    .orElseGet(() -> {
                        String cleanSlug = finalTopicName.toLowerCase().replaceAll("[^a-z0-9]+", "-");
                        Material newMat = new Material(
                                student,
                                finalTopicName,
                                cleanSlug + ".txt",
                                "topic-" + UUID.randomUUID(),
                                "text/plain",
                                (long) finalTopicName.length()
                        );
                        newMat.complete("Flashcard study topic for: " + finalTopicName, "Topic summary", "[]", "[]");
                        return materials.save(newMat);
                    });
            targetMaterialId = material.getId();
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Please provide either a study material or a topic to generate flashcards."));
        }

        Map<String, Object> mlReq = new HashMap<>();
        if (!topicName.isBlank()) {
            mlReq.put("topic", topicName);
            if (material != null && material.getExtractedText() != null && material.getExtractedText().length() > 80) {
                mlReq.put("text", material.getExtractedText());
            }
        } else if (material != null) {
            mlReq.put("topic", material.getTitle());
            if (material.getExtractedText() != null) {
                mlReq.put("text", material.getExtractedText());
            }
        }
        mlReq.put("count", input.count() != null ? input.count() : 6);
        if (clientGroqApiKey != null && !clientGroqApiKey.isBlank()) {
            mlReq.put("api_key", clientGroqApiKey.trim());
        }

        Map<?, ?> response;
        try {
            var postBuilder = ml.post().uri("/ml/v1/flashcards")
                    .contentType(MediaType.APPLICATION_JSON);
            if (clientGroqApiKey != null && !clientGroqApiKey.isBlank()) {
                postBuilder.header("X-Groq-Api-Key", clientGroqApiKey.trim());
            }
            response = postBuilder.body(mlReq).retrieve().body(Map.class);
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of("error", "The flashcard generation service is temporarily unavailable."));
        }

        @SuppressWarnings("unchecked")
        List<Map<String, Object>> generated = (List<Map<String, Object>>) response.get("flashcards");
        List<Flashcard> saved = new ArrayList<>();
        final Long finalMaterialId = material.getId();
        if (generated != null) {
            for (var c : generated) {
                String front = Objects.toString(c.get("front"), "").trim();
                String back = Objects.toString(c.get("back"), "").trim();
                if (front.isBlank() || back.isBlank()) {
                    continue;
                }
                if (cards.existsByOwnerIdAndMaterialIdAndFrontIgnoreCase(student, finalMaterialId, front)) {
                    continue;
                }
                saved.add(cards.save(new Flashcard(
                        student,
                        finalMaterialId,
                        front,
                        back,
                        Objects.toString(c.get("source_reference"), !topicName.isBlank() ? topicName : "document")
                )));
            }
        }
        if (saved.isEmpty()) {
            List<Flashcard> existing = cards.findByOwnerIdAndMaterialIdOrderByNextReviewAsc(student, finalMaterialId);
            if (!existing.isEmpty()) {
                return ResponseEntity.ok(existing);
            }
            return ResponseEntity.status(422).body(Map.of("error", Objects.toString(response.get("notice"), "No cards could be generated.")));
        }
        return ResponseEntity.status(201).body(saved);
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<?> review(@PathVariable Long id, @RequestBody @Valid Review input, Authentication a) {
        Long userId = owner(a);
        return cards.findByIdAndOwnerId(id, userId)
                .map(c -> {
                    int prevInterval = c.getIntervalDays();
                    double prevEase = c.getEaseFactor();
                    c.review(input.quality());
                    Flashcard saved = cards.save(c);

                    // Record review history
                    reviews.save(new FlashcardReview(
                            c.getId(), userId, input.quality(),
                            prevInterval, c.getIntervalDays(),
                            prevEase, c.getEaseFactor()
                    ));

                    return ResponseEntity.ok(Map.of(
                            "card", saved,
                            "projectedIntervals", Map.of(
                                    "again", c.projectedInterval(0),
                                    "hard", c.projectedInterval(1),
                                    "good", c.projectedInterval(2),
                                    "easy", c.projectedInterval(3)
                            )
                    ));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/history")
    public List<FlashcardReview> history(@PathVariable Long id, Authentication a) {
        if (!cards.existsByIdAndOwnerId(id, owner(a))) {
            return List.of();
        }
        return reviews.findByFlashcardIdOrderByReviewedAtDesc(id);
    }

    @GetMapping("/stats")
    public Map<String, Object> stats(Authentication a) {
        Long userId = owner(a);
        List<Flashcard> all = cards.findByOwnerIdOrderByNextReviewAsc(userId);
        long total = all.size();
        long due = all.stream().filter(c -> c.getNextReview() != null && !c.getNextReview().isAfter(java.time.LocalDate.now())).count();
        long mature = all.stream().filter(c -> c.getReviewCount() > 0 && c.getIntervalDays() >= 21).count();
        double avgEase = all.stream().filter(c -> c.getReviewCount() > 0).mapToDouble(Flashcard::getEaseFactor).average().orElse(2.5);
        return Map.of(
                "total", total,
                "due", due,
                "mature", mature,
                "averageEaseFactor", Math.round(avgEase * 100.0) / 100.0
        );
    }
}