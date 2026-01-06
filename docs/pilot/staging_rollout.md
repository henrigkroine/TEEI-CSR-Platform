# Staging Deployment Playbook - Phase C Pilot

## Overview

This playbook provides step-by-step instructions for deploying the Phase C Corporate Cockpit to the staging environment. The pilot-ready cockpit includes multi-tenant routing, RBAC, admin console, and foundation for evidence explorer and generative reporting.

**Target Environment**: Staging (pre-production)
**Deployment Method**: Manual deployment with verification steps
**Rollback Strategy**: Database snapshot + git revert

---

## Prerequisites

### 1. Access Requirements

- [ ] SSH access to staging server
- [ ] Database admin credentials
- [ ] GitHub repository access with deploy key
- [ ] Environment variables documented (see [environment_vars.md](./environment_vars.md))
- [ ] Staging domain DNS configured

### 2. Pre-Deployment Checklist

- [ ] All tests passing in CI (`pnpm test`)
- [ ] Build succeeds locally (`pnpm build`)
- [ ] Database migrations tested locally
- [ ] Environment variables reviewed and updated
- [ ] Rollback plan documented
- [ ] Stakeholders notified of deployment window

### 3. Required Tools

```bash
# Verify tools are installed
node --version   # v20.x or higher
pnpm --version   # v8.x or higher
git --version    # v2.x or higher
psql --version   # PostgreSQL 15.x
```

---

## Deployment Steps

### Step 1: Database Backup

**⚠️ CRITICAL: Always backup before deployment**

```bash
# SSH into staging server
ssh deploy@staging.teei-platform.com

# Create timestamped backup
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U teei_admin -d teei_cockpit_staging \
  -F c -f /backups/teei_cockpit_${BACKUP_DATE}.dump

# Verify backup created
ls -lh /backups/teei_cockpit_${BACKUP_DATE}.dump

# Store backup location for rollback
echo $BACKUP_DATE > /tmp/last_backup_timestamp
```

**Verification**:
- ✅ Backup file exists
- ✅ File size > 10MB (sanity check)
- ✅ Backup timestamp recorded

---

### Step 2: Pull Latest Code

```bash
# Navigate to application directory
cd /var/www/teei-platform

# Fetch latest changes
git fetch origin

# Checkout Phase C branch
git checkout claude/phaseC-pilot-cockpit-011CV5r3NpNKmcL6WnSQbDVZ

# Pull latest commits
git pull origin claude/phaseC-pilot-cockpit-011CV5r3NpNKmcL6WnSQbDVZ

# Verify commit hash (should match CI)
git log -1 --oneline
```

**Verification**:
- ✅ On correct branch
- ✅ Commit hash matches expected deployment
- ✅ No merge conflicts

---

### Step 3: Install Dependencies

```bash
# Install/update dependencies
pnpm install --frozen-lockfile

# Verify no vulnerabilities
pnpm audit

# Build applications
pnpm -w build
```

**Verification**:
- ✅ No install errors
- ✅ No critical vulnerabilities
- ✅ Build completes without errors

---

### Step 4: Run Database Migrations

**See [migration_runbook.md](./migration_runbook.md) for detailed migration procedures**

```bash
# Navigate to reporting service
cd services/reporting

# Check migration status
pnpm db:status

# Run pending migrations
pnpm db:migrate

# Verify migration success
pnpm db:status
```

**Verification**:
- ✅ All migrations applied
- ✅ No migration errors
- ✅ Schema version matches expected

**Phase C Migrations to Apply**:
- `001_add_tenant_routing.sql` - Multi-tenant route support
- `002_add_rbac_roles.sql` - SUPER_ADMIN, ADMIN, MANAGER, VIEWER roles
- `003_add_api_keys_table.sql` - API key management
- `004_add_audit_log_table.sql` - Admin action tracking
- `005_add_weight_overrides_table.sql` - SROI/VIS weight customization
- `006_add_integration_configs_table.sql` - Impact-In platform toggles

---

### Step 5: Update Environment Variables

