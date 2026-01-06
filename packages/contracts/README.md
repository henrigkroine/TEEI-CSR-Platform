# Contract Testing Suite

> **Purpose:** Ensure API contracts between API Gateway and microservices remain stable and compatible.

## Overview

This package contains Pact-based contract tests that verify the communication contracts between the API Gateway (consumer) and backend microservices (providers).

## Why Contract Testing?

Contract testing ensures:
- **Breaking changes are caught early** - Before deployment
- **Services can evolve independently** - Without breaking consumers
- **Documentation stays current** - Contracts serve as executable specs
- **Integration confidence** - Without spinning up all services

## Test Coverage

### Current Contracts

1. **Gateway → Unified Profile Service**
   - `GET /v1/profile/:id` - Get user profile
   - `PUT /v1/profile/:id` - Update user profile
   - `POST /v1/profile/mapping` - Create external ID mapping

2. **Gateway → Q2Q AI Service**
   - `POST /v1/classify/text` - Classify text content
   - `GET /v1/taxonomy` - Get outcome dimensions

3. **Gateway → Safety & Moderation Service**
   - `POST /v1/screen/text` - Screen content for violations
   - `GET /v1/review-queue` - Get pending reviews

4. **Gateway → Reporting Service (Trust API - Evidence)**
   - `GET /trust/v1/evidence/:reportId` - Get evidence with citations
   - `POST /trust/v1/evidence/verify` - Verify citation integrity

5. **Gateway → Reporting Service (Trust API - Ledger)**
   - `GET /trust/v1/ledger/:reportId` - Get ledger entries
   - `POST /trust/v1/ledger/:reportId/append` - Append ledger entry
   - `GET /trust/v1/ledger/:reportId/verify` - Verify ledger chain

6. **Corp Cockpit → Reporting Service (Deck Export)**
   - `POST /deck/export` - Create export job
   - `GET /deck/export/jobs/:jobId` - Get job status
   - `GET /deck/export/download/:filename` - Download deck file

### Planned Contracts

- Gateway → Kintell Connector
- Gateway → Buddy Service
- Gateway → Upskilling Connector

## Running Tests

### Prerequisites

```bash
# Install dependencies
pnpm install
```

### Run All Contract Tests

```bash
# Run all Pact tests
pnpm test:pact

# Run in watch mode
pnpm test:watch
```

### Run Individual Tests

```bash
# Test Gateway → Profile contract
pnpm vitest gateway-to-profile.pact.test.ts

# Test Gateway → Q2Q contract
pnpm vitest gateway-to-q2q.pact.test.ts

# Test Gateway → Safety contract
pnpm vitest gateway-to-safety.pact.test.ts

# Test Trust API contracts (Evidence + Ledger)
pnpm pact:trust

# Test Deck Export API contract
pnpm pact:deck

# Run all contract tests
pnpm pact:all
```

## Generated Artifacts

Contract tests generate Pact files in `./pacts/` directory:

```
pacts/
├── api-gateway-unified-profile-service.json
├── api-gateway-q2q-ai-service.json
├── api-gateway-safety-moderation-service.json
├── api-gateway-reporting-service.json (Trust API - Evidence)
├── api-gateway-reporting-service-ledger.json (Trust API - Ledger)
└── corp-cockpit-reporting-service.json (Deck Export)
```

These JSON files contain:
- Consumer expectations
- Provider states
- Request/response examples
- Matching rules

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/contract-tests.yml
name: Contract Tests

