# Smoke Tests

Quick health checks that verify critical system functionality after deployments.

## Overview

Smoke tests are **fast, shallow tests** that verify the system is basically working. They run in **<2 minutes** and cover:

- Service health endpoints
- API Gateway authentication
- Core reporting calculations
- Basic error handling

**Not covered** by smoke tests:
- Edge cases
- Complex workflows
- Load/performance testing
- UI interactions (use E2E tests)

## Philosophy

Smoke tests answer: **"Is the system basically working?"**

- ✅ All services responding
- ✅ Authentication works
- ✅ Core calculations work
- ✅ Database connectivity
- ✅ No critical errors

Think of smoke tests as a **post-deployment sanity check**.

## Test Suites

### 1. Health Checks

**File**: `health-checks.spec.ts`

**What it tests**:
- All service `/health` endpoints respond with 200
- Health response structure is correct
- Readiness probes work
- Metrics endpoints accessible

**Run**:
```bash
pnpm exec playwright test tests/smoke/health-checks.spec.ts
```

**Expected time**: <30 seconds

### 2. API Gateway

**File**: `api-gateway.spec.ts`

**What it tests**:
- API Gateway accessibility
- Authentication endpoint
- Unauthenticated requests blocked
- CORS headers
- Rate limiting configured
- Error responses well-formed
- Security headers present
- Response times acceptable

**Run**:
```bash
pnpm exec playwright test tests/smoke/api-gateway.spec.ts
```

**Expected time**: <60 seconds

### 3. Reporting Service

**File**: `reporting.spec.ts`

**What it tests**:
- SROI calculation works
- VIS calculation works
- Report listing
- Database connectivity
- Input validation
- Calculation performance
- Export functionality

**Run**:
```bash
pnpm exec playwright test tests/smoke/reporting.spec.ts
```

**Expected time**: <60 seconds

## Running Smoke Tests

### Run All Smoke Tests

```bash
pnpm test:smoke
```

Or manually:

```bash
pnpm exec playwright test tests/smoke/ --reporter=list
```

### Run Specific Suite

```bash
pnpm exec playwright test tests/smoke/health-checks.spec.ts
```

### Environment Variables

```bash
export BASE_URL=https://staging.teei-csr.com
export TEST_EMAIL=smoke-test@example.com
export TEST_PASSWORD=smoke-test-password
export TEST_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

pnpm test:smoke
```

## CI/CD Integration

Smoke tests run automatically:

1. **After deployment** - Verify deployment succeeded
2. **On schedule** - Hourly health check
3. **On demand** - Manual workflow trigger

See: `.github/workflows/deploy-production.yml`

```yaml
- name: Run smoke tests
  run: pnpm test:smoke
  env:
    BASE_URL: https://production.teei-csr.com
```

## When Smoke Tests Fail

### Deployment Failed

If smoke tests fail after deployment:

1. **Don't panic** - This is why we have smoke tests
2. **Check which test failed**:
   ```bash
   pnpm exec playwright test tests/smoke/ --reporter=list
   ```
3. **Review logs**:
   ```bash
   kubectl logs -n teei-csr -l app=<service> --tail=100
   ```
4. **Decide**: Fix forward or rollback?
   - **Rollback** if SEV-1 (complete outage)
   - **Fix forward** if SEV-2/3 (partial issue)

See: [Deployment Rollback Runbook](../../docs/pilot/runbooks/deployment_rollback.md)

### Service Unhealthy

If `health-checks.spec.ts` fails:

```bash
# Check which service is down
kubectl get pods -n teei-csr

# Check service logs
kubectl logs -n teei-csr <pod-name> --tail=50

# Check recent events
kubectl get events -n teei-csr --sort-by='.lastTimestamp' | head -20
```

### API Gateway Issues

If `api-gateway.spec.ts` fails:

```bash
# Check API Gateway pods
kubectl get pods -n teei-csr -l app=api-gateway

# Test health endpoint directly
curl https://api.teei-csr.com/health

# Check for recent deployments
kubectl rollout history deployment/api-gateway -n teei-csr
```

### Reporting Issues

If `reporting.spec.ts` fails:

```bash
# Check reporting service
kubectl get pods -n teei-csr -l app=reporting

# Test SROI calculation
curl -X POST https://api.teei-csr.com/api/reporting/sroi/calculate \
  -H "Content-Type: application/json" \
  -d '{"investment": 100000, "socialValue": 500000, "periodMonths": 12}'

# Check database connectivity
kubectl exec -it -n teei-csr <reporting-pod> -- nc -zv postgresql.teei-csr.svc.cluster.local 5432
```

## Adding New Smoke Tests

### Guidelines

1. **Keep it fast** - Each test should complete in <10 seconds
2. **Test critical paths only** - Don't test edge cases
3. **No complex setup** - Use existing test data
4. **Fail fast** - Don't retry on failure
5. **Clear error messages** - Make debugging easy

### Template

```typescript
import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:6509';

test.describe('Smoke: New Feature', () => {
  test.setTimeout(30000); // 30 seconds max

  test('Feature is accessible', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/new-feature/health`);
    expect(response.status()).toBe(200);
    console.log('[Smoke] ✓ New feature is accessible');
  });

  test('Basic functionality works', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/new-feature/action`, {
      data: { test: true },
      failOnStatusCode: false,
    });

    expect([200, 401]).toContain(response.status());
    console.log('[Smoke] ✓ New feature basic functionality works');
  });
});
```

## Smoke Test vs E2E Test

| Aspect | Smoke Test | E2E Test |
|--------|-----------|----------|
| **Purpose** | Verify system is alive | Verify full user workflows |
| **Speed** | <2 minutes | 10-30 minutes |
| **Depth** | Shallow (health checks) | Deep (complete flows) |
| **Scope** | Critical paths only | All features |
| **When** | After every deployment | Nightly, pre-release |
| **Failure** | Block deployment | Fix before release |

## Best Practices

1. **Run smoke tests first** - Before full E2E suite
2. **Keep them simple** - Don't test complex scenarios
3. **Monitor trends** - Track smoke test duration over time
4. **Update regularly** - When critical paths change
5. **Fail fast** - Don't wait for timeouts

## Smoke Test Schedule

- **Post-deployment**: Immediately after deploy completes
- **Hourly**: Verify production health
- **Pre-release**: Before cutting release tag
- **On-demand**: Manual trigger via GitHub Actions

## Metrics

Track smoke test metrics:

- **Pass rate**: % of smoke test runs that pass
- **Duration**: How long smoke tests take
- **MTTR**: Time from failure to fix
- **False positive rate**: % of failures that weren't real issues

**Goal**: >99% pass rate, <2 minute duration

## Troubleshooting

### Tests timing out

```bash
# Increase timeout
export PLAYWRIGHT_TIMEOUT=60000

pnpm test:smoke
```

### Can't connect to service

```bash
# Check BASE_URL is correct
echo $BASE_URL

# Test connectivity
curl -I $BASE_URL/health

# Check DNS resolution
nslookup api.teei-csr.com
```

### Authentication failures

```bash
# Verify test credentials
echo $TEST_EMAIL
echo $TEST_TOKEN

# Test login manually
curl -X POST https://api.teei-csr.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"'$TEST_EMAIL'","password":"'$TEST_PASSWORD'"}'
```

## Related Documentation

- [E2E Test Guide](../E2E_QUICK_REFERENCE.md)
- [Load Testing](../load/README.md)
- [Synthetic Monitoring](../../scripts/synthetics/README.md)
- [Incident Response](../../docs/pilot/runbooks/incident_response.md)
