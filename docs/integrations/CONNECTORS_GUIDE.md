# TEEI CSR Platform - Data Connectors Guide

**Version**: 2.0.0
**Last Updated**: 2025-11-17

## Overview

The TEEI CSR Platform integrates with 12 data sources to provide comprehensive impact tracking:

### External Platforms (3)
1. **Benevity** - Corporate giving and volunteering platform
2. **Goodera** - CSR and employee engagement platform
3. **Workday** - HR and workforce management (SCIM)

### Internal TEEI Services (3)
4. **Kintell** - Language and mentorship sessions
5. **Upskilling** - Course completion and credentialing
6. **Buddy** - Buddy matching and integration support

All connectors support:
- ✅ OAuth2 authentication (where applicable)
- ✅ Pagination for large datasets
- ✅ Incremental sync (fetch only new/updated records)
- ✅ Automatic retry with exponential backoff
- ✅ PII redaction before persistence
- ✅ Idempotent ingestion (no duplicates)
- ✅ Health checks and monitoring

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Impact-In Service                        │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Benevity    │  │   Goodera    │  │   Workday    │     │
│  │  Inbound     │  │   Inbound    │  │    SCIM      │     │
│  │  Client      │  │   Client     │  │   Client     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Kintell    │  │  Upskilling  │  │    Buddy     │     │
│  │   Client     │  │   Client     │  │   Client     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           PII Redaction Middleware                  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Event Contracts Normalization             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │           Scheduler & Ingestion Routes              │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Event Bus     │
                    │  (Analytics)    │
                    └─────────────────┘
```

---

## API Endpoints

### Trigger Manual Ingestion

```http
POST /v1/impact-in/ingest
Content-Type: application/json

