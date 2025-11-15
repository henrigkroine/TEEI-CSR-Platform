# Vault Integration Guide

This guide explains how to integrate HashiCorp Vault with the TEEI CSR Platform for secure secrets management in Kubernetes.

## Overview

We use **HashiCorp Vault** with the **Vault Agent Injector** for Kubernetes to:
- Store secrets securely outside of version control
- Provide dynamic secret injection into pods
- Enable secret rotation without pod restarts
- Audit all secret access

## Architecture

```
┌─────────────────┐
│  Vault Server   │
│   (External)    │
└────────┬────────┘
         │
         │ Kubernetes Auth
         │
┌────────▼────────┐
│ Vault Agent     │
│ Injector        │
│ (K8s Admission  │
│  Controller)    │
└────────┬────────┘
         │
         │ Inject Secrets
         │
┌────────▼────────┐
│  Application    │
│     Pods        │
└─────────────────┘
```

## Prerequisites

1. Vault server running and accessible from Kubernetes cluster
2. Vault Kubernetes auth method enabled
3. Service accounts created for each service
4. Vault policies defined (already in `infra/vault/policies/`)

## Setup Steps

### 1. Bootstrap Vault

Run the bootstrap script to initialize Vault:

```bash
cd scripts/infra
export VAULT_ADDR=https://vault.example.com
export VAULT_TOKEN=<your-root-token>
./bootstrap-vault.sh
```

This will:
- Enable KV secrets engine v2
- Enable Kubernetes auth method
- Create policies for all services
- Create Kubernetes roles
- Create sample secrets (to be replaced)

### 2. Install Vault Agent Injector

Install the Vault Helm chart with Agent Injector enabled:

```bash
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

helm install vault hashicorp/vault \
  --namespace vault \
  --create-namespace \
  --set "injector.enabled=true" \
  --set "server.enabled=false" \
  --set "injector.externalVaultAddr=https://vault.example.com"
```

### 3. Update Deployments with Vault Annotations

For each service, add Vault annotations to the pod template. Example for api-gateway:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: teei-api-gateway
spec:
  template:
    metadata:
      annotations:
        # Enable Vault injection
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "teei-api-gateway"

        # Inject JWT_SECRET
        vault.hashicorp.com/agent-inject-secret-jwt: "secret/teei/api-gateway"
        vault.hashicorp.com/agent-inject-template-jwt: |
          {{- with secret "secret/teei/api-gateway" -}}
          export JWT_SECRET="{{ .Data.data.JWT_SECRET }}"
          export REDIS_URL="{{ .Data.data.REDIS_URL }}"
          {{- end }}
    spec:
      serviceAccountName: teei-api-gateway
      containers:
      - name: api-gateway
        # Secrets are available as environment variables via the injected script
        command: ["/bin/sh", "-c"]
        args:
          - source /vault/secrets/jwt && exec node server.js
```

### 4. Create Secrets in Vault

Add actual production secrets to Vault:

```bash
# API Gateway
vault kv put secret/teei/api-gateway \
  JWT_SECRET="$(openssl rand -hex 32)" \
  REDIS_URL="redis://redis-service:6379"

# Q2Q AI
vault kv put secret/teei/q2q-ai \
  ANTHROPIC_API_KEY="sk-ant-api03-actual-key-here" \
  DATABASE_URL="postgresql://user:pass@postgres:5432/teei_csr"

# Unified Profile
vault kv put secret/teei/unified-profile \
  DATABASE_URL="postgresql://user:pass@postgres:5432/profiles" \
  JWT_SECRET="<same-as-api-gateway>"

# Discord Bot
vault kv put secret/teei/discord-bot \
  DISCORD_BOT_TOKEN="actual-bot-token" \
  DISCORD_CLIENT_ID="actual-client-id"

