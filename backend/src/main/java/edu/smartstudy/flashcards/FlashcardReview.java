package edu.smartstudy.flashcards;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.*;

@Entity
@Table(name = "flashcard_reviews")
public class FlashcardReview {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "flashcard_id", nullable = false)
    private Long flashcardId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "quality", nullable = false)
    private int quality; // 0=Again, 1=Hard, 2=Good, 3=Easy

    @Column(name = "previous_interval_days", nullable = false)
    private int previousIntervalDays;

    @Column(name = "new_interval_days", nullable = false)
    private int newIntervalDays;

    @Column(name = "previous_ease_factor", nullable = false)
    private double previousEaseFactor;

    @Column(name = "new_ease_factor", nullable = false)
    private double newEaseFactor;

    @Column(name = "reviewed_at", insertable = false, updatable = false)
    private Instant reviewedAt;

    protected FlashcardReview() {}

    public FlashcardReview(Long flashcardId, Long userId, int quality,
                           int previousIntervalDays, int newIntervalDays,
                           double previousEaseFactor, double newEaseFactor) {
        this.flashcardId = flashcardId;
        this.userId = userId;
        this.quality = quality;
        this.previousIntervalDays = previousIntervalDays;
        this.newIntervalDays = newIntervalDays;
        this.previousEaseFactor = previousEaseFactor;
        this.newEaseFactor = newEaseFactor;
    }

    public Long getId() { return id; }
    public Long getFlashcardId() { return flashcardId; }
    public Long getUserId() { return userId; }
    public int getQuality() { return quality; }
    public int getPreviousIntervalDays() { return previousIntervalDays; }
    public int getNewIntervalDays() { return newIntervalDays; }
    public double getPreviousEaseFactor() { return previousEaseFactor; }
    public double getNewEaseFactor() { return newEaseFactor; }
    public Instant getReviewedAt() { return reviewedAt; }
}