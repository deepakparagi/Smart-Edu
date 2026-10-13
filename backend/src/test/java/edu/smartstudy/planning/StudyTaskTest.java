package edu.smartstudy.planning;

import org.junit.jupiter.api.Test;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class StudyTaskTest {
    @Test
    void testTaskLifecycleAndUpdates() {
        LocalDate date = LocalDate.of(2026, 10, 15);
        StudyTask task = new StudyTask(5L, null, "Revise Compiler Design", "CS", date, 60, "HIGH");
        
        assertEquals(5L, task.getStudentId());
        assertEquals("Revise Compiler Design", task.getTitle());
        assertEquals("CS", task.getSubject());
        assertEquals(date, task.getScheduledDate());
        assertEquals(60, task.getEstimatedMinutes());
        assertEquals("HIGH", task.getPriority());
        assertEquals("PENDING", task.getStatus());
        assertNull(task.getCompletedAt());
        
        // Complete
        task.complete();
        assertEquals("COMPLETED", task.getStatus());
        assertNotNull(task.getCompletedAt());
        
        // Reopen
        task.reopen();
        assertEquals("PENDING", task.getStatus());
        assertNull(task.getCompletedAt());
        
        // Update
        LocalDate newDate = LocalDate.of(2026, 10, 16);
        task.update("Revise OS Concepts", "CS Core", newDate, 45, "MEDIUM");
        assertEquals("Revise OS Concepts", task.getTitle());
        assertEquals("CS Core", task.getSubject());
        assertEquals(newDate, task.getScheduledDate());
        assertEquals(45, task.getEstimatedMinutes());
        assertEquals("MEDIUM", task.getPriority());
    }
}
