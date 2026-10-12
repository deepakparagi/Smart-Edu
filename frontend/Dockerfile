# Multi-stage build for Next.js frontend
FROM node:22-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY next.config.ts ./
COPY tsconfig.json ./
COPY postcss.config.mjs ./
COPY eslint.config.mjs ./

# Install dependencies
RUN npm ci

# Copy source files
COPY src ./src

# Build the application
RUN npm run build

# Runtime stage
FROM node:22-alpine AS runner
WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 -S appgroup && \
    adduser -u 1000 -S appuser -G appgroup

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Run the application
ENV NODE_ENV=production
CMD ["node", "server.js"]