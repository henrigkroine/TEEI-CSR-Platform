# Trust API - Example Responses

## Overview

The Trust API provides transparency endpoints for the Trust Boardroom feature, enabling stakeholders to verify evidence lineage, integrity, and data governance policies.

**Base URL (via API Gateway)**: `https://api.teei.io/v1/trust`

**Base URL (Direct to Reporting Service)**: `http://localhost:3010/trust/v1`

---

## Authentication

### Evidence & Ledger Endpoints
- **Required**: JWT Bearer token
- **Header**: `Authorization: Bearer <token>`
- **Rate Limit**: 100 requests/minute per user

### Policies Endpoint
- **Required**: None (public endpoint)
- **Cache**: 1 hour
- **Rate Limit**: Shared gateway limit (100 req/min)

---

## Endpoints

### 1. GET /trust/v1/evidence/:reportId

Returns evidence lineage, citations, and snippet hashes for a generated report.

**Route Definition**:
```typescript
GET /trust/v1/evidence/:reportId
```

**Parameters**:
- `reportId` (path, required): UUID of the report

**Example Request**:
```bash
curl -X GET https://api.teei.io/v1/trust/evidence/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGc..."
```

**Example Response (200 OK)**:
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

**Error Response (404 Not Found)**:
```json
{
  "error": "Report not found",
  "message": "No report found with ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

**PII Redaction**:
- All snippet text is processed through PII redaction before being returned
- Patterns redacted: emails, phone numbers, SSNs, names (in some contexts)
- If PII is detected after redaction, the entire snippet is masked as `[REDACTED]`

**Snippet Hash**:
- SHA-256 hash (first 16 characters) of the redacted snippet text
- Used for integrity verification in Trust Boardroom UI
- Can be recomputed client-side to verify no tampering

---

### 2. GET /trust/v1/ledger/:reportId

Returns integrity ledger with tamper detection results.

**Route Definition**:
```typescript
GET /trust/v1/ledger/:reportId
```

**Parameters**:
- `reportId` (path, required): UUID of the report

**Example Request**:
```bash
curl -X GET https://api.teei.io/v1/trust/ledger/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGc..."
```

**Example Response (200 OK) - Verified Report**:
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

**Example Response (200 OK) - Tampered Report**:
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

**Integrity Checks**:
1. **Citation Count**: Verifies `report_lineage.citationCount` matches actual citations in `report_citations`
2. **Token Accounting**: Ensures `tokensTotal >= tokensInput + tokensOutput`
3. **Timestamp Validity**: Checks that `created_at` is not in the future

**Integrity Score Calculation**:
- Starts at 100
- Citation mismatch: -30 (high severity)
- Token inconsistency: -15 (medium severity)
- Future timestamp: -40 (high severity)
- Minimum score: 0

**Error Response (404 Not Found)**:
```json
{
  "error": "Report not found",
  "message": "No report found with ID: 550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 3. GET /trust/v1/policies

Returns data retention and residency policies (public endpoint).

**Route Definition**:
```typescript
GET /trust/v1/policies
```

**Parameters**: None

**Example Request**:
```bash
curl -X GET https://api.teei.io/v1/trust/policies
```

**Example Response (200 OK)**:
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

**Response Notes**:
- **Public Endpoint**: No authentication required
- **Cacheable**: API gateway sets `Cache-Control: public, max-age=3600` (1 hour)
- **Static Configuration**: Region and residency data is static
- **Dynamic Retention**: GDPR retention policies are queried from `data_retention_policies` table

**Data Categories**:
- `personal_data`: User profiles, contact info
- `user_feedback`: Buddy/Kintell feedback, survey responses
- `impact_metrics`: Outcome scores, SROI/VIS calculations
- `evidence_snippets`: Q2Q evidence, citations
- `report_data`: Generated reports, lineage metadata

---

## Error Codes

| Status Code | Error | Description |
|-------------|-------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid UUID format or malformed request |
| 401 | Unauthorized | Missing or invalid JWT token (evidence/ledger only) |
| 403 | Forbidden | User does not have access to this company's reports |
| 404 | Not Found | Report ID not found |
| 429 | Rate Limit Exceeded | Too many requests (100/min limit) |
| 500 | Internal Server Error | Database error or service failure |

---

## Rate Limiting

### API Gateway
- **Global Limit**: 100 requests/minute per user (or IP if unauthenticated)
- **Key Generator**: `userId` (if authenticated) or `IP address`
- **Response Header**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`

### Retry Strategy
```javascript
if (response.status === 429) {
  const retryAfter = response.headers['Retry-After'] || 60;
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  // Retry request
}
```

---

## Tenant Scoping

All endpoints (except `/policies`) enforce tenant isolation:

1. **Evidence Endpoint**:
   - Query filters by `report_lineage.companyId`
   - JWT token must contain matching `companyId` claim
   - Attempts to access other companies' reports return 404

2. **Ledger Endpoint**:
   - Same tenant scoping as evidence endpoint
   - Ledger entries only include operations for the authenticated company

3. **Policies Endpoint**:
   - No tenant scoping (public transparency endpoint)
   - Does not expose company-specific configuration

---

## Security Considerations

### PII Redaction
- **Pre-LLM**: Applied before sending to AI model
- **Post-Redaction**: Validated to ensure no leaks
- **API Response**: All snippet text is redacted before returning to client
- **Fail-Safe**: If PII detected after redaction, entire snippet masked as `[REDACTED]`

### Integrity Verification
- **Client-Side Hash Verification**: Clients can recompute snippet hashes to verify no tampering
- **Ledger Audit Trail**: All report generation operations logged with timestamps
- **Tamper Detection**: Automated checks for citation count mismatches, token accounting errors, timestamp anomalies

### Data Exposure
- **No Credentials**: API never exposes database credentials, API keys, or internal IPs
- **Summary Only**: Policies endpoint returns summary data, not full configuration
- **GDPR Compliance**: PII redaction ensures compliance with data protection regulations

---

## Integration Examples

### JavaScript/TypeScript
```typescript
import axios from 'axios';

const BASE_URL = 'https://api.teei.io/v1/trust';
const JWT_TOKEN = 'your-jwt-token';

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
      console.error('Rate limit exceeded, retry after', error.response.headers['retry-after']);
    }
    throw error;
  }
}

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

