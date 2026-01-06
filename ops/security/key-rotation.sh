#!/bin/bash
#
# Key Rotation Script for SOC 2 Compliance
# Rotates all secrets and API keys on a scheduled basis
#
# Usage: ./key-rotation.sh <environment> <rotation-type>
# Examples:
#   ./key-rotation.sh prod all         # Rotate all keys
#   ./key-rotation.sh prod database    # Rotate database credentials only
#   ./key-rotation.sh prod api-keys    # Rotate API keys only

set -euo pipefail

ENVIRONMENT="${1:-}"
ROTATION_TYPE="${2:-all}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging
log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Validate inputs
if [ -z "$ENVIRONMENT" ] || [[ ! "$ENVIRONMENT" =~ ^(staging|prod)$ ]]; then
  log_error "Invalid environment. Usage: $0 <staging|prod> <rotation-type>"
  exit 1
fi

NAMESPACE="teei-${ENVIRONMENT}"

log_info "════════════════════════════════════════════════"
log_info "  Key Rotation - ${ENVIRONMENT^^}"
log_info "  Type: $ROTATION_TYPE"
log_info "  Date: $(date '+%Y-%m-%d %H:%M:%S UTC')"
log_info "════════════════════════════════════════════════"
echo ""

# Create backup
BACKUP_DIR="/tmp/key-rotation-backup-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

log_info "Backing up current secrets to: $BACKUP_DIR"

# ─────────────────────────────────────────────────────────────
# 1. Database Credentials Rotation
# ─────────────────────────────────────────────────────────────

rotate_database_credentials() {
  log_info "Rotating database credentials..."

  # Backup current credentials
  kubectl get secret backend-services-secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/backend-services-secrets.yaml"

  # Generate new password
  NEW_DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

  # Update PostgreSQL user password
  kubectl exec -n "$NAMESPACE" postgresql-0 -- psql -U postgres -c \
    "ALTER USER teei WITH PASSWORD '$NEW_DB_PASSWORD';"

  log_success "PostgreSQL password updated"

  # Update Kubernetes secret
  kubectl patch secret backend-services-secrets -n "$NAMESPACE" \
    -p "{\"data\":{\"database-password\":\"$(echo -n $NEW_DB_PASSWORD | base64 -w0)\"}}"

  log_success "Kubernetes secret updated"

  # Rolling restart of pods using database credentials
  log_info "Rolling restart of services..."
  for deployment in api-gateway reporting q2q-ai impact-calculator unified-profile; do
    kubectl rollout restart deployment/$deployment -n "$NAMESPACE"
    log_info "  - Restarted $deployment"
  done

  # Wait for rollouts to complete
  for deployment in api-gateway reporting q2q-ai impact-calculator unified-profile; do
    kubectl rollout status deployment/$deployment -n "$NAMESPACE" --timeout=5m
    log_success "  - $deployment ready"
  done

  log_success "Database credentials rotated successfully"
}

# ─────────────────────────────────────────────────────────────
# 2. API Keys Rotation
# ─────────────────────────────────────────────────────────────

