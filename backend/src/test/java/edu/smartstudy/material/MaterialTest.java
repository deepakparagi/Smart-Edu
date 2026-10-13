package edu.smartstudy.material;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MaterialTest {
    @Test
    void testMaterialLifecycleTransitions() {
        Material material = new Material(
                1L,
                "Operating Systems Notes",
                "os.pdf",
                "os-key-123",
                "application/pdf",
                1024L
        );
        
        assertEquals(1L, material.getOwnerId());
        assertEquals("Operating Systems Notes", material.getTitle());
        assertEquals("os.pdf", material.getFileName());
        assertEquals("application/pdf", material.getMimeType());
        assertEquals(1024L, material.getFileSize());
        assertEquals("UPLOADED", material.getStatus());
        
        // Processing
        material.processing();
        assertEquals("PROCESSING", material.getStatus());
        
        // Complete
        material.complete("Extracted full text here", "OS Summary", "[\"Processes\"]", "[\"CPU\"]");
        assertEquals("COMPLETED", material.getStatus());
        assertEquals("Extracted full text here", material.getExtractedText());
        assertEquals("OS Summary", material.getSummary());
        assertEquals("[\"Processes\"]", material.getTopicsJson());
        assertEquals("[\"CPU\"]", material.getKeywordsJson());
        assertNull(material.getProcessingError());
        
        // Fail
        material.fail("ML extraction timeout");
        assertEquals("FAILED", material.getStatus());
        assertEquals("ML extraction timeout", material.getProcessingError());
    }
}
