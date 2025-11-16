#!/bin/bash
set -euo pipefail

# rotate-certs.sh - Force certificate rotation for Istio mTLS
# Usage: ./rotate-certs.sh [namespace] [certificate-name]
# Example: ./rotate-certs.sh istio-system istio-pilot-cert
# Example: ./rotate-certs.sh  (rotates all certificates)

NAMESPACE="${1:-all}"
CERT_NAME="${2:-all}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Certificate Rotation Tool ===${NC}"
echo ""

# Function to rotate a single certificate
rotate_certificate() {
  local ns=$1
  local cert=$2

  echo -e "${YELLOW}Rotating certificate: ${cert} in namespace: ${ns}${NC}"

  # Check certificate exists
  if ! kubectl get certificate "${cert}" -n "${ns}" &> /dev/null; then
    echo -e "${RED}  Error: Certificate ${cert} not found in namespace ${ns}${NC}"
    return 1
  fi

  # Get current expiry time
  EXPIRY=$(kubectl get certificate "${cert}" -n "${ns}" -o jsonpath='{.status.notAfter}' 2>/dev/null || echo "Unknown")
  echo -e "  Current expiry: ${EXPIRY}"

  # Force renewal by deleting the secret (cert-manager will recreate it)
  SECRET_NAME=$(kubectl get certificate "${cert}" -n "${ns}" -o jsonpath='{.spec.secretName}')
  echo -e "  Deleting secret: ${SECRET_NAME}"
  kubectl delete secret "${SECRET_NAME}" -n "${ns}" --ignore-not-found

  # Wait for cert-manager to recreate the certificate
  echo -e "  Waiting for cert-manager to issue new certificate..."
  kubectl wait --for=condition=Ready certificate/"${cert}" -n "${ns}" --timeout=60s

  # Get new expiry time
  NEW_EXPIRY=$(kubectl get certificate "${cert}" -n "${ns}" -o jsonpath='{.status.notAfter}')
  echo -e "  ${GREEN}✓ New certificate issued${NC}"
  echo -e "  New expiry: ${NEW_EXPIRY}"
  echo ""
}

# Function to rotate all certificates in a namespace
rotate_namespace_certs() {
  local ns=$1

  echo -e "${GREEN}Rotating all certificates in namespace: ${ns}${NC}"
  echo ""

  CERTS=$(kubectl get certificates -n "${ns}" -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

  if [ -z "${CERTS}" ]; then
    echo -e "${YELLOW}No certificates found in namespace ${ns}${NC}"
    return 0
  fi

  for cert in ${CERTS}; do
    rotate_certificate "${ns}" "${cert}"
  done
}

# Main logic
if [ "${NAMESPACE}" = "all" ]; then
  echo -e "${YELLOW}Rotating certificates in all namespaces${NC}"
  echo ""

  # Get all namespaces with certificates
  NAMESPACES=$(kubectl get certificates --all-namespaces -o jsonpath='{range .items[*]}{.metadata.namespace}{"\n"}{end}' | sort -u)

  for ns in ${NAMESPACES}; do
    rotate_namespace_certs "${ns}"
  done

elif [ "${CERT_NAME}" = "all" ]; then
  rotate_namespace_certs "${NAMESPACE}"

else
  rotate_certificate "${NAMESPACE}" "${CERT_NAME}"
fi

# Restart Istio components to pick up new certificates
echo -e "${GREEN}Restarting Istio components${NC}"
kubectl rollout restart deployment -n istio-system istiod
kubectl rollout restart deployment -n istio-system istio-ingressgateway
kubectl rollout restart deployment -n istio-system istio-egressgateway

echo -e "${YELLOW}Waiting for Istio components to restart...${NC}"
kubectl rollout status deployment/istiod -n istio-system --timeout=2m
kubectl rollout status deployment/istio-ingressgateway -n istio-system --timeout=2m
kubectl rollout status deployment/istio-egressgateway -n istio-system --timeout=2m

echo ""
echo -e "${GREEN}=== Certificate Rotation Complete ===${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo -e "1. Verify certificates:"
echo -e "   kubectl get certificates --all-namespaces"
echo -e ""
echo -e "2. Check certificate expiry in Grafana:"
echo -e "   Dashboard: mTLS Security > Certificate Expiry Timeline"
echo -e ""
echo -e "3. Verify mTLS is still working:"
echo -e "   ./scripts/infra/verify-mtls.sh"
echo ""
