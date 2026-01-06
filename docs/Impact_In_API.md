# Impact-In API Documentation

**Version**: 1.0.0
**Last Updated**: 2025-11-13

## Overview

The Impact-In API enables companies to push their TEEI impact metrics to external CSR platforms like Benevity, Goodera, and Workday. Each platform has its own data format, and this API provides mappers to transform TEEI metrics into platform-specific schemas.

## Authentication

All Impact-In endpoints require API key authentication.

### Getting an API Key

API keys are generated per company and stored securely (hashed).

```typescript
// Generate a new API key (admin only)
const apiKey = await generateApiKey(
  companyId,
  'Benevity Integration',
  ['read', 'write'],
  1000 // rate limit per hour
);

// Returns: { key: 'teei_abc123...', id: 'uuid' }
```

### Using an API Key

Include the API key in the `Authorization` header:

```bash
Authorization: Bearer teei_abc123...
```

## Endpoints

### 1. Benevity Integration

**POST** `/impact-in/benevity`

Maps TEEI metrics to Benevity's expected format.

**Request**:
```json
{
  "period": "2025-Q1"
}
```

**Response**:
```json
{
  "success": true,
  "provider": "benevity",
  "payload": {
    "companyId": "uuid",
    "reportingPeriod": "2025-Q1",
    "volunteerMetrics": {
      "totalVolunteers": 5,
      "totalHours": 150,
      "averageHoursPerVolunteer": 30
    },
    "impactMetrics": {
      "beneficiariesReached": 10,
      "socialValue": 32400,
      "sroiRatio": 3.42
    },
    "categories": [
      { "name": "Buddy Program", "hours": 60, "volunteers": 2 },
      { "name": "Language Connect", "hours": 45, "volunteers": 1 },
      { "name": "Mentorship", "hours": 45, "volunteers": 2 }
    ]
  }
}
```

### 2. Goodera Integration

**POST** `/impact-in/goodera`

Maps TEEI metrics to Goodera's expected format with UN SDG alignment.

**Request**:
```json
{
  "period": "2025-Q1"
}
```

**Response**:
```json
{
  "success": true,
  "provider": "goodera",
  "payload": {
    "organization": {
      "id": "uuid",
      "name": "ACME Corp"
    },
    "reporting": {
      "period": "2025-Q1",
      "submittedAt": "2025-11-13T12:00:00Z"
    },
    "volunteers": {
      "count": 5,
      "hours": 150,
      "engagement": "high"
    },
    "outcomes": [
      { "indicator": "Social Integration", "value": 72, "unit": "percentage", "target": 80 },
      { "indicator": "Language Proficiency", "value": 65, "unit": "percentage", "target": 75 },
      { "indicator": "Job Readiness", "value": 58, "unit": "percentage", "target": 85 }
    ],
    "sdgAlignment": ["4", "8", "10"]
  }
}
```

**SDG Alignment**:
- SDG 4: Quality Education
- SDG 8: Decent Work and Economic Growth
- SDG 10: Reduced Inequalities

### 3. Workday Integration

**POST** `/impact-in/workday`

Maps TEEI metrics to Workday's expected XML-ready format.

**Request**:
```json
{
  "period": "2025-Q1"
}
```

**Response**:
```json
{
  "success": true,
  "provider": "workday",
  "payload": {
    "CompanyReference": {
      "ID": "uuid"
    },
    "EffectivePeriod": {
      "StartDate": "2025-01-01",
      "EndDate": "2025-03-31"
    },
    "VolunteeringData": {
      "ParticipantCount": 5,
      "TotalHours": 150,
      "Activities": [
        { "ActivityType": "Buddy_Program", "Hours": 60, "ParticipantCount": 2 },
        { "ActivityType": "Language_Connect", "Hours": 45, "ParticipantCount": 1 },
        { "ActivityType": "Mentorship", "Hours": 45, "ParticipantCount": 2 }
      ]
    },
    "ImpactMeasurement": {
      "SocialROI": 3.42,
      "BeneficiariesReached": 10,
      "OutcomeMetrics": [
        { "MetricName": "Integration_Score", "Value": 0.72, "Unit": "percentage" },
        { "MetricName": "Language_Proficiency", "Value": 0.65, "Unit": "percentage" },
        { "MetricName": "Job_Readiness", "Value": 0.58, "Unit": "percentage" }
      ]
    }
  }
}
```

## Rate Limiting

- Default: 1000 requests per hour per API key
- Configurable per company
- HTTP 429 if rate limit exceeded

## Security

- API keys are hashed (SHA-256) in database
- Keys never stored in plaintext
- Last used timestamp tracked
- Optional expiration date
- Revocation supported

## Usage Example

```bash
# Get Benevity payload
curl -X POST http://localhost:3001/impact-in/benevity \
  -H "Authorization: Bearer teei_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"period":"2025-Q1"}'

# Get Goodera payload
curl -X POST http://localhost:3001/impact-in/goodera \
  -H "Authorization: Bearer teei_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"period":"2025-Q1"}'

# Get Workday payload
curl -X POST http://localhost:3001/impact-in/workday \
  -H "Authorization: Bearer teei_abc123..." \
  -H "Content-Type: application/json" \
  -d '{"period":"2025-Q1"}'
```

## Integration Flow

1. **Generate API Key**: Company admin generates API key in TEEI platform
2. **Configure Integration**: Company provides TEEI API key to external platform
3. **Automated Push**: External platform calls TEEI Impact-In endpoints periodically
4. **Data Mapping**: TEEI transforms metrics to platform-specific format
5. **Push to External**: External platform receives formatted data

## Future Enhancements

- [ ] Webhooks for real-time push
- [ ] Automated scheduling (daily, weekly, monthly)
- [ ] Custom field mapping configuration
- [ ] Audit logs for all pushes
- [ ] Rollback capability
- [ ] Batch operations

## Contact

For integration support:
- **Technical**: Backend Team Lead (Worker 3)
- **Partnerships**: TEEI Platform Owner

---

**Last Review**: 2025-11-13
**Next Review**: After first production integration
