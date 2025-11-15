# Production Launch Run-of-Show

**Document Owner**: incident-scribe
**Last Updated**: 2025-11-15
**Launch Target**: Week 0 - Pilot Go-Live
**Status**: Active Playbook

---

## Overview

This run-of-show playbook orchestrates the TEEI CSR Platform production launch, from T-minus 7 days through T+1 day post-launch. It provides a comprehensive checklist, timeline, communication plan, and rollback procedures.

### Launch Phases
1. **Pre-Launch Week** (T-7 to T-1 days): Hardening, rehearsals, stakeholder prep
2. **Launch Eve** (T-1 day): Final validations, deployment freeze
3. **Launch Hour** (T-1 hour to T+0): Go-live execution
4. **Post-Launch** (T+1 hour to T+24 hours): Monitoring, support, stabilization
5. **Week 1** (T+1 day to T+7 days): Adoption ramp, incident response

### Success Criteria
- ✅ All pre-launch checklist items green
- ✅ Zero P0/P1 incidents in first 24 hours
- ✅ ≥ 90% synthetic monitor uptime
- ✅ ≥ 3 pilot customers activated within 48 hours
- ✅ Mean time to first value (TTFV) ≤ 10 minutes

---

## T-Minus Timeline

### T-7 Days: Hardening Week

**Monday (T-7)**
- [ ] **CAB Review**: Final production changes approved
- [ ] **Deployment Freeze Begins**: Only critical hotfixes allowed
- [ ] **Security Scan**: OWASP ZAP, Snyk, npm audit all green
- [ ] **Dependency Audit**: All packages ≤ 6 months old, zero critical CVEs
- [ ] **Legal Review**: ToS, Privacy Policy, DPA finalized
- [ ] **Insurance Verification**: Cyber liability policy active

**Tuesday (T-6)**
- [ ] **Load Test Execution**: 2x expected pilot load for 4 hours
  - Target: 50 concurrent users, 500 API req/min
  - Pass criteria: P95 latency ≤ 500ms, zero errors
- [ ] **Chaos Engineering**: Terminate random pods, simulate DB failover
- [ ] **Backup Validation**: Restore staging DB from production backup
- [ ] **DR Runbook Test**: Execute disaster recovery playbook on staging

**Wednesday (T-5)**
- [ ] **E2E Test Suite**: Full regression (200+ tests) on production-like data
- [ ] **A11y Audit**: WCAG 2.2 AA compliance verified (axe-core, manual testing)
- [ ] **Browser Compatibility**: Test on Chrome, Firefox, Safari, Edge (latest 2 versions)
- [ ] **Mobile Responsiveness**: iPhone 12, Pixel 5, iPad Pro tested
- [ ] **Third-Party Integrations**: Validate Impact-In, Benevity, Goodera test accounts

**Thursday (T-4)**
- [ ] **Deployment Dry Run**: Full production deployment on staging
  - Validate deployment scripts, migration order, rollback procedure
  - Measure deployment duration (target: ≤ 30 mins)
- [ ] **Runbook Walkthrough**: On-call team rehearses incident response
- [ ] **Support Training**: Customer success completes help center certification
- [ ] **Communication Templates**: Finalize launch announcement, incident emails

**Friday (T-3)**
- [ ] **Pilot Customer Onboarding**: Pre-provision 5 pilot tenants
  - Create admin users, assign roles
  - Load sample CSR data (if applicable)
  - Send welcome emails with login credentials
- [ ] **Monitoring Dashboards**: Verify all Grafana dashboards populated
- [ ] **Alert Tuning**: Adjust PagerDuty thresholds to reduce noise
- [ ] **Status Page Setup**: StatusPage.io configured, subscribers imported

**Weekend (T-2, T-1)**
- [ ] **On-Call Handoff**: Primary + secondary on-call engineers briefed
- [ ] **Final Smoke Tests**: Manual QA on staging (all critical user journeys)
- [ ] **Leadership Briefing**: VP Engineering approves go-live (email confirmation)
- [ ] **War Room Setup**: Slack #launch-war-room channel created, Zoom link pinned

---

### T-1 Day: Launch Eve

