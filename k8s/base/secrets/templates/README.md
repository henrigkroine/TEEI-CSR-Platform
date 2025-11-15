# Secret Templates

This directory contains template files for creating Kubernetes secrets for TEEI CSR Platform services.

## Overview

These templates show the structure and required secret keys for each service. They serve as:
- Documentation of what secrets each service needs
- Starting point for creating actual secrets
- Reference for secret key names and formats

## Available Templates

| Template File | Service | Description |
|---------------|---------|-------------|
| `teei-api-gateway-secrets.yaml` | API Gateway | JWT secrets, Redis, database, rate limiting |
| `teei-unified-profile-secrets.yaml` | Unified Profile | Database, PII encryption, OAuth, SAML, SCIM |
| `teei-q2q-ai-secrets.yaml` | Q2Q AI Service | Anthropic API key, database, vector DB, S3 |
| `teei-analytics-secrets.yaml` | Analytics | Database, ClickHouse, data warehouse, S3 |
| `teei-discord-bot-secrets.yaml` | Discord Bot | Bot token, webhooks, moderation |
| `teei-corp-cockpit-secrets.yaml` | Corporate Cockpit | API gateway, session, analytics, Sentry |

## Usage Methods

### Method 1: Using the Helper Script (Recommended)

The easiest way to create sealed secrets:

```bash
# Seal a secret for staging
./scripts/seal-secret.sh api-gateway staging

# Seal a secret for production
./scripts/seal-secret.sh q2q-ai production

# The script will:
# 1. Fetch the public cert from your cluster
# 2. Copy the template
# 3. Open your editor to fill in values
# 4. Seal the secret
# 5. Save to k8s/overlays/{env}/sealed-secrets/
```

### Method 2: Manual Process

If you prefer manual control:

```bash
# 1. Fetch the public certificate
kubeseal --fetch-cert \
  --controller-namespace=kube-system \
  --controller-name=sealed-secrets-controller \
  > pub-cert.pem

# 2. Copy a template
cp k8s/base/secrets/templates/teei-api-gateway-secrets.yaml /tmp/secret.yaml

# 3. Edit and replace PLACEHOLDER values
# Replace NAMESPACE_PLACEHOLDER with: teei-staging or teei-production
vi /tmp/secret.yaml

# 4. Seal the secret
kubeseal --format=yaml --cert=pub-cert.pem \
  < /tmp/secret.yaml \
  > k8s/overlays/staging/sealed-secrets/api-gateway-sealed.yaml

# 5. Apply to cluster
kubectl apply -f k8s/overlays/staging/sealed-secrets/api-gateway-sealed.yaml

# 6. Clean up temporary files
rm /tmp/secret.yaml
```

### Method 3: One-liner with Generated Values

For quick testing (staging only):

```bash
cat k8s/base/secrets/templates/teei-api-gateway-secrets.yaml | \
  sed "s/NAMESPACE_PLACEHOLDER/teei-staging/g" | \
  sed "s/PLACEHOLDER_JWT_SECRET_REPLACE_ME/$(openssl rand -hex 32)/g" | \
  sed "s/PLACEHOLDER_JWT_REFRESH_SECRET_REPLACE_ME/$(openssl rand -hex 32)/g" | \
  sed "s/PLACEHOLDER_REDIS_PASSWORD/$(openssl rand -hex 16)/g" | \
  kubeseal --format=yaml --cert=pub-cert.pem \
  > k8s/overlays/staging/sealed-secrets/api-gateway-sealed.yaml
```

**WARNING**: This method is not recommended for production as it doesn't allow proper review of secrets before sealing.

## Generating Strong Secrets

Always use strong, randomly generated secrets:

```bash
# 256-bit secret (32 bytes, 64 hex chars)
openssl rand -hex 32

# 128-bit secret (16 bytes, 32 hex chars)
openssl rand -hex 16

# Base64 encoded
openssl rand -base64 32

# UUID
uuidgen
```

## Secret Key Reference

### API Gateway
- `JWT_SECRET`: Token signing key (256-bit)
- `JWT_REFRESH_SECRET`: Refresh token key (256-bit)
- `REDIS_URL`: Redis connection string
- `REDIS_PASSWORD`: Redis auth password
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `ADMIN_API_KEY`: Internal service auth

### Unified Profile
- `DATABASE_URL`: PostgreSQL connection
- `PII_ENCRYPTION_KEY`: 256-bit AES key for PII
- `JWT_SECRET`: Must match API Gateway
- `OAUTH_CLIENT_ID/SECRET`: SSO credentials
- `SAML_CERT/PRIVATE_KEY`: SAML configuration
- `SCIM_API_TOKEN`: User provisioning

