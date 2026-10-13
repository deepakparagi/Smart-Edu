package edu.smartstudy.tutor;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import edu.smartstudy.material.*;
import edu.smartstudy.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/v1/tutor")
public class TutorController {
    private final TutorConversationRepository conversations;
    private final TutorMessageRepository messages;
    private final MaterialRepository materials;
    private final UserRepository users;
    private final RestClient ml;
    private final ObjectMapper json;
    private final String defaultOpenRouterApiKey;

    public TutorController(TutorConversationRepository conversations,
                           TutorMessageRepository messages,
                           MaterialRepository materials,
                           UserRepository users,
                           @Value("${app.ml-url}") String mlUrl,
                           @Value("${app.ml-internal-token:dev-internal-token-change-me}") String mlInternalToken,
                           @Value("${app.openrouter-api-key:}") String defaultOpenRouterApiKey,
                           ObjectMapper json) {
        this.conversations = conversations;
        this.messages = messages;
        this.materials = materials;
        this.users = users;
        this.defaultOpenRouterApiKey = defaultOpenRouterApiKey;
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(15));
        factory.setReadTimeout(Duration.ofSeconds(90));
        this.ml = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(mlUrl)
                .defaultHeader("X-Internal-Token", mlInternalToken)
                .build();
        this.json = json;
    }

    private Long owner(Authentication a) {
        return users.findByEmailIgnoreCase(a.getName()).orElseThrow().getId();
    }

    public record AskRequest(
            @NotBlank @Size(max = 4000) String question,
            Long materialId,
            Long conversationId
    ) {}

    @GetMapping("/conversations")
    public List<TutorConversation> list(Authentication a) {
        return conversations.findTop50ByOwnerIdOrderByCreatedAtDesc(owner(a));
    }

    @GetMapping("/conversations/{id}")
    public ResponseEntity<?> detail(@PathVariable Long id, Authentication a) {
        Long user = owner(a);
        return conversations.findByIdAndOwnerId(id, user).<ResponseEntity<?>>map(c ->
                ResponseEntity.ok(Map.of(
                        "conversation", c,
                        "messages", messages.findByConversationIdOrderByCreatedAtAsc(id).stream().map(this::messageView).toList()
                ))
        ).orElseGet(() -> ResponseEntity.notFound().build());
    }

    private Map<String, Object> messageView(TutorMessage m) {
        try {
            return Map.of(
                    "id", m.getId(),
                    "role", m.getRole(),
                    "content", m.getContent(),
                    "sources", m.getSourcesJson() == null ? List.of() : json.readValue(m.getSourcesJson(), new TypeReference<List<Map<String, Object>>>() {}),
                    "createdAt", m.getCreatedAt()
            );
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    @PostMapping("/ask")
    public ResponseEntity<?> ask(
            @RequestBody @Valid AskRequest input,
            @RequestHeader(value = "X-OpenRouter-Api-Key", required = false) String clientOpenRouterApiKey,
            @RequestHeader(value = "X-LLM-Api-Key", required = false) String clientLlmApiKey,
            Authentication a
    ) throws Exception {
        Long student = owner(a);

        String clientApiKey = (clientOpenRouterApiKey != null && !clientOpenRouterApiKey.isBlank())
                ? clientOpenRouterApiKey.trim()
                : (clientLlmApiKey != null && !clientLlmApiKey.isBlank())
                    ? clientLlmApiKey.trim()
                    : (defaultOpenRouterApiKey != null && !defaultOpenRouterApiKey.isBlank())
                        ? defaultOpenRouterApiKey.trim()
                        : null;

        String contextText = null;
        String materialTitle = null;

        if (input.materialId() != null && input.materialId() > 0) {
            Material material = materials.findByIdAndOwnerId(input.materialId(), student).orElse(null);
            if (material == null) {
                return ResponseEntity.notFound().build();
            }
            if (!"COMPLETED".equals(material.getStatus()) || material.getExtractedText() == null) {
                return ResponseEntity.status(409).body(Map.of("error", "The selected note is still processing. Please choose a completed document or ask in general ChatGPT mode."));
            }
            contextText = material.getExtractedText();
            materialTitle = material.getTitle();
        }

        TutorConversation conversation;
        if (input.conversationId() == null) {
            String title = input.question().trim();
            if (title.length() > 100) title = title.substring(0, 100) + "...";
            conversation = conversations.save(new TutorConversation(student, title));
        } else {
            conversation = conversations.findByIdAndOwnerId(input.conversationId(), student).orElse(null);
            if (conversation == null) {
                return ResponseEntity.notFound().build();
            }
        }

        // Fetch recent conversation history turns
        List<TutorMessage> prevMessages = messages.findByConversationIdOrderByCreatedAtAsc(conversation.getId());
        List<Map<String, String>> historyList = new ArrayList<>();
        for (TutorMessage pm : prevMessages) {
            String role = "USER".equalsIgnoreCase(pm.getRole()) ? "user" : "assistant";
            historyList.add(Map.of("role", role, "content", pm.getContent()));
        }

        // Save student question
        messages.save(new TutorMessage(conversation.getId(), "USER", input.question().trim(), null));

        // Prepare ML chat payload
        Map<String, Object> chatPayload = new HashMap<>();
        chatPayload.put("question", input.question().trim());
        chatPayload.put("messages", historyList);
        if (contextText != null) {
            chatPayload.put("context", contextText);
            chatPayload.put("material_title", materialTitle);
        }
        if (clientApiKey != null) {
            chatPayload.put("api_key", clientApiKey);
        }

        Map<?, ?> chatResponse;
        try {
            var reqBuilder = ml.post().uri("/ml/v1/chat")
                    .contentType(MediaType.APPLICATION_JSON);
            if (clientApiKey != null) {
                reqBuilder.header("X-OpenRouter-Api-Key", clientApiKey);
            }
            chatResponse = reqBuilder.body(chatPayload).retrieve().body(Map.class);
        } catch (Exception e) {
            // Fallback to semantic-search if chat endpoint is busy
            try {
                if (contextText != null) {
                    Map<?, ?> found = ml.post().uri("/ml/v1/semantic-search")
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(Map.of("question", input.question(), "context", contextText))
                            .retrieve().body(Map.class);
                    List<Map<String, Object>> hits = json.convertValue(found.get("matches"), new TypeReference<>() {});
                    String passage = (hits != null && !hits.isEmpty()) ? Objects.toString(hits.get(0).get("text"), "") : "No passage found.";
                    chatResponse = Map.of(
                            "answer", "Here is what I found in your notes:\n\n> " + passage,
                            "sources", hits != null ? hits : List.of()
                    );
                } else {
                    chatResponse = Map.of(
                            "answer", "I received your question: \"" + input.question() + "\". Please ensure the AI worker is active or check your OpenRouter API key in settings.",
                            "sources", List.of()
                    );
                }
            } catch (Exception ex) {
                return ResponseEntity.status(503).body(Map.of("error", "The AI Tutor service is temporarily unavailable."));
            }
        }

        String answerText = chatResponse != null && chatResponse.get("answer") != null
                ? chatResponse.get("answer").toString()
                : "No response generated.";

        Object sourcesObj = chatResponse != null ? chatResponse.get("sources") : List.of();
        String sourcesJson = sourcesObj != null ? json.writeValueAsString(sourcesObj) : "[]";

        messages.save(new TutorMessage(conversation.getId(), "TUTOR", answerText, sourcesJson));

        return ResponseEntity.ok(Map.of(
                "conversationId", conversation.getId(),
                "messages", messages.findByConversationIdOrderByCreatedAtAsc(conversation.getId()).stream().map(this::messageView).toList(),
                "model", chatResponse != null && chatResponse.get("model") != null ? chatResponse.get("model").toString() : "google/gemma-4-26b-a4b-it:free"
        ));
    }
}
