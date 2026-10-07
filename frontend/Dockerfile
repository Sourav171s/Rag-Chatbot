# Multi-stage build for React frontend
FROM node:20-alpine AS builder

# Set working directory at the monorepo root
WORKDIR /app

# Copy root package files (workspace-aware)
COPY package.json package-lock.json ./

# Copy workspace package manifests only (better layer caching)
COPY common-ui/package.json ./common-ui/package.json
COPY frontend/package.json ./frontend/package.json
# Also copy backend manifest so root install sees all declared workspaces
COPY backend/package.json ./backend/package.json

# Install all dependencies at the monorepo root
RUN npm ci --verbose

# Now copy the actual source code
COPY common-ui ./common-ui
COPY frontend ./frontend

# Build shared UI library first
RUN npm run build -w common-ui

# Build the frontend application
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build -w frontend

# Production stage - serve with nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