### Q2Q AI
- `ANTHROPIC_API_KEY`: Claude API key (sk-ant-api03-...)
- `DATABASE_URL`: PostgreSQL connection
- `REDIS_URL`: Cache connection
- `AWS_ACCESS_KEY_ID/SECRET`: S3 for artifacts
- `EVIDENCE_ENCRYPTION_KEY`: Lineage encryption

### Analytics
- `DATABASE_URL`: Primary database
- `ANALYTICS_DB_URL`: Read replica
- `CLICKHOUSE_URL/PASSWORD`: OLAP queries
- `DW_CREDENTIALS`: Data warehouse JSON key
- `S3_BUCKET`: Export storage
- `OTEL_EXPORTER_OTLP_HEADERS`: Telemetry auth

### Discord Bot
- `DISCORD_BOT_TOKEN`: Bot token from Discord
- `DISCORD_CLIENT_ID/SECRET`: OAuth credentials
- `DISCORD_GUILD_ID`: Server ID
- `DATABASE_URL`: PostgreSQL connection
- `FEEDBACK_WEBHOOK_URL`: Notification webhooks

### Corporate Cockpit
- `API_GATEWAY_URL`: Backend API endpoint
- `SESSION_SECRET`: Session encryption
- `SENTRY_DSN`: Error tracking
- `CSP_NONCE_SECRET`: Content Security Policy
- `OTEL_EXPORTER_OTLP_HEADERS`: RUM telemetry

## Security Best Practices

### DO ✓
- Use different secrets for staging and production
- Generate random secrets with `openssl rand`
- Store secrets in a password manager as backup
- Rotate secrets every 90 days
- Use namespace-scoped sealing for production
- Review sealed secrets before committing
- Audit who has access to kubeseal
- Enable audit logging for secret access

### DON'T ✗
- Never commit unsealed secrets to Git
- Never share secrets via Slack/email
- Never reuse secrets across environments
- Never use weak or predictable secrets
- Never skip the review process
- Never seal secrets without backing them up
- Never expose secrets in logs or error messages

## Namespace Mapping

| Environment | Namespace | Use For |
|-------------|-----------|---------|
| `staging` | `teei-staging` | Testing and QA |
| `production` | `teei-production` | Live production workloads |
| `dev` | `teei-dev` | Local development clusters |

## Troubleshooting

### Template not found
```bash
ls -la k8s/base/secrets/templates/
# Ensure all 6 template files exist
```

### Cannot fetch certificate
```bash
# Check controller is running
kubectl get pods -n kube-system -l name=sealed-secrets-controller

# Check controller logs
kubectl logs -n kube-system -l name=sealed-secrets-controller

# Verify kubeseal can reach the cluster
kubectl cluster-info
```

### Sealed secret not decrypting
```bash
# Check SealedSecret resource
kubectl get sealedsecret -n teei-staging

# Check controller logs
kubectl logs -n kube-system -l name=sealed-secrets-controller

# Verify namespace matches
kubectl describe sealedsecret <name> -n teei-staging
```

### Lost secrets
If you lose your secrets:
1. Check your password manager backup
2. Check previous Git commits (for sealed versions only)
3. Extract from running cluster (if still deployed):
   ```bash
   kubectl get secret <name> -n <namespace> -o yaml
   ```
4. Regenerate and redeploy (last resort)

## Migration Path

If you're migrating from manual secrets:

```bash
# 1. Export existing secret
kubectl get secret teei-api-gateway-secrets -n teei-staging -o yaml > /tmp/existing-secret.yaml

# 2. Clean up metadata
# Remove: resourceVersion, uid, creationTimestamp, etc.

# 3. Seal it
kubeseal --format=yaml --cert=pub-cert.pem \
  < /tmp/existing-secret.yaml \
  > k8s/overlays/staging/sealed-secrets/api-gateway-sealed.yaml

# 4. Commit sealed version
git add k8s/overlays/staging/sealed-secrets/api-gateway-sealed.yaml
git commit -m "chore: migrate api-gateway secret to sealed-secrets"

# 5. Clean up temp file
rm /tmp/existing-secret.yaml
```

## Additional Resources

- [Sealed Secrets Documentation](../SEALED_SECRETS.md)
- [Vault Integration](../VAULT_INTEGRATION.md) (alternative approach)
- [SOPS Integration](../SOPS_INTEGRATION.md) (alternative approach)
- [Operator Guide](../OPERATOR_GUIDE.md)
- [Secrets Inventory](../SECRETS_INVENTORY.md)

## Support

For questions or issues:
1. Check the documentation in `k8s/base/secrets/`
2. Review the Sealed Secrets [official docs](https://sealed-secrets.netlify.app/)
3. Contact the platform team
