# Staging Rollout Playbook - Phase C Pilot

**Version**: 1.0
**Date**: 2025-11-13
**Owner**: Performance & Infrastructure Lead (Worker 3)
**Status**: 🚧 Planning Phase

---

## Overview

This playbook guides the deployment of the TEEI CSR Platform Corporate Cockpit to the staging environment for pilot validation. It covers infrastructure setup, environment configuration, feature flag management, tenant onboarding, and rollback procedures.

---

## Prerequisites

### Infrastructure (Worker 1 Coordination Required)

- [ ] Staging domain configured: `staging.teei-csr.example.com`
- [ ] SSL certificate provisioned (Let's Encrypt or managed certificate)
- [ ] DNS records updated (A/AAAA for domain)
- [ ] Cloud provider resources provisioned (compute, storage, database)
- [ ] PostgreSQL database instance (managed or containerized)
- [ ] NATS event bus deployed
- [ ] Redis cache deployed
- [ ] S3-compatible storage (MinIO or cloud storage)

### Environment Variables

**Required Secrets** (stored in secure vault, not committed):
```bash
# Database
DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/teei_csr_staging

# Event Bus
NATS_URL=nats://staging-nats.example.com:4222

# AI/ML
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# JWT
JWT_SECRET=<strong-random-secret-256-bit>
JWT_ISSUER=teei-csr-staging
JWT_EXPIRY=24h

# Email (for scheduled reports)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<sendgrid-api-key>
EMAIL_FROM=reports@teei-csr.example.com

# S3/Storage
S3_ENDPOINT=https://staging-minio.example.com
S3_ACCESS_KEY=<access-key>
S3_SECRET_KEY=<secret-key>
S3_BUCKET=teei-csr-staging

# Observability (Worker 1)
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com:4317
SENTRY_DSN=https://...@sentry.io/...

# Feature Flags
FEATURE_GEN_REPORTS=true
FEATURE_EVIDENCE_EXPLORER=true
FEATURE_SCHEDULED_EXPORTS=true
FEATURE_IMPACT_IN_MONITOR=true
FEATURE_SAVED_VIEWS=true
FEATURE_THEMING=true

# Security
DEMO_CREDENTIALS_ENABLED=false  # CRITICAL: Must be false in staging/prod
SSO_ENABLED=true  # If OIDC provider available (Worker 1)
SSO_ISSUER=https://sso.example.com
SSO_CLIENT_ID=teei-csr-staging
```

---

## Deployment Steps

### 1. Pre-Deployment Validation

**Run locally before deploying:**
```bash
# Type check all packages
pnpm typecheck

# Lint all packages
pnpm lint

# Run all tests
pnpm test

# Build all packages
pnpm build

# Verify Lighthouse budgets (local)
pnpm lighthouse:local
```

**Expected**: All checks pass, no errors.

---

### 2. Database Migration

**Run migrations against staging database:**
```bash
# Set staging DATABASE_URL
export DATABASE_URL=postgresql://user:pass@staging-db.example.com:5432/teei_csr_staging

# Run migrations (Drizzle)
pnpm -w db:migrate

# Verify schema
pnpm -w db:studio
```

**Validation**:
- [ ] All tables created successfully
- [ ] Indexes exist on foreign keys
- [ ] Extensions installed (uuid-ossp, pgcrypto, pgvector)

---

### 3. Tenant Onboarding

**Create initial pilot tenant(s):**
```sql
-- Insert pilot company
INSERT INTO companies (id, name, industry, country)
VALUES (
  gen_random_uuid(),
  'Pilot Corp Inc.',
  'Technology',
  'Norway'
)
RETURNING id;

-- Create company admin user
INSERT INTO users (id, email, role, first_name, last_name)
VALUES (
  gen_random_uuid(),
  'admin@pilotcorp.example.com',
  'company_user',
  'Admin',
  'User'
)
RETURNING id;

-- Link user to company
INSERT INTO company_users (company_id, user_id)
VALUES (
  '<company-uuid>',
  '<user-uuid>'
);
```

**Tenant Configuration**:
```sql
-- Create tenant theme (optional, default theme applies if not set)
INSERT INTO tenant_themes (company_id, logo_url, primary_color, secondary_color, theme_mode)
VALUES (
  '<company-uuid>',
  'https://staging-minio.example.com/logos/pilotcorp.png',
  '#0066CC',
  '#FF6600',
  'light'
);
```

---

### 4. Deploy Services

**Build and deploy backend services:**
```bash
# Build Docker images (or use CI/CD)
docker build -t teei-csr/api-gateway:staging -f services/api-gateway/Dockerfile .
docker build -t teei-csr/unified-profile:staging -f services/unified-profile/Dockerfile .
docker build -t teei-csr/reporting:staging -f services/reporting/Dockerfile .
# ... (all services)

# Push to container registry
docker push teei-csr/api-gateway:staging
docker push teei-csr/unified-profile:staging
docker push teei-csr/reporting:staging
# ... (all services)

# Deploy to Kubernetes/ECS/Cloud Run (Worker 1 manages this)
kubectl apply -f k8s/staging/
```

**Deploy frontend (Astro app):**
```bash
# Build Astro app
cd apps/corp-cockpit-astro
pnpm build

# Deploy to Vercel/Netlify/Cloud Run
# Option A: Vercel
vercel deploy --prod --env-file .env.staging

# Option B: Netlify
netlify deploy --prod --dir dist

# Option C: Static hosting (S3 + CloudFront)
aws s3 sync dist/ s3://staging-cockpit-bucket/
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

---

### 5. Feature Flag Configuration

**Enable pilot features via environment or database:**

**Option A: Environment Variables** (set in deployment config)
```bash
FEATURE_GEN_REPORTS=true
FEATURE_EVIDENCE_EXPLORER=true
FEATURE_SCHEDULED_EXPORTS=true
FEATURE_IMPACT_IN_MONITOR=true
FEATURE_SAVED_VIEWS=true
FEATURE_THEMING=true
```

**Option B: Database Flags** (dynamic toggling)
```sql
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_name VARCHAR(100) UNIQUE NOT NULL,
  enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feature_flags (feature_name, enabled) VALUES
  ('gen_reports', true),
  ('evidence_explorer', true),
  ('scheduled_exports', true),
  ('impact_in_monitor', true),
  ('saved_views', true),
  ('theming', true);
```

---

### 6. Observability Setup (Worker 1 Coordination)

**Configure OpenTelemetry:**
```bash
# Ensure OTEL_EXPORTER_OTLP_ENDPOINT is set
export OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.example.com:4317

# Verify traces are being sent
curl https://otel-collector.example.com:4317/v1/traces

# Verify web-vitals collection (frontend)
# Check browser console for web-vitals events
# Check OTel backend for LCP/INP/CLS metrics
```

**Set up Sentry (error tracking):**
```bash
export SENTRY_DSN=https://...@sentry.io/...

# Verify Sentry integration
# Trigger test error, check Sentry dashboard
```

---

### 7. Smoke Testing

**Run smoke tests against staging:**
```bash
# Set staging base URL
export API_BASE_URL=https://staging.teei-csr.example.com

# Health checks
curl https://staging.teei-csr.example.com/health
curl https://staging.teei-csr.example.com/health/all

# Auth flow (manual or Playwright)
pnpm test:e2e:staging
```

**Manual Smoke Tests**:
- [ ] Login with pilot company admin credentials
- [ ] Tenant selector displays correct company
- [ ] Dashboard loads with widgets
- [ ] "Generate Report" modal opens
- [ ] Evidence Explorer displays data
- [ ] PDF export works
- [ ] Scheduled report can be created
- [ ] Impact-In Monitor displays delivery history
- [ ] Theme editor allows logo upload
- [ ] Share link works (read-only, expires)

---

### 8. Performance Validation

**Run Lighthouse CI against staging:**
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --config lighthouserc.json

# Verify budgets
# - LCP ≤ 2.0s
# - INP ≤ 200ms
# - CLS ≤ 0.1
# - FCP ≤ 1.2s
# - TTI ≤ 3.5s
```

**Web-Vitals Collection**:
- [ ] Verify web-vitals are being sent to OTel
- [ ] Check Grafana/Datadog for LCP/INP/CLS metrics
- [ ] Ensure real-user monitoring (RUM) is active

---

### 9. Security Validation

**Security Checklist**:
- [ ] DEMO_CREDENTIALS_ENABLED=false (no test users)
- [ ] JWT tokens expire after 24 hours
- [ ] HTTPS enforced (no HTTP)
- [ ] CORS configured correctly (only staging domain)
- [ ] Rate limiting active (100 req/min per user)
- [ ] Tenant isolation tests pass (no cross-tenant data leaks)
- [ ] Share links expire after TTL
- [ ] AI API keys not exposed in frontend
- [ ] Secrets stored in secure vault (not env files in repo)

**Run security tests**:
```bash
pnpm test:security:staging
```

---

### 10. A11y Validation

**Run accessibility tests:**
```bash
# Automated a11y CI
pnpm test:a11y:staging

# Manual keyboard testing
# - Tab through all interactive elements
# - Ensure focus order is logical
# - Verify focus indicators are visible
# - Test with screen reader (NVDA/JAWS)
```

**A11y Checklist**:
- [ ] All interactive elements keyboard-accessible
- [ ] Focus order logical
- [ ] ARIA labels on all controls
- [ ] Contrast meets WCAG AA (4.5:1 for text)
- [ ] Target size ≥ 24×24px
- [ ] No horizontal scroll at 320px width
- [ ] Screen reader announces all content correctly

---

## Rollback Procedure

**If critical issues are discovered post-deployment:**

### 1. Immediate Rollback (Frontend)

**Revert to previous frontend build:**
```bash
# Vercel
vercel rollback <deployment-url>

# Netlify
netlify rollback

# Static hosting
aws s3 sync s3://staging-cockpit-bucket-backup/ s3://staging-cockpit-bucket/
aws cloudfront create-invalidation --distribution-id <dist-id> --paths "/*"
```

### 2. Disable Feature Flags

**Disable problematic features:**
```sql
UPDATE feature_flags
SET enabled = false
WHERE feature_name IN ('gen_reports', 'evidence_explorer', 'scheduled_exports');
```

### 3. Rollback Database Migrations

**Revert to previous schema version:**
```bash
# Drizzle rollback (manual)
# Restore database backup
pg_restore --dbname=teei_csr_staging --clean backup_file.dump
```

### 4. Notify Stakeholders

**Communication template:**
```
Subject: Staging Rollback - [DATE]

A critical issue was discovered in the staging deployment:
- Issue: [DESCRIPTION]
- Impact: [USER IMPACT]
- Rollback completed: [TIMESTAMP]
- Root cause: [INVESTIGATION STATUS]
- Next steps: [FIX TIMELINE]

The staging environment is now on the previous stable version.
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

**Performance**:
- LCP, INP, CLS (web-vitals)
- API response times (p50, p95, p99)
- Database query latency
- Event bus lag

**Errors**:
- 5xx errors (backend)
- JavaScript errors (frontend)
- Failed scheduled exports
- Failed email deliveries

**Business Metrics**:
- Tenant logins
- Gen-reports generated
- PDFs exported
- Evidence Explorer views
- Impact-In deliveries

**Alerts** (configure in monitoring tool):
- LCP > 2.0s (warning)
- 5xx rate > 1% (critical)
- Database connections > 80% (warning)
- Failed exports > 5 in 10 minutes (warning)

---

## Post-Deployment Validation

**24-Hour Checklist**:
- [ ] No critical errors in Sentry
- [ ] Web-vitals within budgets
- [ ] All scheduled reports fired successfully
- [ ] No tenant isolation bugs reported
- [ ] Performance metrics stable
- [ ] Pilot users can access dashboard

**1-Week Checklist**:
- [ ] User feedback collected
- [ ] Performance trends reviewed
- [ ] Error rates below threshold
- [ ] A11y audit completed
- [ ] Security audit completed
- [ ] Documentation updated with learnings

---

## Troubleshooting

### Common Issues

**Issue**: Frontend fails to load
- Check: CORS configuration
- Check: API Gateway health
- Check: Environment variables in frontend build

**Issue**: Gen-reports fail
- Check: AI API key validity
- Check: Token budget limits
- Check: Evidence API availability
- Check: Database connection

**Issue**: PDF exports timeout
- Check: Playwright/Puppeteer memory limits
- Check: Concurrent export limits
- Check: S3 upload bandwidth

**Issue**: Scheduled emails not firing
- Check: Cron job running
- Check: SMTP credentials
- Check: Email queue (Redis)
- Check: Delivery status logs

**Issue**: Tenant isolation bugs
- Check: Middleware tenant-scoping
- Check: JWT token claims
- Check: Database query filters
- Check: Security test results

---

## Contact & Escalation

**Worker 3 (Cockpit)**: [orchestrator@example.com]
**Worker 1 (Infrastructure)**: [infra@example.com]
**Worker 2 (Backend)**: [backend@example.com]

**Escalation Path**:
1. Check monitoring dashboards
2. Review logs (Sentry, OTel, CloudWatch)
3. Contact relevant worker lead
4. Escalate to platform owner if critical

---

## Appendix

### Environment-Specific URLs

| Environment | Cockpit URL | API Gateway | Database |
|-------------|-------------|-------------|----------|
| **Local** | http://localhost:4321 | http://localhost:3000 | localhost:5432 |
| **Staging** | https://staging.teei-csr.example.com | https://api-staging.teei-csr.example.com | staging-db.example.com:5432 |
| **Production** | https://teei-csr.example.com | https://api.teei-csr.example.com | prod-db.example.com:5432 |

### Useful Commands

```bash
# Check deployment status
kubectl get pods -n staging

# View logs
kubectl logs -n staging deployment/api-gateway --tail=100

# Restart service
kubectl rollout restart deployment/api-gateway -n staging

# Scale service
kubectl scale deployment/api-gateway --replicas=3 -n staging

# Database backup
pg_dump -h staging-db.example.com -U teei_user teei_csr_staging > backup.sql

# Database restore
psql -h staging-db.example.com -U teei_user teei_csr_staging < backup.sql
```

---

**Document Status**: 🚧 Planning Phase (to be updated during deployment)
**Last Updated**: 2025-11-13
**Owner**: Performance & Infrastructure Lead (Worker 3)
