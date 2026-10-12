package edu.smartstudy.material;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "materials")
public class Material {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "owner_id", nullable = false)
    private Long ownerId;

    @Column(nullable = false)
    private String title;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "storage_key", nullable = false, unique = true)
    private String storageKey;

    @Column(name = "mime_type", nullable = false)
    private String mimeType;

    @Column(name = "file_size", nullable = false)
    private long fileSize;

    @Column(nullable = false)
    private String status;

    @Column(name = "extracted_text", columnDefinition = "LONGTEXT")
    private String extractedText;

    @Column(name = "summary", columnDefinition = "LONGTEXT")
    private String summary;

    @Column(name = "topics_json", columnDefinition = "LONGTEXT")
    private String topicsJson;

    @Column(name = "keywords_json", columnDefinition = "LONGTEXT")
    private String keywordsJson;

    @Column(name = "processing_error", columnDefinition = "LONGTEXT")
    private String processingError;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected Material() {}

    public Material(Long owner, String title, String name, String key, String mime, long size) {
        ownerId = owner;
        this.title = title;
        fileName = name;
        storageKey = key;
        mimeType = mime;
        fileSize = size;
        status = "UPLOADED";
    }

    public Long getId() { return id; }
    @com.fasterxml.jackson.annotation.JsonIgnore
    public String getExtractedText() { return extractedText; }
    public Long getOwnerId() { return ownerId; }
    public String getTitle() { return title; }
    public String getFileName() { return fileName; }
    public String getMimeType() { return mimeType; }
    String storageKey() { return storageKey; }
    public long getFileSize() { return fileSize; }
    public String getStatus() { return status; }
    public String getSummary() { return summary; }
    public String getTopicsJson() { return topicsJson; }
    public String getKeywordsJson() { return keywordsJson; }
    public String getProcessingError() { return processingError; }
    public Instant getCreatedAt() { return createdAt; }

    public void processing() { status = "PROCESSING"; }
    public void complete(String text, String summary, String topicsJson, String keywordsJson) {
        this.extractedText = text;
        this.summary = summary;
        this.topicsJson = topicsJson;
        this.keywordsJson = keywordsJson;
        this.status = "COMPLETED";
        this.processingError = null;
    }
    public void fail(String error) {
        this.status = "FAILED";
        this.processingError = error;
    }
}