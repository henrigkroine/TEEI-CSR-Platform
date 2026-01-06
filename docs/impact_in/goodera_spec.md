# Goodera Impact API Specification

## Overview

The Goodera connector sends TEEI program impact data to Goodera's Impact Measurement API, enabling companies to track social impact dimensions and outcomes in the Goodera platform.

## API Endpoint

**Base URL**: `https://api.goodera.com/v1`

**Impact Data Endpoint**: `POST /impact-data`

**Batch Endpoint**: `POST /impact-data/batch`

## Authentication

Goodera uses **API Key** authentication:

```http
X-API-Key: YOUR_API_KEY
```

API keys are provided by Goodera per organization.

## Request Format

### Headers

```
Content-Type: application/json
X-API-Key: {API_KEY}
X-API-Version: 1.0
```

### Single Record Schema

```json
{
  "projectId": "string",
  "organizationId": "string",
  "reportingPeriod": {
    "from": "YYYY-MM-DD",
    "to": "YYYY-MM-DD"
  },
  "impactDimensions": [
    {
      "dimensionId": "string",
      "dimensionName": "string",
      "value": number,
      "unit": "string",
      "beneficiaries": number (optional)
    }
  ],
  "metadata": {
    "source": "string",
    "timestamp": "ISO 8601 datetime",
    "version": "string"
  }
}
```

### Batch Schema

Batch requests support up to 100 records per request:

```json
{
  "records": [
    {
      "projectId": "string",
      "organizationId": "string",
      "reportingPeriod": {...},
      "impactDimensions": [...],
      "metadata": {...}
    }
  ]
}
```

### Sample Request

```json
{
  "projectId": "teei-integration",
  "organizationId": "org-67890",
  "reportingPeriod": {
    "from": "2024-01-01",
    "to": "2024-01-31"
  },
  "impactDimensions": [
    {
      "dimensionId": "volunteer_engagement",
      "dimensionName": "Volunteer Engagement",
      "value": 45,
      "unit": "volunteers",
      "beneficiaries": 120
    },
    {
      "dimensionId": "volunteer_hours",
      "dimensionName": "Volunteer Hours",
      "value": 180,
      "unit": "hours"
    },
    {
      "dimensionId": "integration_outcome",
      "dimensionName": "Integration Outcome",
      "value": 82,
      "unit": "percentage",
      "beneficiaries": 120
    },
    {
      "dimensionId": "language_proficiency",
      "dimensionName": "Language Proficiency",
      "value": 7.2,
      "unit": "level_0_10",
      "beneficiaries": 120
    }
  ],
  "metadata": {
    "source": "TEEI Platform",
    "timestamp": "2024-02-01T14:20:00Z",
    "version": "1.0"
  }
}
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "transactionId": "goodera-12345",
  "recordsProcessed": 1,
  "message": "Impact data processed successfully"
}
```

### Batch Success Response

```json
{
  "success": true,
  "batchId": "batch-abc123",
  "recordsProcessed": 50,
  "message": "Batch processed successfully"
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": "Invalid dimension ID",
  "errorCode": "DIMENSION_INVALID",
  "details": "Dimension ID 'invalid_dimension' not found"
}
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `AUTH_INVALID` | Invalid API key | Verify API key configuration |
| `PROJECT_NOT_FOUND` | Project ID not found | Check projectId matches Goodera project |
| `DIMENSION_INVALID` | Invalid dimension ID | Use valid dimension IDs |
| `BATCH_SIZE_EXCEEDED` | Batch size > 100 records | Split into multiple batches |
| `RATE_LIMIT` | Rate limit exceeded | Wait before retrying |

## TEEI Mapping

| TEEI Field | Goodera Dimension ID | Unit | Notes |
|------------|---------------------|------|-------|
| `volunteersCount` | `volunteer_engagement` | volunteers | Direct mapping |
| `volunteerHours` | `volunteer_hours` | hours | Direct mapping |
| `participantsCount` | `program_reach` | participants | Direct mapping |
| `sessionsCount` | `session_count` | sessions | Direct mapping |
| `avgIntegrationScore` | `integration_outcome` | percentage | Converted to 0-100 scale |
| `avgLanguageLevel` | `language_proficiency` | level_0_10 | 0-10 scale |
| `avgJobReadiness` | `employability` | percentage | Converted to 0-100 scale |

## Batch Processing

The TEEI connector automatically batches requests:
- Max batch size: 100 records
- Automatic splitting for larger datasets
- Sequential processing with rate limiting

## Rate Limiting

Goodera API limits:
- 100 requests per minute
- Rate limit enforced at 600ms between requests
- Returns 429 status code when exceeded

## Mock Mode

Enable mock mode for testing:
```
GOODERA_MOCK_MODE=true
```

## Environment Variables

```bash
GOODERA_API_KEY=your-api-key-here
GOODERA_API_URL=https://api.goodera.com/v1
GOODERA_MOCK_MODE=false
```

## Support

For API issues, contact Goodera Support:
- Email: support@goodera.com
- Documentation: https://docs.goodera.com
