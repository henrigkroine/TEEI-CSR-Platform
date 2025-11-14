# Environment Variables - Phase C Pilot

## Overview

This document lists all environment variables required for the Phase C Corporate Cockpit deployment. Variables are organized by service and feature.

**⚠️ Security Note**: Never commit actual values to version control. Use environment management tools (e.g., Vault, AWS Secrets Manager) in production.

---

## Core Application Variables

### Node.js Environment

```bash
# Application environment
NODE_ENV=staging  # Options: development, staging, production

# Server configuration
PORT=3000
HOST=0.0.0.0
```

### Database Configuration

```bash
# PostgreSQL connection
DATABASE_URL=postgresql://teei_admin:${DB_PASSWORD}@localhost:5432/teei_cockpit_staging
DB_HOST=localhost
DB_PORT=5432
DB_NAME=teei_cockpit_staging
DB_USER=teei_admin
DB_PASSWORD=<REPLACE_WITH_SECURE_PASSWORD>

# Connection pool settings
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
```

### Session & Authentication

```bash
# JWT signing key (generate with: openssl rand -base64 32)
JWT_SECRET=<REPLACE_WITH_RANDOM_64_CHAR_STRING>

# Session cookie configuration
SESSION_COOKIE_NAME=teei_session
SESSION_SECRET=<REPLACE_WITH_RANDOM_64_CHAR_STRING>
SESSION_MAX_AGE_MS=86400000  # 24 hours
SESSION_SECURE=true  # Set to true in staging/prod (requires HTTPS)

# Token expiry
ACCESS_TOKEN_EXPIRY=15m
REFRESH_TOKEN_EXPIRY=7d
```

---

## Phase C Specific Variables

### Multi-Tenant Routing

```bash
# Enable tenant routing (Phase C A.1)
TENANT_ROUTING_ENABLED=true

# Allowed tenant ID patterns (regex)
TENANT_ID_PATTERN=^[a-z0-9_-]{1,100}$

# Enable cross-tenant access for SUPER_ADMIN
ALLOW_SUPER_ADMIN_CROSS_TENANT=true
```

### RBAC System

```bash
# Enable strict RBAC enforcement (Phase C A.2)
RBAC_ENFORCE_STRICT=true

# Default role for new users
RBAC_DEFAULT_ROLE=VIEWER

# Enable permission caching
RBAC_CACHE_ENABLED=true
RBAC_CACHE_TTL_SECONDS=300  # 5 minutes

# Permission denial logging
RBAC_LOG_DENIALS=true
```

### Admin Console

```bash
# Enable admin console (Phase C A.3)
ADMIN_CONSOLE_ENABLED=true

# API key encryption key (generate with: openssl rand -base64 32)
API_KEY_ENCRYPTION_KEY=<REPLACE_WITH_RANDOM_64_CHAR_STRING>

# API key prefix for identification
API_KEY_PREFIX=teei_

# Default API key expiry
API_KEY_DEFAULT_EXPIRY_DAYS=365

# Audit log retention
AUDIT_LOG_RETENTION_DAYS=90
AUDIT_LOG_ENABLED=true
```

### Weight Overrides

```bash
# Enable weight customization
WEIGHT_OVERRIDES_ENABLED=true

# Default SROI weights
SROI_VOLUNTEER_HOUR_VALUE=29.95
SROI_INTEGRATION_WEIGHT=1.0
SROI_LANGUAGE_WEIGHT=1.0
SROI_JOB_READINESS_WEIGHT=1.0

# Default VIS weights (must sum to 1.0)
VIS_HOURS_WEIGHT=0.3
VIS_CONSISTENCY_WEIGHT=0.3
VIS_IMPACT_WEIGHT=0.4
```

---

## Integration Services

### Reporting Service API

```bash
# Reporting service URL
REPORTING_SERVICE_URL=http://localhost:4000

# API authentication
REPORTING_API_KEY=<REPLACE_WITH_API_KEY>
REPORTING_API_TIMEOUT_MS=30000
```

### Impact-In Integrations

