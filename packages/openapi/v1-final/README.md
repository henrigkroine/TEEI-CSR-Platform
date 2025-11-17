# TEEI Platform OpenAPI Specifications v1 (Final)

This directory contains OpenAPI 3.0.3 specifications for all TEEI Platform APIs.

## Available Specifications

### Core Services

1. **analytics.yaml** (23KB, 749 lines)
   - Time-series trends analysis
   - Cohort comparisons
   - Funnel analysis
   - Industry benchmarks
   - Powered by ClickHouse

2. **reporting.yaml** (15KB, 499 lines)
   - Gen-AI powered report generation
   - Citation tracking
   - PII redaction
   - Cost monitoring
   - Multi-locale support (en, es, fr, uk, no)

3. **impact-in.yaml** (18KB)
   - External platform integrations
   - Delivery management
   - Replay functionality
   - Statistics and analytics

4. **notifications.yaml** (22KB)
   - Multi-channel notifications (email, SMS, push)
   - Scheduling
   - History tracking
   - Quota management

### Trust & Governance

5. **trust.yaml** (20KB, 597 lines) **[NEW]**
   - Evidence retrieval (`/trust/evidence/{reportId}`)
   - Audit ledgers (`/trust/ledger/{reportId}`)
   - Data policies (`/trust/policies`) - Public endpoint
   - Evidence verification (`/trust/verify/{snippetHash}`)

   **Features:**
   - Full citation lineage with relevance scores
   - SHA-256 snippet hashing for third-party verification
   - Immutable audit trails tracking all report generation steps
   - Public data governance policies (GDPR, retention, quality)
   - No PII exposure in audit logs

### Executive Reporting

6. **deck.yaml** (22KB, 671 lines) **[NEW]**
   - PPTX export (`/deck/export`)
   - Job status tracking (`/deck/export/{jobId}/status`)
   - File download (`/deck/export/{jobId}/download`)
   - Template listing (`/deck/templates`)

   **Templates:**
   - Quarterly Impact Report (8 slides, ~30s generation)
   - Annual CSR Report (15 slides, ~60s generation)
   - Investor Update (6 slides, ~20s generation)
   - Impact Deep Dive (20 slides, ~90s generation)

   **Features:**
   - Asynchronous export jobs with progress tracking
   - Custom branding (colors, logos, fonts)
   - Watermarking support
   - Evidence links in slide notes
   - 24-hour download expiry
   - Multi-locale support (en, es, fr, uk, no)

### Merged Specification

7. **merged.yaml** (34KB, 1,308 lines)
   - Consolidated spec combining all services
   - Unified authentication (RS256 JWT)
   - Common error responses
   - Shared schemas and parameters
   - Ready for API gateway deployment

## Validation

All specifications have been validated using `@apidevtools/swagger-cli`.

### Run Validation

```bash
cd packages/openapi
bash scripts/validate.sh
```

### Validation Checks

- ✅ OpenAPI 3.0.3 schema compliance
- ✅ No duplicate operationIds
- ✅ No duplicate paths
- ✅ Bearer auth security schemes present
- ✅ All $refs resolve correctly

## Authentication

All endpoints require RS256 JWT authentication with `company_id` claim, except:

- **Public endpoints:**
  - `GET /trust/policies` - Data governance policies

## API Standards

### Common Patterns

- **Pagination:** `page`, `limit`, `total`, `hasNext`
- **Error responses:** 400, 401, 403, 404, 429, 500
- **Date formats:** ISO 8601 (`YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`)
- **UUIDs:** RFC 4122 format
- **Rate limiting:** Custom headers (`X-RateLimit-*`)

### Response Headers

- `X-Query-Duration-Ms` - Query execution time (Analytics)
- `X-Cache-Status` - Cache hit/miss status (Analytics)
- `X-RateLimit-*` - Rate limit information
- `X-Job-Id` - Async job identifier (Deck exports)
- `X-File-Hash` - SHA-256 file hash (Downloads)

## Usage Examples

### Trust Center: Get Evidence

