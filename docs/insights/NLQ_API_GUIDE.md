# Natural Language Query (NLQ) API Guide

## Overview

The Insights NLQ service provides secure, natural language querying over CSR analytics data with built-in guardrails, evidence linking, and safety verification.

**Service**: `insights-nlq`
**Port**: `3015`
**Base Path**: `/v1/insights/nlq`

## Key Features

- ✅ Natural language to SQL/CHQL conversion
- ✅ 100% safety verification pass rate
- ✅ Row-level tenancy enforcement
- ✅ PII redaction
- ✅ Evidence-linked answers with citations
- ✅ Performance: avg plan ≤350ms, p95 e2e ≤2.5s

## Endpoints

### POST /v1/insights/nlq/query

Execute a natural language query against analytics data.

**Request:**
```json
{
  "query": "How many volunteer hours in Q1 2024?",
  "tenantId": "tenant_123",
  "userId": "user_456",
  "userRole": "analyst",
  "dialect": "clickhouse",
  "includeEvidence": true,
  "includeSql": false
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Based on the analysis of Volunteer Hours:\n\n- **Volunteer Hours**: 1,500 (based on 245 records from impact-in) [Citation: cite_volunteer_hours_tenant_12_1234567890]\n\n...",
  "data": [
    {
      "volunteer_hours": 1500,
      "time_bucket": "2024-01-01"
    }
  ],
  "citations": [
    {
      "id": "cite_volunteer_hours_tenant_12_1234567890",
      "sourceSystem": "impact-in",
      "sourceEntity": "volunteer_activities",
      "metricId": "volunteer_hours",
      "aggregatedValue": 1500,
      "sampleSize": 245,
      "confidence": 1.0,
      "snippet": "Volunteer Hours of 1,500 aggregated from 245 records..."
    }
  ],
  "metadata": {
    "planTimeMs": 250,
    "verificationTimeMs": 50,
    "executionTimeMs": 800,
    "totalTimeMs": 1100,
    "estimatedCost": 45,
    "rowsReturned": 1,
    "citationCount": 1,
    "meetsStandards": true
  }
}
```

**Performance Targets:**
- Plan time: ≤350ms average
- End-to-end: ≤2.5s p95
- Citations: ≥1 per answer

### POST /v1/insights/nlq/plan

Get query plan without execution (for debugging).

**Request:**
```json
{
  "query": "Show me donations by region",
  "tenantId": "tenant_123"
}
```

**Response:**
```json
{
  "success": true,
  "plan": {
    "intent": "Show donations by region",
    "metrics": [
      {
        "id": "donation_amount",
        "aggregation": "sum",
        "alias": "total_donations"
      }
    ],
    "dimensions": [
      {
        "table": "donations",
        "column": "region",
        "alias": "region"
      }
    ],
    "timeRange": {
      "start": "2024-01-01",
      "end": "2024-12-31",
      "granularity": "month"
    },
    "tenantId": "tenant_123"
  },
  "verification": {
    "valid": true,
    "violations": [],
    "warnings": [],
    "estimatedCost": 35
  },
  "sql": "SELECT sum(amount) AS total_donations, donations.region AS region..."
}
```

### GET /v1/insights/nlq/metrics

Get list of available metrics.

**Response:**
```json
{
  "success": true,
  "metrics": [
    {
      "id": "volunteer_hours",
      "name": "Volunteer Hours",
      "description": "Total hours volunteered by employees",
      "category": "volunteering",
      "aggregations": ["sum", "avg", "count", "median"],
      "dimensions": [
        {
          "name": "program_id",
          "description": "Volunteer program"
        }
      ]
    }
  ]
}
```

## Available Metrics

| Metric ID | Category | Aggregations | CSRD Aligned |
|-----------|----------|-------------|--------------|
| `volunteer_hours` | Volunteering | sum, avg, count, median | ✅ |
| `donation_amount` | Donations | sum, avg, count, min, max | ✅ |
| `participant_count` | Engagement | count_distinct | ❌ |
| `sroi_ratio` | Social Return | avg, min, max, median | ✅ |
| `carbon_offset` | Impact | sum, avg | ✅ |

## Safety Guardrails

### Allow Lists

