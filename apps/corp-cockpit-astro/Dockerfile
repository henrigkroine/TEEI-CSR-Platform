# TEEI CSR Platform - Corporate Cockpit (Astro SSR)
# Multi-stage hardened Node.js 20 Alpine Dockerfile
# Security: Non-root user, minimal image size, health checks
# Ref: MULTI_AGENT_PLAN.md § D1.3 Containerization Specialist

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
COPY apps/corp-cockpit-astro/package.json ./apps/corp-cockpit-astro/

# Install dependencies only (no source code yet)
RUN pnpm install --frozen-lockfile --filter @teei/corp-cockpit-astro...

# ============================================================================
# Stage 2: Builder
# ============================================================================
FROM node:20-alpine AS builder

RUN npm install -g pnpm@8

WORKDIR /app

# Copy all dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/corp-cockpit-astro/node_modules ./apps/corp-cockpit-astro/node_modules
COPY --from=deps /app/packages ./packages

# Copy workspace configuration
COPY package.json pnpm-workspace.yaml ./

# Copy shared package source code (needed for building)
COPY packages ./packages

# Copy app source code
COPY apps/corp-cockpit-astro ./apps/corp-cockpit-astro

# Build shared packages first, then the app
RUN pnpm --filter @teei/corp-cockpit-astro^... build || true
WORKDIR /app/apps/corp-cockpit-astro
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

# Copy built application (Astro SSR output is in dist/)
COPY --from=builder --chown=nodejs:nodejs /app/apps/corp-cockpit-astro/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/corp-cockpit-astro/package.json ./
COPY --from=deps --chown=nodejs:nodejs /app/apps/corp-cockpit-astro/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=6509

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 6509

# Health check (Astro serves on /health if configured, otherwise root)
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:6509/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the Astro SSR server (Node adapter)
CMD ["node", "./dist/server/entry.mjs"]
