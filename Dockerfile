# ========================================
# Optimized Multi-Stage Dockerfile
# Paint Application
# ========================================
FROM node:lts-trixie-slim AS base

RUN apt-get update && apt-get install -y \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev

# Set working directory
WORKDIR /app
# ========================================
# Build Dependencies Stage
# ========================================
FROM base AS build-deps

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci
# ========================================
# Development Stage
# ========================================
FROM build-deps AS development

# Set environment
ENV NODE_ENV=development \
    NPM_CONFIG_LOGLEVEL=warn

# Copy source files
COPY . /app

# Expose ports
EXPOSE 5001

# Start development server with watch
CMD ["bash", "-c", "npm run watch & npm run start & wait -n"]
