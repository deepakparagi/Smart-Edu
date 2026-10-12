package edu.smartstudy.flashcards;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface FlashcardReviewRepository extends JpaRepository<FlashcardReview, Long> {
    List<FlashcardReview> findByFlashcardIdOrderByReviewedAtDesc(Long flashcardId);
    List<FlashcardReview> findByUserIdOrderByReviewedAtDesc(Long userId);
}