{
  "companyId": "uuid",
  "connectors": ["benevity", "goodera"],  // or ["all"]
  "since": "2025-01-01T00:00:00Z",       // optional
  "maxRecords": 500                       // optional, default 500
}
```

**Response**:
```json
{
  "companyId": "uuid",
  "connectors": [
    {
      "connector": "benevity",
      "success": true,
      "recordCount": 150,
      "errors": [],
      "duration": 2345
    }
  ],
  "totalRecords": 150,
  "errors": [],
  "duration": 2345
}
```

### Check Connector Status

```http
GET /v1/impact-in/ingest/status?companyId=uuid
```

**Response**:
```json
{
  "companyId": "uuid",
  "connectors": [
    {
      "connector": "benevity",
      "healthy": true,
      "lastSync": "2025-11-17T10:00:00Z"
    }
  ],
  "timestamp": "2025-11-17T10:30:00Z"
}
```

### Health Check

```http
GET /v1/impact-in/integrations/health?companyId=uuid
```

**Response**:
```json
{
  "status": "healthy",
  "connectors": [
    {
      "connector": "benevity",
      "healthy": true,
      "responseTimeMs": 234,
      "lastChecked": "2025-11-17T10:30:00Z"
    }
  ],
  "summary": {
    "total": 6,
    "healthy": 6,
    "unhealthy": 0,
    "degraded": 0
  },
  "timestamp": "2025-11-17T10:30:00Z"
}
```

---

## Connector Configuration

### 1. Benevity

**Purpose**: Ingest employee volunteer hours and charitable donations

**Authentication**: OAuth2 (Client Credentials)

**Environment Variables**:
```env
BENEVITY_API_URL=https://api.benevity.com
BENEVITY_CLIENT_ID=your-client-id
BENEVITY_CLIENT_SECRET=your-client-secret
BENEVITY_TOKEN_URL=https://api.benevity.com/oauth/token
```

**OAuth Scopes Required**:
- `volunteer:read` - Read volunteer activity data
- `donations:read` - Read donation data

**Data Ingested**:
- Volunteer activities (hours, cause areas, nonprofits)
- Charitable donations (amount, match status, frequency)

**Event Contracts**:
- `external.volunteer.logged`
- `external.donation.made`

**Rate Limits**: 100 requests/minute

---

### 2. Goodera

**Purpose**: Ingest CSR program participation and contributions

**Authentication**: OAuth2 (Client Credentials)

**Environment Variables**:
```env
GOODERA_API_URL=https://api.goodera.com
GOODERA_CLIENT_ID=your-client-id
GOODERA_CLIENT_SECRET=your-client-secret
GOODERA_TOKEN_URL=https://api.goodera.com/oauth/token
```

**OAuth Scopes Required**:
- `volunteer:read`
- `contributions:read`

**Data Ingested**:
- Volunteer activities
- Contributions (donations and grants)

**Event Contracts**:
- `external.volunteer.logged`
- `external.donation.made`

**Rate Limits**: 60 requests/minute

---

### 3. Workday (SCIM)

**Purpose**: Sync employee directory, org structure, and cost centers

**Authentication**: Basic Auth (Integration System User)

**Environment Variables**:
```env
WORKDAY_SCIM_URL=https://wd5-impl-services1.workday.com/ccx/scim/{tenant}/v2
WORKDAY_ISU_USERNAME=your-isu-username
WORKDAY_ISU_PASSWORD=your-isu-password
WORKDAY_TENANT_ID=your-tenant-id
```

**SCIM Endpoints Used**:
- `/Users` - Employee directory
- `/ServiceProviderConfig` - Health check

**Data Ingested**:
- User profiles (name, email, job title, department)
- Organizational structure (cost centers, divisions)
- Manager relationships

**Event Contracts**:
- `external.user.synced`

**Rate Limits**: 100 requests/minute

**Setup Instructions**:

1. Create Integration System User (ISU) in Workday
2. Assign permissions:
   - Get Workers
   - Get Organizations
   - SCIM API Access
3. Generate ISU password
4. Test with: `GET {SCIM_URL}/ServiceProviderConfig`

---

### 4. Kintell (Language & Mentorship)

**Purpose**: Ingest language and mentorship session data

**Authentication**: Internal API Key

**Environment Variables**:
```env
KINTELL_CONNECTOR_URL=http://kintell-connector:3010
KINTELL_API_KEY=internal-api-key-optional
```

**Data Ingested**:
- Language sessions (CEFR levels, topics, duration)
- Mentorship sessions (topics, outcomes)
- Session ratings and feedback

**Event Contracts**:
- `kintell.session.completed`
- `kintell.session.scheduled`
- `kintell.rating.created`

**Internal Service**: Yes (no external auth required in production)

---

### 5. Upskilling

**Purpose**: Ingest course completions and credentials

**Authentication**: Internal API Key

**Environment Variables**:
```env
UPSKILLING_CONNECTOR_URL=http://upskilling-connector:3011
UPSKILLING_API_KEY=internal-api-key-optional
```

**Data Ingested**:
- Course completions (provider, certificate URLs)
- Credentials issued (type, issuer, expiration)
- Learning progress updates

**Event Contracts**:
- `upskilling.course.completed`
- `upskilling.credential.issued`
- `upskilling.progress.updated`

**Internal Service**: Yes

---

### 6. Buddy

**Purpose**: Ingest buddy system matches and events

**Authentication**: Internal API Key

**Environment Variables**:
```env
BUDDY_CONNECTOR_URL=http://buddy-connector:3012
BUDDY_API_KEY=internal-api-key-optional
```

**Data Ingested**:
- Buddy matches (matching criteria, status)
- Buddy events (meetups, activities)
- Check-ins (wellbeing scores, progress notes)
- Feedback (ratings, comments)

**Event Contracts**:
- `buddy.match.created`
- `buddy.event.logged`
- `buddy.checkin.completed`
- `buddy.feedback.submitted`

**Internal Service**: Yes

---

## Scheduling Ingestion

### Cron-based Scheduling (Recommended)

Create a cron job to trigger ingestion:

```bash
# Every 6 hours
0 */6 * * * curl -X POST http://impact-in:3007/v1/impact-in/ingest \
  -H "Content-Type: application/json" \
  -d '{"companyId":"uuid","connectors":["all"],"since":"2025-01-01T00:00:00Z"}'
