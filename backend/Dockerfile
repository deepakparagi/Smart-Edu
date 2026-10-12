# Multi-stage build for Spring Boot backend
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Copy Maven files
COPY pom.xml .
COPY src ./src

# Build the application (skip tests for faster build)
RUN apk add --no-cache maven && mvn -B package -DskipTests

# Runtime stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

# Copy built jar from builder
COPY --from=builder /app/target/smart-study-api-*.jar app.jar

# Create uploads directory
RUN mkdir -p /data/uploads && chown -R appuser:appgroup /data

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "app.jar"]