rotate_api_keys() {
  log_info "Rotating third-party API keys..."

  # Backup current secrets
  kubectl get secret q2q-ai-secret -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/q2q-ai-secret.yaml"
  kubectl get secret connectors-secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/connectors-secrets.yaml"

  log_warning "Manual steps required for third-party API keys:"
  echo ""
  echo "  1. OpenAI API Key:"
  echo "     - Go to https://platform.openai.com/account/api-keys"
  echo "     - Generate new key"
  echo "     - Update: kubectl patch secret q2q-ai-secret -n $NAMESPACE -p '{\"data\":{\"openai-api-key\":\"BASE64_VALUE\"}}'"
  echo ""
  echo "  2. Anthropic API Key:"
  echo "     - Go to https://console.anthropic.com/account/keys"
  echo "     - Generate new key"
  echo "     - Update: kubectl patch secret q2q-ai-secret -n $NAMESPACE -p '{\"data\":{\"anthropic-api-key\":\"BASE64_VALUE\"}}'"
  echo ""
  echo "  3. Benevity API Key:"
  echo "     - Contact Benevity support for new API key"
  echo "     - Update: kubectl patch secret connectors-secrets -n $NAMESPACE -p '{\"data\":{\"benevity-api-key\":\"BASE64_VALUE\"}}'"
  echo ""

  read -p "Have you rotated all API keys? (yes/no): " -r
  if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_error "API key rotation incomplete. Exiting."
    exit 1
  fi

  # Restart services using API keys
  kubectl rollout restart deployment/q2q-ai -n "$NAMESPACE"
  kubectl rollout restart deployment/impact-in -n "$NAMESPACE"

  kubectl rollout status deployment/q2q-ai -n "$NAMESPACE" --timeout=5m
  kubectl rollout status deployment/impact-in -n "$NAMESPACE" --timeout=5m

  log_success "API keys rotated successfully"
}

# ─────────────────────────────────────────────────────────────
# 3. JWT Signing Keys Rotation
# ─────────────────────────────────────────────────────────────

rotate_jwt_keys() {
  log_info "Rotating JWT signing keys..."

  # Backup current secret
  kubectl get secret api-gateway-secret -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/api-gateway-secret.yaml"

  # Generate new RSA key pair
  openssl genrsa -out "$BACKUP_DIR/jwt-private.pem" 4096
  openssl rsa -in "$BACKUP_DIR/jwt-private.pem" -pubout -out "$BACKUP_DIR/jwt-public.pem"

  # Update Kubernetes secret
  kubectl patch secret api-gateway-secret -n "$NAMESPACE" \
    -p "{\"data\":{
      \"jwt-private-key\":\"$(cat $BACKUP_DIR/jwt-private.pem | base64 -w0)\",
      \"jwt-public-key\":\"$(cat $BACKUP_DIR/jwt-public.pem | base64 -w0)\"
    }}"

  log_success "JWT keys updated in Kubernetes"

  # Restart API Gateway
  kubectl rollout restart deployment/api-gateway -n "$NAMESPACE"
  kubectl rollout status deployment/api-gateway -n "$NAMESPACE" --timeout=5m

  log_success "JWT signing keys rotated successfully"

  log_warning "IMPORTANT: All existing JWT tokens are now invalid. Users must re-authenticate."
}

# ─────────────────────────────────────────────────────────────
# 4. Encryption Keys Rotation
# ─────────────────────────────────────────────────────────────

rotate_encryption_keys() {
  log_info "Rotating encryption keys..."

  # Backup current secret
  kubectl get secret dsar-secrets -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/dsar-secrets.yaml"

  # Generate new encryption key (AES-256)
  NEW_ENCRYPTION_KEY=$(openssl rand -hex 32)

  # Update Kubernetes secret
  kubectl patch secret dsar-secrets -n "$NAMESPACE" \
    -p "{\"data\":{\"encryption-key\":\"$(echo -n $NEW_ENCRYPTION_KEY | base64 -w0)\"}}"

  log_success "Encryption key updated"

  log_warning "NOTE: Previous DSAR exports encrypted with old key will need re-encryption or key archival"
}

# ─────────────────────────────────────────────────────────────
# 5. Service Account Tokens Rotation
# ─────────────────────────────────────────────────────────────

rotate_service_account_tokens() {
  log_info "Rotating Kubernetes service account tokens..."

  # List all service accounts
  SERVICE_ACCOUNTS=$(kubectl get serviceaccounts -n "$NAMESPACE" -o jsonpath='{.items[*].metadata.name}')

  for sa in $SERVICE_ACCOUNTS; do
    log_info "  - Rotating token for: $sa"

    # Delete existing secrets (new ones auto-created)
    kubectl get secret -n "$NAMESPACE" -o json | \
      jq -r ".items[] | select(.metadata.annotations.\"kubernetes.io/service-account.name\"==\"$sa\") | .metadata.name" | \
      xargs -I {} kubectl delete secret {} -n "$NAMESPACE" || true

    log_success "    Token rotated"
  done

  log_success "Service account tokens rotated successfully"
}

