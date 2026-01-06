# Impact-In Service Runbook

**Service**: Impact-In (External CSR Integrations)
**Owner**: Worker 4 / Integrations Team
**Last Updated**: 2025-11-14
**Status**: Production Ready

## Overview

The Impact-In service delivers impact metrics and CSR data to external platforms (Benevity, Goodera, Workday). It provides authenticated API clients, retry logic, idempotency, webhook verification, and delivery tracking.

### Service Architecture

- **Language**: TypeScript/Node.js
- **Framework**: Fastify
- **Port**: 3007
- **Database**: PostgreSQL (delivery tracking)
- **Cache**: Redis (idempotency)
- **Dependencies**: Benevity API, Goodera API, Workday API

### Supported Platforms

1. **Benevity** - Employee giving & volunteering platform
2. **Goodera** - CSR impact management platform
3. **Workday** - Volunteer management & HR integration

---

## Service Endpoints

### Delivery APIs
- `POST /v1/impact-in/deliveries` - Create delivery
- `GET /v1/impact-in/deliveries` - List deliveries
- `POST /v1/impact-in/deliveries/:id/replay` - Retry failed delivery
- `POST /v1/impact-in/deliveries/bulk-replay` - Bulk retry
- `POST /v1/impact-in/deliveries/retry-all-failed` - Retry all failed

### Webhook Endpoints
- `POST /webhooks/benevity` - Benevity status updates
- `POST /webhooks/goodera` - Goodera status updates
- `POST /webhooks/workday` - Workday status updates
- `GET /webhooks/health` - Webhook health check

### Health & Monitoring
- `GET /health` - Service health
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/teei

# Redis (for idempotency caching)
REDIS_URL=redis://localhost:6379

# Benevity Configuration
BENEVITY_API_KEY=your_api_key
BENEVITY_WEBHOOK_URL=https://api.benevity.com/v1/impact
BENEVITY_WEBHOOK_SECRET=your_webhook_secret

# Goodera Configuration
GOODERA_API_KEY=your_api_key
GOODERA_API_URL=https://api.goodera.com/v1
GOODERA_WEBHOOK_SECRET=your_webhook_secret

# Workday Configuration
WORKDAY_CLIENT_ID=your_client_id
WORKDAY_CLIENT_SECRET=your_client_secret
WORKDAY_TENANT_ID=your_tenant_id
WORKDAY_API_URL=https://wd2-impl-services1.workday.com/ccx/service
WORKDAY_WEBHOOK_SECRET=your_webhook_secret

# Service Configuration
PORT_IMPACT_IN=3007
NODE_ENV=production
LOG_LEVEL=info
```

### Secrets Management

**CRITICAL**: Never commit secrets to version control.

- **Development**: Use `.env` files (gitignored)
- **Staging/Production**: Use AWS Secrets Manager or HashiCorp Vault

```bash
# Fetch secrets from AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id teei/impact-in/prod \
  --query SecretString \
  --output text | jq -r 'to_entries|map("\(.key)=\(.value)")|.[]'
```

---

## Operations

### Starting the Service

```bash
# Development
pnpm --filter @teei/impact-in dev

# Production (with PM2)
pm2 start dist/index.js --name impact-in

# Docker
docker-compose up impact-in
```

### Graceful Shutdown

The service handles SIGTERM/SIGINT for graceful shutdown:

```bash
# Send SIGTERM
pm2 stop impact-in

# Force kill (avoid if possible)
pm2 delete impact-in
```

### Health Checks

```bash
# Check service health
curl http://localhost:3007/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:00:00Z",
  "uptime": 3600,
  "connections": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### Webhook Configuration

#### Benevity Webhook Setup

1. Log in to Benevity Admin Portal
2. Navigate to **Settings** > **Webhooks**
3. Add webhook URL: `https://your-domain.com/webhooks/benevity`
4. Select events: `delivery.success`, `delivery.failed`, `delivery.retry`
5. Copy webhook secret and store in `BENEVITY_WEBHOOK_SECRET`

#### Goodera Webhook Setup

1. Log in to Goodera Dashboard
2. Navigate to **Integrations** > **Webhooks**
3. Add endpoint: `https://your-domain.com/webhooks/goodera`
4. Select events: `data.received`, `data.processed`, `data.failed`
5. Copy secret key to `GOODERA_WEBHOOK_SECRET`

#### Workday Webhook Setup

