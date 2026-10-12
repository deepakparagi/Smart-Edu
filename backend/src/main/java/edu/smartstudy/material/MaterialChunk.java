package edu.smartstudy.material;
import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "material_chunks")
public class MaterialChunk {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "material_id", nullable = false)
    private Long materialId;

    @Column(name = "chunk_ordinal", nullable = false)
    private int chunkOrdinal;

    @Column(name = "page_number")
    private Integer pageNumber;

    @Column(name = "heading", length = 500)
    private String heading;

    @Column(name = "text", columnDefinition = "LONGTEXT", nullable = false)
    private String text;

    @Column(name = "token_count", nullable = false)
    private int tokenCount = 0;

    @Column(name = "embedding", columnDefinition = "BLOB")
    private byte[] embedding;

    @Column(name = "created_at", insertable = false, updatable = false)
    private Instant createdAt;

    protected MaterialChunk() {}

    public MaterialChunk(Long materialId, int chunkOrdinal, Integer pageNumber, String heading,
                         String text, int tokenCount) {
        this.materialId = materialId;
        this.chunkOrdinal = chunkOrdinal;
        this.pageNumber = pageNumber;
        this.heading = heading;
        this.text = text;
        this.tokenCount = tokenCount;
    }

    public Long getId() { return id; }
    public Long getMaterialId() { return materialId; }
    public int getChunkOrdinal() { return chunkOrdinal; }
    public Integer getPageNumber() { return pageNumber; }
    public String getHeading() { return heading; }
    public String getText() { return text; }
    public int getTokenCount() { return tokenCount; }
    public byte[] getEmbedding() { return embedding; }
    public void setEmbedding(byte[] embedding) { this.embedding = embedding; }
    public Instant getCreatedAt() { return createdAt; }
}