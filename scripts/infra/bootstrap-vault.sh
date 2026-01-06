#!/usr/bin/env bash
# TEEI CSR Platform - Vault Bootstrap Script
# Purpose: Initialize HashiCorp Vault for secrets management
# Ref: MULTI_AGENT_PLAN.md § D3.1 Security & Secrets Engineer

set -euo pipefail

# Configuration
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_NAMESPACE="${VAULT_NAMESPACE:-teei-platform}"
K8S_HOST="${K8S_HOST:-https://kubernetes.default.svc}"
K8S_CA_CERT="${K8S_CA_CERT:-/var/run/secrets/kubernetes.io/serviceaccount/ca.crt}"

echo "=== TEEI Vault Bootstrap ==="
echo "Vault Address: ${VAULT_ADDR}"
echo "Namespace: ${VAULT_NAMESPACE}"

# Check if Vault is initialized
if ! vault status > /dev/null 2>&1; then
    echo "ERROR: Vault is not accessible at ${VAULT_ADDR}"
    exit 1
fi

echo "✓ Vault is accessible"

# Enable KV secrets engine (v2)
echo "Enabling KV secrets engine..."
vault secrets enable -path=secret -version=2 kv || echo "KV engine already enabled"

# Enable Kubernetes auth method
echo "Enabling Kubernetes auth method..."
vault auth enable kubernetes || echo "Kubernetes auth already enabled"

# Configure Kubernetes auth
echo "Configuring Kubernetes auth..."
vault write auth/kubernetes/config \
    kubernetes_host="${K8S_HOST}" \
    kubernetes_ca_cert=@"${K8S_CA_CERT}" \
    disable_iss_validation=true

# Create policies for each service
echo "Creating Vault policies..."

SERVICES=(
    "api-gateway"
    "unified-profile"
    "kintell-connector"
    "buddy-service"
    "upskilling-connector"
    "q2q-ai"
    "safety-moderation"
    "analytics"
    "buddy-connector"
    "discord-bot"
    "impact-calculator"
    "impact-in"
    "journey-engine"
    "notifications"
    "reporting"
)

for service in "${SERVICES[@]}"; do
    policy_file="../infra/vault/policies/teei-${service}.hcl"

    if [[ -f "${policy_file}" ]]; then
        echo "  - Creating policy for ${service}..."
        vault policy write "teei-${service}" "${policy_file}"

        # Create Kubernetes role for the service
        vault write "auth/kubernetes/role/teei-${service}" \
            bound_service_account_names="teei-${service}" \
            bound_service_account_namespaces="${VAULT_NAMESPACE}" \
            policies="teei-${service}" \
            ttl=1h
    else
        echo "  - WARNING: Policy file not found: ${policy_file}"
    fi
done

echo ""
echo "=== Sample Secret Creation ==="
echo "Creating sample secrets (replace with actual values)..."

# Create sample secrets for each service
vault kv put secret/teei/api-gateway \
    JWT_SECRET="change-me-in-production-$(openssl rand -hex 32)" \
    REDIS_URL="redis://redis-service:6379"

vault kv put secret/teei/unified-profile \
    DATABASE_URL="postgresql://user:pass@postgres:5432/profiles"

vault kv put secret/teei/q2q-ai \
    OPENAI_API_KEY="sk-placeholder" \
    MODEL_VERSION="gpt-4"

echo ""
echo "=== Bootstrap Complete ==="
echo "Next steps:"
echo "1. Update secrets with actual production values"
echo "2. Test secret retrieval from pods"
echo "3. Set up secret rotation policies"
echo ""
echo "Example: Retrieve a secret"
echo "  vault kv get secret/teei/api-gateway"
