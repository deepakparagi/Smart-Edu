package edu.smartstudy.planning;
import jakarta.persistence.*;
import java.time.*;

@Entity
@Table(name = "study_plans")
public class StudyPlan {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "daily_available_minutes", nullable = false)
    private int dailyAvailableMinutes;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    protected StudyPlan() {}

    public StudyPlan(Long studentId, LocalDate start, LocalDate end, int minutes) {
        this.studentId = studentId;
        startDate = start;
        endDate = end;
        dailyAvailableMinutes = minutes;
    }

    public Long getId() { return id; }
    public Long getStudentId() { return studentId; }
    public LocalDate getStartDate() { return startDate; }
    public LocalDate getEndDate() { return endDate; }
    public int getDailyAvailableMinutes() { return dailyAvailableMinutes; }
    public String getStatus() { return status; }
    public Instant getCreatedAt() { return createdAt; }
    public Long getVersion() { return version; }

    public void supersede() { status = "SUPERSEDED"; }
}