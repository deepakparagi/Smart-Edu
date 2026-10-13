package edu.smartstudy.parent;

import edu.smartstudy.user.*;
import edu.smartstudy.planning.*;
import edu.smartstudy.focus.*;
import edu.smartstudy.quiz.*;
import edu.smartstudy.material.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/parents")
public class ParentController {
    private final ParentStudentLinkRepository links;
    private final UserRepository users;
    private final StudyTaskRepository tasks;
    private final FocusSessionRepository focus;
    private final QuizAttemptRepository attempts;
    private final QuizRepository quizzes;
    private final MaterialRepository materials;

    public ParentController(ParentStudentLinkRepository links, UserRepository users,
                            StudyTaskRepository tasks, FocusSessionRepository focus,
                            QuizAttemptRepository attempts, QuizRepository quizzes,
                            MaterialRepository materials) {
        this.links = links;
        this.users = users;
        this.tasks = tasks;
        this.focus = focus;
        this.attempts = attempts;
        this.quizzes = quizzes;
        this.materials = materials;
    }

    private Long id(Authentication a) {
        return users.findByEmailIgnoreCase(a.getName()).orElseThrow().getId();
    }

    private Map<String, Object> user(User u) {
        return Map.of("id", u.getId(), "name", u.getName(), "email", u.getEmail());
    }

    public record LinkRequest(@Email @NotBlank String studentEmail) {}

    public record LinkAction(@Pattern(regexp = "APPROVE|REJECT") String action) {}

    @PostMapping("/links")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<?> requestLink(@RequestBody @Valid LinkRequest input, Authentication auth) {
        Long parent = id(auth);
        User child = users.findByEmailIgnoreCase(input.studentEmail().trim())
                .filter(u -> u.getRole().equals("STUDENT"))
                .orElse(null);
        if (child == null) return ResponseEntity.status(404).body(Map.of("error", "No student account found with this email."));
        if (links.existsByParentIdAndStudentId(parent, child.getId()))
            return ResponseEntity.status(409).body(Map.of("error", "A link request already exists for this student."));
        return ResponseEntity.status(201).body(Map.of(
                "id", links.save(new ParentStudentLink(parent, child.getId())).getId(),
                "student", user(child),
                "status", "PENDING"));
    }

