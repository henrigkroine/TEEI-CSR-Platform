# Sealed Secrets Integration Guide

This guide explains how to use Bitnami Sealed Secrets for secure secrets management in the TEEI CSR Platform.

## Overview

**Sealed Secrets** is a Kubernetes-native solution that allows you to:
- Encrypt secrets before committing to Git
- Store encrypted secrets safely in version control
- Automatically decrypt secrets in the cluster
- Enable GitOps workflows for secrets

## Why Sealed Secrets?

- No external infrastructure required (unlike Vault)
- Works seamlessly with GitOps tools (ArgoCD, Flux)
- Encrypted secrets can be safely stored in Git
- Simple to set up and manage
- Perfect for staging environments

## Architecture

```
┌─────────────────┐
│  Developer      │
│  Workstation    │
└────────┬────────┘
         │
         │ kubeseal CLI
         │ (encrypts secret)
         │
         ▼
┌─────────────────┐
│  Git Repository │
│  (SealedSecret) │
└────────┬────────┘
         │
         │ GitOps Deploy
         │
┌────────▼────────┐
│  Kubernetes     │
│  Cluster        │
│  ┌───────────┐  │
│  │ Sealed    │  │
│  │ Secrets   │  │
│  │Controller │  │
│  └─────┬─────┘  │
│        │decrypt │
│        ▼        │
│  ┌───────────┐  │
│  │  Secret   │  │
│  └───────────┘  │
└─────────────────┘
```

## Setup Steps

### 1. Install Sealed Secrets Controller

Install the controller in your Kubernetes cluster:

```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
```

Or using Helm:

```bash
helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets
helm repo update

helm install sealed-secrets sealed-secrets/sealed-secrets \
  --namespace kube-system \
  --create-namespace
```

### 2. Install kubeseal CLI

On your local machine, install the `kubeseal` CLI:

**macOS:**
```bash
brew install kubeseal
```

**Linux:**
```bash
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/kubeseal-0.24.0-linux-amd64.tar.gz
tar -xvzf kubeseal-0.24.0-linux-amd64.tar.gz
sudo install -m 755 kubeseal /usr/local/bin/kubeseal
```

**Windows:**
```bash
choco install kubeseal
```

### 3. Fetch Public Key

Get the public encryption key from your cluster:

```bash
kubeseal --fetch-cert \
  --controller-namespace=kube-system \
  --controller-name=sealed-secrets-controller \
  > pub-cert.pem
```

Store this certificate securely - it's safe to commit to Git.

### 4. Create and Seal Secrets

Create a regular Kubernetes secret file:

```yaml
# api-gateway-secret-raw.yaml (DO NOT commit this file)
apiVersion: v1
kind: Secret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
type: Opaque
stringData:
  JWT_SECRET: "actual-secret-value-here"
  REDIS_URL: "redis://redis-service:6379"
```

Seal the secret:

```bash
kubeseal --format=yaml --cert=pub-cert.pem \
  < api-gateway-secret-raw.yaml \
  > api-gateway-sealed-secret.yaml
```

The output file `api-gateway-sealed-secret.yaml` is safe to commit to Git:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
spec:
  encryptedData:
    JWT_SECRET: AgBqE7V... (encrypted)
    REDIS_URL: AgC8w3... (encrypted)
```

### 5. Apply Sealed Secret

Deploy the sealed secret:

```bash
kubectl apply -f api-gateway-sealed-secret.yaml
```

The Sealed Secrets controller will automatically decrypt it and create a regular Kubernetes Secret.

### 6. Verify Secret Creation

Check that the secret was created:

```bash
kubectl get secret teei-api-gateway-secrets -n teei-staging
kubectl get sealedsecret teei-api-gateway-secrets -n teei-staging
```

## Creating Sealed Secrets for All Services

### API Gateway

```bash
# Create raw secret
cat <<EOF | kubeseal --format=yaml --cert=pub-cert.pem > k8s/overlays/staging/sealed-secrets/api-gateway.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
type: Opaque
stringData:
  JWT_SECRET: "$(openssl rand -hex 32)"
  REDIS_URL: "redis://redis-service:6379"
EOF
```

### Q2Q AI

```bash
cat <<EOF | kubeseal --format=yaml --cert=pub-cert.pem > k8s/overlays/staging/sealed-secrets/q2q-ai.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-q2q-ai-secrets
  namespace: teei-staging
