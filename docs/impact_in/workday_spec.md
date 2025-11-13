# Workday Volunteer Management API Specification

## Overview

The Workday connector sends TEEI volunteer activity and program enrollment data to Workday's Volunteer Management API, integrating with Workday's HR and CSR modules.

## API Endpoint

**Base URL**: `https://api.workday.com`

**Volunteer Activities Endpoint**: `POST /volunteer-management/v1/activities`

**OAuth Endpoint**: `POST /oauth2/token`

## Authentication

Workday uses **OAuth 2.0 Client Credentials** flow:

1. Obtain access token from OAuth endpoint
2. Use token in API requests (Bearer authentication)
3. Token expires after 1 hour (auto-refresh implemented)

### Token Request

```http
POST /oauth2/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
&client_id={CLIENT_ID}
&client_secret={CLIENT_SECRET}
&scope=volunteer_management
```

### Token Response

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "volunteer_management"
}
```

## Request Format

### Headers

```
Content-Type: application/json
Authorization: Bearer {ACCESS_TOKEN}
X-Workday-Tenant: {TENANT_ID}
```

### Request Body Schema

```json
{
  "organizationId": "string",
  "reportingPeriod": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  },
  "volunteerActivities": [
    {
      "activityId": "string",
      "activityName": "string",
      "activityType": "volunteer | training | mentorship | community_service",
      "volunteerHours": number,
      "participantCount": number,
      "activityDate": "YYYY-MM-DD",
      "status": "completed | in_progress | planned"
    }
  ],
  "programEnrollments": [
    {
      "programId": "string",
      "programName": "string",
      "enrollmentCount": number,
      "completionCount": number (optional),
      "periodStart": "YYYY-MM-DD",
      "periodEnd": "YYYY-MM-DD"
    }
  ],
  "metadata": {
    "source": "string",
    "version": "string",
    "timestamp": "ISO 8601 datetime"
  }
}
```

### Sample Request

```json
{
  "organizationId": "org-workday-123",
  "reportingPeriod": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  },
  "volunteerActivities": [
    {
      "activityId": "teei-volunteer-123-2024-01",
      "activityName": "TEEI Volunteer Activities",
      "activityType": "volunteer",
      "volunteerHours": 200,
      "participantCount": 40,
      "activityDate": "2024-01-31",
      "status": "completed"
    },
    {
      "activityId": "teei-mentorship-123-2024-01",
      "activityName": "TEEI Mentorship Sessions",
      "activityType": "mentorship",
      "volunteerHours": 60,
      "participantCount": 80,
      "activityDate": "2024-01-31",
      "status": "completed"
    }
  ],
  "programEnrollments": [
    {
      "programId": "teei-integration",
      "programName": "TEEI Integration Program",
      "enrollmentCount": 80,
      "completionCount": 80,
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31"
    }
  ],
  "metadata": {
    "source": "TEEI Platform",
    "version": "1.0",
    "timestamp": "2024-02-01T16:45:00Z"
  }
}
```

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "transactionId": "wd-txn-789",
  "activitiesProcessed": 2,
  "enrollmentsProcessed": 1,
  "message": "Volunteer data processed successfully"
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": "Invalid activity type",
  "errorCode": "ACTIVITY_TYPE_INVALID",
  "details": "Activity type must be one of: volunteer, training, mentorship, community_service"
}
```

## Error Codes

| Code | Description | Resolution |
|------|-------------|------------|
| `AUTH_INVALID` | Invalid or expired token | Refresh OAuth token |
| `TENANT_INVALID` | Invalid tenant ID | Verify tenant ID configuration |
| `ACTIVITY_INVALID` | Invalid activity data | Check activity fields |
| `DUPLICATE_ACTIVITY` | Duplicate activity ID | Use unique activity IDs |
| `RATE_LIMIT` | Too many requests | Implement backoff |

## TEEI Mapping

### Volunteer Activities

| TEEI Field | Workday Activity Field | Notes |
|------------|----------------------|-------|
| `volunteerHours` | `volunteerHours` | Direct mapping |
| `volunteersCount` | `participantCount` | Number of volunteers |
| `sessionsCount` | Additional mentorship activity | 1.5 hours per session |

### Program Enrollments

| TEEI Field | Workday Enrollment Field | Notes |
|------------|------------------------|-------|
| `participantsCount` | `enrollmentCount` | Number of participants |
| `participantsCount` | `completionCount` | Assumes all enrolled are active |
| `periodStart` | `periodStart` | ISO date |
| `periodEnd` | `periodEnd` | ISO date |

## Activity Types

- **volunteer**: General volunteer activities
- **training**: Training and skill-building sessions
- **mentorship**: Mentorship and buddy program sessions
- **community_service**: Community service activities

## Retry Logic

The TEEI connector implements:
- Max retries: 3
- Exponential backoff: 1s, 2s, 4s
- Auto token refresh on 401 errors

## Rate Limiting

Workday API limits:
- No explicit rate limit documented
- Best practice: 10 requests per second
- Token: 1 hour expiry (auto-refreshed)

## Mock Mode

Enable mock mode for testing:
```
WORKDAY_MOCK_MODE=true
```

Mock mode bypasses OAuth and simulates responses.

## Environment Variables

```bash
WORKDAY_CLIENT_ID=your-client-id
WORKDAY_CLIENT_SECRET=your-client-secret
WORKDAY_TENANT_ID=your-tenant-id
WORKDAY_API_URL=https://api.workday.com
WORKDAY_MOCK_MODE=false
```

## Support

For API issues, contact Workday Support:
- Portal: https://community.workday.com
- Documentation: https://doc.workday.com