    @GetMapping("/links/sent")
    @PreAuthorize("hasRole('PARENT')")
    public List<Map<String, Object>> sentLinks(Authentication auth) {
        Long parent = id(auth);
        return links.findByParentIdAndStatusOrderByCreatedAtDesc(parent, "PENDING").stream()
                .map(l -> {
                    User s = users.findById(l.getStudentId()).orElse(null);
                    if (s == null) return null;
                    return Map.<String, Object>of(
                            "id", l.getId(),
                            "student", user(s),
                            "status", l.getStatus(),
                            "createdAt", l.getCreatedAt() != null ? l.getCreatedAt() : Instant.now());
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @GetMapping({"/links/pending", "/requests"})
    @PreAuthorize("hasRole('STUDENT')")
    public List<Map<String, Object>> pendingLinks(Authentication auth) {
        Long student = id(auth);
        return links.findByStudentIdAndStatusOrderByCreatedAtDesc(student, "PENDING").stream()
                .map(l -> {
                    User p = users.findById(l.getParentId()).orElse(null);
                    if (p == null) return null;
                    return Map.<String, Object>of(
                            "id", l.getId(),
                            "parent", Map.of("id", p.getId(), "name", p.getName(), "email", p.getEmail()),
                            "createdAt", l.getCreatedAt() != null ? l.getCreatedAt() : Instant.now());
                })
                .filter(Objects::nonNull)
                .toList();
    }

    @PostMapping("/links/{linkId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> respondToLink(@PathVariable Long linkId,
                                           @RequestBody @Valid LinkAction input,
                                           Authentication auth) {
        Long student = id(auth);
        var linkOpt = links.findById(linkId);
        if (linkOpt.isEmpty() || !linkOpt.get().getStudentId().equals(student) ||
                !"PENDING".equals(linkOpt.get().getStatus())) {
            return ResponseEntity.notFound().build();
        }
        ParentStudentLink link = linkOpt.get();
        if ("APPROVE".equals(input.action())) {
            link.setStatus("APPROVED");
        } else {
            link.setStatus("REJECTED");
        }
        links.save(link);
        return ResponseEntity.ok(Map.of("status", link.getStatus()));
    }

    @PostMapping("/links/{linkId}/accept")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<?> acceptLinkDirect(@PathVariable Long linkId, Authentication auth) {
        Long student = id(auth);
        var linkOpt = links.findById(linkId);
        if (linkOpt.isEmpty() || !linkOpt.get().getStudentId().equals(student) ||
                !"PENDING".equals(linkOpt.get().getStatus())) {
            return ResponseEntity.notFound().build();
        }
        ParentStudentLink link = linkOpt.get();
        link.setStatus("APPROVED");
        links.save(link);
        return ResponseEntity.ok(Map.of("status", link.getStatus()));
    }

    @DeleteMapping("/links/{linkId}")
    public ResponseEntity<?> removeLink(@PathVariable Long linkId, Authentication auth) {
        Long currentUserId = id(auth);
        return links.findById(linkId).map(link -> {
            if (!link.getParentId().equals(currentUserId) && !link.getStudentId().equals(currentUserId)) {
                return ResponseEntity.status(403).body(Map.of("error", "Access denied."));
            }
            links.delete(link);
            return ResponseEntity.ok(Map.of("message", "Link removed successfully."));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @GetMapping("/children")
    @PreAuthorize("hasRole('PARENT')")
    public List<Map<String, Object>> children(Authentication auth) {
        return links.findByParentIdAndStatusOrderByCreatedAtDesc(id(auth), "APPROVED").stream()
                .map(l -> users.findById(l.getStudentId()).map(u -> {
                    Map<String, Object> map = new HashMap<>(user(u));
                    map.put("linkId", l.getId());
                    map.put("linkedSince", l.getCreatedAt() != null ? l.getCreatedAt() : Instant.now());
                    return map;
                }).orElse(null))
                .filter(Objects::nonNull)
                .toList();
    }

    @GetMapping("/children/{studentId}/progress")
    @PreAuthorize("hasRole('PARENT')")
    public ResponseEntity<?> progress(@PathVariable Long studentId, Authentication auth) {
        Long parent = id(auth);
        if (links.findByParentIdAndStudentIdAndStatus(parent, studentId, "APPROVED").isEmpty()) {
            return ResponseEntity.status(404).body(Map.of("error", "Student link not found or not approved."));
        }
        User child = users.findById(studentId).orElse(null);
        if (child == null) return ResponseEntity.notFound().build();

        Map<String, Object> report = new HashMap<>();
        report.put("student", user(child));

        // Focus & study sessions
        List<FocusSession> allSessions = focus.findByStudentId(studentId);
        long studyMinutes = allSessions.stream()
                .filter(s -> "COMPLETED".equals(s.getStatus()))
                .mapToLong(s -> s.getDurationSeconds() / 60)
                .sum();

        Instant dayAgo = Instant.now().minus(24, ChronoUnit.HOURS);
        long todayStudyMinutes = allSessions.stream()
                .filter(s -> "COMPLETED".equals(s.getStatus()) && s.getStartedAt() != null && s.getStartedAt().isAfter(dayAgo))
                .mapToLong(s -> s.getDurationSeconds() / 60)
                .sum();

        Instant weekAgo = Instant.now().minus(7, ChronoUnit.DAYS);
        long weeklyStudyMinutes = allSessions.stream()
                .filter(s -> "COMPLETED".equals(s.getStatus()) && s.getStartedAt() != null && s.getStartedAt().isAfter(weekAgo))
                .mapToLong(s -> s.getDurationSeconds() / 60)
                .sum();

        List<Map<String, Object>> recentSessions = focus.findTop10ByStudentIdOrderByStartedAtDesc(studentId).stream()
                .limit(6)
                .map(s -> Map.<String, Object>of(
                        "id", s.getId(),
                        "durationMinutes", s.getDurationSeconds() / 60,
                        "status", s.getStatus(),
                        "startedAt", s.getStartedAt() != null ? s.getStartedAt() : Instant.now()
                ))
                .toList();

        // Tasks
        List<StudyTask> studentTasks = tasks.findByStudentIdOrderByScheduledDateAscCreatedAtDesc(studentId);
        long tasksTotal = studentTasks.size();
        long tasksCompleted = studentTasks.stream().filter(t -> "COMPLETED".equals(t.getStatus())).count();
        double taskCompletionPercent = tasksTotal > 0 ? (100.0 * tasksCompleted / tasksTotal) : 0;

        List<Map<String, Object>> recentTasks = studentTasks.stream()
                .limit(6)
                .map(t -> {
                    Map<String, Object> tMap = new HashMap<>();
                    tMap.put("id", t.getId());
                    tMap.put("title", t.getTitle());
                    tMap.put("status", t.getStatus());
                    tMap.put("priority", t.getPriority() != null ? t.getPriority() : "MEDIUM");
                    tMap.put("estimatedMinutes", t.getEstimatedMinutes());
                    if (t.getScheduledDate() != null) tMap.put("scheduledDate", t.getScheduledDate().toString());
                    return tMap;
                })
                .toList();

        // Quiz attempts
        List<QuizAttempt> quizAttemptsList = attempts.findByStudentId(studentId);
        long quizAttempts = quizAttemptsList.size();
        double quizAccuracyPercent = 0;
        if (!quizAttemptsList.isEmpty()) {
            double avg = quizAttemptsList.stream()
                    .mapToDouble(a -> (double) a.getScore() / a.getTotalQuestions() * 100)
                    .average().orElse(0);
            quizAccuracyPercent = Math.round(avg * 100.0) / 100.0;
        }

        List<Map<String, Object>> recentQuizzes = attempts.findTop100ByStudentIdOrderBySubmittedAtDesc(studentId).stream()
                .limit(6)
                .map(a -> {
                    String title = quizzes.findById(a.getQuizId()).map(Quiz::getTitle).orElse("Quiz #" + a.getQuizId());
                    return Map.<String, Object>of(
                            "id", a.getId(),
                            "quizId", a.getQuizId(),
                            "title", title,
                            "score", a.getScore(),
                            "total", a.getTotalQuestions(),
                            "accuracyPercent", a.getTotalQuestions() > 0 ? Math.round(100.0 * a.getScore() / a.getTotalQuestions()) : 0,
                            "submittedAt", a.getSubmittedAt() != null ? a.getSubmittedAt() : Instant.now()
                    );
                })
                .toList();

        // Materials studied
        List<Map<String, Object>> materialsStudied = materials.findTop100ByOwnerIdOrderByCreatedAtDesc(studentId).stream()
                .limit(6)
                .map(m -> Map.<String, Object>of(
                        "id", m.getId(),
                        "title", m.getTitle(),
                        "status", m.getStatus(),
                        "createdAt", m.getCreatedAt() != null ? m.getCreatedAt() : Instant.now()
                ))
                .toList();

        String statusAssessment;
        if (studyMinutes >= 60 && quizAccuracyPercent >= 75) {
            statusAssessment = "Outstanding engagement: consistent study habits and high accuracy.";
        } else if (studyMinutes >= 30 || quizAccuracyPercent >= 50) {
            statusAssessment = "Steady academic progress: active learning sessions and quiz practice.";
        } else {
            statusAssessment = "Getting started: encourage more focused study sessions and quizzes this week.";
        }

        report.put("studyMinutes", studyMinutes);
        report.put("todayStudyMinutes", todayStudyMinutes);
        report.put("weeklyStudyMinutes", weeklyStudyMinutes);
        report.put("tasksCompleted", tasksCompleted);
        report.put("tasksTotal", tasksTotal);
        report.put("taskCompletionPercent", Math.round(taskCompletionPercent * 100.0) / 100.0);
        report.put("quizAttempts", quizAttempts);
        report.put("quizAccuracyPercent", quizAccuracyPercent);
        report.put("recentSessions", recentSessions);
        report.put("recentTasks", recentTasks);
        report.put("recentQuizzes", recentQuizzes);
        report.put("materialsStudied", materialsStudied);
        report.put("statusAssessment", statusAssessment);

        return ResponseEntity.ok(report);
    }
}