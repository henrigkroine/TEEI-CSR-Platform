#!/bin/bash
set -euo pipefail

# debug-mtls.sh - Debug mTLS connection issues
# Usage: ./debug-mtls.sh <namespace> <pod-name> [target-service]
# Example: ./debug-mtls.sh default teei-api-gateway-xyz teei-reporting

NAMESPACE="${1:-}"
POD_NAME="${2:-}"
TARGET_SERVICE="${3:-}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "${NAMESPACE}" ] || [ -z "${POD_NAME}" ]; then
  echo -e "${RED}Error: Missing required arguments${NC}"
  echo "Usage: $0 <namespace> <pod-name> [target-service]"
  echo "Example: $0 default teei-api-gateway-xyz teei-reporting"
  exit 1
fi

echo -e "${GREEN}=== mTLS Debug Tool ===${NC}"
echo -e "Namespace: ${NAMESPACE}"
echo -e "Pod: ${POD_NAME}"
echo -e "Target Service: ${TARGET_SERVICE:-N/A}"
echo ""

# Check if pod exists
if ! kubectl get pod "${POD_NAME}" -n "${NAMESPACE}" &> /dev/null; then
  echo -e "${RED}Error: Pod ${POD_NAME} not found in namespace ${NAMESPACE}${NC}"
  exit 1
fi

# Check if pod has Istio sidecar
echo -e "${BLUE}=== Step 1: Verify Istio Sidecar ===${NC}"
CONTAINERS=$(kubectl get pod "${POD_NAME}" -n "${NAMESPACE}" -o jsonpath='{.spec.containers[*].name}')
if echo "${CONTAINERS}" | grep -q "istio-proxy"; then
  echo -e "${GREEN}✓ Istio sidecar is injected${NC}"
else
  echo -e "${RED}✗ Istio sidecar is NOT injected${NC}"
  echo -e "${YELLOW}Solution: Enable istio-injection on namespace and restart pod${NC}"
  echo -e "  kubectl label namespace ${NAMESPACE} istio-injection=enabled"
  echo -e "  kubectl delete pod ${POD_NAME} -n ${NAMESPACE}"
  exit 1
fi
echo ""

# Check PeerAuthentication policy
echo -e "${BLUE}=== Step 2: Check PeerAuthentication Policy ===${NC}"
PEER_AUTH=$(kubectl get peerauthentication -n "${NAMESPACE}" -o yaml 2>/dev/null || echo "")
if [ -z "${PEER_AUTH}" ]; then
  echo -e "${YELLOW}⚠ No PeerAuthentication policy in namespace${NC}"
  echo -e "  Using global policy (if any)"
  GLOBAL_PEER_AUTH=$(kubectl get peerauthentication -n istio-system -o yaml 2>/dev/null || echo "")
  if [ -z "${GLOBAL_PEER_AUTH}" ]; then
    echo -e "${RED}✗ No global PeerAuthentication policy found${NC}"
  else
    echo -e "${GREEN}✓ Global policy exists${NC}"
    kubectl get peerauthentication -n istio-system
  fi
else
  echo -e "${GREEN}✓ Namespace PeerAuthentication policy exists${NC}"
  kubectl get peerauthentication -n "${NAMESPACE}"
fi
echo ""

# Check AuthorizationPolicy
echo -e "${BLUE}=== Step 3: Check AuthorizationPolicy ===${NC}"
AUTH_POLICIES=$(kubectl get authorizationpolicy -n "${NAMESPACE}" 2>/dev/null || echo "")
if [ -z "${AUTH_POLICIES}" ]; then
  echo -e "${YELLOW}⚠ No AuthorizationPolicy in namespace${NC}"
else
  echo -e "${GREEN}✓ AuthorizationPolicies found:${NC}"
  kubectl get authorizationpolicy -n "${NAMESPACE}"

  # Check deny-all policy
  if kubectl get authorizationpolicy deny-all-default -n "${NAMESPACE}" &> /dev/null; then
    echo -e "${YELLOW}⚠ Default DENY policy is active${NC}"
    echo -e "  Ensure explicit ALLOW policies exist for this service"
  fi
fi
echo ""

