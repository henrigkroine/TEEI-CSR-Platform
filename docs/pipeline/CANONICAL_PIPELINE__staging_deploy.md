---
status: canonical
last_verified: 2025-01-27
---

# CANONICAL PIPELINE: Staging Deployment

> This is the ONLY authoritative document for staging deployment procedures.

## Overview

Staging deployment process for testing changes before production. Staging environment mirrors production configuration.

## Pre-Deployment Checklist

- [ ] All tests passing (`pnpm test`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Lint passes (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] E2E tests pass (`pnpm test:e2e`)
- [ ] Staging database backup completed
- [ ] Secrets updated in staging environment
- [ ] Code review approved
- [ ] PR merged to `main` branch

## Deployment Steps

### 1. Run Tests

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# All must pass before deployment
```

### 2. Build All Packages

```bash
pnpm build
```

This builds:
- All packages (`packages/*`)
- All services (`services/*`)
- All apps (`apps/*`)

**Verify build:**
```bash
# Check for build errors
# Verify build artifacts exist
ls -la packages/*/dist
ls -la services/*/dist
ls -la apps/*/dist
```

### 3. Run Database Migrations

```bash
# Set staging database URL
export DATABASE_URL="postgresql://user:pass@staging-db:5432/teei_csr"

# Generate migrations (if schema changed)
pnpm --filter @teei/shared-schema db:generate

# Review generated migrations
# Check migration files in packages/shared-schema/src/migrations/

# Apply migrations
pnpm db:migrate
```

**Verify migrations:**
```bash
# Check migration status
psql $DATABASE_URL -c "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

### 4. Deploy Services

Deploy services in order:

#### 4.1 API Gateway (Port 3017)

```bash
# Deploy API Gateway
# (Use your deployment method: kubectl, docker, PM2, etc.)

# Verify
curl http://staging-api-gateway:3017/health
```

#### 4.2 Core Services (Ports 3018-3026)

```bash
# Deploy Unified Profile (3018)
# Deploy Buddy Service (3019)
# Deploy Q2Q AI (3021)
# Deploy Safety Moderation (3022)
# Deploy Analytics (3023)
# Deploy Journey/NLQ/Notifications (3024)
# Deploy Impact-In (3025)
# Deploy Discord Bot (3026)

# Verify each service
curl http://staging-service:PORT/health
```

#### 4.3 Reporting (Port 4017)

```bash
# Deploy Reporting service
# Verify
curl http://staging-reporting:4017/health
```

#### 4.4 Corp Cockpit (Port 4327)

```bash
# Deploy Corp Cockpit (frontend)
# Verify
curl http://staging-cockpit:4327
# Should return HTML
```

### 5. Verify Deployment

#### 5.1 Health Checks

```bash
# Check all service health endpoints
curl http://staging-api-gateway:3017/health
curl http://staging-unified-profile:3018/health
curl http://staging-buddy-service:3019/health
curl http://staging-q2q-ai:3021/health
curl http://staging-safety-moderation:3022/health
curl http://staging-analytics:3023/health
curl http://staging-journey:3024/health
curl http://staging-impact-in:3025/health
curl http://staging-reporting:4017/health
```

All should return `{"status":"UP"}` or similar.

#### 5.2 Database Connectivity

```bash
# Verify services can connect to database
# Check service logs for connection errors
# Verify data can be read/written
```

#### 5.3 Critical User Flows

Test these flows:
- User login/authentication
- Dashboard loads
- Report generation
- Data ingestion
- API endpoints

#### 5.4 Monitor Logs

```bash
# Check service logs for errors
# Monitor for 5-10 minutes after deployment
# Look for:
# - Connection errors
# - Authentication failures
# - Database errors
# - External API failures
```

## Post-Deployment

### 1. Monitor Dashboards

- Check Grafana dashboards
- Verify metrics collection
- Check error rates
- Monitor response times

### 2. Verify Functionality

- Test critical features
- Verify data flows
- Check integrations
- Test user workflows

### 3. Document Issues

- Log any issues found
- Create tickets for bugs
- Update deployment notes

## Rollback Procedure

If deployment fails:

### 1. Stop Deployment

```bash
# Stop deploying new services
# Keep existing services running
```

### 2. Revert Code

```bash
# Revert to previous commit
git revert HEAD
# Or checkout previous version
git checkout <previous-commit>
```

### 3. Revert Database (if migrations applied)

```bash
# Restore from backup
psql $STAGING_DATABASE_URL < staging-backup-YYYYMMDD-HHMMSS.sql
```

### 4. Redeploy Previous Version

```bash
# Deploy previous version of services
# Follow deployment steps with previous code
```

## Service Ports (Staging)

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

## Troubleshooting

### Service Won't Start

1. Check service logs
2. Verify environment variables
3. Check database connectivity
4. Verify dependencies installed
5. Check port availability

### Database Migration Fails

1. Check migration SQL
2. Verify database permissions
3. Check for conflicting migrations
4. Review database logs
5. Restore from backup if needed

### Health Check Fails

1. Check service is running
2. Verify health endpoint exists
3. Check service logs
4. Verify dependencies (DB, Redis, NATS)
5. Check network connectivity
