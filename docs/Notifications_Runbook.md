# Notifications Service Runbook

**Service**: Notifications (Email/SMS/Push)
**Owner**: Worker 4 / Notifications Team
**Last Updated**: 2025-11-14
**Status**: Production Ready

## Overview

The Notifications service handles multi-channel notification delivery (email, SMS, push) with queue management, delivery receipts, per-tenant rate limiting, and cost tracking.

### Service Architecture

- **Language**: TypeScript/Node.js
- **Framework**: Fastify
- **Port**: 3009
- **Queue**: BullMQ + Redis
- **Database**: PostgreSQL (notification tracking)
- **Providers**: SendGrid (email), Twilio (SMS), Firebase Cloud Messaging (push)

### Notification Channels

1. **Email** - SendGrid (transactional email)
2. **SMS** - Twilio (text messages)
3. **Push** - Firebase Cloud Messaging (mobile/web push)

---

## Service Endpoints

### Notification APIs
- `POST /v1/notify/email` - Send email
- `POST /v1/notify/sms` - Send SMS
- `POST /v1/notify/push` - Send push notification
- `GET /v1/notify/status/:notificationId` - Check delivery status
- `GET /v1/notify/queue/stats` - Queue statistics

### Webhook Endpoints
- `POST /webhooks/sendgrid` - SendGrid delivery events
- `POST /webhooks/twilio` - Twilio status callbacks

### Health & Monitoring
- `GET /health` - Service health
- `GET /health/providers` - Provider connectivity status

---

## Environment Configuration

### Required Environment Variables

```bash
# Database & Queue
DATABASE_URL=postgresql://user:pass@host:5432/teei
REDIS_URL=redis://localhost:6379

# SendGrid (Email)
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@teei-platform.com
SENDGRID_FROM_NAME=TEEI Platform

# Twilio (SMS)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+15551234567
TWILIO_STATUS_CALLBACK_URL=https://your-domain.com/webhooks/twilio

# Firebase (Push)
FIREBASE_SERVICE_ACCOUNT_JSON=/path/to/service-account.json
# OR base64-encoded for container deployments
FIREBASE_SERVICE_ACCOUNT_BASE64=ewogICJ0eXBlIjog...

# Service Configuration
PORT_NOTIFICATIONS=3009
NODE_ENV=production
LOG_LEVEL=info
```

### Secrets Management

```bash
# Fetch from AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id teei/notifications/prod \
  --query SecretString \
  --output text
```

---

## Operations

### Starting the Service

```bash
# Development
pnpm --filter @teei/notifications dev

# Production
pm2 start dist/index.js --name notifications

# With workers for queue processing
pm2 start dist/index.js --name notifications-api
pm2 start dist/workers/email-worker.js --name notifications-worker --instances 2
```

### Queue Management

```bash
# Monitor queue
redis-cli LLEN notifications:email:waiting
redis-cli LLEN notifications:sms:waiting
redis-cli LLEN notifications:push:waiting

# Clear stuck jobs (use cautiously!)
redis-cli DEL notifications:email:failed
redis-cli DEL notifications:sms:failed
```

### Provider Health Checks

```bash
# Check all providers
curl http://localhost:3009/health/providers

# Expected response
{
  "sendgrid": {
    "configured": true,
    "healthy": true
  },
  "twilio": {
    "configured": true,
    "healthy": true,
    "accountStatus": "active"
  },
  "fcm": {
    "configured": true,
    "projectId": "teei-prod"
  }
}
```

---

## Monitoring & Alerts

### Key Metrics

- **Notification Success Rate**: By channel (email/sms/push)
- **Delivery Latency**: Time from queue to sent
- **Queue Depth**: Notifications waiting
- **Provider Errors**: Rate of API failures
- **Cost Tracking**: Per-channel costs (especially SMS)
- **Per-Tenant Quotas**: Usage vs limits

### Recommended Alerts

```yaml
groups:
  - name: notifications
    rules:
      - alert: HighEmailFailureRate
        expr: rate(notifications_email_failed_total[10m]) > 0.05
        for: 15m
        labels:
          severity: warning

      - alert: SMSCostSpike
        expr: increase(notifications_sms_cost_usd[1h]) > 100
        labels:
          severity: warning
        annotations:
          summary: "SMS costs increased significantly"

      - alert: NotificationQueueBacklog
        expr: notifications_queue_depth > 10000
        for: 10m
        labels:
          severity: critical

      - alert: ProviderDown
        expr: notifications_provider_health{provider=~"sendgrid|twilio|fcm"} == 0
        for: 5m
        labels:
          severity: critical
```

