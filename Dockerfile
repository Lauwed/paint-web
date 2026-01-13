# # ========================================
# # Optimized Multi-Stage Dockerfile
# # Paint Application
# # ========================================
FROM alpine:3.23
# Install dependencies
RUN apk add --update \
        nodejs       \
        npm          \
        build-base   \
        g++          \
        cairo-dev    \
        pango-dev    \
        giflib-dev

# Set working directory
WORKDIR /app

# Set environment
ENV NODE_ENV=development

# Copy packages
COPY package*.json ./

# Run clean install
RUN npm ci

# Copy source files
COPY . .

# Build application
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 5001

# Start development server
CMD ["node", "/app/index.js"]
