# TEEI Vault Secrets Management

This directory contains HashiCorp Vault configuration for managing secrets in the TEEI CSR Platform.

## Directory Structure

```
infra/vault/
├── policies/           # Vault policies (one per service)
│   ├── teei-api-gateway.hcl
│   ├── teei-unified-profile.hcl
│   └── ...
└── README.md          # This file
```

## Setup

### 1. Prerequisites

- Vault server running (local or remote)
- `vault` CLI installed
- Kubernetes cluster with service accounts created

### 2. Bootstrap Vault

Run the bootstrap script to initialize Vault:

```bash
cd scripts/infra
export VAULT_ADDR=http://localhost:8200  # or your Vault URL
export VAULT_TOKEN=<your-root-token>
./bootstrap-vault.sh
```

This script will:
- Enable KV secrets engine (v2)
- Enable Kubernetes auth method
- Create policies for all services
- Create Kubernetes roles for service accounts
- Create sample secrets (to be replaced with actual values)

### 3. Add Production Secrets

Replace sample secrets with actual production values:

```bash
# API Gateway secrets
vault kv put secret/teei/api-gateway \
  JWT_SECRET="$(openssl rand -hex 32)" \
  REDIS_URL="redis://redis-cluster:6379"

# Q2Q AI secrets
vault kv put secret/teei/q2q-ai \
  OPENAI_API_KEY="sk-actual-key-here" \
  MODEL_VERSION="gpt-4"

# Database secrets
vault kv put secret/teei/unified-profile \
  DATABASE_URL="postgresql://user:password@postgres:5432/profiles"
```

### 4. Verify Secret Access

Test that a pod can retrieve secrets:

```bash
# Get a token for the api-gateway service account
kubectl exec -it <api-gateway-pod> -- sh

# Inside the pod, retrieve secrets
vault login -method=kubernetes role=teei-api-gateway
vault kv get secret/teei/api-gateway
```

## Policies

Each service has a dedicated Vault policy that grants read-only access to its own secrets.

Example policy (`teei-api-gateway.hcl`):

```hcl
path "secret/data/teei/api-gateway" {
  capabilities = ["read"]
}
```

## Kubernetes Integration

Vault integrates with Kubernetes using service accounts. Each deployment has a service account with a corresponding Vault role.

In the deployment YAML:

```yaml
spec:
  serviceAccountName: teei-api-gateway
  annotations:
    vault.hashicorp.com/role: "teei-api-gateway"
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/agent-inject-secret-config: "secret/teei/api-gateway"
```

## Secret Rotation

To rotate secrets:

1. Generate new secret value
2. Update Vault: `vault kv put secret/teei/<service> KEY=<new-value>`
3. Restart pods to pick up new secrets: `kubectl rollout restart deployment/teei-<service>`

## Troubleshooting

### Secret not found

```bash
vault kv get secret/teei/api-gateway
```

### Permission denied

Check policy:
```bash
vault policy read teei-api-gateway
```

### Kubernetes auth fails

Verify Kubernetes auth config:
```bash
vault read auth/kubernetes/config
```

## Security Best Practices

- ✅ Never commit secrets to git
- ✅ Use least-privilege policies (read-only per service)
- ✅ Enable audit logging in Vault
- ✅ Rotate secrets regularly (every 90 days)
- ✅ Use namespaces to isolate environments
- ✅ Enable TLS for Vault communication
- ✅ Backup Vault data regularly

## References

- [HashiCorp Vault Kubernetes Auth](https://developer.hashicorp.com/vault/docs/auth/kubernetes)
- [Vault Agent Injector](https://developer.hashicorp.com/vault/docs/platform/k8s/injector)
- [KV Secrets Engine](https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2)
