# TEEI CSR Platform - Secrets Inventory

This document provides a comprehensive inventory of all secrets required by each service in the TEEI CSR Platform.

## Secrets by Service

### 1. API Gateway (`teei-api-gateway`)

**Secret Name:** `teei-api-gateway-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `JWT_SECRET` | JWT signing key for authentication tokens | `openssl rand -hex 32` | Yes |
| `REDIS_URL` | Redis connection string for rate limiting | `redis://redis-service:6379` | No |

**Vault Path:** `secret/teei/api-gateway`

**Service Account:** `teei-api-gateway`

---

### 2. Unified Profile Service (`teei-unified-profile`)

**Secret Name:** `teei-unified-profile-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/profiles` | Yes |
| `JWT_SECRET` | JWT verification key (must match API Gateway) | Same as API Gateway | Yes |

**Vault Path:** `secret/teei/unified-profile`

**Service Account:** `teei-unified-profile`

---

### 3. Q2Q AI Service (`teei-q2q-ai`)

**Secret Name:** `teei-q2q-ai-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `ANTHROPIC_API_KEY` | Claude API key from Anthropic | `sk-ant-api03-...` | One of three |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` | One of three |
| `GOOGLE_AI_API_KEY` | Google Gemini API key | `...` | One of three |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/teei_csr` | Yes |

**Vault Path:** `secret/teei/q2q-ai`

**Service Account:** `teei-q2q-ai`

**Notes:** At least one AI provider API key is required. Default provider is Claude.

---

### 4. Analytics Service (`teei-analytics`)

**Secret Name:** `teei-analytics-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://teei:pass@postgres:5432/teei_platform` | Yes |
| `CLICKHOUSE_PASSWORD` | ClickHouse database password | `teei_prod_password` | Yes |
| `REDIS_URL` | Redis connection string for replay cache | `redis://redis-service:6379` | Yes |
| `NATS_URL` | NATS messaging connection string | `nats://nats-service:4222` | Yes |

**Vault Path:** `secret/teei/analytics`

**Service Account:** `teei-analytics`

---

### 5. Discord Bot (`teei-discord-bot`)

**Secret Name:** `teei-discord-bot-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `DISCORD_BOT_TOKEN` | Discord bot authentication token | `MTk4NjIyNDgzNDcxOTI1MjQ4...` | Yes |
| `DISCORD_CLIENT_ID` | Discord application client ID | `123456789012345678` | Yes |

**Vault Path:** `secret/teei/discord-bot`

**Service Account:** `teei-discord-bot`

---

### 6. Corp Cockpit Astro (`teei-corp-cockpit-astro`)

**Secret Name:** `teei-corp-cockpit-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `JWT_SECRET` | JWT verification key (must match API Gateway) | Same as API Gateway | Yes |
| `ANALYTICS_SERVICE_URL` | Analytics service internal URL | `http://teei-analytics:3007` | No |

**Vault Path:** `secret/teei/corp-cockpit`

**Service Account:** `teei-corp-cockpit-astro`

---

### 7. Kintell Connector (`teei-kintell-connector`)

**Secret Name:** `teei-kintell-connector-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `KINTELL_API_KEY` | Kintell platform API key | `kintell_...` | Yes |
| `KINTELL_API_URL` | Kintell API endpoint | `https://api.kintell.com` | No |

**Vault Path:** `secret/teei/kintell-connector`

**Service Account:** `teei-kintell-connector`

---

### 8. Buddy Service (`teei-buddy-service`)

**Secret Name:** `teei-buddy-service-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/buddy` | Yes |

**Vault Path:** `secret/teei/buddy-service`

**Service Account:** `teei-buddy-service`

---

### 9. Buddy Connector (`teei-buddy-connector`)

**Secret Name:** `teei-buddy-connector-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `BUDDY_API_KEY` | Buddy platform API key | `buddy_...` | Yes |
| `BUDDY_API_URL` | Buddy API endpoint | `https://api.buddy.com` | No |

