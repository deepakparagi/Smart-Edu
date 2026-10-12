package edu.smartstudy.flashcards;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FlashcardRepository extends JpaRepository<Flashcard, Long> {
    List<Flashcard> findTop100ByOwnerIdOrderByNextReviewAsc(Long ownerId);
    Optional<Flashcard> findByIdAndOwnerId(Long id, Long ownerId);
    boolean existsByIdAndOwnerId(Long id, Long ownerId);
    boolean existsByOwnerIdAndMaterialIdAndFrontIgnoreCase(Long ownerId, Long materialId, String front);

    List<Flashcard> findByOwnerIdAndMaterialIdOrderByNextReviewAsc(Long ownerId, Long materialId);

    List<Flashcard> findByOwnerIdAndNextReviewLessThanEqualOrderByNextReviewAsc(Long ownerId, LocalDate date);

    long countByOwnerIdAndNextReviewLessThanEqual(Long ownerId, LocalDate date);

    long countByOwnerId(Long ownerId);

    @Query("SELECT f FROM Flashcard f WHERE f.ownerId = :ownerId AND LOWER(f.front) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY f.nextReview ASC")
    List<Flashcard> searchByOwnerAndFront(@Param("ownerId") Long ownerId, @Param("query") String query);

    List<Flashcard> findByOwnerIdOrderByNextReviewAsc(Long ownerId);
}