1. Access Workday Integration Cloud
2. Create Integration System user
3. Configure Web Service endpoint
4. Set callback URL: `https://your-domain.com/webhooks/workday`
5. Store secret in `WORKDAY_WEBHOOK_SECRET`

---

## Monitoring & Alerts

### Key Metrics

Monitor these metrics in Prometheus/Grafana:

- **Delivery Success Rate**: `impact_in_deliveries_success_total / impact_in_deliveries_total`
- **Delivery Latency**: `impact_in_delivery_duration_seconds` (p50, p95, p99)
- **Webhook Receipt Rate**: `impact_in_webhooks_received_total`
- **Failed Deliveries**: `impact_in_deliveries_failed_total`
- **Retry Attempts**: `impact_in_retries_total`

### Recommended Alerts

```yaml
# Prometheus Alert Rules
groups:
  - name: impact-in
    rules:
      - alert: HighDeliveryFailureRate
        expr: rate(impact_in_deliveries_failed_total[5m]) > 0.1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High delivery failure rate"

      - alert: WebhookVerificationFailures
        expr: rate(impact_in_webhook_verification_failed_total[5m]) > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Webhook signature verification failures"

      - alert: ExternalAPIDown
        expr: up{job="impact-in"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Impact-In service is down"
```

### Dashboards

Import Grafana dashboard: `/observability/grafana/impact-in-dashboard.json`

**Key Panels:**
- Delivery success/failure rates by platform
- Webhook receipt timeline
- API latency percentiles
- Retry queue depth
- Error breakdown by error type

---

## Troubleshooting

### Issue: Deliveries Failing to Benevity

**Symptoms**: Deliveries stuck in "failed" status, error: "401 Unauthorized"

**Diagnosis**:
```bash
# Check API key configuration
curl -H "Authorization: Bearer $BENEVITY_API_KEY" \
  https://api.benevity.com/v1/health

# Check delivery logs
docker logs impact-in | grep "Benevity API error"

# Query failed deliveries
psql -d teei -c \
  "SELECT * FROM impact_deliveries WHERE platform='benevity' AND status='failed' ORDER BY created_at DESC LIMIT 10;"
```

**Resolution**:
1. Verify API key is not expired: Check Benevity Admin Portal
2. Rotate API key if needed
3. Update `BENEVITY_API_KEY` environment variable
4. Restart service
5. Retry failed deliveries:
   ```bash
   curl -X POST http://localhost:3007/v1/impact-in/deliveries/retry-all-failed \
     -H "Content-Type: application/json" \
     -d '{"platform": "benevity", "maxRetries": 3}'
   ```

---

### Issue: Webhook Signature Verification Failures

**Symptoms**: Webhooks returning 401, logs show "Invalid signature"

**Diagnosis**:
```bash
# Check webhook secret configuration
echo $BENEVITY_WEBHOOK_SECRET | wc -c  # Should be non-empty

# Test webhook locally
curl -X POST http://localhost:3007/webhooks/benevity \
  -H "Content-Type: application/json" \
  -H "X-Benevity-Signature: sha256=test" \
  -d '{"event_type": "delivery.success", "transaction_id": "test"}'
```

**Resolution**:
1. Verify webhook secret matches platform configuration
2. Check clock skew between servers (webhooks may include timestamps)
3. Re-copy webhook secret from platform admin panel
4. Update environment variable and restart service

---

### Issue: High Retry Queue Depth

**Symptoms**: Many deliveries in "retrying" status, delivery latency increasing

**Diagnosis**:
```bash
# Check retry queue depth
psql -d teei -c \
  "SELECT platform, COUNT(*) FROM impact_deliveries WHERE status='retrying' GROUP BY platform;"

# Check external API health
curl https://api.benevity.com/health
curl https://api.goodera.com/health
```

**Resolution**:
1. Check if external API is experiencing downtime (check status pages)
2. If API is degraded, increase retry backoff:
   - Edit `src/lib/retry.ts`
   - Increase `baseDelay` from 1000ms to 5000ms
   - Deploy updated configuration
3. If API is healthy, investigate payload validation:
   - Check payload samples in `impact_deliveries.payloadSample`
   - Validate against platform API schemas
4. Manual intervention:
   ```bash
   # Bulk cancel retries older than 24 hours
   psql -d teei -c \
     "UPDATE impact_deliveries SET status='failed', error_msg='Cancelled after 24h' WHERE status='retrying' AND created_at < NOW() - INTERVAL '24 hours';"
   ```

