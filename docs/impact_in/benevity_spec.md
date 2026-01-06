# Benevity Impact API Specification

## Overview

The Benevity connector sends TEEI program impact data to Benevity's Impact API, enabling companies to track and report volunteer hours, participant engagement, and outcome scores within the Benevity platform.

## API Endpoint

**Base URL**: `https://api.benevity.com/v1`

**Webhook Endpoint**: `POST /impact`

## Authentication

Benevity uses **Bearer Token** authentication:

```http
Authorization: Bearer YOUR_API_KEY
```

API keys are organization-specific and provided by Benevity.

## Request Format

### Headers

```
Content-Type: application/json
Authorization: Bearer {API_KEY}
X-API-Version: 1.0
```

### Request Body Schema

```json
{
  "organizationId": "string",
  "programId": "string",
  "reportingPeriod": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "metrics": [
    {
      "metricType": "volunteer_hours | participant_count | program_participation | outcome_score",
      "metricValue": number,
      "metricUnit": "string",
      "category": "string (optional)",
      "description": "string (optional)"
    }
  ],
  "programName": "string",
  "programDescription": "string (optional)",
  "timestamp": "ISO 8601 datetime"
}
```

### Sample Request

```json
{
  "organizationId": "org-12345",
  "programId": "teei-integration",
  "reportingPeriod": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "metrics": [
    {
      "metricType": "volunteer_hours",
      "metricValue": 250.5,
      "metricUnit": "hours",
      "description": "Total volunteer hours contributed"
    },
    {
      "metricType": "participant_count",
      "metricValue": 75,
      "metricUnit": "count",
      "description": "Number of program participants"
    },
    {
      "metricType": "outcome_score",
      "metricValue": 0.85,
      "metricUnit": "score",
      "category": "integration",
      "description": "Average integration score (0-1 scale)"
    }
  ],
  "programName": "TEEI Integration Program",
  "programDescription": "Technology-Enhanced Employment Integration Program",
  "timestamp": "2024-02-01T10:30:00Z"
}
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "transactionId": "txn-abc123",
  "message": "Impact data received successfully",
  "processedAt": "2024-02-01T10:30:05Z"
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": "Invalid authentication token",
  "errorCode": "AUTH_INVALID",
  "timestamp": "2024-02-01T10:30:05Z"
}
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `AUTH_INVALID` | Invalid or expired API key | Verify API key configuration |
| `ORG_NOT_FOUND` | Organization ID not found | Check organizationId matches Benevity account |
| `INVALID_METRIC` | Invalid metric type or value | Verify metric types and values are valid |
| `RATE_LIMIT` | Too many requests | Implement exponential backoff |

## TEEI Mapping

The TEEI platform maps data as follows:

| TEEI Field | Benevity Metric Type | Notes |
|------------|---------------------|-------|
| `volunteerHours` | `volunteer_hours` | Direct mapping |
| `participantsCount` | `participant_count` | Number of participants |
| `volunteersCount` | `program_participation` | Number of volunteers |
| `avgIntegrationScore` | `outcome_score` (category: integration) | 0-1 scale |
| `avgLanguageLevel` | `outcome_score` (category: language) | 0-10 scale |
| `avgJobReadiness` | `outcome_score` (category: job_readiness) | 0-1 scale |

## Retry Logic

The TEEI connector implements exponential backoff:
- Max retries: 3
- Base delay: 1 second
- Backoff multiplier: 2x
- Max delay: 4 seconds

## Rate Limiting

Benevity API limits:
- 100 requests per minute per organization
- 10,000 requests per day per organization

## Mock Mode

For testing, enable mock mode:
```
BENEVITY_MOCK_MODE=true
```

Mock mode simulates API responses without making actual network requests.

## Environment Variables

```bash
BENEVITY_API_KEY=your-api-key-here
BENEVITY_WEBHOOK_URL=https://api.benevity.com/v1/impact
BENEVITY_MOCK_MODE=false
```

## Support

For API issues, contact Benevity Support:
- Email: apisupport@benevity.com
- Documentation: https://developer.benevity.com
