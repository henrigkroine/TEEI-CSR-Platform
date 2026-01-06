---
status: canonical
last_verified: 2025-01-27
verified_against: "codebase-2025-01-27"
---

# CANONICAL DEPLOYMENT

> This is the ONLY authoritative document for deployment procedures.

## Overview

Deployment procedures for TEEI CSR Platform across local, staging, and production environments.

## Local Development

### Prerequisites
- Node.js 20+
- PNPM 8+
- Docker & Docker Compose

### Setup Steps

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Start infrastructure**
   ```bash
   docker compose up -d
   ```
   Starts PostgreSQL (5432), ClickHouse (8123), Redis (6379), NATS (4222)

3. **Run migrations**
   ```bash
   pnpm db:migrate
   ```

4. **Start all services**
   ```bash
   pnpm dev
   ```
   Starts all services concurrently on ports 3017-3026, 4017, 4327

### Verification
- API Gateway: http://localhost:3017/health
- Corp Cockpit: http://localhost:4327
- Check logs for errors

## Staging Deployment

### Pre-Deployment Checklist
- [ ] All tests passing (`pnpm test`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Staging database backup completed
- [ ] Secrets updated in staging environment

### Deployment Steps

1. **Run tests**
   ```bash
   pnpm test
   pnpm test:e2e
   ```

2. **Build all packages**
   ```bash
   pnpm build
   ```

3. **Run database migrations**
   ```bash
   pnpm db:migrate
   ```

4. **Deploy services** (manual or via CI/CD)
   - Deploy API Gateway (port 3017)
   - Deploy core services (3018-3026)
   - Deploy Reporting (4017)
   - Deploy Corp Cockpit (4327)

5. **Verify deployment**
   - Check health endpoints
   - Verify database connectivity
   - Test critical user flows
   - Monitor error logs

### Post-Deployment
- Monitor Grafana dashboards
- Check service logs
- Verify metrics collection
- Test API endpoints

## Production Deployment

### ⚠️ REQUIRES APPROVAL

**DO NOT deploy to production without explicit approval.**

### Pre-Deployment Requirements

1. **Backup First**
   ```bash
   # Database backup (MANDATORY)
   pg_dump $DATABASE_URL > backup-$(date +%Y%m%d-%H%M%S).sql
   ```

2. **Approval Checklist**
   - [ ] VP/CTO approval received
   - [ ] Database backup verified
   - [ ] Rollback plan documented
   - [ ] Deployment window scheduled
   - [ ] Stakeholders notified
   - [ ] Incident response team on standby

3. **Pre-Flight Checks**
   - [ ] All staging tests passed
   - [ ] Security scans passed
   - [ ] Performance tests passed
   - [ ] Documentation updated
   - [ ] Release notes prepared

### Deployment Steps

1. **Create backup** (MANDATORY)
   ```bash
   # Full database backup
   pg_dump $PROD_DATABASE_URL > prod-backup-$(date +%Y%m%d-%H%M%S).sql
   
   # Verify backup
   ls -lh prod-backup-*.sql
   ```

2. **Run migrations** (if any)
   ```bash
   # Review migrations first
   pnpm --filter @teei/shared-schema db:generate --dry-run
   
   # Apply migrations
   pnpm db:migrate
   ```

3. **Deploy services** (one at a time, verify each)
   - Start with API Gateway
   - Deploy core services
   - Deploy Reporting
   - Deploy Corp Cockpit last

4. **Verify deployment**
   - Health checks: All services UP
   - Smoke tests: Critical flows work
   - Metrics: No error spikes
   - Logs: No critical errors

### Rollback Plan

If deployment fails:

1. **Immediate rollback**
   ```bash
   # Revert to previous version
   kubectl rollout undo deployment/<service-name>
   ```

2. **Database rollback** (if migrations applied)
   ```bash
   # Restore from backup
   psql $PROD_DATABASE_URL < prod-backup-YYYYMMDD-HHMMSS.sql
   ```

3. **Verify rollback**
   - Services return to previous state
   - Database schema matches previous version
   - No data loss

### Post-Deployment

- Monitor for 24 hours
- Check error rates
- Verify metrics collection
- Review user feedback
- Document any issues

## Environment Variables

Required for all environments:
- `DATABASE_URL` - PostgreSQL connection string
- `CLICKHOUSE_URL` - ClickHouse connection string
- `REDIS_URL` - Redis connection string
- `NATS_URL` - NATS connection string
- `JWT_SECRET` - JWT signing secret
- `API_KEY` - Service API keys

## Service Ports

| Service | Port |
|---------|------|
| API Gateway | 3017 |
| Unified Profile | 3018 |
| Buddy Service | 3019 |
| Q2Q AI | 3021 |
| Safety Moderation | 3022 |
| Analytics | 3023 |
| Journey/NLQ/Notifications | 3024 |
| Impact-In | 3025 |
| Discord Bot | 3026 |
| Reporting | 4017 |
| Corp Cockpit | 4327 |