# Analytics
vault kv put secret/teei/analytics \
  DATABASE_URL="postgresql://user:pass@postgres:5432/teei_platform" \
  CLICKHOUSE_PASSWORD="clickhouse-password" \
  REDIS_URL="redis://redis-service:6379" \
  NATS_URL="nats://nats-service:4222"

# Continue for all other services...
```

### 5. Verify Secret Injection

Deploy a service and verify secrets are injected:

```bash
# Deploy api-gateway
kubectl apply -f k8s/base/api-gateway/

# Check pod annotations
kubectl describe pod -l app=teei-api-gateway

# Check injected secrets (inside pod)
kubectl exec -it <pod-name> -- cat /vault/secrets/jwt
```

## Alternative: Vault CSI Driver

For environments that prefer direct volume mounting over agent injection, use the Vault CSI driver:

### Install Vault CSI Driver

```bash
helm install vault-csi-provider hashicorp/vault-csi-provider \
  --namespace vault \
  --set "vault.address=https://vault.example.com"
```

### Use SecretProviderClass

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: teei-api-gateway-secrets
spec:
  provider: vault
  parameters:
    vaultAddress: "https://vault.example.com"
    roleName: "teei-api-gateway"
    objects: |
      - objectName: "JWT_SECRET"
        secretPath: "secret/data/teei/api-gateway"
        secretKey: "JWT_SECRET"
      - objectName: "REDIS_URL"
        secretPath: "secret/data/teei/api-gateway"
        secretKey: "REDIS_URL"
  secretObjects:
  - secretName: teei-api-gateway-secrets
    type: Opaque
    data:
    - objectName: JWT_SECRET
      key: JWT_SECRET
    - objectName: REDIS_URL
      key: REDIS_URL
```

Then mount in deployment:

```yaml
spec:
  template:
    spec:
      serviceAccountName: teei-api-gateway
      containers:
      - name: api-gateway
        env:
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: teei-api-gateway-secrets
              key: JWT_SECRET
        volumeMounts:
        - name: secrets-store
          mountPath: "/mnt/secrets-store"
          readOnly: true
      volumes:
      - name: secrets-store
        csi:
          driver: secrets-store.csi.k8s.io
          readOnly: true
          volumeAttributes:
            secretProviderClass: "teei-api-gateway-secrets"
```

## Secret Rotation

To rotate a secret:

1. Update the secret in Vault:
   ```bash
   vault kv put secret/teei/api-gateway JWT_SECRET="<new-value>"
   ```

2. Restart the pods to pick up new values:
   ```bash
   kubectl rollout restart deployment/teei-api-gateway
   ```

With Vault Agent Injector, you can also configure automatic secret rotation without pod restarts by using the `vault.hashicorp.com/agent-inject-file` annotation.

## Security Best Practices

1. Use separate Vault namespaces for staging and production
2. Enable audit logging in Vault
3. Rotate secrets every 90 days
4. Use TLS for all Vault communication
5. Restrict Vault policies to least privilege
6. Never log secret values
7. Use dynamic secrets when possible (e.g., database credentials)

## Troubleshooting

### Pod fails to start with "permission denied"

Check the Vault policy:
```bash
vault policy read teei-api-gateway
```

Verify the service account is bound to the role:
```bash
vault read auth/kubernetes/role/teei-api-gateway
```

### Secret not found

Verify the secret exists in Vault:
```bash
vault kv get secret/teei/api-gateway
```

### Vault agent sidecar not injected

Check the webhook is running:
```bash
kubectl get mutatingwebhookconfigurations
kubectl get pods -n vault -l app.kubernetes.io/name=vault-agent-injector
```

## References

- [Vault Agent Injector Documentation](https://developer.hashicorp.com/vault/docs/platform/k8s/injector)
- [Vault CSI Provider Documentation](https://developer.hashicorp.com/vault/docs/platform/k8s/csi)
- [Kubernetes Auth Method](https://developer.hashicorp.com/vault/docs/auth/kubernetes)
