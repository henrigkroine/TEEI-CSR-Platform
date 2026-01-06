# NLQ API Reference

**Complete API documentation for the Natural Language Query service**

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [POST /v1/nlq/ask](#post-v1nlqask)
  - [GET /v1/nlq/queries/:queryId](#get-v1nlqqueriesqueryid)
  - [GET /v1/nlq/history](#get-v1nlqhistory)
  - [GET /health](#get-health)
  - [GET /health/cache](#get-healthcache)
- [Request/Response Schemas](#requestresponse-schemas)
- [Code Examples](#code-examples)

---

## Base URL

**Development**: `http://localhost:3009`
**Production**: `https://insights-nlq.your-domain.com`

All API endpoints are versioned under `/v1/nlq/`.

---

## Authentication

### JWT Authentication (Optional)

If JWT authentication is enabled (via `JWT_SECRET` env var), include the token in the `Authorization` header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### API Key Authentication (Alternative)

If using API key authentication:

```http
X-API-Key: your-api-key-here
```

### No Authentication (Development)

For development without authentication, omit the auth headers.

---

## Rate Limiting

Rate limits are enforced per company (tenant) and per IP address.

### Default Limits

- **Daily**: 500 queries per company
- **Hourly**: 50 queries per company (burst limit)
- **Concurrent**: 5 simultaneous queries per company

### Rate Limit Headers

Every response includes rate limit headers:

```http
X-RateLimit-Remaining-Daily: 487
X-RateLimit-Remaining-Hourly: 42
X-Query-Time-Ms: 1847
X-Cached: false
```

### Rate Limit Exceeded Response

**Status**: `429 Too Many Requests`

```json
{
  "error": "Rate limit exceeded",
  "message": "Daily query limit exceeded (500 queries/day)",
  "limits": {
    "daily": 0,
    "hourly": 15
  },
  "resetAt": "2025-11-17T00:00:00.000Z"
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "ErrorType",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  },
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

### HTTP Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| `200` | OK | Request successful |
| `400` | Bad Request | Invalid request parameters |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Safety check failed or access denied |
| `404` | Not Found | Resource not found |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |
| `503` | Service Unavailable | Service is down or dependencies unavailable |

### Common Error Types

#### Validation Error (400)

```json
{
  "error": "Invalid request",
  "details": [
    {
      "code": "too_small",
      "minimum": 3,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "String must contain at least 3 character(s)",
      "path": ["question"]
    }
  ]
}
```

#### Safety Check Failed (403)

```json
{
  "error": "Safety check failed",
  "message": "Safety validation failed: PII_001, TNT_001",
  "requestId": "123e4567-e89b-12d3-a456-426614174000"
}
```

---

## Endpoints

### POST /v1/nlq/ask

Submit a natural language question and get an answer.

#### Request

**URL**: `POST /v1/nlq/ask`

**Headers**:
```http
Content-Type: application/json
```

**Body**:

```json
{
  "question": "What is our SROI for last quarter?",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "context": {
    "previousQueryId": "123e4567-e89b-12d3-a456-426614174000",
    "filters": {
      "program": "education",
      "location": "oslo"
    },
    "language": "en"
  },
  "userId": "user-123",
  "sessionId": "session-456"
}
```

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | Natural language question (3-500 chars) |
| `companyId` | string (UUID) | Yes | Company/tenant identifier |
| `context.previousQueryId` | string (UUID) | No | Previous query ID for context |
| `context.filters` | object | No | Additional filters (program, location, etc.) |
| `context.language` | enum | No | Language: `en`, `uk`, `no`, `es`, `fr` (default: `en`) |
| `userId` | string (UUID) | No | User identifier for audit trail |
| `sessionId` | string | No | Session identifier for tracking |

#### Response

**Status**: `200 OK`

```json
{
  "queryId": "123e4567-e89b-12d3-a456-426614174000",
  "answer": {
    "summary": "Found 1 result(s). SROI ratio for Q4 2024: 3.42",
    "data": [
      {
        "company_id": "550e8400-e29b-41d4-a716-446655440000",
        "period_start": "2024-10-01T00:00:00.000Z",
        "period_end": "2024-12-31T23:59:59.999Z",
        "sroi_ratio": 3.42,
        "participants_count": 250,
        "volunteers_count": 45
      }
    ],
    "confidence": {
      "overall": 0.87,
      "level": "high",
      "components": {
        "intentConfidence": 0.92,
        "dataCompleteness": 0.95,
        "sampleSizeScore": 0.85,
        "recencyScore": 0.90,
        "ambiguityPenalty": 0.00
      },
      "weights": {
        "intent": 0.30,
        "dataCompleteness": 0.25,
        "sampleSize": 0.20,
        "recency": 0.15,
        "ambiguity": 0.10
      },
      "recommendations": []
    },
    "lineage": {
      "sources": [
        {
          "sourceType": "database",
          "sourceId": "metrics_company_period",
          "tableName": "metrics_company_period",
          "confidence": 1.0
        }
      ],
      "transformations": [
        "Template: sroi_ratio",
        "Aggregation: AVG",
        "Time filter: Q4 2024"
      ],
      "calculationSteps": [
        "SELECT AVG(sroi_ratio) FROM metrics_company_period",
        "WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'",
        "AND period_start >= '2024-10-01' AND period_end <= '2024-12-31'"
      ]
    },
    "visualization": {
      "type": "metric",
      "chartType": null,
      "config": {}
    }
  },
  "metadata": {
    "executionTimeMs": 1847,
    "cached": false,
    "safetyPassed": true,
    "intent": "get_metric",
    "templateId": "get_metric_sroi_ratio",
    "tokensUsed": 1256,
    "estimatedCostUSD": "0.001890"
  }
}
```

**Response Fields**:

| Field | Type | Description |
|-------|------|-------------|
| `queryId` | string (UUID) | Unique query identifier |
| `answer.summary` | string | Human-readable answer summary |
| `answer.data` | array | Query result rows |
| `answer.confidence` | object | Confidence score breakdown |
| `answer.confidence.overall` | number | Overall confidence (0.0-1.0) |
| `answer.confidence.level` | enum | Confidence level: `high`, `medium`, `low` |
| `answer.confidence.components` | object | Confidence score components |
| `answer.confidence.recommendations` | array | Suggestions for improving confidence |
| `answer.lineage` | object | Data lineage and provenance |
| `answer.lineage.sources` | array | Data source references |
| `answer.lineage.transformations` | array | Data transformation steps |
| `answer.visualization` | object | Suggested visualization |
| `metadata.executionTimeMs` | number | Query execution time (ms) |
| `metadata.cached` | boolean | Whether result was cached |
| `metadata.safetyPassed` | boolean | Safety validation result |
| `metadata.intent` | string | Detected user intent |
| `metadata.templateId` | string | Matched metric template ID |
| `metadata.tokensUsed` | number | LLM tokens consumed |
| `metadata.estimatedCostUSD` | string | Estimated API cost (USD) |

---

### GET /v1/nlq/queries/:queryId

Retrieve query details and results by ID.

#### Request

**URL**: `GET /v1/nlq/queries/:queryId`

**Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `queryId` | string (UUID) | Yes | Query identifier (path parameter) |

#### Response

**Status**: `200 OK`

```json
{
  "queryId": "123e4567-e89b-12d3-a456-426614174000",
  "status": "success",
  "question": "What is our SROI for last quarter?",
  "normalizedQuestion": "what is our sroi for last quarter?",
  "intent": "get_metric",
  "template": {
    "id": "abc123",
    "name": "sroi_ratio"
  },
  "query": {
    "sql": "SELECT company_id, period_start, period_end, sroi_ratio...",
    "chql": null,
    "preview": "Calculate average SROI ratio for Q4 2024"
  },
  "safety": {
    "passed": true,
    "violations": null,
    "details": {
      "checkResults": [
        {
          "check": "sql_injection",
          "passed": true,
          "severity": "low",
          "details": "No SQL injection patterns detected"
        },
        {
          "check": "tenant_isolation",
          "passed": true,
          "severity": "low",
          "details": "Tenant isolation enforced"
        }
      ],
      "overallPassed": true,
      "violationCodes": [],
      "overallSeverity": "none"
    }
  },
  "execution": {
    "status": "success",
    "rowCount": 1,
    "executionTimeMs": 1847
  },
  "answer": {
    "summary": "Found 1 result(s). SROI ratio for Q4 2024: 3.42",
    "confidence": 0.87,
    "lineage": {
      "sources": [...]
    }
  },
  "metadata": {
    "cached": false,
    "cacheKey": "nlq:550e8400:abc123...",
    "modelName": "claude-3-5-sonnet-20241022",
    "tokensUsed": 1256,
    "estimatedCostUsd": "0.001890",
    "createdAt": "2025-11-16T12:00:00.000Z"
  }
}
```

---

### GET /v1/nlq/history

Retrieve query history for a company.

#### Request

**URL**: `GET /v1/nlq/history?companyId={id}&limit=20&offset=0`

**Query Parameters**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companyId` | string (UUID) | Yes | Company identifier |
| `limit` | number | No | Max results (1-100, default: 20) |
| `offset` | number | No | Pagination offset (default: 0) |
| `startDate` | string (ISO 8601) | No | Filter by start date |
| `endDate` | string (ISO 8601) | No | Filter by end date |
| `status` | enum | No | Filter by status: `pending`, `success`, `failed`, `rejected` |

#### Response

**Status**: `200 OK`

```json
{
  "queries": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "question": "What is our SROI for last quarter?",
      "normalizedQuestion": "what is our sroi for last quarter?",
      "intent": "get_metric",
      "intentConfidence": 0.92,
      "templateName": "sroi_ratio",
      "executionStatus": "success",
      "resultRowCount": 1,
      "executionTimeMs": 1847,
      "answerConfidence": 0.87,
      "answerSummary": "Found 1 result(s). SROI ratio for Q4 2024: 3.42",
      "cached": false,
      "safetyPassed": true,
      "createdAt": "2025-11-16T12:00:00.000Z"
    },
    {
      "id": "234e5678-e89b-12d3-a456-426614174001",
      "question": "Show volunteer activity for last month",
      "normalizedQuestion": "show volunteer activity for last month",
      "intent": "get_metric",
      "intentConfidence": 0.88,
      "templateName": "volunteer_activity",
      "executionStatus": "success",
      "resultRowCount": 30,
      "executionTimeMs": 2134,
      "answerConfidence": 0.82,
      "answerSummary": "Found 30 result(s). 45 volunteers active in October 2024",
      "cached": true,
      "safetyPassed": true,
      "createdAt": "2025-11-16T11:45:00.000Z"
    }
  ],
  "pagination": {
    "total": 127,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### GET /health

Health check endpoint for monitoring.

#### Request

**URL**: `GET /health`

#### Response

**Status**: `200 OK`

```json
{
  "status": "healthy",
  "alive": true,
  "ready": true,
  "timestamp": "2025-11-16T12:00:00.000Z",
  "uptime": 86400,
  "version": "1.0.0"
}
```

---

### GET /health/cache

Cache statistics and performance metrics.

#### Request

**URL**: `GET /health/cache`

#### Response

**Status**: `200 OK`

```json
{
  "status": "healthy",
  "stats": {
    "totalKeys": 1247,
    "totalHits": 8934,
    "totalMisses": 2156,
    "hitRate": 80.54,
    "memoryUsed": "245.67 MB",
    "memoryUsedBytes": 257458176,
    "avgTtl": 3600,
    "topQueries": [
      {
        "hash": "abc123...",
        "hits": 234,
        "question": "What is our SROI for last quarter?"
      },
      {
        "hash": "def456...",
        "hits": 187,
        "question": "Show volunteer activity"
      }
    ]
  }
}
```

---

## Request/Response Schemas

### Zod Validation Schemas

#### AskRequestSchema

```typescript
import { z } from 'zod';

const AskRequestSchema = z.object({
  question: z.string().min(3).max(500),
  companyId: z.string().uuid(),
  context: z.object({
    previousQueryId: z.string().uuid().optional(),
    filters: z.record(z.any()).optional(),
    language: z.enum(['en', 'uk', 'no', 'es', 'fr']).default('en'),
  }).optional(),
  userId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
});

type AskRequest = z.infer<typeof AskRequestSchema>;
```

#### QueryHistoryQuerySchema

```typescript
const QueryHistoryQuerySchema = z.object({
  companyId: z.string().uuid(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['pending', 'success', 'failed', 'rejected']).optional(),
});

type QueryHistoryQuery = z.infer<typeof QueryHistoryQuerySchema>;
```

---

## Code Examples

### TypeScript

```typescript
import { createNLQClient } from '@/lib/nlq-api';

const client = createNLQClient();

// Submit question
const response = await client.ask({
  question: 'What is our SROI for last quarter?',
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  context: {
    language: 'en',
  },
});

console.log(response.answer.summary);
console.log(`Confidence: ${response.answer.confidence.level}`);
```

### curl

```bash
curl -X POST http://localhost:3009/v1/nlq/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is our SROI for last quarter?",
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "context": {
      "language": "en"
    }
  }'
```

### Python

```python
import requests
import json

def ask_nlq_question(question: str, company_id: str) -> dict:
    """Submit a natural language question to NLQ service."""

    url = 'http://localhost:3009/v1/nlq/ask'

    payload = {
        'question': question,
        'companyId': company_id,
        'context': {
            'language': 'en'
        }
    }

    headers = {
        'Content-Type': 'application/json'
    }

    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()

    return response.json()

# Usage
result = ask_nlq_question(
    question='What is our SROI for last quarter?',
    company_id='550e8400-e29b-41d4-a716-446655440000'
)

print(f"Answer: {result['answer']['summary']}")
print(f"Confidence: {result['answer']['confidence']['level']}")
print(f"Execution time: {result['metadata']['executionTimeMs']}ms")
```

### JavaScript (Fetch)

```javascript
async function askQuestion(question, companyId) {
  const response = await fetch('http://localhost:3009/v1/nlq/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question,
      companyId,
      context: {
        language: 'en',
      },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      const data = await response.json();
      throw new Error(`Rate limit exceeded. Reset at ${data.resetAt}`);
    }
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return await response.json();
}

// Usage
try {
  const result = await askQuestion(
    'What is our SROI for last quarter?',
    '550e8400-e29b-41d4-a716-446655440000'
  );

  console.log(result.answer.summary);
} catch (error) {
  console.error('Query failed:', error.message);
}
```

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
)

type AskRequest struct {
    Question  string                 `json:"question"`
    CompanyID string                 `json:"companyId"`
    Context   map[string]interface{} `json:"context,omitempty"`
}

type NLQResponse struct {
    QueryID  string `json:"queryId"`
    Answer   struct {
        Summary    string                 `json:"summary"`
        Data       []map[string]interface{} `json:"data"`
        Confidence struct {
            Overall float64 `json:"overall"`
            Level   string  `json:"level"`
        } `json:"confidence"`
    } `json:"answer"`
    Metadata struct {
        ExecutionTimeMs int    `json:"executionTimeMs"`
        Cached          bool   `json:"cached"`
        Intent          string `json:"intent"`
    } `json:"metadata"`
}

func askNLQQuestion(question, companyID string) (*NLQResponse, error) {
    url := "http://localhost:3009/v1/nlq/ask"

    reqBody := AskRequest{
        Question:  question,
        CompanyID: companyID,
        Context: map[string]interface{}{
            "language": "en",
        },
    }

    jsonBody, err := json.Marshal(reqBody)
    if err != nil {
        return nil, err
    }

    resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonBody))
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
    }

    var result NLQResponse
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, err
    }

    return &result, nil
}

func main() {
    result, err := askNLQQuestion(
        "What is our SROI for last quarter?",
        "550e8400-e29b-41d4-a716-446655440000",
    )
    if err != nil {
        panic(err)
    }

    fmt.Printf("Answer: %s\n", result.Answer.Summary)
    fmt.Printf("Confidence: %s (%.2f)\n",
        result.Answer.Confidence.Level,
        result.Answer.Confidence.Overall,
    )
    fmt.Printf("Execution time: %dms\n", result.Metadata.ExecutionTimeMs)
}
```

---

## Webhooks & Events (Optional)

If NATS event publishing is enabled, NLQ emits events for query lifecycle:

### Event Types

- `nlq.query.submitted` - Query received
- `nlq.query.completed` - Query successfully executed
- `nlq.query.failed` - Query execution failed
- `nlq.query.rejected` - Safety check failed

### Event Schema

```json
{
  "eventType": "nlq.query.completed",
  "queryId": "123e4567-e89b-12d3-a456-426614174000",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "question": "What is our SROI for last quarter?",
  "intent": "get_metric",
  "templateId": "sroi_ratio",
  "executionTimeMs": 1847,
  "cached": false,
  "timestamp": "2025-11-16T12:00:00.000Z"
}
```

---

## Rate Limit Customization

To customize rate limits for a specific company:

```sql
INSERT INTO nlq_rate_limits (company_id, daily_query_limit, hourly_query_limit)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 1000, 100)
ON CONFLICT (company_id) DO UPDATE
SET daily_query_limit = EXCLUDED.daily_query_limit,
    hourly_query_limit = EXCLUDED.hourly_query_limit;
```

---

**Next**: [Architecture](./NLQ_ARCHITECTURE.md) →
