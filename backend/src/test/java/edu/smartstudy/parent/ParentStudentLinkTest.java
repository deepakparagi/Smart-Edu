package edu.smartstudy.parent;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ParentStudentLinkTest {
    @Test
    void testLinkCreationAndTransitions() {
        ParentStudentLink link = new ParentStudentLink(10L, 20L);
        
        assertEquals(10L, link.getParentId());
        assertEquals(20L, link.getStudentId());
        assertEquals("PENDING", link.getStatus());
        
        link.accept();
        assertEquals("APPROVED", link.getStatus());
        
        link.reject();
        assertEquals("REJECTED", link.getStatus());
        
        link.setStatus("PENDING");
        assertEquals("PENDING", link.getStatus());
    }
}
