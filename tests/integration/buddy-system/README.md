# Buddy System Integration Testing Suite

Quick reference guide for running integration tests.

## Quick Start

```bash
# 1. Start services
pnpm dev

# 2. Run all integration tests
./tests/integration/buddy-system/run-all-tests.sh

# 3. View results
open test-results/buddy-system/summary.html
```

## Test Suites

### 1. Event Flow Tests
Tests complete event journey from Buddy System to CSR Platform.

```bash
pnpm vitest run tests/integration/buddy-system/event-flow.test.ts
```

**Coverage:**
- Match creation → profile linking
- Skill share → VIS calculation
- Milestone → SROI calculation
- Event ordering and consistency

### 2. Webhook Delivery Tests
Tests webhook mechanisms, retry, and resilience.

```bash
pnpm vitest run tests/integration/buddy-system/webhook-delivery.test.ts
```

**Coverage:**
- Idempotency and replay prevention
- Retry logic with exponential backoff
- Dead Letter Queue handling
- Circuit breaker functionality

### 3. Data Validation Tests
Tests data integrity and schema compliance.

```bash
pnpm vitest run tests/integration/buddy-system/data-validation.test.ts
```

**Coverage:**
- Schema validation
- Data type checking
- Referential integrity
- SQL/XSS injection prevention

### 4. Calculation Accuracy Tests
Tests SROI and VIS calculation accuracy.

```bash
pnpm vitest run tests/integration/buddy-system/calculation-accuracy.test.ts
```

**Coverage:**
- VIS score calculations
- SROI calculations
- Weighted scoring
- Metric aggregation

### 5. Failure Injection Tests
Tests system resilience under failure conditions.

```bash
pnpm vitest run tests/integration/buddy-system/failure-injection.test.ts
```

**Coverage:**
- Database failures
- Network partitions
- Service crashes
- Resource exhaustion

## Load Testing

```bash
# Run all load tests
./tests/load/buddy-system/run-load-tests.sh

# Or run individual tests
k6 run --vus 100 --duration 5m tests/load/buddy-system/load-test.js
```

## Environment Variables

```bash
export BUDDY_CONNECTOR_URL=http://localhost:3010
export API_GATEWAY_URL=http://localhost:3000
export BUDDY_WEBHOOK_SECRET=your-secret
export DATABASE_URL=postgresql://user:pass@localhost:5432/db
```

## CI/CD Integration

Tests run automatically on:
- Push to main/develop
- Pull requests
- Daily at 2 AM (load tests)

## Performance Targets

| Metric | Target |
|--------|--------|
| Webhook acceptance | < 100ms |
| Event processing | < 2s |
| Success rate | > 99% |
| Response time p95 | < 500ms |
| Response time p99 | < 1000ms |

## Troubleshooting

**Services not running:**
```bash
pnpm dev
curl http://localhost:3010/v1/webhooks/health
```

**Database connection errors:**
```bash
pnpm --filter @teei/shared-schema db:migrate
```

**Signature validation failures:**
```bash
# Verify secret matches
echo $BUDDY_WEBHOOK_SECRET
```

## Documentation

Full documentation: `D:\Dev\reports\TASK-A-14-integration-testing.md`
