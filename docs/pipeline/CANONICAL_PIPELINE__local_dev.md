---
status: canonical
last_verified: 2025-01-27
---

# CANONICAL PIPELINE: Local Development

> This is the ONLY authoritative document for local development setup and workflow.

## Prerequisites

- Node.js 20+
- PNPM 8+
- Docker Desktop (or Docker + Docker Compose)
- Git

## Step-by-Step Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd TEEI_CSR_Platform
```

### 2. Install Dependencies

```bash
pnpm install
```

This installs all dependencies for packages, services, and apps.

### 3. Start Infrastructure (Docker)

```bash
docker compose up -d
```

This starts:
- PostgreSQL on port 5432
- ClickHouse on port 8123
- Redis on port 6379
- NATS on port 4222

**Verify infrastructure:**
```bash
docker compose ps
```

All services should show "Up" status.

### 4. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your local settings
# Required: DATABASE_URL, CLICKHOUSE_URL, REDIS_URL, NATS_URL
```

### 5. Run Database Migrations

```bash
pnpm db:migrate
```

This applies all pending migrations to your local PostgreSQL database.

**Verify migrations:**
```bash
# Check migration status
pnpm --filter @teei/shared-schema db:studio
# Opens Drizzle Studio at http://localhost:4983
```

### 6. Start Development Servers

```bash
pnpm dev
```

This starts all services concurrently:
- API Gateway: http://localhost:3017
- Unified Profile: http://localhost:3018
- Buddy Service: http://localhost:3019
- Q2Q AI: http://localhost:3021
- Safety Moderation: http://localhost:3022
- Analytics: http://localhost:3023
- Journey/NLQ/Notifications: http://localhost:3024
- Impact-In: http://localhost:3025
- Discord Bot: http://localhost:3026 (no HTTP endpoint)
- Reporting: http://localhost:4017
- Corp Cockpit: http://localhost:4327

## Common Development Tasks

### Run Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# E2E tests
pnpm test:e2e

# Watch mode
pnpm test -- --watch
```

### Type Checking

```bash
pnpm typecheck
```

### Linting

```bash
# Check
pnpm lint

# Fix
pnpm lint:fix
```

### Build

```bash
# Build all
pnpm build

# Build specific package
pnpm --filter @teei/reporting build
```

### Database Operations

```bash
# Generate new migration
pnpm --filter @teei/shared-schema db:generate

# Run migrations
pnpm db:migrate

# Open Drizzle Studio
pnpm db:studio

# Seed database (dev only)
pnpm db:seed

# Reset database (dev only - DESTRUCTIVE)
pnpm db:reset
```

### View Logs

```bash
# All services (via concurrently)
# Logs appear in terminal where `pnpm dev` is running

# Specific service
pnpm --filter @teei/api-gateway dev
```

## Troubleshooting

### Port Already in Use

If a port is already in use:
1. Find process: `lsof -i :3017` (macOS/Linux) or `netstat -ano | findstr :3017` (Windows)
2. Kill process or change port in service config

### Database Connection Failed

1. Check Docker: `docker compose ps`
2. Verify DATABASE_URL in .env
3. Check PostgreSQL logs: `docker compose logs postgres`

### Migration Errors

1. Check migration files in `packages/shared-schema/src/migrations/`
2. Verify database state: `pnpm db:studio`
3. Reset if needed (dev only): `pnpm db:reset`

### Service Won't Start

1. Check service logs
2. Verify environment variables
3. Check dependencies: `pnpm install`
4. Verify Node.js version: `node --version` (must be 20+)

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm install` | Install dependencies |
| `docker compose up -d` | Start infrastructure |
| `pnpm db:migrate` | Run migrations |
| `pnpm dev` | Start all services |
| `pnpm test` | Run tests |
| `pnpm typecheck` | Type check |
| `pnpm lint` | Lint code |
| `pnpm build` | Build all |