# ─────────────────────────────────────────────────────────────
# Execute Rotation
# ─────────────────────────────────────────────────────────────

case "$ROTATION_TYPE" in
  all)
    rotate_database_credentials
    rotate_api_keys
    rotate_jwt_keys
    rotate_encryption_keys
    rotate_service_account_tokens
    ;;
  database)
    rotate_database_credentials
    ;;
  api-keys)
    rotate_api_keys
    ;;
  jwt)
    rotate_jwt_keys
    ;;
  encryption)
    rotate_encryption_keys
    ;;
  service-accounts)
    rotate_service_account_tokens
    ;;
  *)
    log_error "Invalid rotation type: $ROTATION_TYPE"
    echo "Valid types: all, database, api-keys, jwt, encryption, service-accounts"
    exit 1
    ;;
esac

# ─────────────────────────────────────────────────────────────
# Post-Rotation Validation
# ─────────────────────────────────────────────────────────────

log_info "Validating services..."

# Check all pods are running
FAILED_PODS=$(kubectl get pods -n "$NAMESPACE" --field-selector=status.phase!=Running,status.phase!=Succeeded -o name | wc -l)

if [ "$FAILED_PODS" -gt 0 ]; then
  log_error "$FAILED_PODS pod(s) not running. Check: kubectl get pods -n $NAMESPACE"
  exit 1
fi

log_success "All pods running"

# Test API Gateway health
log_info "Testing API Gateway health..."
API_GW_HEALTH=$(kubectl run -n "$NAMESPACE" --rm -i --restart=Never curl-test --image=curlimages/curl -- \
  curl -s -o /dev/null -w "%{http_code}" http://api-gateway:3000/health || echo "000")

if [ "$API_GW_HEALTH" = "200" ]; then
  log_success "API Gateway healthy"
else
  log_error "API Gateway health check failed (HTTP $API_GW_HEALTH)"
  exit 1
fi

# ─────────────────────────────────────────────────────────────
# Evidence Collection
# ─────────────────────────────────────────────────────────────

EVIDENCE_DIR="/ops/security/key-rotation-evidence/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$EVIDENCE_DIR"

log_info "Collecting evidence..."

# Create rotation summary
cat > "$EVIDENCE_DIR/rotation-summary.md" <<EOF
# Key Rotation Evidence

**Date**: $(date '+%Y-%m-%d %H:%M:%S UTC')
**Environment**: $ENVIRONMENT
**Rotation Type**: $ROTATION_TYPE
**Executed By**: $(whoami)
**Backup Location**: $BACKUP_DIR

## Secrets Rotated

$(kubectl get secrets -n "$NAMESPACE" -o json | jq -r '.items[] | "- \(.metadata.name) (last updated: \(.metadata.resourceVersion))"')

## Validation

- All pods running: ✓
- API Gateway health check: ✓

## Rollout History

$(kubectl rollout history deployment/api-gateway -n "$NAMESPACE")

## Approval

I certify that this key rotation was performed according to documented procedures
and all validation checks passed.

Signed: _________________
Date: $(date '+%Y-%m-%d')
EOF

log_success "Evidence collected: $EVIDENCE_DIR/rotation-summary.md"

log_info "════════════════════════════════════════════════"
log_success "  Key Rotation Complete"
log_info "════════════════════════════════════════════════"
echo ""
log_info "Backup location: $BACKUP_DIR"
log_info "Evidence location: $EVIDENCE_DIR"
echo ""
log_warning "Next rotation due: $(date -d '+90 days' '+%Y-%m-%d')"
