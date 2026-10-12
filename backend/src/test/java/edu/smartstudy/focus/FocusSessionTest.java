package edu.smartstudy.focus;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class FocusSessionTest {
    @Test void sessionCanPauseResumeAndFinish() {
        var session = new FocusSession(12L, 3L);
        assertEquals("ACTIVE", session.getStatus());
        session.pause();
        assertEquals("PAUSED", session.getStatus());
        session.resume();
        assertEquals("ACTIVE", session.getStatus());
        session.finish();
        assertEquals("COMPLETED", session.getStatus());
        assertNotNull(session.getEndedAt());
        assertTrue(session.getDurationSeconds() >= 0);
    }
}
