package edu.smartstudy.planning;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface StudyTaskRepository extends JpaRepository<StudyTask,Long>{List<StudyTask> findTop100ByStudentIdOrderByScheduledDateAscCreatedAtDesc(Long studentId);long countByStudentId(Long studentId);long countByStudentIdAndStatus(Long studentId,String status);Optional<StudyTask> findByIdAndStudentId(Long id,Long studentId);}
