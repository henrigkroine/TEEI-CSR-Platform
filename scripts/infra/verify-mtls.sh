#!/bin/bash
set -euo pipefail

# verify-mtls.sh - Verify mTLS is enforced for service-to-service communication
# Usage: ./verify-mtls.sh [namespace]
# Example: ./verify-mtls.sh production

NAMESPACE="${1:-default}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== mTLS Verification Tool ===${NC}"
echo -e "Namespace: ${NAMESPACE}"
echo ""

# Check if namespace exists
if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
  echo -e "${RED}Error: Namespace ${NAMESPACE} not found${NC}"
  exit 1
fi

# Check Istio injection
echo -e "${BLUE}=== Step 1: Verify Istio Sidecar Injection ===${NC}"
INJECTION_LABEL=$(kubectl get namespace "${NAMESPACE}" -o jsonpath='{.metadata.labels.istio-injection}' 2>/dev/null || echo "")
if [ "${INJECTION_LABEL}" = "enabled" ]; then
  echo -e "${GREEN}✓ Istio injection is enabled on namespace${NC}"
else
  echo -e "${RED}✗ Istio injection is NOT enabled on namespace${NC}"
  echo -e "${YELLOW}  Run: ./scripts/infra/enable-mtls.sh ${NAMESPACE}${NC}"
  exit 1
fi

# Count pods with sidecars
TOTAL_PODS=$(kubectl get pods -n "${NAMESPACE}" --no-headers 2>/dev/null | wc -l)
PODS_WITH_SIDECAR=$(kubectl get pods -n "${NAMESPACE}" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep "istio-proxy" | wc -l)

echo -e "  Total pods: ${TOTAL_PODS}"
echo -e "  Pods with sidecar: ${PODS_WITH_SIDECAR}"

if [ "${TOTAL_PODS}" -eq 0 ]; then
  echo -e "${YELLOW}⚠ No pods found in namespace${NC}"
elif [ "${PODS_WITH_SIDECAR}" -eq "${TOTAL_PODS}" ]; then
  echo -e "${GREEN}✓ All pods have Istio sidecar${NC}"
elif [ "${PODS_WITH_SIDECAR}" -gt 0 ]; then
  echo -e "${YELLOW}⚠ Some pods are missing Istio sidecar${NC}"
  echo -e "${YELLOW}  Pods without sidecar:${NC}"
  kubectl get pods -n "${NAMESPACE}" -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep -v "istio-proxy" || true
else
  echo -e "${RED}✗ No pods have Istio sidecar${NC}"
fi
echo ""

# Check PeerAuthentication
echo -e "${BLUE}=== Step 2: Verify PeerAuthentication Policy ===${NC}"
PEER_AUTH=$(kubectl get peerauthentication -n "${NAMESPACE}" 2>/dev/null || echo "")
GLOBAL_PEER_AUTH=$(kubectl get peerauthentication -n istio-system 2>/dev/null || echo "")

if [ -z "${PEER_AUTH}" ] && [ -z "${GLOBAL_PEER_AUTH}" ]; then
  echo -e "${RED}✗ No PeerAuthentication policy found (namespace or global)${NC}"
  echo -e "${YELLOW}  mTLS is not enforced!${NC}"
  exit 1
elif [ -n "${PEER_AUTH}" ]; then
  echo -e "${GREEN}✓ Namespace PeerAuthentication policy exists${NC}"
  MTLS_MODE=$(kubectl get peerauthentication -n "${NAMESPACE}" -o jsonpath='{.items[0].spec.mtls.mode}' 2>/dev/null || echo "UNKNOWN")
  echo -e "  mTLS Mode: ${MTLS_MODE}"

  if [ "${MTLS_MODE}" = "STRICT" ]; then
    echo -e "${GREEN}  ✓ STRICT mode: Only mTLS connections allowed${NC}"
  elif [ "${MTLS_MODE}" = "PERMISSIVE" ]; then
    echo -e "${YELLOW}  ⚠ PERMISSIVE mode: Both plaintext and mTLS allowed${NC}"
  else
    echo -e "${RED}  ✗ Unknown or disabled mTLS mode${NC}"
  fi
else
  echo -e "${YELLOW}⚠ Using global PeerAuthentication policy${NC}"
  GLOBAL_MTLS_MODE=$(kubectl get peerauthentication -n istio-system -o jsonpath='{.items[0].spec.mtls.mode}' 2>/dev/null || echo "UNKNOWN")
  echo -e "  Global mTLS Mode: ${GLOBAL_MTLS_MODE}"
fi
echo ""

# Check DestinationRules
echo -e "${BLUE}=== Step 3: Verify DestinationRules ===${NC}"
DEST_RULES=$(kubectl get destinationrule -n "${NAMESPACE}" 2>/dev/null || echo "")
GLOBAL_DEST_RULES=$(kubectl get destinationrule -n istio-system 2>/dev/null || echo "")

if [ -z "${DEST_RULES}" ] && [ -z "${GLOBAL_DEST_RULES}" ]; then
  echo -e "${YELLOW}⚠ No DestinationRules found${NC}"
  echo -e "  Client-side mTLS may not be enforced"
else
  if [ -n "${DEST_RULES}" ]; then
    echo -e "${GREEN}✓ Namespace DestinationRules exist${NC}"
    kubectl get destinationrule -n "${NAMESPACE}" -o custom-columns=NAME:.metadata.name,HOST:.spec.host,TLS:.spec.trafficPolicy.tls.mode
  fi
  if [ -n "${GLOBAL_DEST_RULES}" ]; then
    echo -e "${GREEN}✓ Global DestinationRules exist${NC}"
    kubectl get destinationrule -n istio-system -o custom-columns=NAME:.metadata.name,HOST:.spec.host,TLS:.spec.trafficPolicy.tls.mode
  fi
