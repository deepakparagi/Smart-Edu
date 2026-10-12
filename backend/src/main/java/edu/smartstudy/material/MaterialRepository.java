package edu.smartstudy.material;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MaterialRepository extends JpaRepository<Material, Long> {
    List<Material> findTop100ByOwnerIdOrderByCreatedAtDesc(Long ownerId);
    List<Material> findByStatus(String status);
    long countByStatus(String status);
    Optional<Material> findByIdAndOwnerId(Long id, Long ownerId);

    Page<Material> findByOwnerIdOrderByCreatedAtDesc(Long ownerId, Pageable pageable);

    @Query("SELECT m FROM Material m WHERE m.ownerId = :ownerId AND " +
           "(LOWER(m.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(m.fileName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           " LOWER(m.extractedText) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY m.createdAt DESC")
    Page<Material> searchByOwnerAndQuery(@Param("ownerId") Long ownerId, @Param("query") String query, Pageable pageable);

    List<Material> findByOwnerIdAndStatusIn(Long ownerId, List<String> statuses);
}