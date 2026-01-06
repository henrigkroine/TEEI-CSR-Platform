# Staging Sealed Secrets

This directory contains encrypted (sealed) secrets for the staging environment.

## Overview

Sealed secrets are encrypted using the public key from the Sealed Secrets controller. They can be safely committed to Git and will be automatically decrypted by the controller in the cluster.

## Prerequisites

1. Sealed Secrets controller installed in cluster
2. `kubeseal` CLI installed locally
3. Public certificate fetched from cluster

## Creating Sealed Secrets

### 1. Fetch the public certificate

```bash
kubeseal --fetch-cert \
  --controller-namespace=kube-system \
  --controller-name=sealed-secrets-controller \
  > staging-pub-cert.pem
```

### 2. Create sealed secrets for each service

Use the helper script or create manually:

```bash
# API Gateway
cat <<EOF | kubeseal --format=yaml --cert=staging-pub-cert.pem > api-gateway-sealed.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
type: Opaque
stringData:
  JWT_SECRET: "$(openssl rand -hex 32)"
  REDIS_URL: "redis://staging-redis-service:6379"
EOF

# Q2Q AI
cat <<EOF | kubeseal --format=yaml --cert=staging-pub-cert.pem > q2q-ai-sealed.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-q2q-ai-secrets
  namespace: teei-staging
type: Opaque
stringData:
  ANTHROPIC_API_KEY: "sk-ant-api03-staging-key-here"
  DATABASE_URL: "postgresql://staging_user:staging_pass@postgres:5432/teei_csr"
EOF

# Discord Bot
cat <<EOF | kubeseal --format=yaml --cert=staging-pub-cert.pem > discord-bot-sealed.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-discord-bot-secrets
  namespace: teei-staging
type: Opaque
stringData:
  DISCORD_BOT_TOKEN: "staging-discord-bot-token"
  DISCORD_CLIENT_ID: "staging-discord-client-id"
EOF

# Continue for all other services...
```

### 3. Add to kustomization

Update `k8s/overlays/staging/kustomization.yaml`:

```yaml
resources:
  # Sealed secrets
  - sealed-secrets/api-gateway-sealed.yaml
  - sealed-secrets/q2q-ai-sealed.yaml
  - sealed-secrets/discord-bot-sealed.yaml
  # ... add all others
```

## File Naming Convention

- `<service>-sealed.yaml` - Encrypted sealed secret (safe to commit)
- `<service>-raw.yaml` - Raw secret with plaintext values (NEVER commit)

## Security Notes

1. ✅ Sealed secrets are safe to commit to Git
2. ❌ Never commit raw (unsealed) secrets
3. ✅ Add `*-raw.yaml` to `.gitignore`
4. ✅ Use different secrets for staging and production
5. ✅ Rotate secrets every 90 days

## Applying Sealed Secrets

Sealed secrets are automatically applied when you deploy using kustomize:

```bash
kubectl apply -k k8s/overlays/staging
```

Or deploy individually:

```bash
kubectl apply -f api-gateway-sealed.yaml
```

The controller will automatically decrypt and create the corresponding Kubernetes Secret.

## Verifying Secrets

Check that secrets were created:

```bash
# List sealed secrets
kubectl get sealedsecrets -n teei-staging

# List regular secrets (created by controller)
kubectl get secrets -n teei-staging

# Verify a specific secret exists
kubectl get secret teei-api-gateway-secrets -n teei-staging
```

## Updating Secrets

To update a secret:

1. Create a new raw secret with updated values
2. Seal it using kubeseal
3. Commit and apply the new sealed secret
4. Restart pods to pick up changes

## Example: Complete Workflow

```bash
# 1. Create raw secret (DO NOT COMMIT)
cat > api-gateway-raw.yaml <<EOF
apiVersion: v1
kind: Secret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
type: Opaque
stringData:
  JWT_SECRET: "new-secret-value"
  REDIS_URL: "redis://staging-redis:6379"
EOF

# 2. Seal the secret
kubeseal --format=yaml --cert=staging-pub-cert.pem \
  < api-gateway-raw.yaml \
  > api-gateway-sealed.yaml

# 3. Delete raw secret file
rm api-gateway-raw.yaml

# 4. Commit sealed secret
git add api-gateway-sealed.yaml
git commit -m "Update API Gateway secrets for staging"

# 5. Apply
kubectl apply -f api-gateway-sealed.yaml

# 6. Restart deployment
kubectl rollout restart deployment/teei-api-gateway -n teei-staging
```

## Placeholder Files

This directory currently contains placeholder/example files. Replace them with actual sealed secrets before deploying to staging.

Example placeholders:
- `.gitkeep` - Keeps directory in Git
- `EXAMPLE-sealed.yaml` - Example sealed secret format

## References

- [Sealed Secrets Documentation](https://sealed-secrets.netlify.app/)
- [Main Sealed Secrets Guide](../../../base/secrets/SEALED_SECRETS.md)