---

## Troubleshooting

### Issue: Emails Not Delivering (SendGrid)

**Diagnosis**:
```bash
# Check SendGrid API key
curl -H "Authorization: Bearer $SENDGRID_API_KEY" \
  https://api.sendgrid.com/v3/user/account

# Check recent email logs
psql -d teei -c \
  "SELECT * FROM notifications_queue WHERE type='email' AND status='failed' ORDER BY created_at DESC LIMIT 10;"

# Check SendGrid Activity Feed
# https://app.sendgrid.com/email_activity
```

**Common Causes**:
1. **Invalid API Key**: Rotate key in SendGrid dashboard
2. **Rate Limit Exceeded**: SendGrid returns 429
   - Solution: Increase plan or implement backoff
3. **Bounced Addresses**: Recipients blocking delivery
   - Solution: Remove bounced addresses from lists
4. **Domain Authentication**: SPF/DKIM not configured
   - Solution: Configure sender authentication in SendGrid

**Resolution**:
```bash
# Retry failed emails
curl -X POST http://localhost:3009/v1/notify/queue/retry \
  -H "Content-Type: application/json" \
  -d '{"channel": "email", "retryFailed": true}'
```

---

### Issue: SMS Messages Failing (Twilio)

**Diagnosis**:
```bash
# Check Twilio account status
curl -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json

# Check SMS logs
psql -d teei -c \
  "SELECT * FROM notifications_queue WHERE type='sms' AND status='failed' ORDER BY created_at DESC LIMIT 10;"

# Check Twilio Console
# https://console.twilio.com/us1/monitor/logs/sms
```

**Common Causes**:
1. **Invalid Phone Number Format**: Must be E.164 format (+1234567890)
   - Solution: Validate with `/^\+[1-9]\d{1,14}$/`
2. **Insufficient Balance**: Twilio account depleted
   - Solution: Add funds or enable auto-recharge
3. **Carrier Filtering**: Spam filters blocking messages
   - Solution: Register campaign, use approved templates
4. **Unsubscribed Numbers**: Recipient opted out
   - Solution: Honor opt-outs, remove from lists

**Resolution**:
```bash
# Check number validity
curl -X POST http://localhost:3009/v1/notify/validate \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+15551234567"}'
```

---

### Issue: Push Notifications Not Delivered (FCM)

**Diagnosis**:
```bash
# Check FCM configuration
curl http://localhost:3009/health/providers | jq '.fcm'

# Check Firebase Cloud Messaging logs
# https://console.firebase.google.com/project/teei-prod/notification

# Query failed push notifications
psql -d teei -c \
  "SELECT * FROM notifications_queue WHERE type='push' AND status='failed' ORDER BY created_at DESC LIMIT 10;"
```

**Common Causes**:
1. **Invalid FCM Token**: Device token expired or invalid
   - Solution: Tokens expire after 60 days; refresh on app startup
2. **Service Account Misconfigured**: Wrong credentials
   - Solution: Re-download service account JSON from Firebase Console
3. **App Not Running**: Device offline or app uninstalled
   - Solution: Expected behavior; FCM will retry
4. **Payload Too Large**: >4KB limit
   - Solution: Reduce data payload, use image URLs instead of inline

**Resolution**:
```bash
# Test with a valid token
curl -X POST http://localhost:3009/v1/notify/push \
  -H "Content-Type: application/json" \
  -d '{
    "token": "fcm-device-token",
    "title": "Test",
    "body": "Test notification",
    "tenantId": "test-company"
  }'
```

---

### Issue: High Queue Depth / Slow Processing

**Symptoms**: Notifications delayed, queue depth increasing

**Diagnosis**:
```bash
# Check queue stats
redis-cli INFO stats | grep instantaneous_ops_per_sec

# Check worker processes
pm2 list | grep notifications-worker

# Check database connections
psql -d teei -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='notifications';"
```

