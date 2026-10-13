package edu.smartstudy.admin;

import edu.smartstudy.user.*;
import edu.smartstudy.material.*;
import edu.smartstudy.quiz.*;
import edu.smartstudy.focus.*;
import edu.smartstudy.planning.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {
    private final UserRepository users;
    private final MaterialRepository materials;
    private final QuizAttemptRepository attempts;
    private final QuizRepository quizzes;
    private final FocusSessionRepository focus;
    private final StudyTaskRepository tasks;
    private final RestClient ml;

    public AdminController(UserRepository users,
                           MaterialRepository materials,
                           QuizAttemptRepository attempts,
                           QuizRepository quizzes,
                           FocusSessionRepository focus,
                           StudyTaskRepository tasks,
                           @Value("${app.ml-url:http://localhost:8000}") String mlUrl,
                           @Value("${app.ml-internal-token:dev-internal-token-change-me}") String mlInternalToken) {
        this.users = users;
        this.materials = materials;
        this.attempts = attempts;
        this.quizzes = quizzes;
        this.focus = focus;
        this.tasks = tasks;
        this.ml = RestClient.builder()
                .baseUrl(mlUrl)
                .defaultHeader("X-Internal-Token", mlInternalToken)
                .build();
    }

    public record RoleInput(@Pattern(regexp = "STUDENT|PARENT|ADMIN") String role) {}

    @GetMapping("/users")
    public List<Map<String, Object>> users(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role
    ) {
        List<User> list;
        if (search != null && !search.isBlank()) {
            list = users.searchUsers(search.trim());
        } else if (role != null && !role.isBlank()) {
            list = users.findByRoleOrderByCreatedAtDesc(role.trim().toUpperCase());
        } else {
            list = users.findTop100ByOrderByCreatedAtDesc();
        }

        return list.stream().map(u -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", u.getId());
            map.put("name", u.getName());
            map.put("email", u.getEmail());
            map.put("role", u.getRole());
            map.put("enabled", u.isEnabled());
            map.put("emailVerified", u.isEmailVerified());
            map.put("createdAt", u.getCreatedAt());
            map.put("materialsCount", materials.countByOwnerId(u.getId()));
            map.put("quizAttemptsCount", attempts.countByStudentId(u.getId()));
            Long sec = focus.totalSeconds(u.getId());
            map.put("studyMinutes", sec != null ? sec / 60 : 0);
            return map;
        }).toList();
    }

    @PatchMapping("/users/{id}/role")
    public ResponseEntity<?> updateRole(@PathVariable Long id, @RequestBody @Valid RoleInput input, Authentication auth) {
        User admin = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        if (admin.getId().equals(id)) {
            return ResponseEntity.status(409).body(Map.of("error", "You cannot change your own role."));
        }
        return users.findById(id).<ResponseEntity<?>>map(user -> {
            if ("ADMIN".equals(user.getRole()) && !"ADMIN".equals(input.role()) && users.countByRole("ADMIN") <= 1) {
                return ResponseEntity.status(409).body(Map.of("error", "Promote another administrator before changing the last admin account."));
            }
            user.setRole(input.role());
            users.save(user);
            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "role", user.getRole(),
                    "notice", "Role changes take effect on the user's next sign in."
            ));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PatchMapping("/users/{id}/toggle-status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable Long id, Authentication auth) {
        User admin = users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        if (admin.getId().equals(id)) {
            return ResponseEntity.status(409).body(Map.of("error", "You cannot disable your own administrator account."));
        }
        return users.findById(id).<ResponseEntity<?>>map(user -> {
            if ("ADMIN".equals(user.getRole()) && users.countByRole("ADMIN") <= 1 && user.isEnabled()) {
                return ResponseEntity.status(409).body(Map.of("error", "Cannot disable the only active administrator."));
            }
            user.setEnabled(!user.isEnabled());
            users.save(user);
            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "enabled", user.isEnabled(),
                    "message", user.isEnabled() ? "Account activated." : "Account suspended."
            ));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/documents")
    public List<Map<String, Object>> documents() {
        return materials.findTop50ByOrderByCreatedAtDesc().stream().map(m -> {
            User owner = users.findById(m.getOwnerId()).orElse(null);
            Map<String, Object> map = new HashMap<>();
            map.put("id", m.getId());
            map.put("title", m.getTitle());
            map.put("fileName", m.getFileName());
            map.put("fileSize", m.getFileSize());
            map.put("mimeType", m.getMimeType());
            map.put("status", m.getStatus());
            map.put("processingError", m.getProcessingError());
            map.put("createdAt", m.getCreatedAt());
            map.put("ownerId", m.getOwnerId());
            map.put("ownerName", owner != null ? owner.getName() : "Unknown");
            map.put("ownerEmail", owner != null ? owner.getEmail() : "Unknown");
            return map;
        }).toList();
    }

    @GetMapping("/recent-activity")
    public Map<String, Object> recentActivity() {
        // Recent quiz submissions
        List<Map<String, Object>> recentQuizzes = attempts.findTop50ByOrderBySubmittedAtDesc().stream()
                .limit(10)
                .map(a -> {
                    User student = users.findById(a.getStudentId()).orElse(null);
                    String qTitle = quizzes.findById(a.getQuizId()).map(Quiz::getTitle).orElse("Quiz #" + a.getQuizId());
                    return Map.<String, Object>of(
                            "id", a.getId(),
                            "studentName", student != null ? student.getName() : "Student",
                            "quizTitle", qTitle,
                            "score", a.getScore(),
                            "total", a.getTotalQuestions(),
                            "accuracyPercent", a.getTotalQuestions() > 0 ? Math.round(100.0 * a.getScore() / a.getTotalQuestions()) : 0,
                            "submittedAt", a.getSubmittedAt() != null ? a.getSubmittedAt() : Instant.now()
                    );
                })
                .toList();

        // Recent focus sessions
        List<Map<String, Object>> recentSessions = focus.findTop50ByOrderByStartedAtDesc().stream()
                .limit(10)
                .map(s -> {
                    User student = users.findById(s.getStudentId()).orElse(null);
                    return Map.<String, Object>of(
                            "id", s.getId(),
                            "studentName", student != null ? student.getName() : "Student",
                            "durationMinutes", s.getDurationSeconds() / 60,
                            "status", s.getStatus(),
                            "startedAt", s.getStartedAt() != null ? s.getStartedAt() : Instant.now()
                    );
                })
                .toList();

        // Recent registrations
        List<Map<String, Object>> recentUsers = users.findTop100ByOrderByCreatedAtDesc().stream()
                .limit(10)
                .map(u -> Map.<String, Object>of(
                        "id", u.getId(),
                        "name", u.getName(),
                        "email", u.getEmail(),
                        "role", u.getRole(),
                        "createdAt", u.getCreatedAt() != null ? u.getCreatedAt() : Instant.now()
                ))
                .toList();

        return Map.of(
                "quizzes", recentQuizzes,
                "sessions", recentSessions,
                "users", recentUsers
        );
    }

    @GetMapping("/system")
    public Map<String, Object> system() {
        Map<String, Long> docStates = new LinkedHashMap<>();
        for (String s : List.of("UPLOADED", "PROCESSING", "COMPLETED", "FAILED")) {
            docStates.put(s, materials.countByStatus(s));
        }

        long totalAttempts = attempts.count();
        double avgQuizAccuracy = 0;
        List<QuizAttempt> allAttempts = attempts.findAll();
        if (!allAttempts.isEmpty()) {
            double avg = allAttempts.stream()
                    .filter(a -> a.getTotalQuestions() > 0)
                    .mapToDouble(a -> (double) a.getScore() / a.getTotalQuestions() * 100)
                    .average().orElse(0);
            avgQuizAccuracy = Math.round(avg * 10.0) / 10.0;
        }

        // ML Service Health Check
        String mlHealthStatus = "OFFLINE";
        try {
            var res = ml.get().uri("/ml/v1/health").retrieve().toBodilessEntity();
            if (res.getStatusCode().is2xxSuccessful()) {
                mlHealthStatus = "ONLINE";
            }
        } catch (Exception e) {
            mlHealthStatus = "DEGRADED";
        }

        Runtime rt = Runtime.getRuntime();
        long usedMem = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
        long maxMem = rt.maxMemory() / (1024 * 1024);
        long totalMem = rt.totalMemory() / (1024 * 1024);

        Map<String, Object> telemetry = Map.of(
                "jvmUsedMemoryMB", usedMem,
                "jvmTotalMemoryMB", totalMem,
                "jvmMaxMemoryMB", maxMem,
                "memoryUsagePercent", maxMem > 0 ? Math.round(100.0 * usedMem / maxMem) : 0,
                "availableProcessors", rt.availableProcessors(),
                "javaVersion", System.getProperty("java.version", "21"),
                "serverTime", Instant.now(),
                "mlEngineStatus", mlHealthStatus
        );

        Long platformSecs = focus.platformTotalSeconds();
        long totalStudyMinutes = platformSecs != null ? platformSecs / 60 : 0;

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("users", users.count());
        res.put("students", users.countByRole("STUDENT"));
        res.put("parents", users.countByRole("PARENT"));
        res.put("admins", users.countByRole("ADMIN"));
        res.put("totalMaterials", materials.count());
        res.put("documentProcessing", docStates);
        res.put("totalQuizzes", quizzes.count());
        res.put("quizAttempts", totalAttempts);
        res.put("avgQuizAccuracyPercent", avgQuizAccuracy);
        res.put("totalStudyMinutes", totalStudyMinutes);
        res.put("totalStudyHours", Math.round((totalStudyMinutes / 60.0) * 10.0) / 10.0);
        res.put("completedSessions", focus.countByStatus("COMPLETED"));
        res.put("totalTasks", tasks.count());
        res.put("completedTasks", tasks.countByStatus("COMPLETED"));
        res.put("serverTelemetry", telemetry);
        res.put("mode", "single-instance");
        return res;
    }
}
