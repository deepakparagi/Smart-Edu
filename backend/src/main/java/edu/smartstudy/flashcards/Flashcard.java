package edu.smartstudy.flashcards;
import jakarta.persistence.*;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.*;

@Entity
@Table(name = "flashcards")
public class Flashcard {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(name = "material_id")
    private Long materialId;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String front;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String back;

    @Column(name = "source_reference", length = 120)
    private String sourceReference;

    @Column(name = "last_reviewed")
    private LocalDate lastReviewed;

    @Column(name = "next_review")
    private LocalDate nextReview;

    @Column(name = "interval_days", nullable = false)
    private int intervalDays = 0;

    @Column(name = "ease_factor", nullable = false)
    private double easeFactor = 2.5;

    @Column(name = "review_count", nullable = false)
    private int reviewCount = 0;

    @Column(name = "lapses", nullable = false)
    private int lapses = 0;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    @Version
    @Column(name = "version", nullable = false)
    private Long version = 0L;

    protected Flashcard() {}

    public Flashcard(Long owner, Long material, String front, String back, String source) {
        ownerId = owner;
        materialId = material;
        this.front = front;
        this.back = back;
        sourceReference = source;
        nextReview = LocalDate.now();
    }

    public Long getId() { return id; }
    public Long getOwnerId() { return ownerId; }
    public Long getMaterialId() { return materialId; }
    public String getFront() { return front; }
    public String getBack() { return back; }
    public String getSourceReference() { return sourceReference; }
    public LocalDate getNextReview() { return nextReview; }
    public int getIntervalDays() { return intervalDays; }
    public double getEaseFactor() { return easeFactor; }
    public int getReviewCount() { return reviewCount; }
    public int getLapses() { return lapses; }
    public Instant getCreatedAt() { return createdAt; }
    public Long getVersion() { return version; }

    public void setFront(String front) { this.front = front; }
    public void setBack(String back) { this.back = back; }
    public void setSourceReference(String sourceReference) { this.sourceReference = sourceReference; }

    /**
     * SM-2 variant with 4 ratings (Appendix A):
     * quality: 0=Again, 1=Hard, 2=Good, 3=Easy
     */
    public void review(@Min(0) @Max(5) int inputQuality) {
        LocalDate today = LocalDate.now();
        int quality = inputQuality > 3 ? (inputQuality == 5 ? 3 : 2) : inputQuality;

        if (quality == 0) { // Again
            reviewCount = 0;
            lapses++;
            intervalDays = 1;
            easeFactor = Math.max(1.3, easeFactor - 0.20);
            // Due again today (same session) or tomorrow - we'll set to today for same-session review
            nextReview = today;
        } else if (quality == 1) { // Hard
            easeFactor = Math.max(1.3, easeFactor - 0.15);
            if (reviewCount == 0) {
                intervalDays = 1;
            } else {
                intervalDays = Math.max(1, (int) Math.round(intervalDays * 1.2));
            }
            nextReview = today.plusDays(intervalDays);
        } else if (quality == 2) { // Good
            if (reviewCount == 0) {
                intervalDays = 1;
            } else if (reviewCount == 1) {
                intervalDays = 3;
            } else {
                intervalDays = Math.max(1, (int) Math.round(intervalDays * easeFactor));
            }
            // easeFactor unchanged for Good
            nextReview = today.plusDays(intervalDays);
        } else if (quality == 3) { // Easy
            easeFactor = Math.min(3.0, easeFactor + 0.15); // Cap at 3.0
            if (reviewCount == 0) {
                intervalDays = 3;
            } else if (reviewCount == 1) {
                intervalDays = 6;
            } else {
                intervalDays = Math.max(1, (int) Math.round(intervalDays * easeFactor * 1.3));
            }
            nextReview = today.plusDays(intervalDays);
        }

        // Cap interval at 365 days
        intervalDays = Math.min(intervalDays, 365);
        if (quality > 0) {
            reviewCount++;
        }
        lastReviewed = today;
    }

    /**
     * Get the projected interval for a given quality rating (for UI preview).
     */
    public int projectedInterval(@Min(0) @Max(3) int quality) {
        if (quality == 0) return 1;
        if (quality == 1) {
            if (reviewCount == 0) return 1;
            return Math.max(1, (int) Math.round(intervalDays * 1.2));
        }
        if (quality == 2) {
            if (reviewCount == 0) return 1;
            if (reviewCount == 1) return 3;
            return Math.max(1, (int) Math.round(intervalDays * easeFactor));
        }
        // Easy
        if (reviewCount == 0) return 3;
        if (reviewCount == 1) return 6;
        return Math.max(1, (int) Math.round(intervalDays * easeFactor * 1.3));
    }
}