# Synthetic Monitoring

Synthetic monitoring probes that run every 5 minutes to verify critical functionality.

## Overview

Synthetics simulate real user behavior to detect issues before they impact users. Our synthetic suite covers:

1. **Uptime Probe** - Health checks for all services
2. **Login Flow** - Critical user authentication journey
3. **SSE Probe** - Real-time event streaming functionality

## Architecture

```
┌─────────────────────────────────────────────┐
│  GitHub Actions (scheduled every 5 min)     │
└─────────────┬───────────────────────────────┘
              │
              ├─► Uptime Probe (bash script)
              │   └─► Checks /health endpoints
              │
              ├─► Login Flow (Playwright)
              │   └─► Tests login → dashboard
              │
              └─► SSE Probe (Playwright)
                  └─► Verifies EventSource connection
```

## Synthetics

### 1. Uptime Probe

**Script**: `uptime-probe.sh`

Curl-based health checks for all services:

- API Gateway
- Reporting Service
- Impact Calculator
- Q2Q AI Service
- Analytics Service
- Journey Engine
- Notifications Service
- Unified Profile
- Corporate Cockpit UI
- Discord Bot

**Run locally**:
```bash
export BASE_URL=https://staging.teei-csr.com
./scripts/synthetics/uptime-probe.sh
```

**Expected output**:
```
Checking API Gateway... ✓ PASS (HTTP 200)
Checking Reporting Service... ✓ PASS (HTTP 200)
...
✓ All services healthy (0 failures)
```

### 2. Login Flow Synthetic

**Script**: `login-flow.spec.ts`

Playwright test that simulates a user logging in:

1. Navigate to `/login`
2. Enter credentials
3. Submit form
4. Verify redirect to dashboard
5. Verify dashboard content loaded
6. Take screenshot

**Run locally**:
```bash
export BASE_URL=https://staging.teei-csr.com
export SYNTHETIC_USERNAME=synthetic@teei-csr.com
export SYNTHETIC_PASSWORD=<password>

pnpm exec playwright test scripts/synthetics/login-flow.spec.ts
```

**What it checks**:
- Login page loads
- Form inputs are visible
- Authentication succeeds
- Dashboard loads with content
- No error messages displayed

### 3. SSE Probe Synthetic

**Script**: `sse-probe.spec.ts`

Playwright test that verifies real-time event streaming:

1. Login to application
2. Inject SSE event listener
3. Verify EventSource connection established
4. Monitor for events
5. Check connection readyState

**Run locally**:
```bash
export BASE_URL=https://staging.teei-csr.com
export SYNTHETIC_USERNAME=synthetic@teei-csr.com
export SYNTHETIC_PASSWORD=<password>

pnpm exec playwright test scripts/synthetics/sse-probe.spec.ts
```

**What it checks**:
- EventSource API available
- SSE connection established (readyState = OPEN)
- Connection remains stable
- No SSE errors

## Workflow Configuration

**File**: `.github/workflows/synthetics.yml`

**Schedule**: Every 5 minutes (`*/5 * * * *`)

**Environment variables** (configure in GitHub Secrets):

- `SYNTHETIC_BASE_URL` - Base URL to test (e.g., https://staging.teei-csr.com)
- `SYNTHETIC_USERNAME` - Test account username
- `SYNTHETIC_PASSWORD` - Test account password
- `DISCORD_WEBHOOK_ALERTS` - Discord webhook for failure alerts

## Alerting

When a synthetic fails:

1. Test failure is recorded in GitHub Actions
2. Failure screenshots uploaded as artifacts (7-day retention)
3. Discord alert sent to on-call team
4. Status page updated (via statuspage-exporter)

## Troubleshooting

### Uptime probe fails

1. Check service logs: `kubectl logs -n teei-csr <pod>`
2. Verify health endpoint: `curl https://staging.teei-csr.com/api/health`
3. Check database connectivity
4. Review recent deployments

### Login flow fails

1. Check screenshots in GitHub Actions artifacts
2. Verify SSO/SAML configuration
3. Test manual login
4. Check session service logs

### SSE probe fails

1. Verify SSE endpoint is enabled: `curl -H "Accept: text/event-stream" https://staging.teei-csr.com/api/events/stream`
2. Check NGINX/load balancer timeout settings
3. Verify EventSource implementation in frontend
4. Review SSE service logs

## Best Practices

1. **Keep tests fast** - Synthetics should complete in <30 seconds
2. **Use dedicated test account** - Don't use real user accounts
3. **Monitor false positives** - Adjust timeouts if tests are flaky
4. **Review regularly** - Update synthetics as features evolve
5. **Screenshot on failure** - Always capture visual evidence

## Metrics

Track these synthetic metrics:

- **Uptime %** - Percentage of successful uptime checks
- **Login success rate** - Percentage of successful login flows
- **SSE availability** - Percentage of successful SSE connections
- **Response time** - Average time for synthetics to complete

## Maintenance

- **Weekly**: Review failure trends
- **Monthly**: Update synthetic credentials
- **Quarterly**: Add synthetics for new critical features

## Related Documentation

- [On-Call Runbook](../../docs/pilot/oncall.md)
- [Status Page Configuration](../../docs/pilot/status_page.md)
- [Incident Response](../../docs/pilot/runbooks/incident_response.md)