# Check certificates
echo -e "${BLUE}=== Step 4: Check Certificates ===${NC}"
CERT_CHAIN=$(kubectl exec "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy -- cat /etc/certs/cert-chain.pem 2>/dev/null || echo "")
if [ -z "${CERT_CHAIN}" ]; then
  echo -e "${RED}✗ Certificate not found in sidecar${NC}"
else
  echo -e "${GREEN}✓ Certificate exists${NC}"

  # Check certificate expiry
  kubectl exec "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy -- \
    openssl x509 -in /etc/certs/cert-chain.pem -noout -enddate 2>/dev/null || true

  # Check certificate subject
  echo -e "\nCertificate subject:"
  kubectl exec "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy -- \
    openssl x509 -in /etc/certs/cert-chain.pem -noout -subject 2>/dev/null || true
fi
echo ""

# Check Envoy configuration
echo -e "${BLUE}=== Step 5: Check Envoy mTLS Configuration ===${NC}"
echo "Fetching Envoy config (this may take a moment)..."
kubectl exec "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy -- \
  curl -s localhost:15000/config_dump | grep -A 5 "tls_context" | head -20
echo ""

# Check Envoy clusters (upstream services)
echo -e "${BLUE}=== Step 6: Check Envoy Clusters ===${NC}"
if [ -n "${TARGET_SERVICE}" ]; then
  echo "Checking connection to ${TARGET_SERVICE}..."
  kubectl exec "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy -- \
    curl -s localhost:15000/clusters | grep "${TARGET_SERVICE}" || echo "Service not found in Envoy clusters"
else
  echo "All outbound clusters:"
  kubectl exec "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy -- \
    curl -s localhost:15000/clusters | grep "outbound" | head -10
fi
echo ""

# Check Envoy listeners
echo -e "${BLUE}=== Step 7: Check Envoy Listeners ===${NC}"
kubectl exec "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy -- \
  curl -s localhost:15000/listeners | grep -E "name|tls" | head -20
echo ""

# Check recent Envoy logs for mTLS errors
echo -e "${BLUE}=== Step 8: Check Envoy Logs for Errors ===${NC}"
kubectl logs "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy --tail=50 | \
  grep -E "tls|certificate|handshake|error|denied" || echo "No mTLS-related errors found"
echo ""

# Test connection if target service specified
if [ -n "${TARGET_SERVICE}" ]; then
  echo -e "${BLUE}=== Step 9: Test Connection to Target Service ===${NC}"

  # Check if target service exists
  if ! kubectl get service "${TARGET_SERVICE}" -n "${NAMESPACE}" &> /dev/null; then
    echo -e "${RED}✗ Service ${TARGET_SERVICE} not found in namespace ${NAMESPACE}${NC}"
  else
    SERVICE_IP=$(kubectl get service "${TARGET_SERVICE}" -n "${NAMESPACE}" -o jsonpath='{.spec.clusterIP}')
    SERVICE_PORT=$(kubectl get service "${TARGET_SERVICE}" -n "${NAMESPACE}" -o jsonpath='{.spec.ports[0].port}')

    echo -e "Testing connection to ${TARGET_SERVICE} (${SERVICE_IP}:${SERVICE_PORT})..."

    # Try to connect from the pod
    kubectl exec "${POD_NAME}" -n "${NAMESPACE}" -c istio-proxy -- \
      curl -v -m 5 "http://${SERVICE_IP}:${SERVICE_PORT}/health" 2>&1 || true
  fi
fi
echo ""

# Summary and recommendations
echo -e "${GREEN}=== Debug Summary ===${NC}"
echo ""
echo -e "${YELLOW}Common Issues and Solutions:${NC}"
echo ""
echo -e "1. ${BLUE}Sidecar not injected:${NC}"
echo -e "   kubectl label namespace ${NAMESPACE} istio-injection=enabled"
echo -e "   kubectl delete pod ${POD_NAME} -n ${NAMESPACE}"
echo ""
echo -e "2. ${BLUE}Certificate expired:${NC}"
echo -e "   ./scripts/infra/rotate-certs.sh istio-system"
echo ""
echo -e "3. ${BLUE}Authorization denied (403):${NC}"
echo -e "   Check AuthorizationPolicy and ensure service identity is allowed"
echo -e "   kubectl get authorizationpolicy -n ${NAMESPACE}"
echo ""
echo -e "4. ${BLUE}mTLS mode mismatch:${NC}"
echo -e "   Ensure source and destination have compatible mTLS modes"
echo -e "   kubectl get peerauthentication --all-namespaces"
echo ""
echo -e "5. ${BLUE}Connection refused:${NC}"
echo -e "   Verify NetworkPolicy allows traffic"
echo -e "   kubectl get networkpolicy -n ${NAMESPACE}"
echo ""
echo -e "${YELLOW}Useful Commands:${NC}"
echo -e "  View Istio proxy logs:    kubectl logs ${POD_NAME} -n ${NAMESPACE} -c istio-proxy"
echo -e "  View application logs:    kubectl logs ${POD_NAME} -n ${NAMESPACE}"
echo -e "  Verify mTLS:              ./scripts/infra/verify-mtls.sh ${NAMESPACE}"
echo -e "  Monitor in Grafana:       http://grafana.example.com/d/mtls-security"
echo ""
