# Notifications Service

## Overview

The Notifications Service is responsible for sending emails, SMS, and push notifications across the TEEI Platform. It provides a reliable, queued notification system with rate limiting, delivery tracking, and scheduled notifications.

## Architecture

### Components

1. **API Layer** - REST endpoints for sending and managing notifications
2. **Email Worker** - BullMQ-based queue processor for reliable delivery
3. **Rate Limiter** - Redis-backed quota enforcement
4. **Scheduler** - Cron-based scheduler for recurring notifications
5. **Template Engine** - MJML/Handlebars email templates
6. **Provider Adapters** - SendGrid (email), Twilio (SMS stub), FCM (push stub)
7. **Event Listeners** - Responds to platform events

### Technology Stack

- **Framework**: Fastify
- **Queue**: BullMQ (Redis-backed)
- **Templates**: MJML + Handlebars
- **Email Provider**: SendGrid API v3
- **SMS Provider**: Twilio (stub for future implementation)
- **Push Provider**: Firebase Cloud Messaging (stub for future implementation)
- **Database**: PostgreSQL (via Drizzle ORM)
- **Cache/Queue**: Redis

## Database Schema

### Tables

#### notifications_queue
Stores all notifications to be sent.

```sql
CREATE TABLE notifications_queue (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,           -- 'email' | 'sms' | 'push'
  channel VARCHAR(50) NOT NULL,        -- 'sendgrid' | 'twilio' | 'fcm'
  template_id VARCHAR(100) NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL,         -- 'queued' | 'sending' | 'sent' | 'failed'
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### notifications_delivery_receipts
Tracks delivery events from providers.

```sql
CREATE TABLE notifications_delivery_receipts (
  id UUID PRIMARY KEY,
  notification_id UUID REFERENCES notifications_queue(id),
  event_type VARCHAR(50) NOT NULL,     -- 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam'
  event_data JSONB,
  received_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### notifications_quotas
Per-tenant notification quotas.

```sql
CREATE TABLE notifications_quotas (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id) UNIQUE,
  email_daily_limit INTEGER NOT NULL DEFAULT 1000,
  email_daily_used INTEGER NOT NULL DEFAULT 0,
  sms_daily_limit INTEGER NOT NULL DEFAULT 100,
  sms_daily_used INTEGER NOT NULL DEFAULT 0,
  push_daily_limit INTEGER NOT NULL DEFAULT 10000,
  push_daily_used INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### POST /v1/notifications/send
Send notification immediately.

**Request:**
```json
{
  "companyId": "uuid",
  "userId": "uuid",
  "type": "email",
  "templateId": "weekly-report",
  "recipient": "user@example.com",
  "subject": "Weekly Report",
  "payload": {
    "companyName": "ACME Corp",
    "reportPeriod": {
      "start": "2025-01-01",
      "end": "2025-01-07"
    },
    "metrics": {
      "totalParticipants": 150,
      "avgConfidenceScore": 85,
      "sroiRatio": 3.2
    },
    "reportUrl": "https://app.teei.com/reports/123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "notificationId": "uuid",
  "status": "queued",
  "message": "Notification queued for sending"
}
```

### POST /v1/notifications/schedule
Schedule notification for future delivery.

**Request:**
```json
{
  "companyId": "uuid",
  "type": "email",
  "templateId": "welcome",
  "recipient": "user@example.com",
  "subject": "Welcome to TEEI Platform",
  "payload": { ... },
  "scheduledAt": "2025-01-10T09:00:00Z"
}
```

### DELETE /v1/notifications/:id/cancel
Cancel scheduled notification.

### GET /v1/notifications/history
Query notification history with filters.

**Query Parameters:**
- `companyId` - Filter by company
- `userId` - Filter by user
- `type` - Filter by type (email, sms, push)
- `status` - Filter by status (queued, sent, failed)
- `limit` - Pagination limit (default: 50)
- `offset` - Pagination offset (default: 0)

### GET /v1/notifications/:id
Get notification details with delivery receipts.

### GET /v1/notifications/quota
Check remaining quota for a company.

**Query Parameters:**
- `companyId` - Required

**Response:**
```json
{
  "success": true,
  "companyId": "uuid",
  "quotas": {
    "email": {
      "limit": 1000,
      "used": 150,
      "remaining": 850,
      "resetAt": "2025-01-11T00:00:00Z"
    },
    "sms": {
      "limit": 100,
      "used": 5,
      "remaining": 95,
      "resetAt": "2025-01-11T00:00:00Z"
    },
    "push": {
      "limit": 10000,
      "used": 1200,
      "remaining": 8800,
      "resetAt": "2025-01-11T00:00:00Z"
    }
  }
}
```

### POST /v1/notifications/webhooks/sendgrid
Webhook receiver for SendGrid delivery events.

### POST /v1/notifications/webhooks/twilio
Webhook receiver for Twilio delivery events.

## Email Templates

### Available Templates

1. **weekly-report.mjml** - Weekly impact report
2. **alert-slo-breach.mjml** - SLO breach alert
3. **welcome.mjml** - Welcome email for new users
4. **data-export-ready.mjml** - GDPR data export notification

### Template Variables

#### weekly-report
```typescript
{
  companyName: string;
  reportPeriod: { start: string; end: string };
  metrics: {
    totalParticipants: number;
    avgConfidenceScore: number;
    sroiRatio: number;
  };
  reportUrl: string;
}
```

#### alert-slo-breach
```typescript
{
  serviceName: string;
  metric: string;
  threshold: number;
  current: number;
  timestamp: string;
  dashboardUrl: string;
}
```

#### welcome
```typescript
{
  userName: string;
  dashboardUrl: string;
  helpCenterUrl: string;
}
```

#### data-export-ready
```typescript
{
  userName: string;
  requestDate: string;
  exportDate: string;
  fileFormat: string;
  fileSize: string;
  downloadUrl: string;
  expiryDays: number;
  privacyPolicyUrl: string;
}
```

### Custom Handlebars Helpers

- `{{formatDate date}}` - Format date as "January 1, 2025"
- `{{formatNumber num}}` - Format number with commas: "1,000"
- `{{formatCurrency amount}}` - Format as currency: "$1,000.00"
- `{{formatPercent value}}` - Format as percentage: "85.5%"

## Rate Limiting

### Quota Configuration

Default quotas (configurable via environment variables):
- **Email**: 1,000 per day
- **SMS**: 100 per day
- **Push**: 10,000 per day

### Quota Enforcement

1. Check quota before sending
2. If exceeded, reject with error
3. If allowed, send and increment counter
4. Reset daily at midnight

### Admin Override

Admins can update quota limits via database:
```sql
UPDATE notifications_quotas
SET email_daily_limit = 5000
WHERE company_id = 'uuid';
```

## Event-Driven Notifications

The service listens to platform events and automatically sends notifications:

### reporting.generated
Triggers: Weekly report email
```json
{
  "companyId": "uuid",
  "reportId": "uuid",
  "reportUrl": "https://...",
  "reportPeriod": { ... },
  "metrics": { ... },
  "recipientEmail": "admin@company.com"
}
```

### slo.breached
Triggers: SLO breach alert
```json
{
  "serviceName": "api-gateway",
  "metric": "p95_latency",
  "threshold": 500,
  "current": 850,
  "timestamp": "2025-01-10T15:30:00Z",
  "dashboardUrl": "https://...",
  "alertEmail": "oncall@company.com"
}
```

### privacy.export.completed
Triggers: GDPR data export notification
```json
{
  "userId": "uuid",
  "userName": "John Doe",
  "userEmail": "user@example.com",
  "downloadUrl": "https://...",
  "requestDate": "2025-01-01",
  "exportDate": "2025-01-10",
  "fileFormat": "JSON",
  "fileSize": "2.5 MB",
  "expiryDays": 7
}
```

### user.registered
Triggers: Welcome email
```json
{
  "userId": "uuid",
  "userName": "John Doe",
  "userEmail": "user@example.com",
  "companyId": "uuid",
  "dashboardUrl": "https://app.teei.com",
  "helpCenterUrl": "https://help.teei.com"
}
```

## Queue System

### BullMQ Configuration

- **Concurrency**: 10 workers
- **Rate Limit**: 100 jobs per second
- **Retry Strategy**: Exponential backoff (5s, 10s, 20s)
- **Max Attempts**: 3
- **Job Retention**:
  - Completed: 7 days (up to 10,000 jobs)
  - Failed: 30 days

### Queue Monitoring

Get queue status:
```bash
GET /health/queue
```

Response:
```json
{
  "status": "ok",
  "queue": {
    "waiting": 10,
    "active": 5,
    "completed": 1234,
    "failed": 3
  },
  "timestamp": "2025-01-10T12:00:00Z"
}
```

## Delivery Tracking

### SendGrid Webhooks

Configure webhook URL in SendGrid dashboard:
```
https://your-domain.com/v1/notifications/webhooks/sendgrid
```

Tracked events:
- `delivered` - Email delivered to recipient's server
- `open` - Recipient opened email
- `click` - Recipient clicked link
- `bounce` - Email bounced
- `spam` - Email marked as spam
- `unsubscribe` - Recipient unsubscribed

## Provider Configuration

### SendGrid (Email)

1. Create SendGrid account: https://sendgrid.com
2. Generate API key: Settings → API Keys
3. Verify sender identity: Settings → Sender Authentication
4. Configure environment variables:
```env
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@teei-platform.com
SENDGRID_FROM_NAME=TEEI Platform
```

### Twilio (SMS) - Stub

1. Create Twilio account: https://www.twilio.com
2. Get Account SID and Auth Token
3. Purchase phone number
4. Configure environment variables:
```env
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
```
5. Implement `sendSms()` in `twilio-stub.ts`

### FCM (Push) - Stub

1. Create Firebase project: https://console.firebase.google.com
2. Download service account JSON
3. Configure environment variable:
```env
FIREBASE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
```
4. Implement `sendPush()` in `fcm-stub.ts`

## Scheduled Notifications

### Cron Jobs

- **Process Scheduled**: Every minute
- **Weekly Reports**: Monday at 9am

### Add Custom Schedule

```typescript
import { addCronJob } from './lib/scheduler.js';

addCronJob('daily-digest', '0 8 * * *', async () => {
  // Send daily digest emails
});
```

## Health Checks

### Endpoints

- `GET /health` - Overall health
- `GET /health/live` - Liveness probe
- `GET /health/ready` - Readiness probe
- `GET /health/dependencies` - Check all dependencies
- `GET /health/queue` - Queue status

### Dependencies Checked

- Database (PostgreSQL)
- Redis (rate limiting & queue)
- SendGrid (email provider)
- Twilio (SMS provider stub)
- FCM (push provider stub)
- Queue system (BullMQ)

## Environment Variables

See `.env.example` for full configuration. Key variables:

```env
# Service
PORT_NOTIFICATIONS=3008

# SendGrid
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@teei-platform.com
SENDGRID_FROM_NAME=TEEI Platform

# Redis
REDIS_URL=redis://localhost:6379

# Rate Limits
EMAIL_DAILY_LIMIT=1000
SMS_DAILY_LIMIT=100
PUSH_DAILY_LIMIT=10000

# NATS
NATS_URL=nats://localhost:4222

# Database
DATABASE_URL=postgresql://...
```

## Development

### Run Service

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm --filter @teei/notifications dev

# Build
pnpm --filter @teei/notifications build

# Start production
pnpm --filter @teei/notifications start
```

### Test Email Templates

Compile and preview templates:

```typescript
import { compileTemplate } from './lib/template-compiler.js';

const { html, text } = compileTemplate('weekly-report', {
  companyName: 'ACME Corp',
  reportPeriod: { start: '2025-01-01', end: '2025-01-07' },
  metrics: { totalParticipants: 150, avgConfidenceScore: 85, sroiRatio: 3.2 },
  reportUrl: 'https://app.teei.com/reports/123'
});

console.log(html); // Rendered HTML
console.log(text); // Plain text version
```

## Troubleshooting

### Emails Not Sending

1. Check SendGrid API key is configured
2. Verify sender email is verified in SendGrid
3. Check queue status: `GET /health/queue`
4. Check Redis connection: `GET /health/dependencies`
5. Review logs for errors

### Rate Limit Issues

1. Check current quota: `GET /v1/notifications/quota?companyId=xxx`
2. Review quota settings in database
3. Adjust limits if needed (admin only)

### Scheduled Notifications Not Firing

1. Check scheduler is running: Logs should show "Notification scheduler initialized"
2. Verify cron jobs are active: Check `scheduledJobs` Map
3. Ensure `scheduledAt` is in future
4. Check notification status in database

## Security Considerations

### Rate Limiting
- Prevents abuse and quota overruns
- Enforced at tenant level
- Redis-backed for distributed systems

### PII Protection
- Email addresses stored encrypted
- Delivery receipts do not contain message content
- User data in templates not persisted

### Webhook Security
- SendGrid webhook signature verification (future)
- IP whitelist for webhook endpoints (future)
- HTTPS only in production

## Future Enhancements

1. **SMS Implementation** - Complete Twilio integration
2. **Push Notifications** - Complete FCM integration
3. **A/B Testing** - Test different email templates
4. **Analytics** - Open rates, click rates, conversion tracking
5. **Unsubscribe Management** - Handle opt-outs
6. **Template Builder** - Visual MJML template editor
7. **Multi-language** - i18n support for templates
8. **Batch Sending** - Bulk email campaigns
9. **Webhook Signature Verification** - Validate incoming webhooks

## Support

For questions or issues:
- Documentation: `/docs/Notifications_Service.md`
- Test Matrix: `/reports/notifications_test_matrix.md`
- Integration Report: `/reports/notifications_lead_report.md`
