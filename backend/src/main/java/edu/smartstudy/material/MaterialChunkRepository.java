package edu.smartstudy.material;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface MaterialChunkRepository extends JpaRepository<MaterialChunk, Long> {
    List<MaterialChunk> findByMaterialIdOrderByChunkOrdinalAsc(Long materialId);

    @Query("SELECT c FROM MaterialChunk c WHERE c.materialId = :materialId AND c.chunkOrdinal = :ordinal")
    Optional<MaterialChunk> findByMaterialIdAndChunkOrdinal(@Param("materialId") Long materialId, @Param("ordinal") int ordinal);

    void deleteByMaterialId(Long materialId);
}