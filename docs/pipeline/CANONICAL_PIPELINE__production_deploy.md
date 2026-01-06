---
status: canonical
last_verified: 2025-01-27
---

# CANONICAL PIPELINE: Production Deployment

> This is the ONLY authoritative document for production deployment procedures.

## ⚠️ CRITICAL WARNING

**DO NOT deploy to production without explicit approval.**

**ALWAYS backup database before deploying.**

**HAVE rollback plan ready.**

## Pre-Deployment Requirements

### 1. Approval Checklist

- [ ] VP/CTO approval received (written confirmation)
- [ ] Deployment window scheduled
- [ ] Stakeholders notified
- [ ] Incident response team on standby
- [ ] Rollback plan documented and tested
- [ ] Database backup completed and verified

### 2. Pre-Flight Checks

- [ ] All tests passing in staging
- [ ] Staging deployment successful for 24+ hours
- [ ] Security scans passed (Trivy, Snyk)
- [ ] Performance tests passed
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Change request submitted (if required)

### 3. Backup Database (MANDATORY)

```bash
# Create full database backup
pg_dump $PROD_DATABASE_URL > prod-backup-$(date +%Y%m%d-%H%M%S).sql

# Verify backup file exists and has content
ls -lh prod-backup-*.sql

# Test backup integrity (optional but recommended)
pg_restore --list prod-backup-*.sql > /dev/null && echo "Backup valid" || echo "Backup invalid"

# Store backup in secure location
# Upload to S3/backup storage
aws s3 cp prod-backup-*.sql s3://teei-backups/production/
```

**Backup must be completed within 1 hour of deployment.**

## Deployment Steps

### 1. Final Verification

```bash
# Verify staging is stable
curl http://staging-api-gateway:3017/health

# Verify all services healthy in staging
# Check Grafana dashboards
# Review staging logs for errors
```

### 2. Review Migrations (if any)

```bash
# List pending migrations
psql $PROD_DATABASE_URL -c "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 10;"

# Generate migrations (if schema changed)
pnpm --filter @teei/shared-schema db:generate

# Review generated migration SQL
cat packages/shared-schema/src/migrations/*.sql

# Test migration on staging first
```

### 3. Apply Database Migrations

```bash
# Set production database URL
export DATABASE_URL=$PROD_DATABASE_URL

# Apply migrations
pnpm db:migrate

# Verify migrations applied
psql $PROD_DATABASE_URL -c "SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5;"
```

**If migration fails:**
- **STOP IMMEDIATELY**
- Do not proceed with service deployment
- Restore from backup
- Fix migration issue
- Retry in staging first

### 4. Deploy Services (One at a Time)

Deploy services in order, verifying each before proceeding:

#### 4.1 API Gateway (Port 3017)

```bash
# Deploy API Gateway
# (Use your deployment method)

# Wait 30 seconds
sleep 30

# Verify
curl https://api.teei.com/health
# Should return: {"status":"UP"}

# Check logs for errors
# Monitor for 2 minutes
```

#### 4.2 Core Services (Ports 3018-3026)

Deploy one service at a time:

```bash
# Unified Profile (3018)
# Deploy → Wait 30s → Verify health → Monitor 2min

# Buddy Service (3019)
# Deploy → Wait 30s → Verify health → Monitor 2min

# Q2Q AI (3021)
# Deploy → Wait 30s → Verify health → Monitor 2min

# Safety Moderation (3022)
# Deploy → Wait 30s → Verify health → Monitor 2min

# Analytics (3023)
# Deploy → Wait 30s → Verify health → Monitor 2min

# Journey/NLQ/Notifications (3024)
# Deploy → Wait 30s → Verify health → Monitor 2min

# Impact-In (3025)
# Deploy → Wait 30s → Verify health → Monitor 2min

# Discord Bot (3026)
# Deploy → Wait 30s → Verify logs → Monitor 2min
```

**After each service:**
- Verify health endpoint
- Check error logs
- Test critical functionality
- Monitor metrics

#### 4.3 Reporting (Port 4017)

```bash
# Deploy Reporting service
# Wait 30 seconds
sleep 30

# Verify
curl https://reporting.teei.com/health

# Test report generation
# Monitor for 2 minutes
```