**Sunday 6:00 PM UTC (T-18 hours)**

#### Infrastructure Checklist (30 mins)
- [ ] **DNS Records**: Verify production domain points to correct load balancer
  - `dig cockpit.teei.io` → production IP
  - TTL set to 300s for quick rollback
- [ ] **SSL Certificates**: Valid for ≥ 30 days, auto-renewal enabled
  - Check Let's Encrypt or DigiCert expiration
  - Verify intermediate certs in chain
- [ ] **CDN Configuration**: CloudFlare cache rules, origin headers correct
  - Purge all caches before go-live
  - Verify cache hit ratio ≥ 70% on staging
- [ ] **Database**: Production PostgreSQL healthy
  - Replication lag ≤ 5 seconds
  - Disk space ≥ 50% free
  - Connection pool tuned (max_connections = 200)
- [ ] **Redis Caches**: Eviction policy, memory limits configured
  - cockpit-cache: 4GB, allkeys-lru eviction
  - session-store: 2GB, noeviction
- [ ] **Object Storage**: S3 buckets, lifecycle policies, CORS rules
  - `teei-csr-exports`: 90-day retention
  - `teei-csr-uploads`: virus scanning enabled
- [ ] **Message Queue**: RabbitMQ or Kafka cluster ready
  - All exchanges, queues declared
  - Dead-letter queues configured
  - Publisher confirms enabled

#### Services Checklist (45 mins)
- [ ] **Backend Services Deployed**: All microservices at target versions
  - `reporting-api`: v2.5.0
  - `q2q-pipeline`: v1.8.2
  - `notification-service`: v1.3.1
  - `export-service`: v2.1.0
- [ ] **Health Checks Green**: `/health` endpoints return 200 OK
  - Check dependencies (DB, Redis, external APIs)
  - Verify circuit breakers in closed state
- [ ] **Feature Flags**: Review all flags in production
  - `cockpit-approvals`: enabled for pilot tenants only
  - `gen-reports-beta`: disabled (will enable T+7 days)
  - `audit-mode`: enabled globally
- [ ] **Environment Variables**: Secrets rotated, no hardcoded values
  - Database passwords updated within 7 days
  - API keys for Impact-In, OpenAI, Anthropic verified
- [ ] **Rate Limiting**: Configured per tenant tier
  - Free tier: 60 req/min
  - Pilot tier: 300 req/min
  - Enterprise tier: 1000 req/min
- [ ] **CORS & CSP**: Policies match production domains
  - `Access-Control-Allow-Origin`: `https://cockpit.teei.io`
  - CSP nonce-based, no `unsafe-inline`

#### Frontend Checklist (30 mins)
- [ ] **Astro 5 App Built**: Production build optimized
  - `pnpm -w build` completes without warnings
  - Bundle size ≤ 500KB (gzipped)
  - Lighthouse score ≥ 90 (Performance, A11y, Best Practices)
- [ ] **Static Assets**: Uploaded to CDN with SRI hashes
  - CSS, JS, fonts, images cache headers correct
  - Subresource Integrity tags in HTML
- [ ] **Service Worker**: PWA install prompt, offline cache primed
  - Cache strategy: Network-first for API, Cache-first for assets
  - Version bump triggers update prompt
- [ ] **Analytics Tags**: Google Analytics, Plausible, Hotjar configured
  - Cookie consent banner shown (GDPR compliance)
  - IP anonymization enabled

#### Monitoring & Observability (20 mins)
- [ ] **Synthetic Monitors**: Pingdom, Uptime Robot, Datadog synthetics
  - Check every 1 minute from 5 global locations
  - Alert if 2 consecutive failures
- [ ] **APM Tracing**: New Relic or Datadog APM enabled
  - Trace sample rate: 10% (adjust based on volume)
  - Service map shows all dependencies
- [ ] **Log Aggregation**: Logs streaming to Loki, Elasticsearch, or CloudWatch
  - Retention: 30 days
  - Error logs trigger alerts
- [ ] **RUM (Real User Monitoring)**: Web vitals instrumented
  - LCP, FID, CLS tracked per route
  - Budget alerts: LCP ≤ 2.5s, FID ≤ 100ms, CLS ≤ 0.1
