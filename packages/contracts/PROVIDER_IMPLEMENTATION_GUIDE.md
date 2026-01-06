# Provider Implementation Guide

**For**: Reporting Service Backend Engineers
**Purpose**: Implement endpoints that satisfy the Trust API and Deck Export contracts

---

## Quick Reference: Contract Requirements

### Trust API - Evidence Endpoints

#### 1. GET /trust/v1/evidence/:reportId

**Request**:
```http
GET /trust/v1/evidence/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer token
Accept: application/json
```

**Response** (200 OK):
```json
{
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "citations": [
    {
      "id": "cite-abc123",
      "snippetId": "snip-def456",
      "relevanceScore": 0.85,
      "snippetHash": "abc123def456...", // 64-char hex SHA-256
      "text": "150 young participants completed the program",
      "source": "kintell_sessions",
      "createdAt": "2024-11-14T10:30:00.000Z"
    }
  ],
  "evidenceCount": 42,
  "metadata": {
    "generatedAt": "2024-11-14T10:30:00.000Z",
    "version": "1.0.0"
  }
}
```

**Response** (404 Not Found):
```json
{
  "error": "Report not found",
  "reportId": "999e9999-e99b-99d9-a999-999999999999"
}
```

---

#### 2. POST /trust/v1/evidence/verify

**Request**:
```http
POST /trust/v1/evidence/verify
Authorization: Bearer token
Content-Type: application/json

{
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "citationIds": ["cite-abc123", "cite-def456"]
}
```

**Response** (200 OK - Valid):
```json
{
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "verified": true,
  "results": [
    {
      "citationId": "cite-abc123",
      "valid": true,
      "snippetHash": "abc123def456...",
      "matchesSource": true
    }
  ],
  "verifiedAt": "2024-11-14T10:30:00.000Z"
}
```

**Response** (200 OK - Tampered):
```json
{
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "verified": false,
  "results": [
    {
      "citationId": "cite-tampered",
      "valid": false,
      "snippetHash": "tampered123...",
      "matchesSource": false,
      "reason": "Hash mismatch detected"
    }
  ],
  "verifiedAt": "2024-11-14T10:30:00.000Z"
}
```

---

### Trust API - Ledger Endpoints

#### 3. GET /trust/v1/ledger/:reportId

**Request**:
```http
GET /trust/v1/ledger/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer token
Accept: application/json
```

**Response** (200 OK - Valid Chain):
```json
{
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "entries": [
    {
      "id": "entry-abc123",
      "eventType": "REPORT_GENERATED",
      "timestamp": "2024-11-14T10:30:00.000Z",
      "actor": "system",
      "metadata": {
        "modelName": "gpt-4-turbo",
        "promptVersion": "v2.1.0",
        "citationCount": 42
      },
      "hash": "abc123def456...", // 64-char hex SHA-256
      "previousHash": "0000000000000000000000000000000000000000000000000000000000000000"
    }
  ],
  "chainValid": true,
  "entryCount": 5
}
```

**Response** (200 OK - Broken Chain):
```json
{
  "reportId": "456e7890-e12b-34c5-d678-567890123456",
  "entries": [...],
  "chainValid": false,
  "entryCount": 3,
  "integrityViolation": {
    "detected": true,
    "entryId": "entry-tampered",
    "reason": "Hash chain broken at entry 2"
  }
}
```

**Response** (404 Not Found):
```json
{
  "error": "Ledger not found",
  "reportId": "999e9999-e99b-99d9-a999-999999999999"
}
```

---

#### 4. POST /trust/v1/ledger/:reportId/append

**Request**:
```http
POST /trust/v1/ledger/123e4567-e89b-12d3-a456-426614174000/append
Authorization: Bearer token
Content-Type: application/json

{
  "eventType": "REPORT_APPROVED",
  "actor": "user@example.com",
  "metadata": {
    "approverRole": "CSR_MANAGER",
    "comments": "Approved for publication"
  }
}
```

**Response** (201 Created):
```json
{
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "entry": {
    "id": "entry-new123",
    "eventType": "REPORT_APPROVED",
    "timestamp": "2024-11-14T10:35:00.000Z",
    "actor": "user@example.com",
    "metadata": {
      "approverRole": "CSR_MANAGER",
      "comments": "Approved for publication"
    },
    "hash": "newhash1234...",
    "previousHash": "prevhash1234..."
  },
  "chainValid": true
}
```

**Response** (409 Conflict - Broken Chain):
```json
{
  "error": "Cannot append to broken ledger chain",
  "reportId": "456e7890-e12b-34c5-d678-567890123456",
  "chainValid": false
}
```

---

#### 5. GET /trust/v1/ledger/:reportId/verify

**Request**:
```http
GET /trust/v1/ledger/123e4567-e89b-12d3-a456-426614174000/verify
Authorization: Bearer token
Accept: application/json
```

