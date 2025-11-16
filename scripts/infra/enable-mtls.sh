#!/bin/bash
set -euo pipefail

# enable-mtls.sh - Enable mTLS for a namespace
# Usage: ./enable-mtls.sh <namespace> [mtls-mode]
# Example: ./enable-mtls.sh production STRICT
# Example: ./enable-mtls.sh staging PERMISSIVE

NAMESPACE="${1:-default}"
MTLS_MODE="${2:-STRICT}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Enabling mTLS for namespace: ${NAMESPACE} ===${NC}"
echo -e "mTLS Mode: ${MTLS_MODE}"
echo ""

# Validate mTLS mode
if [[ ! "${MTLS_MODE}" =~ ^(STRICT|PERMISSIVE|DISABLE)$ ]]; then
  echo -e "${RED}Error: Invalid mTLS mode. Must be STRICT, PERMISSIVE, or DISABLE${NC}"
  exit 1
fi

# Check if namespace exists
if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
  echo -e "${YELLOW}Namespace ${NAMESPACE} does not exist. Creating...${NC}"
  kubectl create namespace "${NAMESPACE}"
fi

# Label namespace for Istio injection
echo -e "${GREEN}Step 1: Enabling Istio sidecar injection${NC}"
kubectl label namespace "${NAMESPACE}" istio-injection=enabled --overwrite
kubectl label namespace "${NAMESPACE}" mtls-mode="${MTLS_MODE}" --overwrite
echo -e "  ✓ Labeled namespace for sidecar injection"
echo ""

# Apply PeerAuthentication policy
echo -e "${GREEN}Step 2: Applying PeerAuthentication policy${NC}"
cat <<EOF | kubectl apply -f -
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: ${NAMESPACE}-mtls-policy
  namespace: ${NAMESPACE}
  labels:
    part-of: teei-csr-platform
    managed-by: enable-mtls-script
spec:
  mtls:
    mode: ${MTLS_MODE}
EOF
echo -e "  ✓ Applied PeerAuthentication policy"
echo ""

# Restart pods to inject sidecars
echo -e "${GREEN}Step 3: Restarting pods to inject Istio sidecars${NC}"
DEPLOYMENTS=$(kubectl get deployments -n "${NAMESPACE}" -o name 2>/dev/null || true)

if [ -z "${DEPLOYMENTS}" ]; then
  echo -e "${YELLOW}  No deployments found in namespace${NC}"
else
  for deployment in ${DEPLOYMENTS}; do
    echo -e "  Restarting ${deployment}..."
    kubectl rollout restart -n "${NAMESPACE}" "${deployment}"
  done
  echo -e "  ✓ Initiated pod restarts"
  echo ""
  echo -e "${YELLOW}Waiting for rollouts to complete (this may take a few minutes)...${NC}"
  for deployment in ${DEPLOYMENTS}; do
    kubectl rollout status -n "${NAMESPACE}" "${deployment}" --timeout=5m
  done
fi
echo ""

# Verify sidecar injection
echo -e "${GREEN}Step 4: Verifying sidecar injection${NC}"
PODS=$(kubectl get pods -n "${NAMESPACE}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || true)
if [ -z "${PODS}" ]; then
  echo -e "${YELLOW}  No pods found in namespace${NC}"
else
  for pod in ${PODS}; do
    CONTAINERS=$(kubectl get pod "${pod}" -n "${NAMESPACE}" -o jsonpath='{.spec.containers[*].name}')
    if echo "${CONTAINERS}" | grep -q "istio-proxy"; then
      echo -e "  ✓ ${pod}: sidecar injected"
    else
      echo -e "  ${RED}✗ ${pod}: sidecar NOT injected${NC}"
    fi
  done
fi
echo ""

# Verify mTLS configuration
echo -e "${GREEN}Step 5: Verifying mTLS configuration${NC}"
kubectl get peerauthentication -n "${NAMESPACE}" "${NAMESPACE}-mtls-policy" -o yaml | grep "mode: ${MTLS_MODE}" > /dev/null
if [ $? -eq 0 ]; then
  echo -e "  ✓ PeerAuthentication mode: ${MTLS_MODE}"
else
  echo -e "  ${RED}✗ Failed to verify PeerAuthentication${NC}"
fi
echo ""

# Summary
echo -e "${GREEN}=== Summary ===${NC}"
echo -e "Namespace: ${NAMESPACE}"
echo -e "mTLS Mode: ${MTLS_MODE}"
echo -e "Istio Injection: Enabled"
echo ""

# Next steps
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Verify mTLS is working:"
echo -e "   ./scripts/infra/verify-mtls.sh ${NAMESPACE}"
echo -e ""
echo -e "2. Monitor mTLS traffic in Grafana:"
echo -e "   Open: http://grafana.example.com/d/mtls-security"
echo -e ""
echo -e "3. Debug mTLS issues (if needed):"
echo -e "   ./scripts/infra/debug-mtls.sh ${NAMESPACE} <pod-name>"
echo -e ""
echo -e "${GREEN}✓ mTLS enabled successfully!${NC}"