**⚠️ Do not skip this step - required for Phase C features**

```bash
# Edit environment file
sudo nano /etc/teei-platform/cockpit.env

# Add new Phase C variables (see environment_vars.md)
# - ADMIN_CONSOLE_ENABLED=true
# - RBAC_ENFORCE_STRICT=true
# - TENANT_ROUTING_ENABLED=true
# - API_KEY_ENCRYPTION_KEY=<secret>
# - AUDIT_LOG_RETENTION_DAYS=90

# Reload environment
sudo systemctl reload teei-cockpit
```

**Verification**:
- ✅ All required variables set
- ✅ No secrets in version control
- ✅ Service reloaded successfully

---

### Step 6: Restart Services

```bash
# Restart Astro application
sudo systemctl restart teei-cockpit-astro

# Restart reporting service
sudo systemctl restart teei-reporting-service

# Restart Discord bot (if Impact-In enabled)
sudo systemctl restart teei-discord-bot

# Check service status
sudo systemctl status teei-cockpit-astro
sudo systemctl status teei-reporting-service
sudo systemctl status teei-discord-bot
```

**Verification**:
- ✅ All services active and running
- ✅ No error logs in journalctl
- ✅ Processes listening on expected ports

---

### Step 7: Health Checks

```bash
# Check application health endpoints
curl -f https://staging.teei-platform.com/health || echo "Health check failed"

# Check reporting service
curl -f https://staging.teei-platform.com/api/health || echo "API health check failed"

# Check database connectivity
psql -h localhost -U teei_admin -d teei_cockpit_staging -c "SELECT 1;"

# Check logs for errors
sudo journalctl -u teei-cockpit-astro -n 50 --no-pager
sudo journalctl -u teei-reporting-service -n 50 --no-pager
```

**Verification**:
- ✅ Health endpoints return 200 OK
- ✅ Database connection successful
- ✅ No critical errors in logs

---

### Step 8: Smoke Tests

**Run manual smoke tests from [smoke_tests.md](./smoke_tests.md)**

Critical paths to test:

1. **Multi-Tenant Routing**:
   - [ ] Navigate to `/en/cockpit/test-company-123`
   - [ ] Verify tenant validation (should show 404 for invalid IDs)
   - [ ] Test cross-tenant access prevention

2. **RBAC System**:
   - [ ] Login as VIEWER - verify cannot access admin routes
   - [ ] Login as ADMIN - verify can access admin console
   - [ ] Test permission gates on widgets

3. **Admin Console**:
   - [ ] Access `/en/cockpit/test-company-123/admin`
   - [ ] Create API key
   - [ ] Toggle Impact-In integration
   - [ ] Modify SROI weights
   - [ ] View audit log

4. **Dashboard Functionality**:
   - [ ] Load main dashboard
   - [ ] Verify all widgets render
   - [ ] Test export functionality (if MANAGER+)

**Verification**:
- ✅ All smoke tests passing
- ✅ No JavaScript errors in browser console
- ✅ No 500 errors in server logs

---

### Step 9: Post-Deployment Monitoring

```bash
# Monitor logs in real-time for 10 minutes
sudo journalctl -u teei-cockpit-astro -f &
LOG_PID=$!

# Check error rate
sleep 600  # 10 minutes

# Stop log monitoring
kill $LOG_PID

# Check for errors
ERROR_COUNT=$(sudo journalctl -u teei-cockpit-astro --since "10 minutes ago" | grep -i error | wc -l)
echo "Error count in last 10 minutes: $ERROR_COUNT"

# Alert if errors > threshold
if [ $ERROR_COUNT -gt 10 ]; then
  echo "⚠️ High error rate detected - consider rollback"
fi
```

**Verification**:
- ✅ Error rate within acceptable limits (<5 errors/minute)
- ✅ No memory leaks (check `top` or `htop`)
- ✅ No connection pool exhaustion

---

### Step 10: Notification

