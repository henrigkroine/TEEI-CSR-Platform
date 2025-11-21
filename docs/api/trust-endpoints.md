# Trust API Endpoints

## Overview

The Trust API provides transparency endpoints for the TEEI Trust Center, enabling stakeholders to verify evidence lineage, integrity, and data governance policies. All endpoints are designed for public consumption with appropriate authentication and rate limiting.

**Base URL**: `https://api.teei.io/v1/trust`

**OpenAPI Specification**: `/packages/openapi/v1-final/trust.yaml`

---

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
  - [GET /evidence/:reportId](#get-evidencereportid)
  - [GET /ledger/:reportId](#get-ledgerreportid)
  - [GET /policies](#get-policies)
  - [GET /status](#get-status)
- [Error Codes](#error-codes)
- [Security Considerations](#security-considerations)
- [Code Examples](#code-examples)

---

## Authentication

### Evidence & Ledger Endpoints

**Authentication Method**: JWT Bearer Token

```http
Authorization: Bearer <jwt-token>
```

**Token Requirements**:
- Valid JWT signed by TEEI platform
- Contains `companyId` claim matching requested report's company
- Not expired (check `exp` claim)
- Issued by trusted issuer (check `iss` claim)

**Rate Limit**: 100 requests/minute per user

### Public Endpoints

**Authentication Method**: None (publicly accessible)

**Endpoints**:
- `GET /policies` - Data retention and residency policies
- `GET /status` - System status and uptime

**Rate Limit**: 100 requests/minute per IP address

---

## Rate Limiting

### Global Rate Limits

| Endpoint Type | Limit | Window | Key |
|--------------|-------|--------|-----|
| Authenticated | 100 req/min | 60 seconds | User ID from JWT |
| Public | 100 req/min | 60 seconds | IP Address |
| Status | 300 req/min | 60 seconds | IP Address (higher for monitoring) |

### Rate Limit Headers

All responses include rate limit information:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700150400
Retry-After: 45
```

### Handling Rate Limits

**HTTP 429 Too Many Requests**:

```json
{
  "error": "RateLimitExceeded",
  "message": "You have exceeded the rate limit of 100 requests per minute",
  "retryAfter": 45,
  "limit": 100,
  "window": 60
}
```

**Retry Strategy**:
```javascript
if (response.status === 429) {
  const retryAfter = response.headers['retry-after'] || 60;
  await sleep(retryAfter * 1000);
  // Retry request
}
```

---

## Endpoints

### GET /evidence/:reportId

Returns evidence lineage, citations, and snippet hashes for a generated report.

**URL**: `/trust/v1/evidence/:reportId`

**Method**: `GET`

**Authentication**: Required (JWT Bearer Token)

**Parameters**:

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| `reportId` | UUID | Path | Yes | Report identifier |

**Example Request**:

```bash
curl -X GET https://api.teei.io/v1/trust/evidence/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK)**:

```json
{
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "companyId": "550e8400-e29b-41d4-a716-446655440001",
  "citations": [
    {
      "citationId": "550e8400-e29b-41d4-a716-446655440003",
      "snippetId": "550e8400-e29b-41d4-a716-446655440004",
      "snippetText": "Participant reported [REDACTED] in confidence level after 3 sessions.",
      "relevanceScore": "0.87",
      "snippetHash": "a3f5c8d9e2b1f4a7",
      "dimension": "confidence",
      "score": 0.72
    },
    {
      "citationId": "550e8400-e29b-41d4-a716-446655440005",
      "snippetId": "550e8400-e29b-41d4-a716-446655440006",
      "snippetText": "Volunteer feedback: 'Mentee showed significant progress in technical skills.'",
      "relevanceScore": "0.93",
      "snippetHash": "b7e4d1c8f9a2e5b3",
      "dimension": "job_readiness",
      "score": 0.85
    }
  ],
  "evidenceCount": 2,
  "lineage": {
    "modelName": "gpt-4-turbo",
    "promptVersion": "1.2.0",
    "timestamp": "2024-11-17T10:30:00.000Z",
    "tokensUsed": 3542
  }
}
```

**Error Responses**:

**401 Unauthorized**:
```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid JWT token"
}
```

**403 Forbidden**:
```json
{
  "error": "Forbidden",
  "message": "You do not have access to this company's reports"
}
```

**404 Not Found**:
```json
{
  "error": "ReportNotFound",
  "message": "No report found with ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `reportId` | UUID | Report identifier |
| `companyId` | UUID | Company identifier |
| `citations` | Array | List of evidence citations |
| `citations[].citationId` | UUID | Citation identifier |
| `citations[].snippetId` | UUID | Evidence snippet identifier |
| `citations[].snippetText` | String | PII-redacted snippet text |
| `citations[].relevanceScore` | String | ML-generated relevance (0.0-1.0) |
| `citations[].snippetHash` | String | SHA-256 hash (first 16 chars) for integrity |
| `citations[].dimension` | String | Outcome dimension (e.g., "confidence") |
| `citations[].score` | Number | Outcome score (0.0-1.0) |
| `evidenceCount` | Number | Total number of citations |
| `lineage` | Object | Generation metadata |
| `lineage.modelName` | String | AI model used (e.g., "gpt-4-turbo") |
| `lineage.promptVersion` | String | Prompt template version |
| `lineage.timestamp` | ISO8601 | Generation timestamp (UTC) |
| `lineage.tokensUsed` | Number | Total tokens consumed |

---

### GET /ledger/:reportId

Returns integrity ledger with tamper detection results.

**URL**: `/trust/v1/ledger/:reportId`

**Method**: `GET`

**Authentication**: Required (JWT Bearer Token)

**Parameters**:

| Parameter | Type | Location | Required | Description |
|-----------|------|----------|----------|-------------|
| `reportId` | UUID | Path | Yes | Report identifier |

**Example Request**:

```bash
curl -X GET https://api.teei.io/v1/trust/ledger/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Success Response (200 OK) - Verified Report**:

```json
{
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "companyId": "550e8400-e29b-41d4-a716-446655440001",
  "entries": [
    {
      "entryId": "550e8400-e29b-41d4-a716-446655440002",
      "timestamp": "2024-11-17T10:30:00.000Z",
      "operation": "REPORT_GENERATED",
      "actor": "system",
      "metadata": {
        "modelName": "gpt-4-turbo",
        "promptVersion": "1.2.0",
        "tokensTotal": 3542,
        "citationCount": 15
      }
    }
  ],
  "verified": true,
  "tamperLog": [],
  "integrityScore": 100
}
```

**Success Response (200 OK) - Tampered Report**:

```json
{
  "reportId": "550e8400-e29b-41d4-a716-446655440000",
  "companyId": "550e8400-e29b-41d4-a716-446655440001",
  "entries": [
    {
      "entryId": "550e8400-e29b-41d4-a716-446655440002",
      "timestamp": "2024-11-17T10:30:00.000Z",
      "operation": "REPORT_GENERATED",
      "actor": "system",
      "metadata": {
        "modelName": "gpt-4-turbo",
        "promptVersion": "1.2.0",
        "tokensTotal": 3542,
        "citationCount": 15
      }
    }
  ],
  "verified": false,
  "tamperLog": [
    {
      "timestamp": "2024-11-17T11:45:23.000Z",
      "issue": "Citation count mismatch: expected 15, found 12",
      "severity": "high"
    },
    {
      "timestamp": "2024-11-17T11:45:23.000Z",
      "issue": "Token accounting inconsistency detected",
      "severity": "medium"
    }
  ],
  "integrityScore": 55
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `reportId` | UUID | Report identifier |
| `companyId` | UUID | Company identifier |
| `entries` | Array | Ledger entries for report |
| `entries[].entryId` | UUID | Ledger entry identifier |
| `entries[].timestamp` | ISO8601 | Entry creation timestamp (UTC) |
| `entries[].operation` | String | Operation type (e.g., "REPORT_GENERATED") |
| `entries[].actor` | String | User ID or "system" |
| `entries[].metadata` | Object | Technical metadata (no PII) |
| `verified` | Boolean | True if ledger passed integrity checks |
| `tamperLog` | Array | List of detected tampering issues |
| `tamperLog[].timestamp` | ISO8601 | When issue was detected |
| `tamperLog[].issue` | String | Description of integrity violation |
| `tamperLog[].severity` | String | "high", "medium", or "low" |
| `integrityScore` | Number | 0-100 score (100 = perfect integrity) |

**Integrity Checks**:
1. **Citation Count**: Verifies `report_lineage.citationCount` matches actual citations
2. **Token Accounting**: Ensures `tokensTotal >= tokensInput + tokensOutput`
3. **Timestamp Validity**: Checks that `created_at` is not in the future

**Integrity Score Calculation**:
- Starts at 100
- Citation mismatch: -30 (high severity)
- Token inconsistency: -15 (medium severity)
- Future timestamp: -40 (high severity)
- Minimum score: 0

---

### GET /policies

Returns data retention and residency policies (public endpoint).

**URL**: `/trust/v1/policies`

**Method**: `GET`

**Authentication**: None (public endpoint)

**Parameters**: None

**Example Request**:

```bash
curl -X GET https://api.teei.io/v1/trust/policies
```

**Success Response (200 OK)**:

```json
{
  "regions": [
    {
      "region": "eu",
      "dataResidency": "EU-WEST-1",
      "regulations": ["GDPR", "ePrivacy Directive"]
    },
    {
      "region": "us",
      "dataResidency": "US-EAST-1",
      "regulations": ["CCPA", "SOC 2"]
    },
    {
      "region": "uk",
      "dataResidency": "UK-LONDON-1",
      "regulations": ["UK GDPR", "Data Protection Act 2018"]
    }
  ],
  "residency": {
    "eu": {
      "allowed": true,
      "locations": ["eu-west-1", "eu-central-1"]
    },
    "us": {
      "allowed": true,
      "locations": ["us-east-1", "us-west-2"]
    },
    "uk": {
      "allowed": true,
      "locations": ["uk-london-1"]
    }
  },
  "gdpr": {
    "enabled": true,
    "retention": [
      {
        "category": "personal_data",
        "retentionDays": 2555,
        "legalBasis": "Legitimate Interest",
        "deletionMethod": "secure_erase"
      },
      {
        "category": "user_feedback",
        "retentionDays": 1095,
        "legalBasis": "Consent",
        "deletionMethod": "anonymization"
      },
      {
        "category": "impact_metrics",
        "retentionDays": 3650,
        "legalBasis": "Legal Obligation",
        "deletionMethod": "archive"
      }
    ]
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `regions` | Array | Supported regions with regulations |
| `regions[].region` | String | Region code (e.g., "eu", "us", "uk") |
| `regions[].dataResidency` | String | Primary data center location |
| `regions[].regulations` | Array | Applicable regulations |
| `residency` | Object | Data residency configuration |
| `residency[region].allowed` | Boolean | Region enabled for data storage |
| `residency[region].locations` | Array | Allowed data center locations |
| `gdpr` | Object | GDPR compliance configuration |
| `gdpr.enabled` | Boolean | GDPR compliance enabled |
| `gdpr.retention` | Array | Retention policies by data category |
| `gdpr.retention[].category` | String | Data category (e.g., "personal_data") |
| `gdpr.retention[].retentionDays` | Number | Retention period in days |
| `gdpr.retention[].legalBasis` | String | Legal basis for processing |
| `gdpr.retention[].deletionMethod` | String | Deletion method (e.g., "secure_erase") |

**Cache Headers**:
```http
Cache-Control: public, max-age=3600
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

---

### GET /status

Returns system status and uptime metrics.

**URL**: `/trust/v1/status`

**Method**: `GET`

**Authentication**: None (public endpoint)

**Parameters**: None

**Example Request**:

```bash
curl -X GET https://api.teei.io/v1/trust/status
```

**Success Response (200 OK)**:

```json
{
  "status": "operational",
  "uptime": {
    "percentage": 99.97,
    "incidents": 0,
    "lastIncident": null
  },
  "services": [
    {
      "name": "API Gateway",
      "status": "operational",
      "responseTime": 45,
      "uptime": 99.99
    },
    {
      "name": "Reporting Service",
      "status": "operational",
      "responseTime": 120,
      "uptime": 99.95
    },
    {
      "name": "Analytics Service",
      "status": "operational",
      "responseTime": 80,
      "uptime": 99.98
    },
    {
      "name": "Q2Q AI",
      "status": "operational",
      "responseTime": 1500,
      "uptime": 99.90
    }
  ],
  "slo": {
    "availability": {
      "target": 99.9,
      "actual": 99.97
    },
    "latency": {
      "target": 500,
      "actual": 245
    },
    "errorRate": {
      "target": 0.1,
      "actual": 0.03
    }
  },
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `status` | String | Overall status: "operational", "degraded", "down" |
| `uptime` | Object | Uptime metrics |
| `uptime.percentage` | Number | Uptime percentage (7-day rolling) |
| `uptime.incidents` | Number | Incident count (last 30 days) |
| `uptime.lastIncident` | ISO8601 | Timestamp of last incident (null if none) |
| `services` | Array | Individual service statuses |
| `services[].name` | String | Service name |
| `services[].status` | String | Service status |
| `services[].responseTime` | Number | Response time in ms (p95) |
| `services[].uptime` | Number | Service uptime percentage |
| `slo` | Object | Service Level Objectives |
| `slo.availability.target` | Number | Target availability percentage |
| `slo.availability.actual` | Number | Actual availability percentage |
| `slo.latency.target` | Number | Target latency in ms (p95) |
| `slo.latency.actual` | Number | Actual latency in ms (p95) |
| `slo.errorRate.target` | Number | Target error rate percentage |
| `slo.errorRate.actual` | Number | Actual error rate percentage |
| `timestamp` | ISO8601 | Status check timestamp (UTC) |

---

## Error Codes

### Standard HTTP Status Codes

| Code | Status | Description | When to Use |
|------|--------|-------------|-------------|
| 200 | OK | Request successful | Normal successful response |
| 400 | Bad Request | Invalid request format | Invalid UUID, malformed JSON |
| 401 | Unauthorized | Missing/invalid auth | No JWT or invalid token |
| 403 | Forbidden | Access denied | User lacks permission for resource |
| 404 | Not Found | Resource not found | Report ID doesn't exist |
| 422 | Unprocessable Entity | Validation error | Evidence gates violation |
| 429 | Too Many Requests | Rate limit exceeded | Exceeded 100 req/min |
| 500 | Internal Server Error | Server error | Database error, service failure |
| 503 | Service Unavailable | Service down | Maintenance mode, service outage |

### Error Response Format

All errors follow a consistent format:

```json
{
  "error": "ErrorType",
  "message": "Human-readable description of the error",
  "details": {
    "field": "Additional context (optional)"
  },
  "timestamp": "2025-11-17T10:30:00.000Z",
  "requestId": "req-abc123"
}
```

### Error Types

| Error Type | HTTP Code | Description |
|-----------|-----------|-------------|
| `Unauthorized` | 401 | Missing or invalid JWT token |
| `Forbidden` | 403 | User lacks permission |
| `ReportNotFound` | 404 | Report ID not found |
| `InvalidUUID` | 400 | Malformed UUID parameter |
| `RateLimitExceeded` | 429 | Too many requests |
| `EvidenceGateViolation` | 422 | Citation validation failed |
| `InternalServerError` | 500 | Unexpected server error |
| `ServiceUnavailable` | 503 | Service temporarily down |

---

## Security Considerations

### PII Redaction

All evidence snippet text is automatically redacted before being returned:

**Patterns Redacted**:
- Email addresses
- Phone numbers
- Social Security Numbers
- Credit card numbers
- Names (in some contexts)

**Fail-Safe**: If PII is detected after redaction, the entire snippet is masked as `[REDACTED]`.

### Integrity Verification

**Client-Side Hash Verification**:

Clients can verify snippet integrity by recomputing hashes:

```javascript
import crypto from 'crypto';

function verifySnippetHash(snippetText, expectedHash) {
  const computed = crypto
    .createHash('sha256')
    .update(snippetText)
    .digest('hex')
    .substring(0, 16);

  return computed === expectedHash;
}

// Usage
const snippet = response.citations[0];
const isValid = verifySnippetHash(snippet.snippetText, snippet.snippetHash);
console.log('Snippet integrity:', isValid ? 'VALID' : 'TAMPERED');
```

### Data Exposure

The Trust API **NEVER** exposes:
- Database credentials
- API keys or secrets
- Internal IP addresses
- Full infrastructure details
- User passwords or PII
- Unredacted evidence snippets

---

## Code Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const BASE_URL = 'https://api.teei.io/v1/trust';
const JWT_TOKEN = 'your-jwt-token';

// Get evidence for a report
async function getReportEvidence(reportId: string) {
  try {
    const response = await axios.get(`${BASE_URL}/evidence/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`
      }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) {
      console.error('Report not found');
    } else if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.error(`Rate limit exceeded, retry after ${retryAfter}s`);
    }
    throw error;
  }
}

// Verify report integrity
async function verifyReportIntegrity(reportId: string) {
  const ledger = await axios.get(`${BASE_URL}/ledger/${reportId}`, {
    headers: { 'Authorization': `Bearer ${JWT_TOKEN}` }
  });

  if (!ledger.data.verified) {
    console.warn('Integrity issues detected:', ledger.data.tamperLog);
    console.warn('Integrity score:', ledger.data.integrityScore);
  }

  return ledger.data;
}

// Get data policies (public endpoint)
async function getDataPolicies() {
  const response = await axios.get(`${BASE_URL}/policies`);
  return response.data;
}
```

### Python

```python
import requests

BASE_URL = 'https://api.teei.io/v1/trust'
JWT_TOKEN = 'your-jwt-token'

def get_report_evidence(report_id):
    headers = {'Authorization': f'Bearer {JWT_TOKEN}'}
    response = requests.get(f'{BASE_URL}/evidence/{report_id}', headers=headers)
    response.raise_for_status()
    return response.json()

def verify_report_integrity(report_id):
    headers = {'Authorization': f'Bearer {JWT_TOKEN}'}
    response = requests.get(f'{BASE_URL}/ledger/{report_id}', headers=headers)
    ledger = response.json()

    if not ledger['verified']:
        print(f"WARNING: Integrity issues detected")
        for issue in ledger['tamperLog']:
            print(f"  - {issue['severity'].upper()}: {issue['issue']}")

    return ledger

def get_data_policies():
    response = requests.get(f'{BASE_URL}/policies')
    return response.json()
```

### cURL

```bash
# Get evidence for a report
curl -X GET https://api.teei.io/v1/trust/evidence/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Accept: application/json"

# Get ledger with integrity check
curl -X GET https://api.teei.io/v1/trust/ledger/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Accept: application/json"

# Get data policies (public)
curl -X GET https://api.teei.io/v1/trust/policies \
  -H "Accept: application/json"

# Get system status (public)
curl -X GET https://api.teei.io/v1/trust/status \
  -H "Accept: application/json"
```

---

## Related Documentation

- [Trust Center Overview](../trust-center/README.md)
- [Evidence Gates](../trust-center/evidence-gates.md)
- [Evidence Ledger](../trust-center/evidence-ledger.md)
- [Trust API Examples](../trust-api-examples.md)
- [Executive Packs](../cockpit/executive_packs.md)

## Support

For assistance with the Trust API:
- **Documentation**: `/docs/api/trust-endpoints.md`
- **OpenAPI Spec**: `/packages/openapi/v1-final/trust.yaml`
- **API Status**: https://status.teei.io
- **GitHub Issues**: Tag with `trust-api` label
- **Support Email**: support@teei.io

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Maintained By**: Agent 5.1 - Technical Writer