**Resolution**:
1. **Scale Workers**: Increase worker instances
   ```bash
   pm2 scale notifications-worker 5
   ```
2. **Optimize Database Queries**: Add indexes
   ```sql
   CREATE INDEX CONCURRENTLY idx_notifications_queue_status
   ON notifications_queue(status, scheduled_at);
   ```
3. **Increase Redis Memory**: If queue is memory-bound
   ```bash
   redis-cli CONFIG SET maxmemory 4gb
   ```

---

### Issue: Per-Tenant Quotas Exceeded

**Symptoms**: 429 responses, logs show "Quota exceeded"

**Diagnosis**:
```bash
# Check quota usage
psql -d teei -c \
  "SELECT company_id, email_daily_used, email_daily_limit, sms_daily_used, sms_daily_limit
   FROM notifications_quotas
   WHERE email_daily_used >= email_daily_limit
      OR sms_daily_used >= sms_daily_limit;"
```

**Resolution**:
1. **Increase Quota**: For legitimate high-volume tenants
   ```sql
   UPDATE notifications_quotas
   SET email_daily_limit = 5000
   WHERE company_id = 'xxx';
   ```
2. **Reset Quotas**: If it's a new day and quotas didn't reset
   ```sql
   UPDATE notifications_quotas
   SET email_daily_used = 0, sms_daily_used = 0, push_daily_used = 0, last_reset_at = NOW();
   ```
3. **Investigate Abuse**: Check for spam or bot activity
   ```sql
   SELECT user_id, COUNT(*) as notification_count
   FROM notifications_queue
   WHERE created_at > NOW() - INTERVAL '1 hour'
   GROUP BY user_id
   ORDER BY notification_count DESC
   LIMIT 10;
   ```

---

## Incident Response

### P0: Complete Notification Outage

**Actions**:
1. Check service: `pm2 status notifications`
2. Check providers: `curl http://localhost:3009/health/providers`
3. Check queue: `redis-cli PING`
4. Restart: `pm2 restart notifications notifications-worker`
5. If providers down, check status pages:
   - SendGrid: https://status.sendgrid.com
   - Twilio: https://status.twilio.com
   - Firebase: https://status.firebase.google.com

### P1: Provider Outage

**Actions**:
1. Verify provider status on status page
2. Pause queue processing to prevent failures:
   ```bash
   redis-cli RENAME notifications:email:waiting notifications:email:paused
   ```
3. Monitor provider status
4. Resume once recovered:
   ```bash
   redis-cli RENAME notifications:email:paused notifications:email:waiting
   pm2 restart notifications-worker
   ```

---

## Maintenance

### Database Cleanup

```bash
# Archive old notifications (retain 30 days)
psql -d teei -c \
  "DELETE FROM notifications_queue WHERE created_at < NOW() - INTERVAL '30 days';"

# Archive delivery receipts (retain 90 days)
psql -d teei -c \
  "DELETE FROM notifications_delivery_receipts WHERE received_at < NOW() - INTERVAL '90 days';"

# Vacuum
psql -d teei -c "VACUUM ANALYZE notifications_queue, notifications_delivery_receipts;"
```

### Cost Optimization

**SMS Costs** (Twilio charges per message):
- Monitor: `SELECT SUM(segments) FROM notifications_queue WHERE type='sms' AND created_at > NOW() - INTERVAL '1 month';`
- Optimize: Use email when possible; consolidate multiple SMS into one

**SendGrid Costs** (tiered pricing):
- Monitor monthly volume
- Upgrade plan if consistently near limit
- Remove bounced/invalid addresses

---

## Contacts

- **Primary On-Call**: notifications-team@teei.com
- **Secondary**: backend-lead@teei.com
- **Slack Channel**: #alerts-notifications
- **PagerDuty**: https://teei.pagerduty.com/services/notifications

---

## References

- **Service Documentation**: `/docs/Notifications_Service.md`
- **API Spec**: `/packages/openapi/v1-final/notifications.yaml`
- **Grafana Dashboard**: `/observability/grafana/notifications-dashboard.json`
- **Provider Docs**:
  - SendGrid: https://docs.sendgrid.com
  - Twilio: https://www.twilio.com/docs
  - Firebase: https://firebase.google.com/docs/cloud-messaging
