# Multi-stage build for ML worker
FROM python:3.12-slim AS builder
WORKDIR /app

# Install system dependencies for PyMuPDF and Tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download embedding model if enabled
ARG EMBEDDINGS_ENABLED=false
ARG EMBEDDINGS_MODEL=sentence-transformers/all-MiniLM-L6-v2
RUN if [ "$EMBEDDINGS_ENABLED" = "true" ]; then \
    python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('$EMBEDDINGS_MODEL')"; \
    fi

# Runtime stage
FROM python:3.12-slim
WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgl1-mesa-glx \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN addgroup --gid 1000 --system appgroup && \
    adduser --uid 1000 --system --ingroup appgroup appuser

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY app ./app

# Switch to non-root user
USER appuser

# Expose port (only for internal network)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8000/ml/v1/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]