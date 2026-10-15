# ChapterHaven - Production Dockerfile
FROM node:22-alpine

# Open Container Initiative (OCI) metadata labels
LABEL org.opencontainers.image.title="ChapterHaven"
LABEL org.opencontainers.image.description="Ultra-fast, text-only Manga, Manhwa, and Manhua chapter tracker"
LABEL org.opencontainers.image.url="https://github.com/Neoslyke/ChapterHaven"
LABEL org.opencontainers.image.source="https://github.com/Neoslyke/ChapterHaven"
LABEL org.opencontainers.image.licenses="GPL-3.0"

# Set working directory
WORKDIR /app

# Install production dependencies first for optimal layer caching
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy application source code and web assets
COPY src/ ./src/
COPY public/ ./public/

# Create and declare persistent data volume for SQLite database
RUN mkdir -p /app/data
VOLUME ["/app/data"]

# Default environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    BASE_PATH=/chapterhaven \
    DATA_DIR=/app/data

# Expose service port
EXPOSE 3000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start server
CMD ["node", "src/server.js"]
