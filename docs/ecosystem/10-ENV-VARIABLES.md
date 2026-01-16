# TEEI Environment Variables

**Last Updated**: 2025-01-27

---

## Core Application Variables

### Node.js Environment

```bash
NODE_ENV=development  # Options: development, staging, production
PORT=3000              # Service port (varies by service)
HOST=0.0.0.0          # Server host
```

---

## Database Configuration

### PostgreSQL

```bash
DATABASE_URL=postgresql://teei:teei_dev_password@localhost:5432/teei_platform
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teei_platform
DB_USER=teei
DB_PASSWORD=<REPLACE_WITH_SECURE_PASSWORD>

# Connection Pool
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=100  # Default: 100 (high-end dev workstation)
DB_IDLE_TIMEOUT_MS=30000
```

---

## Authentication & Security

### JWT

```bash
JWT_SECRET=<REPLACE_WITH_RANDOM_64_CHAR_STRING>
JWT_EXPIRES_IN=24h
JWT_ISSUER=teei-platform
JWT_ALGORITHM=HS256  # Upgrading to RS256
```

### Session

```bash
SESSION_COOKIE_NAME=teei_session
SESSION_SECRET=<REPLACE_WITH_RANDOM_64_CHAR_STRING>
SESSION_MAX_AGE_MS=86400000  # 24 hours
SESSION_SECURE=true  # Set to true in staging/prod (requires HTTPS)
```

### OAuth

```bash
GOOGLE_CLIENT_ID=<GOOGLE_OAUTH_CLIENT_ID>
GOOGLE_CLIENT_SECRET=<GOOGLE_OAUTH_CLIENT_SECRET>
```

---

## Service Ports

```bash
PORT_API_GATEWAY=3017
PORT_UNIFIED_PROFILE=3018
PORT_KINTELL_CONNECTOR=3027
PORT_BUDDY_SERVICE=3019
PORT_BUDDY_CONNECTOR=3029
PORT_UPSKILLING_CONNECTOR=3028
PORT_Q2Q_AI=3021
PORT_SAFETY_MODERATION=3022
PORT_ANALYTICS=3023
PORT_NOTIFICATIONS=3024
PORT_REPORTING=4017
PORT_IMPACT_IN=3007
PORT_DISCORD_BOT=3026
```

---

## Event Bus (NATS)

```bash
NATS_URL=nats://localhost:4222
NATS_CLUSTER_ID=teei-cluster
```

---

## Analytics & Data Warehouse

### ClickHouse

```bash
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_DATABASE=analytics
CLICKHOUSE_USER=default
CLICKHOUSE_PASSWORD=
```

### Redis

```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=
```

---

## AI/ML Services

### OpenAI

```bash
OPENAI_API_KEY=<OPENAI_API_KEY>
OPENAI_MODEL=gpt-4-turbo
OPENAI_ORG_ID=<ORG_ID>  # Optional
```

### Anthropic

```bash
ANTHROPIC_API_KEY=<ANTHROPIC_API_KEY>
ANTHROPIC_MODEL=claude-3-5-sonnet
```

### LLM Configuration

```bash
LLM_PROVIDER=openai  # Options: openai, anthropic
LLM_MODEL=gpt-4-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000
```

---

## Email Services

### SendGrid

```bash
SENDGRID_API_KEY=<SENDGRID_API_KEY>
SENDGRID_FROM_EMAIL=noreply@teei.io
SENDGRID_FROM_NAME=TEEI Platform
```

### Resend (Alternative)

```bash
RESEND_API_KEY=<RESEND_API_KEY>
RESEND_FROM_EMAIL=noreply@teei.io
RESEND_FROM_NAME=TEEI Platform
```

---

## Storage Services

### Cloudflare R2 / S3

```bash
R2_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
R2_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
R2_BUCKET_NAME=teei-certificates
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://<bucket>.r2.dev
```

---

## External Integrations

### Benevity

```bash
BENEVITY_API_KEY=<BENEVITY_API_KEY>
BENEVITY_WEBHOOK_SECRET=<WEBHOOK_SECRET>
BENEVITY_BASE_URL=https://api.benevity.com
```

### Goodera

```bash
GOODERA_CLIENT_ID=<GOODERA_CLIENT_ID>
GOODERA_CLIENT_SECRET=<GOODERA_CLIENT_SECRET>
GOODERA_BASE_URL=https://api.goodera.com
GOODERA_OAUTH_TOKEN_URL=https://api.goodera.com/oauth/token
```

### Workday

```bash
WORKDAY_TENANT=<WORKDAY_TENANT>
WORKDAY_USERNAME=<WORKDAY_USERNAME>
WORKDAY_PASSWORD=<WORKDAY_PASSWORD>
WORKDAY_BASE_URL=https://<tenant>.workday.com
```

### Discord

```bash
DISCORD_BOT_TOKEN=<DISCORD_BOT_TOKEN>
DISCORD_GUILD_ID=<DISCORD_GUILD_ID>
DISCORD_CLIENT_ID=<DISCORD_CLIENT_ID>
DISCORD_CLIENT_SECRET=<DISCORD_CLIENT_SECRET>
```

### LiveKit (if used)

```bash
LIVEKIT_URL=<LIVEKIT_URL>
LIVEKIT_API_KEY=<LIVEKIT_API_KEY>
LIVEKIT_API_SECRET=<LIVEKIT_API_SECRET>
```