```

### Application-level Scheduling

Use the `/ingest/schedule` endpoint:

```http
POST /v1/impact-in/ingest/schedule
Content-Type: application/json

{
  "companyId": "uuid",
  "connectors": ["benevity", "goodera"],
  "interval": "0 */6 * * *"  // cron expression
}
```

---

## Security & Compliance

### PII Redaction

All ingested data passes through PII redaction before persistence:

**Redacted Patterns**:
- Email addresses → `[EMAIL_REDACTED]`
- Phone numbers → `[PHONE_REDACTED]`
- SSN → `[SSN_REDACTED]`
- Credit cards → `[CC_REDACTED]`

**Hashed Fields** (for analytics uniqueness):
- `email` → `hash:abc123...`
- `userId` → `hash:def456...`
- `employeeNumber` → `hash:ghi789...`

**Sensitive Fields** (always redacted):
- `password`, `ssn`, `credit_card`, `api_key`, `token`

### Audit Logging

All ingestion events are logged with:
- Connector name
- Record count
- Redaction count
- Errors (if any)
- Duration

Logs are shipped to centralized logging (ELK/CloudWatch).

### No Secrets in Repo

All credentials must be stored in:
- Environment variables (`.env` file for local dev)
- Secrets Manager (AWS Secrets Manager, Vault) for production

---

## Troubleshooting

### Common Issues

#### 1. OAuth Token Expired

**Symptom**: `401 Unauthorized`

**Solution**: Tokens are auto-refreshed. Check that `clientId` and `clientSecret` are correct.

#### 2. Rate Limit Exceeded

**Symptom**: `429 Too Many Requests`

**Solution**: Clients implement exponential backoff automatically. Check that `maxRecords` is not too high.

#### 3. PII Validation Failed

**Symptom**: `PII detected after redaction`

**Solution**: Check PII redaction patterns in `lib/pii-redaction.ts`. Add new patterns if needed.

#### 4. Connector Health Check Failed

**Symptom**: `/integrations/health` returns `unhealthy`

**Solution**:
- Check credentials (env vars)
- Verify network connectivity to external platforms
- Check internal service ports (kintell:3010, upskilling:3011, buddy:3012)

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

---

## Testing

### Manual Testing

```bash
# Test Benevity health
curl http://localhost:3007/v1/impact-in/integrations/health/benevity?companyId=uuid

# Trigger manual sync
curl -X POST http://localhost:3007/v1/impact-in/ingest \
  -H "Content-Type: application/json" \
  -d '{"companyId":"uuid","connectors":["benevity"],"maxRecords":10}'
```

### Contract Tests

Run connector contract tests:

```bash
pnpm --filter @teei/impact-in test
```

### E2E Tests

Run end-to-end ingestion flow:

```bash
pnpm --filter @teei/impact-in test:e2e
```

---

## Monitoring & Observability

### Metrics

Track these metrics per connector:
- `ingestion.records.count` - Total records ingested
- `ingestion.errors.count` - Total errors
- `ingestion.duration.ms` - Ingestion duration
- `connector.health.status` - Health check status (0 = unhealthy, 1 = healthy)

### Dashboards

Use `/integrations/metrics` to fetch metrics for Grafana/Datadog:

```http
GET /v1/impact-in/integrations/metrics?companyId=uuid
```

### Alerts

Set up alerts for:
- Connector health degradation (>2 connectors unhealthy)
- High error rate (>10% errors)
- Sync lag (last sync >24 hours ago)

---

## Roadmap

### Planned Connectors
- **Salesforce** - CRM integration for corporate partnerships
- **Microsoft Teams** - Employee engagement events
- **Slack** - Team collaboration metrics

### Planned Features
- **Conflict Resolution** - Handle duplicate records across sources
- **Data Quality Scores** - Automated data quality checks
- **Real-time Webhooks** - Real-time event ingestion (vs polling)

---

## Support

For issues or questions:
- **GitHub Issues**: https://github.com/yourorg/teei-platform/issues
- **Slack**: #teei-integrations
- **Email**: support@teei-platform.com

---

**Last Updated**: 2025-11-17
**Maintained By**: Worker 4 Team