type: Opaque
stringData:
  ANTHROPIC_API_KEY: "sk-ant-api03-your-actual-key"
  DATABASE_URL: "postgresql://user:pass@postgres:5432/teei_csr"
EOF
```

### Discord Bot

```bash
cat <<EOF | kubeseal --format=yaml --cert=pub-cert.pem > k8s/overlays/staging/sealed-secrets/discord-bot.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-discord-bot-secrets
  namespace: teei-staging
type: Opaque
stringData:
  DISCORD_BOT_TOKEN: "your-discord-bot-token"
  DISCORD_CLIENT_ID: "your-discord-client-id"
EOF
```

Continue this pattern for all services.

## Updating Secrets

To update a secret:

1. Create a new raw secret file with updated values
2. Seal it with kubeseal
3. Apply the new sealed secret
4. Restart pods to pick up changes:
   ```bash
   kubectl rollout restart deployment/teei-api-gateway -n teei-staging
   ```

## Secret Rotation

For regular rotation:

```bash
# Generate new value
NEW_JWT_SECRET=$(openssl rand -hex 32)

# Create updated sealed secret
cat <<EOF | kubeseal --format=yaml --cert=pub-cert.pem > api-gateway-sealed-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: teei-api-gateway-secrets
  namespace: teei-staging
type: Opaque
stringData:
  JWT_SECRET: "${NEW_JWT_SECRET}"
  REDIS_URL: "redis://redis-service:6379"
EOF

# Apply and restart
kubectl apply -f api-gateway-sealed-secret.yaml
kubectl rollout restart deployment/teei-api-gateway -n teei-staging
```

## Backup and Disaster Recovery

### Backup Private Key

The controller's private key is critical. Back it up:

```bash
kubectl get secret -n kube-system \
  -l sealedsecrets.bitnami.com/sealed-secrets-key=active \
  -o yaml > sealed-secrets-private-key-backup.yaml
```

Store this file in a secure location (e.g., encrypted vault, not in Git).

### Restore Private Key

To restore in a new cluster:

```bash
kubectl apply -f sealed-secrets-private-key-backup.yaml
kubectl rollout restart deployment/sealed-secrets-controller -n kube-system
```

## GitOps Integration

Sealed Secrets work seamlessly with GitOps:

```yaml
# k8s/overlays/staging/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
  # Regular resources
  - ../../base/api-gateway

  # Sealed secrets (safe to commit)
  - sealed-secrets/api-gateway.yaml
  - sealed-secrets/q2q-ai.yaml
  - sealed-secrets/discord-bot.yaml
```

## Security Best Practices

1. Never commit raw (unsealed) secrets to Git
2. Add `*-secret-raw.yaml` to `.gitignore`
3. Use different sealed secrets for staging and production
4. Backup the controller's private key securely
5. Rotate secrets every 90 days
6. Use namespace-scoped sealing for production
7. Audit who has access to kubeseal and the certificate

## Namespace-Scoped Secrets

For production, use namespace-scoped sealing for extra security:

```bash
kubeseal --format=yaml --cert=pub-cert.pem \
  --scope=namespace-wide \
  < secret-raw.yaml \
  > sealed-secret.yaml
```

This ensures the sealed secret can only be decrypted in the specified namespace.

## Troubleshooting

### Sealed secret not decrypting

Check controller logs:
```bash
kubectl logs -n kube-system -l name=sealed-secrets-controller
```

### Certificate mismatch

Ensure you're using the correct certificate:
```bash
kubeseal --fetch-cert --controller-namespace=kube-system
```

### Secret rotation not working

Delete the old secret and reapply:
```bash
kubectl delete sealedsecret teei-api-gateway-secrets -n teei-staging
kubectl apply -f api-gateway-sealed-secret.yaml
```

## Comparison: Sealed Secrets vs Vault

| Feature | Sealed Secrets | Vault |
|---------|----------------|-------|
| External Infrastructure | No | Yes |
| GitOps Friendly | Yes | Partial |
| Secret Rotation | Manual | Automatic |
| Dynamic Secrets | No | Yes |
| Audit Logging | Basic | Advanced |
| Setup Complexity | Low | High |
| Best For | Staging, small teams | Production, large teams |

## References

- [Sealed Secrets GitHub](https://github.com/bitnami-labs/sealed-secrets)
- [Sealed Secrets Documentation](https://sealed-secrets.netlify.app/)
- [GitOps Best Practices](https://www.weave.works/blog/gitops-secret-management)
