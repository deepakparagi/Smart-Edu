package edu.smartstudy.focus;

import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;

public interface FocusSessionRepository extends JpaRepository<FocusSession,Long>{
    List<FocusSession> findTop30ByStudentIdOrderByStartedAtDesc(Long studentId);
    Optional<FocusSession> findFirstByStudentIdAndStatusInOrderByStartedAtDesc(Long studentId,Collection<String> statuses);
    @Query("select coalesce(sum(f.durationSeconds),0) from FocusSession f where f.studentId=:id and f.status='COMPLETED'")
    Long totalSeconds(@Param("id") Long id);
    List<FocusSession> findByStudentIdAndStartedAtGreaterThanEqualOrderByStartedAtAsc(Long studentId,Instant from);
    Optional<FocusSession> findByIdAndStudentId(Long id,Long studentId);
    List<FocusSession> findByStudentId(Long studentId);
    List<FocusSession> findTop10ByStudentIdOrderByStartedAtDesc(Long studentId);
    List<FocusSession> findTop50ByOrderByStartedAtDesc();
    long countByStatus(String status);
    @Query("select coalesce(sum(f.durationSeconds),0) from FocusSession f where f.status='COMPLETED'")
    Long platformTotalSeconds();
}