- [ ] **PagerDuty**: Escalation policies, on-call schedules verified
  - Incident response SLA: 5 mins (P0), 15 mins (P1), 1 hour (P2)

#### Security & Compliance (15 mins)
- [ ] **Secrets Management**: Vault, AWS Secrets Manager, or Doppler
  - All secrets fetched at runtime, not baked into containers
  - Rotation policy: Every 90 days
- [ ] **Audit Logging**: Enabled for admin actions, data exports, DSAR
  - Immutable audit trail (WORM storage)
  - Retention: 7 years (GDPR requirement)
- [ ] **GDPR Readiness**: Cookie consent, privacy policy, DSAR endpoints
  - Data Processing Agreement signed with pilot customers
  - DPO contact info published
- [ ] **SOC 2 Controls**: Evidence collection for pilot period
  - Access logs, change logs, incident reports

#### Communication Prep (10 mins)
- [ ] **Stakeholder Email**: Draft sent to VP Engineering for approval
  - Subject: "TEEI CSR Platform Pilot Launch - T-1 Day Update"
  - Include: Go-live time, expected downtime (if any), support contact
- [ ] **Customer Success**: Onboarding emails scheduled (send at T+1 hour)
- [ ] **Status Page**: Pre-scheduled maintenance notice (if planned downtime)
- [ ] **Social Media**: LinkedIn post drafted (publish at T+24 hours)

**Sunday 9:00 PM UTC (T-15 hours): Go/No-Go Decision**

**Attendees**: VP Engineering, SRE Lead, Tech Lead, Product Owner, QA Lead

**Agenda** (15 mins):
1. Review pre-launch checklist completion (target: 100%)
2. Review open incidents and risks
3. Confirm on-call coverage (primary + secondary)
4. Vote: GO or NO-GO
5. If NO-GO: Define next checkpoint (e.g., T+24 hours)

**Decision Criteria**:
- ✅ All critical checklist items green
- ✅ Zero P0/P1 incidents in past 24 hours
- ✅ Load tests passed
- ✅ Rollback plan tested and documented
- ✅ On-call team ready

**Decision**: [GO / NO-GO]
**Signed by**: [VP Engineering Name], [Date/Time]

---

### T-1 Hour: Launch Countdown

**Monday 6:00 AM UTC (T-60 mins)**

