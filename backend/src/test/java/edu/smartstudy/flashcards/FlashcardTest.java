package edu.smartstudy.flashcards;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class FlashcardTest {
    @Test void successfulRecallUsesIncreasingIntervalsAndMissResets() {
        var card = new Flashcard(7L, 2L, "Term", "Meaning", "Page 1");
        // First review: Good (2) -> interval 1 day
        card.review(2);
        assertEquals(1, card.getIntervalDays());
        assertEquals(LocalDate.now().plusDays(1), card.getNextReview());
        assertEquals(1, card.getReviewCount());
        assertEquals(0, card.getLapses());

        // Second review: Good (2) -> interval 3 days
        card.review(2);
        assertEquals(3, card.getIntervalDays());
        assertEquals(LocalDate.now().plusDays(3), card.getNextReview());
        assertEquals(2, card.getReviewCount());

        // Third review: Again (0) -> reset to interval 1, lapses++, reviewCount reset to 0
        card.review(0);
        assertEquals(1, card.getIntervalDays());
        assertEquals(LocalDate.now(), card.getNextReview()); // Due again today
        assertEquals(1, card.getLapses());
        assertEquals(0, card.getReviewCount()); // Review count reset to 0

        // Fourth review: Good (2) -> interval 1 day (reviewCount was reset to 0)
        card.review(2);
        assertEquals(1, card.getIntervalDays());
        assertEquals(LocalDate.now().plusDays(1), card.getNextReview());
        assertEquals(1, card.getReviewCount());

        // Test Hard (1) rating
        var card2 = new Flashcard(8L, 3L, "Term2", "Meaning2", "Page 2");
        card2.review(2); // Good -> interval 1
        card2.review(1); // Hard -> interval max(1, round(1 * 1.2)) = 1
        assertEquals(1, card2.getIntervalDays());
        assertTrue(card2.getEaseFactor() < 2.5); // Ease factor decreased

        // Test Easy (3) rating
        var card3 = new Flashcard(9L, 4L, "Term3", "Meaning3", "Page 3");
        card3.review(2); // Good -> interval 1
        card3.review(2); // Good -> interval 3
        card3.review(3); // Easy -> interval round(3 * 2.5 * 1.3) = round(9.75) = 10
        assertEquals(10, card3.getIntervalDays());
        assertTrue(card3.getEaseFactor() > 2.5); // Ease factor increased
    }

    @Test void projectedIntervalsMatchReviewLogic() {
        var card = new Flashcard(10L, 5L, "Term", "Meaning", "Page 1");
        // Review count 0
        assertEquals(1, card.projectedInterval(0)); // Again
        assertEquals(1, card.projectedInterval(1)); // Hard
        assertEquals(1, card.projectedInterval(2)); // Good
        assertEquals(3, card.projectedInterval(3)); // Easy

        card.review(2); // Good -> interval 1, reviewCount 1
        assertEquals(1, card.projectedInterval(0));
        assertEquals(1, card.projectedInterval(1));
        assertEquals(3, card.projectedInterval(2));
        assertEquals(6, card.projectedInterval(3));

        card.review(2); // Good -> interval 3, reviewCount 2
        assertEquals(1, card.projectedInterval(0));
        assertEquals(4, card.projectedInterval(1)); // round(3 * 1.2) = 4
        assertEquals(8, card.projectedInterval(2)); // round(3 * 2.5) = 8 (easeFactor 2.5)
        assertEquals(10, card.projectedInterval(3)); // round(3 * 2.5 * 1.3) = round(9.75) = 10
    }

    @Test void easeFactorBounds() {
        var card = new Flashcard(11L, 6L, "Term", "Meaning", "Page 1");
        // Repeated Again should floor easeFactor at 1.3
        for (int i = 0; i < 20; i++) {
            card.review(0); // Again
        }
        assertEquals(1.3, card.getEaseFactor(), 0.01);

        // Repeated Easy should cap easeFactor at 3.0
        var card2 = new Flashcard(12L, 7L, "Term", "Meaning", "Page 1");
        for (int i = 0; i < 20; i++) {
            card2.review(3); // Easy
        }
        assertEquals(3.0, card2.getEaseFactor(), 0.01);

        // Interval cap at 365 days
        var card3 = new Flashcard(13L, 8L, "Term", "Meaning", "Page 1");
        card3.review(2); // interval 1
        card3.review(2); // interval 3
        // Manually set high interval to test cap
        java.lang.reflect.Field field;
        try {
            field = Flashcard.class.getDeclaredField("intervalDays");
            field.setAccessible(true);
            field.set(card3, 300);
            field = Flashcard.class.getDeclaredField("reviewCount");
            field.setAccessible(true);
            field.set(card3, 5);
            field = Flashcard.class.getDeclaredField("easeFactor");
            field.setAccessible(true);
            field.set(card3, 2.5);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        card3.review(2); // Good
        assertTrue(card3.getIntervalDays() <= 365);
    }
}