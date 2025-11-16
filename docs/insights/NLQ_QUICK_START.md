# NLQ Quick Start Guide

**Get the Natural Language Query service running in under 5 minutes**

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Service](#running-the-service)
- [Testing with curl](#testing-with-curl)
- [Testing with Postman](#testing-with-postman)
- [Frontend Integration](#frontend-integration)
- [Next Steps](#next-steps)

---

## Prerequisites

Before you start, ensure you have:

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **PostgreSQL** >= 14
- **Redis** >= 6.0
- **API Key** from Anthropic (Claude) or OpenAI (GPT)

---

## Installation

### 1. Clone the Repository

```bash
cd /home/user/TEEI-CSR-Platform
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Setup Environment Variables

Navigate to the NLQ service directory:

```bash
cd services/insights-nlq
```

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```bash
# Minimal configuration
NODE_ENV=development
PORT_INSIGHTS_NLQ=3009
HOST=0.0.0.0

# Database (Required)
DATABASE_URL=postgresql://user:password@localhost:5432/teei_csr_platform

# Redis (Required)
REDIS_URL=redis://localhost:6379

# LLM Provider (Required - choose one)
ANTHROPIC_API_KEY=sk-ant-your-key-here
# OR
OPENAI_API_KEY=sk-your-key-here

# LLM Settings
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
```

### 4. Run Database Migrations

```bash
# From repository root
pnpm -w db:migrate
```

This creates the following NLQ tables:
- `nlq_queries` - Query audit log
- `nlq_templates` - Metric templates catalog
- `nlq_safety_checks` - Safety validation results
- `nlq_cache_entries` - Cache metadata
- `nlq_rate_limits` - Per-tenant rate limits

---

## Running the Service

### Development Mode (with hot reload)

```bash
# From repository root
pnpm -w dev:insights-nlq

# OR from service directory
cd services/insights-nlq
pnpm dev
```

You should see:

```
═══════════════════════════════════════════════════════
  Insights NLQ Service - Natural Language Query Engine
═══════════════════════════════════════════════════════

✓ PostgreSQL connected
✓ Redis connected
✓ Insights NLQ Service running on port 3009

Available endpoints:
  Health:
    GET  /health - Health check
    GET  /health/ready - Readiness probe
    GET  /health/cache - Cache statistics

  NLQ APIs:
    POST /v1/nlq/ask - Natural language query
    GET  /v1/nlq/queries/:queryId - Get query details
    GET  /v1/nlq/history - Query history
```

### Production Mode

```bash
# Build
pnpm build

# Start
pnpm start
```

---

## Testing with curl

### 1. Health Check

```bash
curl http://localhost:3009/health
```

Expected response:

```json
{
  "status": "healthy",
  "alive": true,
  "ready": true,
  "timestamp": "2025-11-16T12:00:00.000Z"
}
```

### 2. Submit a Natural Language Question

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

Expected response:

```json
{
  "queryId": "123e4567-e89b-12d3-a456-426614174000",
  "answer": {
    "summary": "Found 1 result(s). SROI ratio for Q4 2024: 3.42",
    "data": [
      {
        "period_start": "2024-10-01",
        "period_end": "2024-12-31",
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
      "transformations": ["Template: sroi_ratio", "Aggregation: AVG"]
    },
    "visualization": {
      "type": "metric",
      "chartType": null
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

### 3. Get Query History

```bash
curl "http://localhost:3009/v1/nlq/history?companyId=550e8400-e29b-41d4-a716-446655440000&limit=10"
```

### 4. Get Query Details by ID

```bash
curl http://localhost:3009/v1/nlq/queries/123e4567-e89b-12d3-a456-426614174000
```

---

## Testing with Postman

### Import Collection

Create a new Postman collection with these requests:

#### 1. Submit Question

- **Method**: POST
- **URL**: `http://localhost:3009/v1/nlq/ask`
- **Headers**:
  - `Content-Type: application/json`
- **Body** (raw JSON):

```json
{
  "question": "Show me volunteer activity for last month",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "context": {
    "language": "en"
  },
  "userId": "user-123",
  "sessionId": "session-456"
}
```

#### 2. Query History

- **Method**: GET
- **URL**: `http://localhost:3009/v1/nlq/history?companyId=550e8400-e29b-41d4-a716-446655440000&limit=20`

#### 3. Cache Statistics

- **Method**: GET
- **URL**: `http://localhost:3009/health/cache`

---

## Frontend Integration

### Using the TypeScript Client

```typescript
import { createNLQClient, type NLQResponse } from '@/lib/nlq-api';

// Create client instance
const nlqClient = createNLQClient(); // Uses default service URL

// Submit a question
async function askQuestion(question: string, companyId: string): Promise<NLQResponse> {
  try {
    const response = await nlqClient.ask({
      question,
      companyId,
      context: {
        language: 'en',
      },
    });

    console.log('Answer:', response.answer.summary);
    console.log('Confidence:', response.answer.confidence.level);
    console.log('Execution time:', response.metadata.executionTimeMs, 'ms');

    return response;
  } catch (error) {
    if (error.status === 429) {
      // Rate limit exceeded
      console.error('Rate limit exceeded. Try again later.');
    } else if (error.status === 403) {
      // Safety check failed
      console.error('Query rejected due to safety violation.');
    } else {
      console.error('Query failed:', error.message);
    }
    throw error;
  }
}

// Get query history
async function getHistory(companyId: string) {
  const history = await nlqClient.getHistory({
    companyId,
    limit: 20,
    offset: 0,
  });

  console.log(`Found ${history.pagination.total} queries`);
  history.queries.forEach(q => {
    console.log(`- ${q.question} (${q.executionStatus})`);
  });
}
```

### React Component Example

```tsx
import { useState } from 'react';
import { askQuestion } from '@/lib/nlq-api';
import type { NLQResponse } from '@/lib/nlq-api';

export function NLQSearchBox({ companyId }: { companyId: string }) {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<NLQResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await askQuestion(question, companyId);
      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nlq-search">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your metrics..."
          disabled={loading}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {result && (
        <div className="results">
          <div className="summary">
            {result.answer.summary}
          </div>

          <div className="confidence">
            Confidence: <strong>{result.answer.confidence.level}</strong>
            ({(result.answer.confidence.overall * 100).toFixed(1)}%)
          </div>

          <div className="metadata">
            Execution time: {result.metadata.executionTimeMs}ms
            {result.metadata.cached && ' (cached)'}
          </div>

          {result.answer.data.length > 0 && (
            <table>
              <thead>
                <tr>
                  {Object.keys(result.answer.data[0]).map(key => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.answer.data.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i}>{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Next Steps

Now that you have NLQ running, explore:

1. **[API Reference](./NLQ_API_REFERENCE.md)** - Complete API documentation
2. **[Architecture](./NLQ_ARCHITECTURE.md)** - System design and data flow
3. **[Security](./NLQ_SECURITY.md)** - 12-point safety guardrails
4. **[Template Catalog](./NLQ_TEMPLATE_CATALOG.md)** - Available metric templates
5. **[Troubleshooting](./NLQ_TROUBLESHOOTING.md)** - Common issues and solutions
6. **[Production Deployment](./NLQ_PRODUCTION_DEPLOYMENT.md)** - Deploy to production

---

## Quick Troubleshooting

### Service won't start

1. **Check PostgreSQL connection**:
   ```bash
   psql $DATABASE_URL -c "SELECT 1"
   ```

2. **Check Redis connection**:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

3. **Verify LLM API key**:
   ```bash
   curl https://api.anthropic.com/v1/messages \
     -H "x-api-key: $ANTHROPIC_API_KEY" \
     -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
   ```

### Query rejected

Check the safety violations in the response. Common issues:
- Missing tenant isolation (companyId filter)
- Unauthorized table access
- PII column access
- Time window too large

See [Troubleshooting Guide](./NLQ_TROUBLESHOOTING.md) for more details.

---

## Support

- **Documentation**: `/docs/insights/`
- **GitHub Issues**: Create an issue for bugs or feature requests
- **Logs**: Check service logs at `logs/insights-nlq.log`

---

**Next**: [API Reference](./NLQ_API_REFERENCE.md) →