---

### Issue: Idempotency Cache Miss

**Symptoms**: Duplicate deliveries, same payload delivered multiple times

**Diagnosis**:
```bash
# Check Redis connection
redis-cli -h localhost ping  # Should return PONG

# Check idempotency keys
redis-cli --scan --pattern "idempotency:benevity:*" | head

# Check for duplicate payloads
psql -d teei -c \
  "SELECT payload_hash, COUNT(*) FROM impact_deliveries WHERE status='delivered' GROUP BY payload_hash HAVING COUNT(*) > 1;"
```

**Resolution**:
1. Verify Redis is running and accessible
2. Check Redis TTL configuration (should be 24 hours)
3. Increase Redis memory limit if evictions are occurring:
   ```bash
   redis-cli CONFIG SET maxmemory 2gb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```
4. If duplicates persist, review idempotency key generation logic in `delivery-log.ts`

---

## Incident Response

### Severity Levels

- **P0 (Critical)**: Complete service outage, data loss risk
- **P1 (High)**: Partial outage, >50% failure rate
- **P2 (Medium)**: Degraded performance, <50% failure rate
- **P3 (Low)**: Minor issues, no user impact

### P0: Service Down

**Actions**:
1. Check service status: `pm2 status impact-in`
2. Check logs: `pm2 logs impact-in --lines 100`
3. Restart service: `pm2 restart impact-in`
4. If restart fails, check dependencies:
   - Database: `pg_isready -h $DB_HOST`
   - Redis: `redis-cli ping`
5. Escalate to on-call engineer if not resolved in 15 minutes

### P1: External API Outage

**Actions**:
1. Check platform status pages:
   - Benevity: https://status.benevity.com
   - Goodera: https://status.goodera.com
   - Workday: https://status.workday.com
2. Enable mock mode temporarily to prevent delivery failures:
   ```bash
   # Set in environment
   export BENEVITY_MOCK_MODE=true
   pm2 restart impact-in
   ```
3. Monitor platform status and re-enable once recovered
4. Bulk retry failed deliveries after recovery

---

## Maintenance

### Database Maintenance

```bash
# Cleanup old deliveries (retain 90 days)
psql -d teei -c \
  "DELETE FROM impact_deliveries WHERE created_at < NOW() - INTERVAL '90 days';"

# Vacuum table
psql -d teei -c "VACUUM ANALYZE impact_deliveries;"

# Reindex for performance
psql -d teei -c "REINDEX TABLE impact_deliveries;"
```

### Log Rotation

Logs are rotated daily by PM2. Configure retention:

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'impact-in',
    script: './dist/index.js',
    error_file: './logs/impact-in-error.log',
    out_file: './logs/impact-in-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    max_memory_restart: '1G',
    log_size: '50M',
    max_files: 30,  // Retain 30 days
  }]
};
```

### Dependency Updates

Update dependencies monthly for security patches:

```bash
# Check for updates
pnpm outdated

# Update non-breaking
pnpm update --latest --filter @teei/impact-in

# Test thoroughly before deploying
pnpm test
```

---

## Disaster Recovery

### Backup Delivery Data

```bash
# Backup impact_deliveries table
pg_dump -t impact_deliveries -d teei > impact_deliveries_backup_$(date +%Y%m%d).sql

# Compress and upload to S3
gzip impact_deliveries_backup_*.sql
aws s3 cp impact_deliveries_backup_*.sql.gz s3://teei-backups/impact-in/
```

### Restore from Backup

```bash
# Download from S3
aws s3 cp s3://teei-backups/impact-in/impact_deliveries_backup_20251114.sql.gz .

# Decompress
gunzip impact_deliveries_backup_20251114.sql.gz

# Restore
psql -d teei < impact_deliveries_backup_20251114.sql
```

---

## Contacts

- **Primary On-Call**: integrations-team@teei.com
- **Secondary**: backend-lead@teei.com
- **Slack Channel**: #alerts-impact-in
- **PagerDuty**: https://teei.pagerduty.com/services/impact-in

---

## References

- **Platform Architecture**: `/docs/Platform_Architecture.md`
- **API Documentation**: `/packages/openapi/v1-final/impact-in.yaml`
- **Connector Specs**: `/docs/ImpactIn_Connectors.md`
- **Grafana Dashboard**: `/observability/grafana/impact-in-dashboard.json`
- **Change Log**: `/CHANGELOG.md`