#### 4.4 Corp Cockpit (Port 4327)

```bash
# Deploy Corp Cockpit (frontend)
# Wait 30 seconds
sleep 30

# Verify
curl https://cockpit.teei.com
# Should return HTML

# Test dashboard loads
# Monitor for 2 minutes
```

### 5. Post-Deployment Verification

#### 5.1 Health Checks (All Services)

```bash
# Verify all services healthy
curl https://api.teei.com/health
curl https://unified-profile.teei.com/health
curl https://buddy-service.teei.com/health
curl https://q2q-ai.teei.com/health
curl https://safety-moderation.teei.com/health
curl https://analytics.teei.com/health
curl https://journey.teei.com/health
curl https://impact-in.teei.com/health
curl https://reporting.teei.com/health
```

#### 5.2 Smoke Tests

Test critical user flows:
- User login/authentication
- Dashboard loads and displays data
- Report generation works
- Data ingestion functional
- API endpoints respond correctly

#### 5.3 Monitor Metrics

- Check Grafana dashboards
- Verify error rates (should be < 0.1%)
- Check response times (should be < 500ms p95)
- Monitor database connections
- Check external API calls

#### 5.4 Monitor Logs

```bash
# Check all service logs for errors
# Look for:
# - Connection errors
# - Authentication failures
# - Database errors
# - External API failures
# - High error rates
```

Monitor for **at least 15 minutes** after deployment.

## Rollback Plan

### When to Rollback

Rollback immediately if:
- Error rate > 1%
- Critical functionality broken
- Database errors
- Service crashes
- Data corruption detected

### Rollback Procedure

#### 1. Stop Deployment

```bash
# Stop deploying new services
# Keep existing services running if possible
```

#### 2. Revert Services

```bash
# Revert to previous version
# Use your deployment method to rollback

# Example with kubectl:
kubectl rollout undo deployment/api-gateway
kubectl rollout undo deployment/unified-profile
# ... repeat for all services
```

#### 3. Revert Database (if migrations applied)

```bash
# Restore from backup
psql $PROD_DATABASE_URL < prod-backup-YYYYMMDD-HHMMSS.sql

# Verify restore
psql $PROD_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
```

#### 4. Verify Rollback

- All services return to previous version
- Database schema matches previous version
- No data loss
- Services healthy
- Functionality restored

#### 5. Document Incident

- Record what went wrong
- Document rollback steps taken
- Create post-mortem
- Update deployment procedures

## Post-Deployment Monitoring

### First 24 Hours

- Monitor error rates hourly
- Check service health every 30 minutes
- Review user feedback
- Monitor performance metrics
- Check database performance

### First Week

- Daily health checks
- Weekly performance review
- User feedback collection
- Bug tracking
- Performance optimization

## Service Ports (Production)

| Service | Port | URL |
|---------|------|-----|
| API Gateway | 3017 | https://api.teei.com |
| Unified Profile | 3018 | https://unified-profile.teei.com |
| Buddy Service | 3019 | https://buddy-service.teei.com |
| Q2Q AI | 3021 | https://q2q-ai.teei.com |
| Safety Moderation | 3022 | https://safety-moderation.teei.com |
| Analytics | 3023 | https://analytics.teei.com |
| Journey/NLQ/Notifications | 3024 | https://journey.teei.com |
| Impact-In | 3025 | https://impact-in.teei.com |
| Discord Bot | 3026 | N/A (non-HTTP) |
| Reporting | 4017 | https://reporting.teei.com |
| Corp Cockpit | 4327 | https://cockpit.teei.com |

## Emergency Contacts

- **On-Call Engineer**: [Contact Info]
- **VP Engineering**: [Contact Info]
- **CTO**: [Contact Info]
- **Database Admin**: [Contact Info]

## Deployment Checklist

- [ ] Approval received
- [ ] Backup completed
- [ ] Migrations reviewed
- [ ] Services deployed
- [ ] Health checks passed
- [ ] Smoke tests passed
- [ ] Monitoring active
- [ ] Rollback plan ready
- [ ] Team notified
- [ ] Documentation updated