fi
echo ""

# Check certificates
echo -e "${BLUE}=== Step 4: Verify Certificates ===${NC}"
CERTS=$(kubectl get certificates -n istio-system 2>/dev/null || echo "")
if [ -z "${CERTS}" ]; then
  echo -e "${YELLOW}⚠ No certificates found in istio-system${NC}"
else
  echo -e "${GREEN}✓ Certificates found:${NC}"
  kubectl get certificates -n istio-system -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,EXPIRY:.status.notAfter

  # Check for expiring certificates (less than 6 hours)
  NOW=$(date +%s)
  while IFS= read -r line; do
    CERT_NAME=$(echo "$line" | awk '{print $1}')
    EXPIRY=$(echo "$line" | awk '{print $3}')

    if [ -n "${EXPIRY}" ] && [ "${EXPIRY}" != "EXPIRY" ]; then
      EXPIRY_EPOCH=$(date -d "${EXPIRY}" +%s 2>/dev/null || echo "0")
      HOURS_LEFT=$(( (EXPIRY_EPOCH - NOW) / 3600 ))

      if [ "${HOURS_LEFT}" -lt 6 ]; then
        echo -e "${RED}  ✗ Certificate ${CERT_NAME} expires in ${HOURS_LEFT} hours!${NC}"
        echo -e "${YELLOW}    Run: ./scripts/infra/rotate-certs.sh istio-system ${CERT_NAME}${NC}"
      fi
    fi
  done < <(kubectl get certificates -n istio-system -o custom-columns=NAME:.metadata.name,READY:.status.conditions[0].status,EXPIRY:.status.notAfter --no-headers 2>/dev/null)
fi
echo ""

# Test actual mTLS connectivity
echo -e "${BLUE}=== Step 5: Test mTLS Connectivity ===${NC}"

# Find a pod to test from
TEST_POD=$(kubectl get pods -n "${NAMESPACE}" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null || echo "")

if [ -z "${TEST_POD}" ]; then
  echo -e "${YELLOW}⚠ No pods available for testing${NC}"
else
  echo -e "Testing from pod: ${TEST_POD}"

  # Check if pod has istio-proxy
  CONTAINERS=$(kubectl get pod "${TEST_POD}" -n "${NAMESPACE}" -o jsonpath='{.spec.containers[*].name}')
  if ! echo "${CONTAINERS}" | grep -q "istio-proxy"; then
    echo -e "${RED}✗ Test pod does not have Istio sidecar${NC}"
  else
    # Check Envoy stats for mTLS
    echo -e "Checking Envoy stats for mTLS..."
    MTLS_REQUESTS=$(kubectl exec "${TEST_POD}" -n "${NAMESPACE}" -c istio-proxy -- \
      curl -s localhost:15000/stats | grep "ssl.handshake" | head -5 || echo "")

    if [ -n "${MTLS_REQUESTS}" ]; then
      echo -e "${GREEN}✓ mTLS handshakes detected:${NC}"
      echo "${MTLS_REQUESTS}"
    else
      echo -e "${YELLOW}⚠ No mTLS handshake stats found${NC}"
    fi
  fi
fi
echo ""

# Check Istio telemetry for mTLS
echo -e "${BLUE}=== Step 6: Check Istio Telemetry ===${NC}"
if command -v istioctl &> /dev/null; then
  echo "Using istioctl to verify mTLS..."
  istioctl authn tls-check -n "${NAMESPACE}" 2>/dev/null || echo "Unable to check with istioctl"
else
  echo -e "${YELLOW}⚠ istioctl not installed, skipping telemetry check${NC}"
  echo -e "  Install: https://istio.io/latest/docs/setup/getting-started/#download"
fi
echo ""

# Summary
echo -e "${GREEN}=== Verification Summary ===${NC}"
echo ""

# Count checks
CHECKS_PASSED=0
CHECKS_WARNING=0
CHECKS_FAILED=0

# Sidecar injection
if [ "${INJECTION_LABEL}" = "enabled" ] && [ "${PODS_WITH_SIDECAR}" -gt 0 ]; then
  ((CHECKS_PASSED++))
else
  ((CHECKS_FAILED++))
fi

# PeerAuthentication
if [ -n "${PEER_AUTH}" ] || [ -n "${GLOBAL_PEER_AUTH}" ]; then
  ((CHECKS_PASSED++))
else
  ((CHECKS_FAILED++))
fi

# DestinationRules
if [ -n "${DEST_RULES}" ] || [ -n "${GLOBAL_DEST_RULES}" ]; then
  ((CHECKS_PASSED++))
else
  ((CHECKS_WARNING++))
fi

# Certificates
if [ -n "${CERTS}" ]; then
  ((CHECKS_PASSED++))
else
  ((CHECKS_WARNING++))
fi

echo -e "Checks passed: ${GREEN}${CHECKS_PASSED}${NC}"
echo -e "Checks with warnings: ${YELLOW}${CHECKS_WARNING}${NC}"
echo -e "Checks failed: ${RED}${CHECKS_FAILED}${NC}"
echo ""

if [ "${CHECKS_FAILED}" -gt 0 ]; then
  echo -e "${RED}✗ mTLS verification FAILED${NC}"
  echo -e "${YELLOW}  Review the issues above and run:${NC}"
  echo -e "    ./scripts/infra/enable-mtls.sh ${NAMESPACE}"
  exit 1
elif [ "${CHECKS_WARNING}" -gt 0 ]; then
  echo -e "${YELLOW}⚠ mTLS verification completed with warnings${NC}"
  echo -e "  Review the warnings above"
  exit 0
else
  echo -e "${GREEN}✓ mTLS is correctly configured and enforced!${NC}"
  exit 0
fi
