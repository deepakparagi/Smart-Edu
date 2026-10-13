package edu.smartstudy.parent;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ParentStudentLinkRepository extends JpaRepository<ParentStudentLink, Long> {
    boolean existsByParentIdAndStudentId(Long parent, Long student);
    List<ParentStudentLink> findByParentIdAndStatusOrderByCreatedAtDesc(Long parent, String status);
    List<ParentStudentLink> findByStudentIdAndStatusOrderByCreatedAtDesc(Long student, String status);
    Optional<ParentStudentLink> findByIdAndStudentId(Long id, Long student);
    Optional<ParentStudentLink> findByParentIdAndStudentIdAndStatus(Long parent, Long student, String status);
    Optional<ParentStudentLink> findByParentIdAndStudentId(Long parent, Long student);
}