---

## Monitoring & Observability

### Metrics to Track
- **Evidence Endpoint**:
  - Response time (target: <500ms)
  - PII redaction rate (redactions per request)
  - Citation count distribution

- **Ledger Endpoint**:
  - Response time (target: <500ms)
  - Integrity score distribution
  - Tamper detection rate (% of reports with issues)

- **Policies Endpoint**:
  - Response time (target: <200ms)
  - Cache hit rate
  - Request volume

### Logging
All endpoints log:
- Request ID (`x-request-id` header)
- User ID (from JWT)
- Company ID (tenant scope)
- Response time
- Error details (without exposing sensitive data)

---

## Future Enhancements

### Planned Features
1. **Ledger Expansion**: Add `evidence_ledger` table for full audit trail beyond report generation
2. **Evidence Drill-Through**: Link citations to Evidence Explorer for full context
3. **Dimension Join**: Join with `outcome_scores` to populate `dimension` and `score` in evidence response
4. **Data Residency Service**: Query `services/data-residency/` for real-time region rules
5. **Webhook Notifications**: Alert stakeholders when integrity issues detected

### API Versioning
- Current version: `v1`
- Breaking changes will be introduced as `v2`
- Deprecation notices will be provided 6 months in advance

---

## Support

For questions or issues:
- **Documentation**: `/docs/trust-api-examples.md`
- **API Status**: `https://status.teei.io`
- **Support Email**: `support@teei.io`
