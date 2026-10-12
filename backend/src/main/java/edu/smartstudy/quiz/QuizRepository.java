package edu.smartstudy.quiz;
import java.util.*;import org.springframework.data.jpa.repository.JpaRepository;
public interface QuizRepository extends JpaRepository<Quiz,Long>{List<Quiz> findTop100ByOwnerIdOrderByCreatedAtDesc(Long ownerId);Optional<Quiz> findByIdAndOwnerId(Long id,Long ownerId);}
