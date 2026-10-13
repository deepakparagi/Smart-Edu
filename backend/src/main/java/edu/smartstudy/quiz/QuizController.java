package edu.smartstudy.quiz;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.smartstudy.material.*;
import edu.smartstudy.user.UserRepository;
import jakarta.validation.Valid;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/v1/quizzes")
public class QuizController {
    private final QuizRepository quizzes;
    private final QuizAttemptRepository attempts;
    private final MaterialRepository materials;
    private final UserRepository users;
    private final ObjectMapper json;
    private final RestClient ml;

    public QuizController(QuizRepository quizzes, QuizAttemptRepository attempts,
                          MaterialRepository materials, UserRepository users,
                          ObjectMapper json,
                          @Value("${app.ml-url}") String mlUrl,
                          @Value("${app.ml-internal-token:dev-internal-token-change-me}") String mlInternalToken) {
        this.quizzes = quizzes;
        this.attempts = attempts;
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

    public record GenerateRequest(
            Long materialId,
            String topic,
            Integer count
    ) {}

    public record AttemptInput(@jakarta.validation.constraints.NotEmpty List<String> answers) {}

    @GetMapping
    public List<Map<String, Object>> list(Authentication a) {
        return quizzes.findTop100ByOwnerIdOrderByCreatedAtDesc(owner(a)).stream()
                .map(q -> Map.<String, Object>of("id", q.getId(), "title", q.getTitle(), "materialId", q.getMaterialId(), "createdAt", q.getCreatedAt()))
                .toList();
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
                return ResponseEntity.status(409).body(Map.of("error", "Wait until this note has finished processing."));
            }
        } else if (!topicName.isBlank()) {
            // Check if existing material for this topic or create a lightweight placeholder material for FK
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
                        newMat.complete("Quiz study topic for: " + finalTopicName, "Topic summary", "[]", "[]");
                        return materials.save(newMat);
                    });
        } else {
            return ResponseEntity.badRequest().body(Map.of("error", "Please provide either a study material or a topic to generate a quiz."));
        }

        // Prepare ML request payload
        Map<String, Object> mlReq = new HashMap<>();
        if (!topicName.isBlank()) {
            mlReq.put("topic", topicName);
        } else if (material != null) {
            mlReq.put("topic", material.getTitle());
        }
        if (material != null && material.getExtractedText() != null) {
            mlReq.put("text", material.getExtractedText());
        }
        mlReq.put("count", input.count() != null ? input.count() : 5);
        if (clientGroqApiKey != null && !clientGroqApiKey.isBlank()) {
            mlReq.put("api_key", clientGroqApiKey.trim());
        }

        Map<?, ?> generated;
        try {
            var postBuilder = ml.post().uri("/ml/v1/questions")
                    .contentType(MediaType.APPLICATION_JSON);
            if (clientGroqApiKey != null && !clientGroqApiKey.isBlank()) {
                postBuilder.header("X-Groq-Api-Key", clientGroqApiKey.trim());
            }
            generated = postBuilder.body(mlReq).retrieve().body(Map.class);
        } catch (Exception e) {
            return ResponseEntity.status(503).body(Map.of("error", "The quiz generation service is temporarily unavailable."));
        }

        List<Map<String, Object>> questions = json.convertValue(generated.get("questions"), new TypeReference<>() {});
        if (questions == null || questions.isEmpty()) {
            String notice = generated.get("notice") != null ? generated.get("notice").toString() : "Could not generate questions. Please ensure notes contain content or specify a valid topic.";
            return ResponseEntity.status(422).body(Map.of("error", notice));
        }

        String quizTitle = !topicName.isBlank() ? "Quiz on " + topicName : "Quiz on " + material.getTitle();
        Quiz quiz = new Quiz(student, material.getId(), quizTitle, json.writeValueAsString(questions));
        return ResponseEntity.status(201).body(quizzes.save(quiz));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> get(@PathVariable Long id, Authentication a) {
        return quizzes.findByIdAndOwnerId(id, owner(a)).<ResponseEntity<?>>map(quiz -> {
            List<Map<String, Object>> qList = List.of();
            try {
                qList = json.readValue(quiz.getQuestionsJson(), new TypeReference<>() {});
            } catch (Exception ignored) {}
            return ResponseEntity.ok(Map.of(
                    "id", quiz.getId(),
                    "title", quiz.getTitle(),
                    "materialId", quiz.getMaterialId(),
                    "questions", qList,
                    "createdAt", quiz.getCreatedAt()
            ));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PostMapping({"/{id}/attempt", "/{id}/attempts"})
    public ResponseEntity<?> attempt(@PathVariable Long id, @RequestBody @Valid AttemptInput input, Authentication a) {
        return quizzes.findByIdAndOwnerId(id, owner(a)).<ResponseEntity<?>>map(quiz -> {
            List<Map<String, Object>> questions;
            try {
                questions = json.readValue(quiz.getQuestionsJson(), new TypeReference<>() {});
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                return ResponseEntity.status(422).body(Map.of("error", "Invalid quiz data"));
            }
            if (questions == null || questions.isEmpty())
                return ResponseEntity.status(422).body(Map.of("error", "Quiz has no questions"));

            int correct = 0;
            List<Map<String, Object>> itemResults = new ArrayList<>();
            for (int i = 0; i < questions.size(); i++) {
                Map<String, Object> question = questions.get(i);
                String selected = i < input.answers().size() ? input.answers().get(i) : "";

                // Find expected answer from multiple possible keys
                String expected = "";
                if (question.get("correct_answer") != null) {
                    expected = question.get("correct_answer").toString();
                } else if (question.get("answer") != null) {
                    expected = question.get("answer").toString();
                } else if (question.get("correct_index") != null && question.get("options") instanceof List<?> opts) {
                    int cIdx = ((Number) question.get("correct_index")).intValue();
                    if (cIdx >= 0 && cIdx < opts.size()) {
                        expected = opts.get(cIdx).toString();
                    }
                }

                // Evaluate correctness
                boolean isCorrect = false;
                if (!expected.isBlank() && !selected.isBlank()) {
                    if (expected.trim().equalsIgnoreCase(selected.trim())) {
                        isCorrect = true;
                    } else if (question.get("options") instanceof List<?> opts) {
                        try {
                            int selIdx = Integer.parseInt(selected.trim());
                            if (selIdx >= 0 && selIdx < opts.size() && opts.get(selIdx).toString().trim().equalsIgnoreCase(expected.trim())) {
                                isCorrect = true;
                            }
                        } catch (NumberFormatException ignored) {}
                    }
                }

                if (isCorrect) correct++;

                itemResults.add(Map.of(
                        "question", Objects.toString(question.get("question"), ""),
                        "selectedAnswer", selected,
                        "correctAnswer", expected,
                        "correct", isCorrect,
                        "explanation", Objects.toString(question.get("explanation"), "Correct answer: " + expected),
                        "sourceReference", Objects.toString(question.get("source_reference"), "Study notes")
                ));
            }

            String answersJson = "[]";
            try {
                answersJson = json.writeValueAsString(input.answers());
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                // ignore
            }
            QuizAttempt attempt = new QuizAttempt(quiz.getId(), owner(a), correct, questions.size(), answersJson);
            attempts.save(attempt);
            return ResponseEntity.ok(Map.of(
                    "score", correct,
                    "total", questions.size(),
                    "accuracyPercent", questions.isEmpty() ? 0 : Math.round(100.0 * correct / questions.size()),
                    "results", itemResults,
                    "notice", "Attempt recorded."
            ));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication a) {
        return quizzes.findByIdAndOwnerId(id, owner(a)).map(quiz -> {
            attempts.deleteAll(attempts.findByQuizId(id));
            quizzes.delete(quiz);
            return ResponseEntity.ok(Map.of("message", "Quiz deleted"));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}