**Allowed Functions:**
- Aggregations: `sum`, `avg`, `count`, `min`, `max`, `median`
- Date/Time: `toStartOfDay`, `toStartOfMonth`, `toStartOfYear`
- String: `lower`, `upper`, `substring`, `concat`
- Math: `round`, `floor`, `ceil`

**Allowed Operators:**
- Comparison: `=`, `!=`, `>`, `<`, `>=`, `<=`
- Logical: `AND`, `OR`, `NOT`
- Sets: `IN`, `NOT IN`, `BETWEEN`

### Deny Lists

**Denied Keywords:**
- DDL: `DROP`, `DELETE`, `TRUNCATE`, `ALTER`, `CREATE`
- DML: `INSERT`, `UPDATE`
- Dangerous: `EXEC`, `UNION`, `WAITFOR`, `SLEEP`

### Cost & Time Budgets

**Standard Tier:**
- Max execution time: 5s
- Max rows scanned: 1M
- Max rows returned: 10K
- Max joins: 3
- Max cost points: 100

**Enterprise Tier:**
- Max execution time: 15s
- Max rows scanned: 10M
- Max rows returned: 50K
- Max joins: 5
- Max cost points: 500

### Row-Level Security

**All queries MUST include:**
- `tenant_id` filter in WHERE clause
- Time range filter

Example:
```sql
SELECT sum(hours) FROM volunteer_activities
WHERE tenant_id = {param1:String}
  AND timestamp >= {param2:DateTime}
  AND timestamp < {param3:DateTime}
```

### PII Protection

**Auto-redacted fields:**
- `email`, `employee_email`, `donor_email`
- `phone`, `phone_number`
- `name`, `employee_name`, `donor_name`
- `address`, `ip_address`
- `ssn`, `tax_id`

**Redaction methods:**
- Emails: `jo***@example.com`
- Phones: `***-***-1234`
- Names: `John D***`
- IDs: `1234***`

## Error Handling

### 400 Bad Request

**Query validation failed:**
```json
{
  "success": false,
  "error": "Query validation failed",
  "violations": [
    "Metric not allowed: unknown_metric",
    "Time range exceeds maximum: 2000 days (max 730)"
  ]
}
```

### 500 Internal Server Error

**Query execution failed:**
```json
{
  "success": false,
  "error": "Query planning failed: Invalid time range"
}
```

## Example Queries

### Volunteer Hours by Region
```
"How many volunteer hours by region in 2024?"
```

### Donations Trend
```
"Show me monthly donation trends for the last quarter"
```

### SROI Comparison
```
"Compare SROI ratios between programs A and B"
```

### Participant Engagement
```
"Count unique participants by activity type this year"
```

## Integration Example

```typescript
import { InsightsNlqClient } from '@teei/clients';

const client = new InsightsNlqClient({
  baseUrl: 'http://localhost:3015',
});

const result = await client.query({
  query: 'How many volunteer hours in Q1 2024?',
  tenantId: 'tenant_123',
  userId: 'user_456',
  includeEvidence: true,
});

console.log(result.answer);
console.log(result.citations);
```

## Performance Optimization

### Caching

All query results are cached in Redis with TTL:
- Metric queries: 5 minutes
- Aggregations: 15 minutes
- Time-series: 30 minutes

### Query Optimization Tips

1. **Limit time ranges**: Use shortest necessary time window
2. **Minimize dimensions**: Each dimension multiplies query cost
3. **Avoid count_distinct**: Most expensive aggregation
4. **Use filters**: Reduce rows scanned
5. **Cache where possible**: Enable caching for repeated queries

## Monitoring

**Metrics exposed:**
- `nlq_plan_time_ms`: Plan generation time
- `nlq_verification_time_ms`: Safety verification time
- `nlq_execution_time_ms`: Query execution time
- `nlq_total_time_ms`: End-to-end time
- `nlq_cost_points`: Query cost
- `nlq_citations_count`: Citations per answer

**Alerts:**
- Plan time > 500ms
- Total time > 3s
- Error rate > 5%
- Cost > budget

## Support

For questions or issues:
- Email: insights-team@teei.com
- Slack: #insights-nlq
- Docs: https://docs.teei.com/insights/nlq
