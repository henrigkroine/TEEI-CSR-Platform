# TEEI CSR Platform - API Gateway
# Multi-stage hardened Node.js 20 Alpine Dockerfile
# Security: Non-root user, minimal image size, health checks
# Ref: MULTI_AGENT_PLAN.md § D1.1 Containerization Specialist

# ============================================================================
# Stage 1: Dependencies
# ============================================================================
FROM node:20-alpine AS deps

# Install pnpm globally
RUN apk add --no-cache libc6-compat && \
    npm install -g pnpm@8

WORKDIR /app

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files for all packages (for dependency resolution)
COPY packages/*/package.json ./packages/
COPY services/api-gateway/package.json ./services/api-gateway/

# Install dependencies only (no source code yet)
RUN pnpm install --frozen-lockfile --filter @teei/api-gateway...

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:20-alpine AS builder

RUN npm install -g pnpm@8

WORKDIR /app

# Copy all dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/api-gateway/node_modules ./services/api-gateway/node_modules
COPY --from=deps /app/packages ./packages

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml ./

# Copy shared package source code (needed for building)
COPY packages ./packages

# Copy service source code
COPY services/api-gateway ./services/api-gateway

# Build shared packages first, then the service
RUN pnpm --filter @teei/api-gateway^... build || true
WORKDIR /app/services/api-gateway
RUN pnpm build

# ============================================================================
# Stage 3: Production Runner
# ============================================================================
FROM node:20-alpine AS runner

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

WORKDIR /app

# Create non-root user
RUN addgroup -g 1000 -S nodejs && \
    adduser -S nodejs -u 1000 -G nodejs

# Copy built application and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/services/api-gateway/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/api-gateway/package.json ./
COPY --from=deps --chown=nodejs:nodejs /app/services/api-gateway/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production \
    PORT_API_GATEWAY=3000 \
    HOST=0.0.0.0

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["node", "dist/index.js"]