```bash
# Notify stakeholders of successful deployment
# (Use your preferred notification method: Slack, email, etc.)

echo "✅ Phase C deployment to staging complete at $(date)"
echo "Branch: claude/phaseC-pilot-cockpit-011CV5r3NpNKmcL6WnSQbDVZ"
echo "Commit: $(git log -1 --oneline)"
echo "Backup: /backups/teei_cockpit_$(cat /tmp/last_backup_timestamp).dump"
```

---

## Rollback Procedure

**If deployment fails or critical issues arise**:

### Quick Rollback (Code Only)

```bash
# Revert to previous commit
git log -5 --oneline  # Find previous good commit
git checkout <previous-commit-hash>

# Rebuild and restart
pnpm install --frozen-lockfile
pnpm -w build
sudo systemctl restart teei-cockpit-astro
sudo systemctl restart teei-reporting-service
```

### Full Rollback (Code + Database)

```bash
# Restore database from backup
BACKUP_DATE=$(cat /tmp/last_backup_timestamp)
pg_restore -h localhost -U teei_admin -d teei_cockpit_staging \
  --clean --if-exists \
  /backups/teei_cockpit_${BACKUP_DATE}.dump

# Revert code (see above)

# Clear application caches
redis-cli FLUSHDB  # If using Redis

# Restart services
sudo systemctl restart teei-cockpit-astro
sudo systemctl restart teei-reporting-service
```

**Verification after rollback**:
- ✅ Application accessible
- ✅ Dashboard loads without errors
- ✅ Database queries working
- ✅ No data loss confirmed

---

## Troubleshooting

### Issue: Migration Failed

**Symptoms**: `pnpm db:migrate` exits with error

**Resolution**:
1. Check migration logs: `cat logs/migrations.log`
2. Verify database connectivity
3. Check for schema conflicts (existing tables)
4. If safe, rollback migration: `pnpm db:migrate:rollback`
5. Fix migration file and retry

### Issue: Service Won't Start

**Symptoms**: `systemctl status` shows failed

**Resolution**:
1. Check logs: `sudo journalctl -u teei-cockpit-astro -n 100`
2. Verify environment variables: `sudo systemctl show teei-cockpit-astro | grep Environment`
3. Check port conflicts: `sudo lsof -i :3000`
4. Verify file permissions: `ls -la /var/www/teei-platform`

### Issue: 403 Errors on Routes

**Symptoms**: Users see "Access Denied" on valid routes

**Resolution**:
1. Verify RBAC middleware is configured
2. Check user role in database: `SELECT id, role FROM users WHERE email='user@example.com';`
3. Review route permissions in `middleware/rbacGuard.ts`
4. Clear user sessions: `redis-cli DEL session:*`

### Issue: High Memory Usage

**Symptoms**: `htop` shows >80% memory usage

**Resolution**:
1. Restart services to clear memory
2. Check for memory leaks: `node --inspect dist/index.js`
3. Reduce worker processes if needed
4. Add swap space if physical RAM insufficient

---

## Success Criteria

Deployment is successful when:

- ✅ All services running without errors
- ✅ Health checks returning 200 OK
- ✅ Smoke tests passing
- ✅ Error rate < 5 errors/minute
- ✅ Response times < 500ms (P95)
- ✅ Database migrations applied
- ✅ User authentication working
- ✅ Admin console accessible to admins
- ✅ Multi-tenant routing enforced
- ✅ Audit logs recording actions

---

## Next Steps

After successful staging deployment:

1. **User Acceptance Testing (UAT)**:
   - Provide access to stakeholders
   - Collect feedback on new features
   - Log bugs in GitHub issues

2. **Performance Testing**:
   - Run load tests with realistic traffic
   - Monitor resource usage over 24 hours
   - Identify bottlenecks

3. **Security Audit**:
   - Review RBAC enforcement
   - Test tenant isolation
   - Verify API key security

4. **Production Deployment Planning**:
   - Schedule production deployment window
   - Prepare production rollout playbook
   - Coordinate with operations team

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Maintained By**: Worker 3 Tech Lead
**Review Frequency**: Before each deployment