```bash
# Enable Impact-In module
IMPACT_IN_ENABLED=true

# Benevity configuration
BENEVITY_API_URL=https://api.benevity.com/v1
BENEVITY_API_KEY=<REPLACE_WITH_BENEVITY_KEY>
BENEVITY_COMPANY_ID=<YOUR_BENEVITY_COMPANY_ID>

# Goodera configuration
GOODERA_API_URL=https://api.goodera.com/v1
GOODERA_API_KEY=<REPLACE_WITH_GOODERA_KEY>
GOODERA_ORG_ID=<YOUR_GOODERA_ORG_ID>

# Workday configuration
WORKDAY_API_URL=https://api.workday.com/volunteering
WORKDAY_CLIENT_ID=<REPLACE_WITH_WORKDAY_CLIENT_ID>
WORKDAY_CLIENT_SECRET=<REPLACE_WITH_WORKDAY_SECRET>
WORKDAY_TENANT_ID=<YOUR_WORKDAY_TENANT>

# Delivery retry configuration
IMPACT_IN_MAX_RETRIES=3
IMPACT_IN_RETRY_DELAY_MS=5000
```

### Discord Bot (Phase B)

```bash
# Discord bot configuration
DISCORD_BOT_TOKEN=<REPLACE_WITH_DISCORD_BOT_TOKEN>
DISCORD_APPLICATION_ID=<REPLACE_WITH_DISCORD_APP_ID>

# Discord webhook for notifications
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...

# Enable feedback commands
DISCORD_FEEDBACK_ENABLED=true
```

---

## Observability & Monitoring

### Logging

```bash
# Log level
LOG_LEVEL=info  # Options: debug, info, warn, error

# Log format
LOG_FORMAT=json  # Options: json, pretty

# Log file locations
LOG_FILE_PATH=/var/log/teei-platform/cockpit.log
LOG_ERROR_FILE_PATH=/var/log/teei-platform/cockpit-error.log

# Enable request logging
LOG_REQUESTS=true
LOG_REQUESTS_BODY=false  # Set to false in production (may contain PII)
```

### OpenTelemetry (Worker 1 Integration)

```bash
# OTel collector endpoint
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Service identification
OTEL_SERVICE_NAME=teei-cockpit
OTEL_SERVICE_VERSION=phase-c-1.0.0

# Enable traces
OTEL_TRACES_ENABLED=true
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1  # Sample 10% of traces

# Enable metrics
OTEL_METRICS_ENABLED=true
OTEL_METRICS_EXPORT_INTERVAL_MS=60000  # 1 minute

# Resource attributes
OTEL_RESOURCE_ATTRIBUTES=environment=staging,region=us-east-1
```

### Sentry (Worker 1 Integration)

```bash
# Sentry DSN
SENTRY_DSN=<REPLACE_WITH_SENTRY_DSN>

# Environment and release tracking
SENTRY_ENVIRONMENT=staging
SENTRY_RELEASE=phase-c@1.0.0

# Error sampling
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10%
SENTRY_ERROR_SAMPLE_RATE=1.0   # 100%

# Performance monitoring
SENTRY_ENABLE_PROFILING=true
SENTRY_PROFILES_SAMPLE_RATE=0.05  # 5%
```

### Performance Monitoring

```bash
# Enable Web Vitals collection (Phase C E.1)
WEB_VITALS_ENABLED=true

# Performance budgets
PERF_BUDGET_LCP_MS=2500  # Largest Contentful Paint
PERF_BUDGET_INP_MS=200   # Interaction to Next Paint
PERF_BUDGET_CLS=0.1      # Cumulative Layout Shift
PERF_BUDGET_TTFB_MS=800  # Time to First Byte
```

---

## Cache & Rate Limiting

### Redis Configuration

```bash
# Redis connection
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=<REPLACE_IF_AUTH_ENABLED>

# Redis key prefix
REDIS_KEY_PREFIX=teei:cockpit:

# Cache TTL
CACHE_DEFAULT_TTL_SECONDS=300  # 5 minutes
CACHE_WIDGET_DATA_TTL_SECONDS=60  # 1 minute
```

### Rate Limiting

```bash
# Enable rate limiting
RATE_LIMIT_ENABLED=true

# Global rate limits
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=100

# API rate limits (per API key)
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=1000

# Reporting API rate limits
REPORTING_RATE_LIMIT_MAX_REQUESTS=500
```

---

## Email & Notifications

### Email Service (for scheduled reports)