```bash
curl -X GET \
  'https://api.teei.io/v1/trust/evidence/rpt_7f8a9b0c1d2e3f4a?minRelevance=0.5' \
  -H 'Authorization: Bearer <JWT_TOKEN>'
```

### Trust Center: Verify Snippet

```bash
curl -X GET \
  'https://api.teei.io/v1/trust/verify/a3b2c1d4e5f6789012345678901234567890123456789012345678901234abcd'
```

### Deck Export: Create Job

```bash
curl -X POST \
  'https://api.teei.io/v1/deck/export' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "template": "quarterly",
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-03-31T23:59:59Z",
    "locale": "en",
    "watermark": "CONFIDENTIAL"
  }'
```

### Deck Export: Check Status

```bash
curl -X GET \
  'https://api.teei.io/v1/deck/export/job_9876abcd1234efgh/status' \
  -H 'Authorization: Bearer <JWT_TOKEN>'
```

### Deck Export: Download

```bash
curl -X GET \
  'https://api.teei.io/v1/deck/export/job_9876abcd1234efgh/download' \
  -H 'Authorization: Bearer <JWT_TOKEN>' \
  --output deck.pptx
```

## Schema Highlights

### Trust API

**TrustEvidenceResponse:**
- `reportId`: Report identifier
- `citations[]`: Array of citations with snippets, hashes, relevance scores
- `metadata`: Company, period, generation context

**TrustLedgerResponse:**
- `events[]`: Immutable audit trail
  - Event types: evidence_extraction, pii_redaction, llm_generation, citation_validation, report_finalized
  - Timestamps, actors, details (no PII)

**TrustPoliciesResponse:**
- `policies[]`: Governance policies by category
  - Categories: retention, residency, privacy, quality, security

**TrustVerifyResponse:**
- `verified`: Boolean verification result
- Snippet metadata (if verified)
- `hashAlgorithm`: SHA-256

### Deck API

**DeckExportRequest:**
- `template`: quarterly | annual | investor | impact-deep-dive
- `periodStart/End`: ISO 8601 date-time
- `locale`: en | es | fr | uk | no
- `tiles[]`: Custom slide selection
- `watermark`: Optional text
- `branding`: Colors, logo, fonts

**DeckExportStatusResponse:**
- `status`: queued | processing | completed | failed
- `progress`: 0-100
- `downloadUrl`: Available when completed
- `expiresAt`: 24h expiry timestamp
- `fileSize`: Bytes (when completed)

## Integration Notes

### Trust Center

- Evidence snippets use SHA-256 hashing for integrity verification
- Third parties can verify snippets without authentication using `/trust/verify`
- Audit ledgers track full lineage but never log PII
- Policies endpoint is public for transparency

### Deck Exports

- All exports are asynchronous (202 Accepted)
- Poll `/status` endpoint for progress (recommended: 2-5 second intervals)
- Download URLs expire after 24 hours
- Files are automatically deleted after expiry
- Export quotas enforced per tenant (default: 10/month)

## Changelog

### 2024-11-17 (Agent 3.1)

**Added:**
- `trust.yaml` - Evidence transparency and audit APIs (597 lines)
- `deck.yaml` - Executive deck export APIs (671 lines)
- Updated `merged.yaml` with trust and deck endpoints
- Created `scripts/validate.sh` for spec validation

**Features:**
- 4 trust endpoints (evidence, ledger, policies, verify)
- 4 deck endpoints (export, status, download, templates)
- 4 deck templates with customization options
- SHA-256 snippet verification
- Asynchronous export job pattern
- Public data governance policies

## Contributing

When adding new endpoints:

1. Add to individual service spec (e.g., `trust.yaml`)
2. Update `merged.yaml` with new paths and schemas
3. Run validation: `bash scripts/validate.sh`
4. Ensure no duplicate operationIds or paths
5. Follow existing patterns for errors, pagination, auth

## Support

For questions or issues:
- Platform Team: platform@teei.io
- API Docs: https://docs.teei.io/api
- Swagger UI: https://api.teei.io/docs
