package edu.smartstudy.quiz;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface QuizAttemptRepository extends JpaRepository<QuizAttempt, Long> {
    List<QuizAttempt> findTop30ByQuizIdAndStudentIdOrderBySubmittedAtDesc(Long quizId, Long studentId);
    List<QuizAttempt> findTop100ByStudentIdOrderBySubmittedAtDesc(Long studentId);
    List<QuizAttempt> findByStudentId(Long studentId);
    List<QuizAttempt> findByQuizId(Long quizId);
    List<QuizAttempt> findTop50ByOrderBySubmittedAtDesc();
    long countByStudentId(Long studentId);
}