```bash
# SMTP configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=true  # Use TLS
SMTP_USER=notifications@teei-platform.com
SMTP_PASSWORD=<REPLACE_WITH_SMTP_PASSWORD>

# Email templates
EMAIL_FROM_ADDRESS=noreply@teei-platform.com
EMAIL_FROM_NAME=TEEI Corporate Cockpit

# Report delivery
EMAIL_REPORT_SUBJECT_PREFIX=[TEEI Report]
EMAIL_REPORT_ATTACH_PDF=true
```

---

## Feature Flags

### Phase C Feature Toggles

```bash
# A) Tenantization
FEATURE_TENANT_ROUTING=true
FEATURE_ADMIN_CONSOLE=true

# B) Evidence Explorer (upcoming)
FEATURE_EVIDENCE_EXPLORER=false

# C) Generative Reporting (upcoming)
FEATURE_GEN_REPORTS=false

# D) Saved Views (upcoming)
FEATURE_SAVED_VIEWS=false
FEATURE_SHARE_LINKS=false
FEATURE_REPORT_SCHEDULER=false

# E) Performance & A11y
FEATURE_WEB_VITALS=true
FEATURE_A11Y_AUDIT=true

# F) Impact-In Monitor (upcoming)
FEATURE_IMPACTIN_MONITOR=false

# G) Theming (upcoming)
FEATURE_WHITELABEL_THEMING=false
```

---

## Security & Compliance

### Content Security Policy

```bash
# CSP directives
CSP_DEFAULT_SRC="'self'"
CSP_SCRIPT_SRC="'self' 'unsafe-inline' 'unsafe-eval'"  # Adjust as needed
CSP_STYLE_SRC="'self' 'unsafe-inline'"
CSP_IMG_SRC="'self' data: https:"
CSP_CONNECT_SRC="'self' https://*.teei-platform.com"
```

### CORS Configuration

```bash
# Allowed origins
CORS_ALLOWED_ORIGINS=https://staging.teei-platform.com,https://admin.teei-platform.com

# Allowed methods
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,PATCH,OPTIONS

# Allowed headers
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With

# Credentials support
CORS_ALLOW_CREDENTIALS=true
```

### Data Protection

```bash
# Enable PII redaction in logs
REDACT_PII_IN_LOGS=true

# Enable data encryption at rest
ENCRYPT_SENSITIVE_FIELDS=true

# GDPR compliance
GDPR_MODE=true
DATA_RETENTION_DAYS=730  # 2 years
```

---

## Development & Testing

### Development Only Variables

```bash
# Enable debug mode (NEVER in production)
DEBUG=false

# Enable hot reload
HOT_RELOAD=true

# Bypass authentication (dev only)
DEV_BYPASS_AUTH=false

# Mock external services
MOCK_BENEVITY_API=false
MOCK_GOODERA_API=false
MOCK_WORKDAY_API=false
```

### Testing Variables

```bash
# Test database
TEST_DATABASE_URL=postgresql://test_user:test_pass@localhost:5433/teei_cockpit_test

# Disable external calls in tests
TEST_DISABLE_EXTERNAL_CALLS=true

# Seed test data
TEST_SEED_DATA=true
```

---

## Validation Checklist

Before deployment, verify:

- [ ] All `<REPLACE_WITH_...>` placeholders filled
- [ ] No secrets in version control
- [ ] JWT_SECRET and SESSION_SECRET are random 64-char strings
- [ ] Database passwords meet complexity requirements
- [ ] API keys are valid and have correct scopes
- [ ] CORS origins match deployment domain
- [ ] Feature flags set appropriately for staging
- [ ] Log level appropriate for environment
- [ ] Sentry DSN configured for error tracking
- [ ] Redis connection working
- [ ] SMTP credentials tested

---

## Generating Secure Values

### Generate JWT Secret

```bash
openssl rand -base64 32
```

### Generate API Key Encryption Key

```bash
openssl rand -base64 32
```

### Generate Session Secret

```bash
openssl rand -base64 32
```

### Verify Environment Variables Loaded

```bash
# Check if variable is set
echo $TENANT_ROUTING_ENABLED

# List all TEEI variables
env | grep TEEI

# Validate JWT secret length
echo $JWT_SECRET | wc -c  # Should be 44-48 chars
```

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Security Classification**: Internal - Restricted
**Access**: Deployment team only