**Vault Path:** `secret/teei/buddy-connector`

**Service Account:** `teei-buddy-connector`

---

### 10. Upskilling Connector (`teei-upskilling-connector`)

**Secret Name:** `teei-upskilling-connector-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `UPSKILLING_API_KEY` | Upskilling platform API key | `upskill_...` | Yes |
| `UPSKILLING_API_URL` | Upskilling API endpoint | `https://api.upskilling.com` | No |

**Vault Path:** `secret/teei/upskilling-connector`

**Service Account:** `teei-upskilling-connector`

---

### 11. Safety Moderation (`teei-safety-moderation`)

**Secret Name:** `teei-safety-moderation-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `MODERATION_API_KEY` | Content moderation API key (e.g., OpenAI) | `sk-...` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/safety` | Yes |

**Vault Path:** `secret/teei/safety-moderation`

**Service Account:** `teei-safety-moderation`

---

### 12. Reporting Service (`teei-reporting`)

**Secret Name:** `teei-reporting-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/reporting` | Yes |
| `S3_ACCESS_KEY_ID` | S3/MinIO access key for report storage | `AKIAIOSFODNN7EXAMPLE` | No |
| `S3_SECRET_ACCESS_KEY` | S3/MinIO secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` | No |

**Vault Path:** `secret/teei/reporting`

**Service Account:** `teei-reporting`

---

### 13. Notifications Service (`teei-notifications`)

**Secret Name:** `teei-notifications-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `SMTP_PASSWORD` | SMTP server password for email notifications | `smtp_password` | No |
| `SENDGRID_API_KEY` | SendGrid API key (alternative to SMTP) | `SG.xxx` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/notifications` | Yes |

**Vault Path:** `secret/teei/notifications`

**Service Account:** `teei-notifications`

---

### 14. Journey Engine (`teei-journey-engine`)

**Secret Name:** `teei-journey-engine-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/journey` | Yes |

**Vault Path:** `secret/teei/journey-engine`

**Service Account:** `teei-journey-engine`

---

### 15. Impact Calculator (`teei-impact-calculator`)

**Secret Name:** `teei-impact-calculator-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/impact` | Yes |

**Vault Path:** `secret/teei/impact-calculator`

**Service Account:** `teei-impact-calculator`

---

### 16. Impact-In Service (`teei-impact-in`)

**Secret Name:** `teei-impact-in-secrets`

| Key | Description | Example | Required |
|-----|-------------|---------|----------|
| `IMPACT_IN_API_KEY` | Impact-In platform API key | `impact_...` | Yes |
| `IMPACT_IN_WEBHOOK_SECRET` | Webhook signature verification secret | `whsec_...` | Yes |

**Vault Path:** `secret/teei/impact-in`

**Service Account:** `teei-impact-in`

---

## Shared Secrets

Some secrets must be identical across multiple services:

| Secret Key | Services | Reason |
|------------|----------|--------|
| `JWT_SECRET` | api-gateway, unified-profile, corp-cockpit | Token verification across services |
| `DATABASE_URL` | Multiple | Each service may have its own database or share a common one |

## Secret Generation Commands

### JWT Secret
```bash
openssl rand -hex 32
```

### Database Password
```bash
openssl rand -base64 32
```

### API Keys
Contact the respective third-party service provider for API keys.

## Security Notes

1. Never commit plaintext secrets to version control
2. Use different secrets for staging and production environments
3. Rotate secrets every 90 days
4. Use least-privilege principles (each service only gets its own secrets)
5. Enable audit logging to track secret access
6. Store secrets in a secure secrets manager (Vault, Sealed Secrets, etc.)

## Next Steps

See `README.md` in this directory for instructions on:
- Creating secrets using Vault
- Creating secrets using Sealed Secrets
- Deploying secrets to Kubernetes
- Rotating secrets safely