**Response** (200 OK):
```json
{
  "reportId": "123e4567-e89b-12d3-a456-426614174000",
  "chainValid": true,
  "entryCount": 5,
  "verifiedAt": "2024-11-14T10:30:00.000Z",
  "genesisHash": "0000000000000000000000000000000000000000000000000000000000000000",
  "headHash": "headhash1234..."
}
```

---

### Deck Export Endpoints

#### 6. POST /deck/export

**Request** (Quarterly):
```http
POST /deck/export
Authorization: Bearer token
Content-Type: application/json

{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "template": "quarterly",
  "periodStart": "2024-01-01T00:00:00.000Z",
  "periodEnd": "2024-03-31T23:59:59.999Z",
  "locale": "en"
}
```

**Request** (Annual with Options):
```http
POST /deck/export
Authorization: Bearer token
Content-Type: application/json

{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "template": "annual",
  "periodStart": "2024-01-01T00:00:00.000Z",
  "periodEnd": "2024-12-31T23:59:59.999Z",
  "locale": "en",
  "options": {
    "includeNarratives": true,
    "includeCharts": true,
    "watermark": true
  }
}
```

**Response** (202 Accepted):
```http
HTTP/1.1 202 Accepted
Content-Type: application/json
Location: /deck/export/jobs/job-abc123

{
  "jobId": "job-abc123",
  "status": "PENDING",
  "estimatedDuration": 10,
  "createdAt": "2024-11-14T10:30:00.000Z"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "template",
      "message": "Invalid template. Must be one of: quarterly, annual, investor-update, impact-deep-dive"
    }
  ]
}
```

**Valid Templates**:
- `quarterly`
- `annual`
- `investor-update`
- `impact-deep-dive`

**Valid Locales**:
- `en`, `es`, `fr`, `uk`, `no`

---

#### 7. GET /deck/export/jobs/:jobId

**Request**:
```http
GET /deck/export/jobs/job-abc123
Authorization: Bearer token
Accept: application/json
```

**Response** (Pending):
```json
{
  "jobId": "job-abc123",
  "status": "PENDING",
  "progress": 0,
  "createdAt": "2024-11-14T10:30:00.000Z",
  "updatedAt": "2024-11-14T10:30:00.000Z"
}
```

**Response** (In Progress):
```json
{
  "jobId": "job-def456",
  "status": "IN_PROGRESS",
  "progress": 45,
  "currentStep": "Generating charts",
  "createdAt": "2024-11-14T10:30:00.000Z",
  "updatedAt": "2024-11-14T10:31:30.000Z"
}
```

**Response** (Completed):
```json
{
  "jobId": "job-ghi789",
  "status": "COMPLETED",
  "progress": 100,
  "downloadUrl": "/deck/export/download/deck-quarterly-2024-Q1.pptx",
  "fileSize": 5242880,
  "createdAt": "2024-11-14T10:30:00.000Z",
  "updatedAt": "2024-11-14T10:32:00.000Z",
  "completedAt": "2024-11-14T10:32:00.000Z"
}
```

**Response** (Failed):
```json
{
  "jobId": "job-failed123",
  "status": "FAILED",
  "progress": 65,
  "error": {
    "code": "INSUFFICIENT_DATA",
    "message": "Insufficient metrics data for the selected period"
  },
  "createdAt": "2024-11-14T10:30:00.000Z",
  "updatedAt": "2024-11-14T10:31:45.000Z",
  "failedAt": "2024-11-14T10:31:45.000Z"
}
```

**Response** (404 Not Found):
```json
{
  "error": "Export job not found",
  "jobId": "job-nonexistent"
}
```

**Job Status Values**:
- `PENDING`
- `IN_PROGRESS`
- `COMPLETED`
- `FAILED`

---

#### 8. GET /deck/export/download/:filename

**Request**:
```http
GET /deck/export/download/deck-quarterly-2024-Q1.pptx
Authorization: Bearer token
```

**Response** (200 OK):
```http
HTTP/1.1 200 OK
Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation
Content-Disposition: attachment; filename="deck-quarterly-2024-Q1.pptx"
Content-Length: 5242880

[binary PPTX content]
```

---

## Implementation Checklist

### Trust API - Evidence
- [ ] Implement GET /trust/v1/evidence/:reportId
- [ ] Validate reportId is valid UUID
- [ ] Return citations with SHA-256 hashes
- [ ] Return 404 for non-existent reports
- [ ] Return empty array for reports without citations
- [ ] Implement POST /trust/v1/evidence/verify
- [ ] Verify citation integrity by comparing hashes
- [ ] Detect tampered citations
- [ ] Return verification results with reason for failures

