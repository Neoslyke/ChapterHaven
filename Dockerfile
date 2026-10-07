# ChapterHaven - Dockerfile
FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application code
COPY src/ ./src/
COPY public/ ./public/

# Create data directory for SQLite database
RUN mkdir -p /app/data

# Default environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    BASE_PATH=/chapterhaven \
    DATA_DIR=/app/data \
    AUTH_ENABLED=true \
    AUTH_USER=admin \
    AUTH_PASS=chapterhaven123

# Expose port
EXPOSE 3000

# Health check to ensure the container is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start server
CMD ["node", "src/server.js"]