#### Launch War Room
- **Platform**: Zoom (link pinned in Slack #launch-war-room)
- **Participants**:
  - SRE Lead (Launch Commander)
  - DevOps Engineer (Deployment Executor)
  - Backend Lead (Service Health Monitor)
  - Frontend Lead (UI Validation)
  - QA Lead (Smoke Tests)
  - Customer Success (Support Standby)
  - VP Engineering (Observer)

#### Deployment Sequence (30 mins)

**T-60 mins: Pre-Deployment**
- [ ] **Backup Database**: Create snapshot, verify size and status
  - `pg_dump` or RDS snapshot
  - Retention: 30 days
- [ ] **Enable Maintenance Mode**: Display banner to existing users (if any)
  - "Platform upgrade in progress. Back online at 7:00 AM UTC."
- [ ] **Notify Status Page**: Post "Scheduled Maintenance" update

**T-45 mins: Backend Deployment**
- [ ] **Deploy Microservices**: Rolling update, zero-downtime
  - Update container tags in Kubernetes manifests
  - Apply with `kubectl apply -k overlays/production`
  - Monitor pod readiness: `kubectl get pods -w`
- [ ] **Run Database Migrations**: Apply schema changes
  - `pnpm migrate:prod` (idempotent migrations)
  - Verify with `pnpm migrate:status`
- [ ] **Warm Caches**: Pre-populate Redis with tenant metadata
  - `curl -X POST /admin/cache/warm`

**T-30 mins: Frontend Deployment**
- [ ] **Upload Static Assets**: Sync to CDN with versioned paths
  - `aws s3 sync ./dist s3://teei-static/v2.5.0/`
  - Purge CDN cache: `curl -X POST https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache`
- [ ] **Update HTML**: Point to new asset versions
  - Swap origin in CDN to new S3 prefix
  - Verify asset loading with `curl -I`

**T-15 mins: Health Checks**
- [ ] **Service Health**: All `/health` endpoints green
- [ ] **Database Connectivity**: Connection pool saturated, no errors
- [ ] **External APIs**: Test Impact-In webhook delivery
- [ ] **Feature Flags**: Verify pilot tenant flags enabled

**T-10 mins: Smoke Tests**
- [ ] **Login Flow**: Admin user logs in successfully
- [ ] **Dashboard Load**: Cockpit renders metrics for pilot tenant
- [ ] **Report Generation**: Trigger Q2Q report, verify completion
- [ ] **Export Download**: Download CSV export, validate format
- [ ] **SSE Stream**: Connect to real-time updates, receive heartbeat

**T-5 mins: Final Checks**
- [ ] **Error Rates**: Zero 5xx errors in past 5 minutes
- [ ] **Latency**: P95 ≤ 500ms across all endpoints
- [ ] **Logs**: No CRITICAL or ERROR logs (except expected warnings)
- [ ] **Synthetic Monitors**: All green (5/5 locations)

**T-0 mins: GO LIVE**
- [ ] **Disable Maintenance Mode**: Remove banner
- [ ] **Status Page Update**: "All Systems Operational"
- [ ] **Announce in Slack**: "#launch-war-room: Platform is LIVE!"
- [ ] **Start Monitoring Sprint**: 1-hour intensive monitoring period

---

### T+0 to T+1 Hour: Launch Hour Monitoring

**Monitoring Focus**: Catch issues before users do

#### Real-Time Dashboards (Grafana)
1. **Request Volume**: Track req/min vs. baseline
   - Expected: 10-50 req/min (pilot load)
   - Alert if > 500 req/min (potential attack or scraper)
2. **Error Rates**: Track 4xx and 5xx errors
   - Target: ≤ 0.1% error rate
   - Alert if > 1% sustained for 2 minutes
3. **Latency**: P50, P95, P99 response times
   - Target: P95 ≤ 500ms
   - Alert if P95 > 1000ms sustained
4. **Database Performance**: Query times, connection pool usage
   - Target: Query P95 ≤ 100ms
   - Alert if connection pool > 80% utilized
5. **Cache Hit Ratio**: Redis cache effectiveness
   - Target: ≥ 70% hit ratio
   - Alert if < 50% (cache warming issue)

#### Health Check Frequency
- **First 15 mins**: Check dashboards every 2 minutes
- **15-60 mins**: Check dashboards every 5 minutes
- **After 60 mins**: Normal monitoring cadence (every 15 mins)

#### Incident Response Thresholds
| Severity | Condition | Response Time | Action |
|----------|-----------|---------------|--------|
| **P0** | Platform down (5xx > 50%) | 5 mins | Immediate rollback, page on-call |
| **P1** | Feature broken (e.g., login fails) | 15 mins | Investigate, consider rollback |
| **P2** | Performance degraded (P95 > 2s) | 30 mins | Investigate, scale if needed |
| **P3** | Minor bug (cosmetic, non-blocking) | 4 hours | Log issue, fix in next release |

---

### T+1 Hour to T+24 Hours: Stabilization

**T+1 Hour: First Checkpoint**
- [ ] **Metrics Review**: Compare to pre-launch baseline
  - Request volume, error rates, latency all within expected ranges
- [ ] **User Feedback**: Check Slack, email, support tickets
  - Expected: 0-2 support tickets in first hour
- [ ] **Send Onboarding Emails**: Welcome pilot customers
  - Include: Login link, getting started guide, support contact

**T+4 Hours: Mid-Day Checkpoint**
- [ ] **Pilot Customer Activation**: Track first logins
  - Target: ≥ 2 pilot customers logged in
- [ ] **TTFV (Time to First Value)**: Measure dashboard load times
  - Target: ≤ 10 minutes from login to first metric displayed
- [ ] **WAU (Weekly Active Users)**: Track unique logins
  - Seed data: 5 pilot users expected
- [ ] **Error Log Review**: Scan for unexpected errors
  - Filter: ERROR, CRITICAL, FATAL severity

**T+8 Hours: End-of-Day Checkpoint**
- [ ] **Incident Summary**: Document any issues encountered
  - If zero incidents: Celebrate!
  - If incidents: Triage and assign owners
- [ ] **Rollback Readiness**: Ensure rollback still viable
  - Database backup still fresh (< 24 hours old)
  - Previous service versions tagged and available
- [ ] **On-Call Handoff**: Brief next on-call shift
  - Share launch summary, open issues, watch points

**T+24 Hours: Day 1 Retrospective**
- [ ] **Launch Debrief** (30 mins, all war room participants)
  - What went well?
  - What could be improved?
  - Action items for next launch
- [ ] **Week 1 Priorities**: Define focus areas
  - E.g., adoption support, bug fixes, feature requests
- [ ] **Publish Launch Report**: Share with leadership
  - Metrics: Uptime, activation rate, TTFV, incidents
  - Wins and learnings

---

## Pre-Launch Checklist (60+ Items)

### Infrastructure (12 items)
- [ ] DNS records configured and verified
- [ ] SSL certificates valid and auto-renewing
- [ ] CDN caching rules optimized
- [ ] Load balancer health checks configured
- [ ] Database replication and backups tested
- [ ] Redis cache eviction policies set
- [ ] Object storage lifecycle policies configured
- [ ] Message queue exchanges and dead-letter queues created
- [ ] Kubernetes resource limits and requests tuned
- [ ] Auto-scaling policies configured (min: 2, max: 10 pods)
- [ ] Network policies and firewall rules applied
- [ ] VPC peering and private subnets configured

### Services (15 items)
- [ ] All microservices deployed at target versions
- [ ] Health check endpoints returning 200 OK
- [ ] Feature flags reviewed and configured
- [ ] Environment variables and secrets rotated
- [ ] Rate limiting configured per tenant tier
- [ ] CORS and CSP policies match production domains
- [ ] Circuit breakers configured (failure threshold: 5, timeout: 30s)
- [ ] Retry logic implemented (exponential backoff, max 3 retries)
- [ ] API versioning headers validated (`Accept: application/vnd.teei.v2+json`)
- [ ] Webhook endpoints registered with third-party systems
- [ ] Service mesh (Istio/Linkerd) traffic routing rules applied
- [ ] Graceful shutdown handlers implemented (SIGTERM handling)
- [ ] Connection pooling tuned (DB: 50 per service, Redis: 10)
- [ ] Request ID propagation verified (X-Request-ID header)
- [ ] Service dependencies documented (service map updated)

### Frontend (8 items)
- [ ] Production build completed without warnings
- [ ] Bundle size optimized (≤ 500KB gzipped)
- [ ] Lighthouse score ≥ 90 (Performance, A11y, Best Practices, SEO)
- [ ] Static assets uploaded to CDN with SRI hashes
- [ ] Service worker installed and offline cache primed
- [ ] Analytics tags configured (GA, Plausible, Hotjar)
- [ ] Cookie consent banner shown (GDPR compliance)
- [ ] Browser compatibility tested (Chrome, Firefox, Safari, Edge)

### Data & Migrations (5 items)
- [ ] Database migrations tested on staging with production-like data
- [ ] Migration rollback scripts tested
- [ ] Sample tenant data seeded (5 pilot tenants)
- [ ] Data validation queries pass (referential integrity, no orphans)
- [ ] Backup restoration tested (RTO: 1 hour, RPO: 5 minutes)

### Monitoring & Observability (10 items)
- [ ] Synthetic monitors configured (Pingdom, Uptime Robot, Datadog)
- [ ] APM tracing enabled (New Relic, Datadog, Honeycomb)
- [ ] Log aggregation streaming to centralized store (Loki, Elasticsearch)
- [ ] RUM (Real User Monitoring) instrumented (Web Vitals)
- [ ] PagerDuty escalation policies and schedules verified
- [ ] Grafana dashboards populated with production data
- [ ] Alert thresholds tuned (reduce false positives)
- [ ] Runbooks linked in PagerDuty alerts
- [ ] On-call rotation schedule published (2 weeks ahead)
- [ ] Status page configured and subscribers notified

### Security & Compliance (8 items)
- [ ] Security scan passed (OWASP ZAP, Snyk, npm audit)
- [ ] Secrets rotated within past 7 days
- [ ] Audit logging enabled for admin actions, exports, DSAR
- [ ] GDPR cookie consent and privacy policy published
- [ ] Data Processing Agreement signed with pilot customers
- [ ] SOC 2 evidence collection process documented
- [ ] Rate limiting and DDoS protection tested
- [ ] Vulnerability disclosure policy published (security.txt)

### Testing (12 items)
- [ ] Unit tests passing (≥ 80% code coverage)
- [ ] Integration tests passing (API contracts validated)
- [ ] E2E tests passing (200+ Playwright scenarios)
- [ ] Load tests passed (2x expected pilot load for 4 hours)
- [ ] Chaos engineering tests completed (pod failures, DB failover)
- [ ] A11y audit passed (WCAG 2.2 AA, axe-core + manual testing)
- [ ] Browser compatibility tested (latest 2 versions of major browsers)
- [ ] Mobile responsiveness tested (iPhone, Android, iPad)
- [ ] Third-party integrations validated (Impact-In, Benevity, Goodera)
- [ ] Smoke tests documented and rehearsed
- [ ] Rollback procedure tested on staging
- [ ] Deployment dry run completed (measure duration: target ≤ 30 mins)

### Communication & Documentation (10 items)
- [ ] Runbooks updated for production environment
- [ ] Incident response procedures documented
- [ ] Help center articles published (getting started, FAQs)
- [ ] API documentation updated (OpenAPI spec, Redoc)
- [ ] Customer success team trained
- [ ] Support ticket system configured (Zendesk, Intercom, Freshdesk)
- [ ] Launch announcement email drafted
- [ ] Status page pre-scheduled maintenance notice published
- [ ] Social media posts drafted (LinkedIn, Twitter)
- [ ] Leadership briefed and go-live approved (email confirmation)

---

## Launch Day Procedures

### War Room Protocol
- **Slack Channel**: #launch-war-room (create 24 hours before launch)
- **Zoom Link**: Pinned in channel (participants join at T-60 mins)
- **Roles**:
  - **Launch Commander** (SRE Lead): Calls the shots, makes go/no-go decisions
  - **Deployment Executor** (DevOps Engineer): Runs deployment scripts, monitors progress
  - **Service Monitor** (Backend Lead): Watches service health, logs, metrics
  - **UI Validator** (Frontend Lead): Tests frontend, validates smoke tests
  - **Test Lead** (QA Lead): Executes smoke test checklist
  - **Support Standby** (Customer Success): Monitors support channels, user feedback

### Communication Cadence
- **Every 15 mins**: Launch Commander posts status update in Slack
  - Format: "T+15 mins: All green. Req/min: 45, Error rate: 0%, Latency P95: 320ms"
- **Any issue**: Immediate Slack post + @channel mention
  - Format: "🚨 P1 ALERT: Login endpoint returning 500. Investigating."
- **Hourly**: Update status page (statuspage.io)
  - First hour: Post every 30 mins
  - After hour 1: Post if status changes

### Escalation Path
1. **Issue Detected**: Service Monitor or UI Validator notices anomaly
2. **Investigate** (5 mins): Check logs, metrics, recent changes
3. **Triage** (2 mins): Classify severity (P0, P1, P2, P3)
4. **Decision** (3 mins): Launch Commander decides:
   - **Fix Forward**: Deploy hotfix (if quick fix available)
   - **Rollback**: Revert to previous version
   - **Accept Risk**: Monitor and fix later (if low severity)
5. **Execute** (10-30 mins): DevOps executes decision
6. **Verify** (5 mins): QA Lead validates fix or rollback
7. **Communicate**: Update Slack, status page, affected users

---

## Post-Launch Activities

### T+24 Hours: Day 1 Summary Report

**Audience**: VP Engineering, Product Owner, CAB members

**Template**:

```markdown
# TEEI CSR Platform - Launch Day Summary

**Launch Date**: 2025-11-XX
**Launch Time**: 07:00 UTC
**Status**: [Success / Partial Success / Rollback]

## Metrics
- **Uptime**: 99.95% (5 mins downtime during deployment)
- **Pilot Activations**: 4 of 5 customers logged in (80%)
- **TTFV**: 8 minutes (avg time to first dashboard load)
- **Error Rate**: 0.02% (15 errors out of 75,000 requests)
- **Latency**: P95 = 420ms (target: ≤ 500ms)

## Incidents
- **P2-001**: Redis cache eviction caused slow dashboard loads (T+2 hours)
  - Resolution: Increased Redis memory from 2GB to 4GB
  - Duration: 15 mins

## Wins
- Zero P0/P1 incidents
- Deployment completed in 28 mins (under 30 min target)
- Positive feedback from 3 pilot customers

## Action Items
- [ ] Increase Redis memory in production runbook (Owner: SRE Lead, Due: T+48h)
- [ ] Add cache hit ratio alert (Owner: Backend Lead, Due: T+3 days)
- [ ] Schedule customer success check-in with 5th pilot customer (Owner: CS, Due: T+24h)

## Next Steps
- Continue intensive monitoring for T+7 days
- Weekly pilot report starting Week 1
- CAB retrospective scheduled for T+7 days
```

### T+7 Days: Week 1 Retrospective

**Attendees**: Launch war room participants + CAB

**Agenda** (45 mins):
1. **Metrics Review** (10 mins): Uptime, activation, TTFV, incidents
2. **Timeline Walkthrough** (15 mins): What happened when
3. **What Went Well** (5 mins): Celebrate wins
4. **What Could Improve** (10 mins): Identify gaps
5. **Action Items** (5 mins): Assign owners and due dates

**Retrospective Outputs**:
- Updated run-of-show playbook (this document)
- CAB criteria adjustments (if needed)
- Training needs for next launch (e.g., rollback drills)

---

## Rollback Plan

### Rollback Triggers
- P0 incident (platform down, data loss, security breach)
- Error rate > 5% sustained for 5 minutes
- P95 latency > 5 seconds sustained
- Critical feature broken (login, reports, exports)

### Rollback Procedure (20 mins)

**Step 1: Decision** (2 mins)
- Launch Commander calls rollback in Slack: "🔴 ROLLBACK INITIATED"
- Notify status page: "Investigating performance issues"

**Step 2: Revert Services** (10 mins)
- [ ] **Tag Previous Version**: `git tag rollback-v2.4.9`
- [ ] **Deploy Previous Containers**: Update Kubernetes manifests
  - `kubectl set image deployment/reporting-api reporting-api=teei/reporting-api:v2.4.9`
  - Repeat for all affected services
- [ ] **Wait for Rollout**: Monitor pod readiness
  - `kubectl rollout status deployment/reporting-api`

**Step 3: Revert Database** (5 mins)
- [ ] **Run Revert Migration**: Apply down migrations
  - `pnpm migrate:down --to=2025-11-14-10-00-00`
  - Verify with `pnpm migrate:status`
- [ ] **Validate Data Integrity**: Run validation queries

**Step 4: Revert Frontend** (3 mins)
- [ ] **Swap CDN Origin**: Point to previous S3 prefix
  - `aws s3 sync ./dist-rollback s3://teei-static/v2.4.9/`
  - Purge CDN cache

**Step 5: Verify Rollback** (5 mins)
- [ ] **Smoke Tests**: Run critical user journeys
- [ ] **Health Checks**: All services green
- [ ] **Metrics**: Error rate < 0.1%, latency normal

**Step 6: Communicate** (5 mins)
- [ ] **Slack Update**: "✅ ROLLBACK COMPLETE. Platform stable."
- [ ] **Status Page**: "Resolved: Service restored to previous version"
- [ ] **Postmortem Scheduled**: Within 24 hours

### Rollback Testing (Pre-Launch)
- [ ] **Staging Rollback Drill** (T-4 days): Deploy new version, rollback, verify
- [ ] **Database Revert Test** (T-3 days): Apply migrations, revert, validate data
- [ ] **Measure Rollback Duration**: Target ≤ 20 mins end-to-end

---

## Appendix A: Deployment Scripts

### 1. Full Production Deployment

```bash
#!/bin/bash
# deploy-production.sh
set -e

echo "🚀 Starting production deployment..."

# Step 1: Backup database
echo "📦 Creating database backup..."
kubectl exec -it postgres-0 -- pg_dump -U postgres teei_production > backup-$(date +%Y%m%d-%H%M%S).sql

# Step 2: Deploy backend services
echo "🔧 Deploying backend services..."
kubectl apply -k k8s/overlays/production/

# Step 3: Run migrations
echo "🗃️ Running database migrations..."
kubectl exec -it reporting-api-0 -- pnpm migrate:prod

# Step 4: Warm caches
echo "🔥 Warming caches..."
curl -X POST https://api.teei.io/admin/cache/warm -H "Authorization: Bearer $ADMIN_TOKEN"

# Step 5: Deploy frontend
echo "🎨 Deploying frontend..."
aws s3 sync ./apps/cockpit/dist s3://teei-static/v$(cat VERSION)/ --delete
aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"

# Step 6: Health checks
echo "🏥 Running health checks..."
curl https://api.teei.io/health | jq '.status' | grep -q "ok"

echo "✅ Deployment complete!"
```

### 2. Rollback Script

```bash
#!/bin/bash
# rollback-production.sh
set -e

PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
  echo "Usage: ./rollback-production.sh v2.4.9"
  exit 1
fi

echo "🔴 Rolling back to $PREVIOUS_VERSION..."

# Step 1: Revert services
echo "🔧 Reverting backend services..."
kubectl set image deployment/reporting-api reporting-api=teei/reporting-api:$PREVIOUS_VERSION
kubectl set image deployment/q2q-pipeline q2q-pipeline=teei/q2q-pipeline:$PREVIOUS_VERSION
kubectl set image deployment/notification-service notification-service=teei/notification-service:$PREVIOUS_VERSION

# Step 2: Revert migrations (manual step, operator must specify target)
echo "🗃️ MANUAL STEP: Run migration revert if needed"
echo "kubectl exec -it reporting-api-0 -- pnpm migrate:down --to=<TIMESTAMP>"

# Step 3: Revert frontend
echo "🎨 Reverting frontend..."
aws s3 sync ./releases/$PREVIOUS_VERSION/dist s3://teei-static/$PREVIOUS_VERSION/ --delete
aws cloudfront create-invalidation --distribution-id $CF_DIST_ID --paths "/*"

echo "✅ Rollback complete!"
```

---

## Appendix B: Smoke Test Checklist

**Executor**: QA Lead
**Duration**: 10 mins
**Environment**: Production
**Frequency**: After every deployment

### Critical User Journeys

1. **Authentication**
   - [ ] Admin login with email/password
   - [ ] SSO login (if enabled)
   - [ ] Password reset flow
   - [ ] Session timeout after 30 mins

2. **Dashboard**
   - [ ] Cockpit loads within 5 seconds
   - [ ] Metrics display (SROI, VIS, Impact Score)
   - [ ] Charts render without errors
   - [ ] Real-time updates via SSE

3. **Reports**
   - [ ] Generate Q2Q report
   - [ ] Download PDF export
   - [ ] Download CSV export
   - [ ] Scheduled report appears in queue

4. **Admin Functions**
   - [ ] Create new user
   - [ ] Assign role (Admin, Viewer, Editor)
   - [ ] Update tenant settings
   - [ ] View audit log

5. **Integrations**
   - [ ] Impact-In webhook receives payload
   - [ ] Discord bot posts message
   - [ ] Email notification sent

### Acceptance Criteria
- ✅ All 20 steps pass
- ✅ No JavaScript console errors
- ✅ No 5xx errors in server logs
- ✅ Latency ≤ 500ms for all API calls

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-15 | Initial run-of-show playbook | incident-scribe |

---

**End of Run-of-Show Playbook**

For questions or updates, contact: incident-scribe or SRE Lead