on: [push, pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm --filter @teei/contracts test:pact
      - name: Publish Pacts
        if: github.ref == 'refs/heads/main'
        run: pnpm --filter @teei/contracts pact:publish
        env:
          PACT_BROKER_BASE_URL: ${{ secrets.PACT_BROKER_URL }}
```

## Provider Verification

Providers (microservices) should verify they satisfy consumer contracts:

### Example: Unified Profile Service

```typescript
// services/unified-profile/tests/pact.verify.test.ts
import { Verifier } from '@pact-foundation/pact';

describe('Unified Profile Service - Provider Verification', () => {
  it('should satisfy API Gateway contract', async () => {
    const verifier = new Verifier({
      provider: 'unified-profile-service',
      providerBaseUrl: 'http://localhost:3001',
      pactUrls: [
        path.resolve(__dirname, '../../../packages/contracts/pacts/api-gateway-unified-profile-service.json')
      ],
      providerVersion: '1.0.0',
      stateHandlers: {
        'user exists': async () => {
          // Setup: Create test user in database
        },
        'user does not exist': async () => {
          // Setup: Ensure user doesn't exist
        },
      },
    });

    await verifier.verifyProvider();
  });
});
```

## Contract States

### Provider States

Each interaction can specify a "state" that the provider must be in:

**Profile & User States:**
- `user exists` - Test user is present in database
- `user does not exist` - User ID is not in database

**Service Health States:**
- `service is available` - Service is running and healthy
- `taxonomy is available` - Q2Q taxonomy is loaded
- `reviews are pending` - Review queue has items

**Reporting States:**
- `company has outcome data for period` - Company has metrics data
- `company has insufficient outcome data` - Limited data available
- `reports have been generated` - Report generation history exists

**Trust API States:**
- `report exists with citations` - Report with valid citations
- `report exists without citations` - Report with no evidence
- `report does not exist` - Report ID not found
- `citations exist and are valid` - Citations pass integrity check
- `citation has been tampered with` - Citation failed integrity check
- `report has ledger entries` - Report has audit trail
- `report ledger has broken chain` - Ledger integrity violation detected
- `report ledger is valid` - Ledger chain is valid
- `report ledger does not exist` - No ledger found for report

**Deck Export States:**
- `company has metrics data` - Company has data for deck generation
- `company has annual metrics data` - Company has full year data
- `export job is pending` - Job created, not started
- `export job is in progress` - Job currently processing
- `export job is completed` - Job finished successfully
- `export job has failed` - Job failed with error
- `export job does not exist` - Job ID not found
- `deck file is available for download` - File ready for download

### State Handlers

Providers implement state handlers to set up test conditions:

```typescript
stateHandlers: {
  'user exists': async () => {
    await db.insert(users).values({
      id: '123e4567-e89b-12d3-a456-426614174000',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      role: 'apprentice',
    });
  },
}
```

## Best Practices

### 1. Test Happy Paths First

Focus on successful scenarios before edge cases.

### 2. Use Realistic Data

Match production-like UUIDs, timestamps, and values.

### 3. Don't Over-Specify

Only specify fields that matter for the contract. Use matchers for flexible validation:

```typescript
body: {
  id: Matchers.uuid(),
  createdAt: Matchers.iso8601DateTime(),
  firstName: Matchers.string('John'),
}
```

### 4. Keep Tests Independent

Each test should set up its own state and not depend on other tests.

### 5. Version Your Contracts

Tag Pact files with provider versions to track compatibility over time.

## Troubleshooting

### Mock Server Won't Start

```bash
# Check if port is already in use
lsof -i :8080

# Kill existing process
kill -9 <PID>
```

### Contract Verification Fails

1. Check provider service is running
2. Verify provider state handlers are implemented
3. Review Pact logs in `./logs/pact.log`
4. Ensure database is seeded correctly

### TypeScript Errors

```bash
# Regenerate types
pnpm tsc --noEmit
```

## Resources

- [Pact Documentation](https://docs.pact.io/)
- [Pact JS Guide](https://github.com/pact-foundation/pact-js)
- [Contract Testing Best Practices](https://docs.pact.io/getting_started/best_practices)

## Maintainers

**Platform Lead** - Phase B Hardening
**Contract Test Engineer** - Specialist implementation

---

Last updated: 2025-11-13