### Trust API - Ledger
- [ ] Implement GET /trust/v1/ledger/:reportId
- [ ] Build ledger entries with hash chaining
- [ ] Validate chain integrity
- [ ] Detect broken chains and return integrityViolation
- [ ] Return 404 for non-existent ledgers
- [ ] Implement POST /trust/v1/ledger/:reportId/append
- [ ] Append new entries with proper hash chaining
- [ ] Reject appends to broken chains (409 Conflict)
- [ ] Implement GET /trust/v1/ledger/:reportId/verify
- [ ] Verify full chain from genesis to head

### Deck Export API
- [ ] Implement POST /deck/export
- [ ] Validate template (quarterly, annual, investor-update, impact-deep-dive)
- [ ] Validate locale (en, es, fr, uk, no)
- [ ] Create async job and return 202 with Location header
- [ ] Return 400 for invalid templates
- [ ] Implement GET /deck/export/jobs/:jobId
- [ ] Track job status (PENDING, IN_PROGRESS, COMPLETED, FAILED)
- [ ] Update progress percentage (0-100)
- [ ] Return currentStep for in-progress jobs
- [ ] Return downloadUrl for completed jobs
- [ ] Return error details for failed jobs
- [ ] Return 404 for non-existent jobs
- [ ] Implement GET /deck/export/download/:filename
- [ ] Serve PPTX file with correct Content-Type
- [ ] Include Content-Disposition header

---

## Provider State Handlers

When implementing provider verification tests, you'll need state handlers:

```typescript
// services/reporting/tests/pact.verify.test.ts
const stateHandlers = {
  // Trust API - Evidence
  'report exists with citations': async () => {
    await db.insert(reports).values({
      id: '123e4567-e89b-12d3-a456-426614174000',
      // ... insert with citations
    });
  },
  'report exists without citations': async () => {
    await db.insert(reports).values({
      id: '456e7890-e12b-34c5-d678-567890123456',
      citations: [],
    });
  },
  'report does not exist': async () => {
    // No-op: ensure report doesn't exist
  },
  'citations exist and are valid': async () => {
    // Insert valid citations
  },
  'citation has been tampered with': async () => {
    // Insert citation with mismatched hash
  },

  // Trust API - Ledger
  'report has ledger entries': async () => {
    // Insert ledger with valid chain
  },
  'report ledger has broken chain': async () => {
    // Insert ledger with broken chain
  },
  'report ledger is valid': async () => {
    // Insert valid ledger
  },
  'report ledger chain is broken': async () => {
    // Insert ledger with integrity violation
  },
  'report ledger does not exist': async () => {
    // No-op
  },

  // Deck Export
  'company has metrics data': async () => {
    // Insert company with quarterly data
  },
  'company has annual metrics data': async () => {
    // Insert company with full year data
  },
  'export job is pending': async () => {
    await db.insert(export_jobs).values({
      id: 'job-abc123',
      status: 'PENDING',
      progress: 0,
    });
  },
  'export job is in progress': async () => {
    await db.insert(export_jobs).values({
      id: 'job-def456',
      status: 'IN_PROGRESS',
      progress: 45,
      currentStep: 'Generating charts',
    });
  },
  'export job is completed': async () => {
    await db.insert(export_jobs).values({
      id: 'job-ghi789',
      status: 'COMPLETED',
      progress: 100,
      downloadUrl: '/deck/export/download/deck-quarterly-2024-Q1.pptx',
      fileSize: 5242880,
    });
  },
  'export job has failed': async () => {
    await db.insert(export_jobs).values({
      id: 'job-failed123',
      status: 'FAILED',
      progress: 65,
      error: {
        code: 'INSUFFICIENT_DATA',
        message: 'Insufficient metrics data for the selected period',
      },
    });
  },
  'export job does not exist': async () => {
    // No-op
  },
  'deck file is available for download': async () => {
    // Ensure file exists in storage
  },
};
```

---

## Hash Generation (SHA-256)

For citation integrity and ledger chain:

```typescript
import crypto from 'crypto';

// Citation hash
function generateCitationHash(citation: {
  id: string;
  snippetId: string;
  text: string;
  source: string;
}): string {
  const data = JSON.stringify(citation);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Ledger entry hash
function generateLedgerHash(entry: {
  id: string;
  eventType: string;
  timestamp: string;
  actor: string;
  metadata: object;
  previousHash: string;
}): string {
  const data = JSON.stringify(entry);
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Genesis hash (all zeros)
const GENESIS_HASH = '0'.repeat(64);
```

---

## Testing Contracts

```bash
# Run contract tests
pnpm --filter @teei/contracts test:pact

# Verify contracts are generated
ls packages/contracts/pacts/

# Expected output:
# api-gateway-reporting-service.json
# corp-cockpit-reporting-service.json
```

---

## Next Steps

1. Implement all 8 endpoints in `services/reporting/src/routes/`
2. Create database schemas for ledger and export jobs
3. Implement hash generation and chain validation
4. Add provider verification tests
5. Run provider verification against generated Pacts
6. Deploy to staging and verify E2E flow

---

**Reference**: See `CONTRACTS_SUMMARY.md` for full contract details.
