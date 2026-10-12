package edu.smartstudy.planning;
import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface StudyPlanRepository extends JpaRepository<StudyPlan,Long>{Optional<StudyPlan> findFirstByStudentIdAndStatusOrderByCreatedAtDesc(Long studentId,String status);}