---

## Cron Job Configuration

```bash
# Campaign Jobs
SEAT_USAGE_CRON_INTERVAL="0 * * * *"  # Hourly
CREDIT_USAGE_CRON_INTERVAL="0 * * * *"  # Hourly

# VIS Recalculation
VIS_CRON_SCHEDULE="0 2 * * *"  # Daily at 2 AM

# Analytics Sync
ANALYTICS_SYNC_INTERVAL="*/15 * * * *"  # Every 15 minutes

# Synthetic Monitoring
SYNTHETICS_SCHEDULE="*/5 * * * *"  # Every 5 minutes
```

---

## Observability

### OpenTelemetry

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
OTEL_SERVICE_NAME=teei-platform
OTEL_RESOURCE_ATTRIBUTES=service.name=teei-platform
```

### Sentry

```bash
SENTRY_DSN=<SENTRY_DSN>
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=1.0
```

### Grafana / Prometheus

```bash
GRAFANA_URL=http://localhost:3000
PROMETHEUS_URL=http://localhost:9090
```

---

## Feature Flags

```bash
FEATURE_RBAC_ENABLED=true
FEATURE_SSO_ENABLED=true
FEATURE_WHITE_LABEL_ENABLED=true
FEATURE_REGULATORY_PACKS_ENABLED=true
```

---

## Multi-Tenant Configuration

```bash
TENANT_ROUTING_ENABLED=true
TENANT_ID_PATTERN=^[a-z0-9_-]{1,100}$
ALLOW_SUPER_ADMIN_CROSS_TENANT=true
```

---

## RBAC Configuration

```bash
RBAC_ENFORCE_STRICT=true
RBAC_DEFAULT_ROLE=VIEWER
RBAC_CACHE_ENABLED=true
RBAC_CACHE_TTL_SECONDS=300  # 5 minutes
```

---

## CORS Configuration

```bash
CORS_ORIGIN=http://localhost:4327
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS
```

---

## Rate Limiting

```bash
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
```

---

## Logging

```bash
LOG_LEVEL=info  # Options: debug, info, warn, error
LOG_FORMAT=json  # Options: json, pretty
```

---

## AI Budget Configuration

```bash
AI_BUDGET_MONTHLY=1000.00  # Default monthly budget per company
AI_BUDGET_ENFORCEMENT=true
AI_BUDGET_ALERT_THRESHOLD=0.8  # Alert at 80% usage
```

---

## Security

### CSP (Content Security Policy)

```bash
CSP_ENABLED=true
CSP_REPORT_URI=/api/csp-report
```

### Secrets Management

```bash
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=<VAULT_TOKEN>
VAULT_SECRET_PATH=secret/teei
```

---

## Per-Service Environment Variables

### API Gateway

```bash
PORT_API_GATEWAY=3017
JWT_SECRET=<JWT_SECRET>
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379
```

### Reporting Service

```bash
PORT_REPORTING=4017
DATABASE_URL=<DATABASE_URL>
LLM_PROVIDER=openai
OPENAI_API_KEY=<OPENAI_API_KEY>
REDIS_URL=redis://localhost:6379
```

### Analytics Service

```bash
PORT_ANALYTICS=3023
DATABASE_URL=<DATABASE_URL>
CLICKHOUSE_URL=http://localhost:8123
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
```

### Notifications Service

```bash
PORT_NOTIFICATIONS=3024
DATABASE_URL=<DATABASE_URL>
SENDGRID_API_KEY=<SENDGRID_API_KEY>
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
```

---

## Required vs Optional

### ✅ Required (Production)

- `DATABASE_URL`
- `JWT_SECRET`
- `NATS_URL`
- `REDIS_URL`
- `OPENAI_API_KEY` (or `ANTHROPIC_API_KEY`)
- `SENDGRID_API_KEY` (or `RESEND_API_KEY`)
- `R2_ACCESS_KEY_ID` (if using R2)
- `R2_SECRET_ACCESS_KEY` (if using R2)

### ⚠️ Optional

- `CLICKHOUSE_URL` (if using ClickHouse)
- `SENTRY_DSN` (for error tracking)
- `DISCORD_BOT_TOKEN` (if using Discord)
- External integration keys (Benevity, Goodera, Workday)

---

## Environment-Specific Values

### Development

```bash
NODE_ENV=development
DATABASE_URL=postgresql://teei:teei_dev_password@localhost:5432/teei_platform
REDIS_URL=redis://localhost:6379
NATS_URL=nats://localhost:4222
LOG_LEVEL=debug
```

### Staging

```bash
NODE_ENV=staging
DATABASE_URL=<STAGING_DATABASE_URL>
SESSION_SECURE=true
LOG_LEVEL=info
```

### Production

```bash
NODE_ENV=production
DATABASE_URL=<PRODUCTION_DATABASE_URL>
SESSION_SECURE=true
LOG_LEVEL=warn
CSP_ENABLED=true
```

---

## Security Notes

⚠️ **Never commit actual values to version control**
- Use environment management tools (Vault, AWS Secrets Manager)
- Use `.env.example` files for documentation
- Rotate secrets regularly
- Use different secrets per environment

---

**Next**: See [11-GAPS-TODO.md](./11-GAPS-TODO.md) for gaps and TODO items.
