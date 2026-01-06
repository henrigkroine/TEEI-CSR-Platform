# TEEI CSR Platform - analytics
# Multi-stage hardened Node.js 20 Alpine Dockerfile
# Security: Non-root user, minimal image size, health checks
# Ref: MULTI_AGENT_PLAN.md § D1.2 Containerization Specialist

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
COPY services/analytics/package.json ./services/analytics/

# Install dependencies only (no source code yet)
RUN pnpm install --frozen-lockfile --filter @teei/analytics...

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:20-alpine AS builder

RUN npm install -g pnpm@8

WORKDIR /app

# Copy all dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/services/analytics/node_modules ./services/analytics/node_modules
COPY --from=deps /app/packages ./packages

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml ./

# Copy shared package source code (needed for building)
COPY packages ./packages

# Copy service source code
COPY services/analytics ./services/analytics

# Build shared packages first, then the service
RUN pnpm --filter @teei/analytics^... build || true
WORKDIR /app/services/analytics
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
COPY --from=builder --chown=nodejs:nodejs /app/services/analytics/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/services/analytics/package.json ./
COPY --from=deps --chown=nodejs:nodejs /app/services/analytics/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production \
    PORT=3007 \
    HOST=0.0.0.0

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["node", "dist/index.js"]
