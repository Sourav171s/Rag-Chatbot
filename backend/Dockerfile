# Build stage for backend workspace
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root manifests (workspace-aware)
COPY package.json package-lock.json ./

# Copy workspace manifests for better caching
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY common-ui/package.json ./common-ui/package.json

# Install all dependencies at the monorepo root
RUN npm ci --verbose

# Copy source code needed to build the backend
COPY backend ./backend

# Build only the backend workspace
RUN npm run build -w backend

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy root and backend package files
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json

# Install production dependencies only
RUN npm ci --omit=dev --verbose && npm cache clean --force

# Copy compiled backend from builder
COPY --from=builder /app/backend/dist ./backend/dist

# Copy docs directory for seeding
COPY backend/src/db/docs ./backend/dist/db/docs

# Copy startup script
COPY backend/start.sh ./backend/start.sh
RUN chmod +x ./backend/start.sh

# Set working directory to backend
WORKDIR /app/backend

# Expose the application port
EXPOSE 3001

# Start the application with migration
CMD ["./start.sh"]
