# E2E Testing Quick Reference

## Common Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI (interactive mode)
pnpm test:e2e:ui

# Run in debug mode
pnpm test:e2e:debug

# Generate and view HTML report
pnpm test:e2e:report

# Run specific test file
pnpm exec playwright test tests/e2e/buddy-integration.spec.ts

# Run specific test by name
pnpm exec playwright test -g "should create buddy match"

# Run on specific browser
pnpm exec playwright test --project=firefox

# Update visual snapshots
pnpm exec playwright test --update-snapshots

# Run with trace
pnpm exec playwright test --trace on
```

## Test Runner Script

```bash
# Full suite
./scripts/run-e2e-tests.sh full chromium

# Quick smoke tests
./scripts/run-e2e-tests.sh quick chromium

# Visual regression only
./scripts/run-e2e-tests.sh visual chromium

# Integration tests only
./scripts/run-e2e-tests.sh integration chromium

# Webhook tests only
./scripts/run-e2e-tests.sh webhook chromium

# All browsers
./scripts/run-e2e-tests.sh full all
```

## Docker Commands

```bash
# Start E2E environment
docker-compose -f docker-compose.e2e.yml up -d

# Check service health
docker-compose -f docker-compose.e2e.yml ps

# View logs
docker-compose -f docker-compose.e2e.yml logs -f

# Stop and remove
docker-compose -f docker-compose.e2e.yml down

# Stop and remove with volumes (clean slate)
docker-compose -f docker-compose.e2e.yml down -v
```

## Environment Variables

```bash
export BUDDY_SYSTEM_URL="http://localhost:3001"
export CSR_PLATFORM_URL="http://localhost:4321"
export API_GATEWAY_URL="http://localhost:3017"
export BUDDY_CONNECTOR_URL="http://localhost:3025"
export BUDDY_WEBHOOK_SECRET="test-webhook-secret-buddy-e2e"
```

## Test Data Factory

```typescript
import { E2ETestDataFactory } from '../fixtures/e2e-data-factory';

const factory = new E2ETestDataFactory();

// Create user
const user = await factory.createTestUser({
  email: 'test@example.com',
  role: 'participant'
});

// Create buddy match
const matchId = await factory.createBuddyMatch(user1.id, user2.id);

// Create and attend event
const eventId = await factory.createAndAttendEvent({
  userId: user.id,
  category: 'workshop',
  title: 'Test Event'
});

// Complete skill session
const sessionId = await factory.completeSkillSession({
  skillId: 1,
  teacherId: user1.id,
  learnerId: user2.id,
  teacherRating: 5,
  learnerRating: 5
});

// Create complete user journey
const journey = await factory.createCompleteUserJourney(user.id);

// Cleanup
await factory.cleanup();
```

## API Clients

```typescript
import { BuddySystemAPI } from '../api-clients/buddy-system-api';
import { CSRPlatformAPI } from '../api-clients/csr-platform-api';

const buddyAPI = new BuddySystemAPI();
const csrAPI = new CSRPlatformAPI();

// Authenticate
await buddyAPI.authenticate('user@example.com', 'password');

// Wait for event
const event = await csrAPI.waitForEvent('buddy.match.created', {
  participantId: '123',
  timeout: 10000
});

// Get profile
const profile = await csrAPI.getUnifiedProfile('123');

// Get metrics
const metrics = await csrAPI.getMetrics({
  startDate: '2025-01-01',
  endDate: '2025-12-31'
});
```

## Helper Utilities

```typescript
import {
  waitForEvent,
  waitForMetricUpdate,
  waitForPageReady,
  waitForStableElement,
  takeScreenshot,
  getMetricValue,
  checkServiceHealth
} from '../utils/e2e-helpers';

// Wait for page ready
await waitForPageReady(page);

// Wait for metric update
await waitForMetricUpdate(page, '[data-widget="matches"]', 5);

// Wait for stable element (animations done)
await waitForStableElement(page, '.chart');

// Take screenshot
await takeScreenshot(page, 'dashboard');

// Get metric value
const value = await getMetricValue(page, '[data-widget="matches"]');

// Check service health
const healthy = await checkServiceHealth('http://localhost:3017');
```

## Webhook Helpers

```typescript
import {
  generateWebhookSignature,
  generateExpiredWebhookSignature,
  createWebhookPayload
} from '../utils/webhook-helpers';

// Generate signature
const signature = generateWebhookSignature(payload, secret);

// Create payload
const payload = createWebhookPayload('buddy.match.created', {
  matchId: '123',
  participantId: '1',
  buddyId: '2'
}, {
  correlationId: 'test-correlation-id'
});
```

## Visual Regression

```typescript
// Full page screenshot
await expect(page).toHaveScreenshot('page.png', {
  fullPage: true,
  animations: 'disabled'
});

// Element screenshot
await expect(element).toHaveScreenshot('widget.png', {
  animations: 'disabled'
});

// With tolerance
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 100
});
```

## Debugging

```bash
# Run with headed browser
pnpm exec playwright test --headed

# Run with slowmo
pnpm exec playwright test --headed --slow-mo=1000

# Run with inspector
pnpm exec playwright test --debug

# Generate trace
pnpm exec playwright test --trace on

# View trace
pnpm exec playwright show-trace trace.zip
```

## CI/CD

```bash
# Trigger workflow manually
gh workflow run e2e-tests.yml

# View workflow runs
gh run list --workflow=e2e-tests.yml

# View logs
gh run view [run-id] --log

# Download artifacts
gh run download [run-id]
```

## Troubleshooting

### Tests Timing Out
```typescript
// Increase timeout
test.setTimeout(60000);

// Or in playwright.config.ts
timeout: 60000
```

### Flaky Tests
```typescript
// Retry failed tests
test.describe.configure({ retries: 2 });

// Use proper waits
await page.waitForSelector('.element', { state: 'visible' });
await waitForStableElement(page, '.element');
```

### Services Not Ready
```bash
# Check logs
docker-compose -f docker-compose.e2e.yml logs [service]

# Restart service
docker-compose -f docker-compose.e2e.yml restart [service]

# Full reset
docker-compose -f docker-compose.e2e.yml down -v
docker-compose -f docker-compose.e2e.yml up -d
```

### Visual Diffs
```bash
# Update baselines
pnpm exec playwright test --update-snapshots

# View diffs
open test-results/[test-name]/[screenshot]-diff.png
```

## Performance

### Benchmarks
```typescript
const startTime = Date.now();
// ... test code ...
const duration = Date.now() - startTime;
expect(duration).toBeLessThan(3000); // 3 second SLA
```

### Load Testing
```typescript
// Create multiple operations in parallel
const promises = Array.from({ length: 50 }, (_, i) =>
  factory.createAndAttendEvent({ userId: user.id, title: `Event ${i}` })
);
await Promise.all(promises);
```

## Coverage

```bash
# View coverage report
open playwright-report/index.html

# View test results JSON
cat test-results/results.json | jq
```

## File Locations

- Test specs: `tests/e2e/*.spec.ts`
- Data factory: `tests/fixtures/e2e-data-factory.ts`
- API clients: `tests/api-clients/*.ts`
- Utilities: `tests/utils/*.ts`
- Config: `playwright.config.ts`
- Docker: `docker-compose.e2e.yml`
- CI/CD: `.github/workflows/e2e-tests.yml`
- Scripts: `scripts/run-e2e-tests.sh`

## Documentation

- Full docs: `D:\Dev\reports\TASK-A-18-e2e-testing.md`
- Test README: `tests/e2e/README.md`
- This file: `tests/E2E_QUICK_REFERENCE.md`
