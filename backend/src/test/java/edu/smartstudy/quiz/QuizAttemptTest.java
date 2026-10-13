package edu.smartstudy.quiz;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class QuizAttemptTest {
    @Test
    void testQuizAttemptCreationAndGetters() {
        QuizAttempt attempt = new QuizAttempt(101L, 202L, 4, 5, "[\"A\", \"B\", \"C\", \"D\", \"A\"]");
        
        assertEquals(101L, attempt.getQuizId());
        assertEquals(202L, attempt.getStudentId());
        assertEquals(4, attempt.getScore());
        assertEquals(5, attempt.getTotalQuestions());
        assertEquals("[\"A\", \"B\", \"C\", \"D\", \"A\"]", attempt.getAnswersJson());
        
        double accuracy = (double) attempt.getScore() / attempt.getTotalQuestions() * 100.0;
        assertEquals(80.0, accuracy, 0.001);
    }

    @Test
    void testPerfectScoreAttempt() {
        QuizAttempt perfect = new QuizAttempt(102L, 203L, 3, 3, "[\"X\", \"Y\", \"Z\"]");
        assertEquals(3, perfect.getScore());
        assertEquals(3, perfect.getTotalQuestions());
        assertEquals(100.0, ((double) perfect.getScore() / perfect.getTotalQuestions()) * 100.0, 0.001);
    }
}
