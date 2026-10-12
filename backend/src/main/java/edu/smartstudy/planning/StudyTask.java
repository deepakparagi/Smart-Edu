package edu.smartstudy.planning;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.*;

@Entity
@Table(name = "study_tasks")
public class StudyTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "plan_id")
    private Long planId;

    @Column(nullable = false)
    private String title;

    @Column(length = 120)
    private String subject;

    @Column(name = "scheduled_date")
    private LocalDate scheduledDate;

    @Column(name = "estimated_minutes", nullable = false)
    private int estimatedMinutes;

    @Column(nullable = false)
    private String priority = "MEDIUM";

    @Column(nullable = false)
    private String status = "PENDING";

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    protected StudyTask() {}

    public StudyTask(Long studentId, Long planId, String title, String subject, LocalDate date, int minutes, String priority) {
        this.studentId = studentId;
        this.planId = planId;
        this.title = title;
        this.subject = subject;
        scheduledDate = date;
        estimatedMinutes = minutes;
        this.priority = priority;
    }

    public Long getId() { return id; }
    public Long getStudentId() { return studentId; }
    public Long getPlanId() { return planId; }
    public String getTitle() { return title; }
    public String getSubject() { return subject; }
    public LocalDate getScheduledDate() { return scheduledDate; }
    public int getEstimatedMinutes() { return estimatedMinutes; }
    public String getPriority() { return priority; }
    public String getStatus() { return status; }
    public Instant getCompletedAt() { return completedAt; }
    public Instant getCreatedAt() { return createdAt; }
    public Long getVersion() { return version; }

    public void update(String title, String subject, LocalDate date, int minutes, String priority) {
        this.title = title;
        this.subject = subject;
        scheduledDate = date;
        estimatedMinutes = minutes;
        this.priority = priority;
    }

    public void complete() {
        status = "COMPLETED";
        completedAt = Instant.now();
    }

    public void reopen() {
        status = "PENDING";
        completedAt = null;
    }
}