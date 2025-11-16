#!/bin/bash
set -euo pipefail

# install-istio-mtls.sh - Complete Istio + mTLS installation
# Usage: ./install-istio-mtls.sh [skip-prerequisites]

SKIP_PREREQS="${1:-false}"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  TEEI mTLS Service Mesh Installation ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Prerequisites
if [ "${SKIP_PREREQS}" != "skip-prerequisites" ]; then
  echo -e "${BLUE}Step 1: Installing Prerequisites${NC}"
  echo ""

  # Install cert-manager
  echo -e "${YELLOW}Installing cert-manager v1.13.0...${NC}"
  kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

  echo -e "${YELLOW}Waiting for cert-manager to be ready...${NC}"
  kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=3m
  kubectl wait --for=condition=Available deployment/cert-manager-webhook -n cert-manager --timeout=3m
  kubectl wait --for=condition=Available deployment/cert-manager-cainjector -n cert-manager --timeout=3m
  echo -e "${GREEN}✓ cert-manager ready${NC}"
  echo ""

  # Install Istio operator
  echo -e "${YELLOW}Installing Istio operator v1.20.0...${NC}"
  kubectl apply -f https://github.com/istio/istio/releases/download/1.20.0/istio-operator.yaml

  echo -e "${YELLOW}Waiting for Istio operator to be ready...${NC}"
  kubectl wait --for=condition=Available deployment/istio-operator -n istio-operator --timeout=3m
  echo -e "${GREEN}✓ Istio operator ready${NC}"
  echo ""
else
  echo -e "${YELLOW}Skipping prerequisites (cert-manager and Istio operator must already be installed)${NC}"
  echo ""
fi

# Install Istio control plane
echo -e "${BLUE}Step 2: Installing Istio Control Plane${NC}"
echo ""

echo -e "${YELLOW}Applying Istio configuration...${NC}"
kubectl apply -k k8s/base/istio/

echo -e "${YELLOW}Waiting for Istio control plane to be ready...${NC}"
kubectl wait --for=condition=Available deployment/istiod -n istio-system --timeout=5m
kubectl wait --for=condition=Available deployment/istio-ingressgateway -n istio-system --timeout=5m
kubectl wait --for=condition=Available deployment/istio-egressgateway -n istio-system --timeout=5m
echo -e "${GREEN}✓ Istio control plane ready${NC}"
echo ""

# Install mTLS policies
echo -e "${BLUE}Step 3: Installing mTLS Policies${NC}"
echo ""

echo -e "${YELLOW}Applying mTLS configuration...${NC}"
kubectl apply -k k8s/base/mtls/
echo -e "${GREEN}✓ mTLS policies applied${NC}"
echo ""

# Verify installation
echo -e "${BLUE}Step 4: Verifying Installation${NC}"
echo ""

echo -e "${YELLOW}Checking components...${NC}"
echo ""

echo "Istio Pods:"
kubectl get pods -n istio-system
echo ""

echo "PeerAuthentication Policies:"
kubectl get peerauthentication -A
echo ""

echo "AuthorizationPolicies:"
kubectl get authorizationpolicy -n default | head -10
echo ""

echo "Certificates:"
kubectl get certificates -n istio-system
echo ""

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Installation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "1. Enable mTLS for your namespace:"
echo -e "   ${BLUE}./scripts/infra/enable-mtls.sh default STRICT${NC}"
echo ""
echo -e "2. Verify mTLS is working:"
echo -e "   ${BLUE}./scripts/infra/verify-mtls.sh default${NC}"
echo ""
echo -e "3. View monitoring dashboard:"
echo -e "   ${BLUE}Import: observability/grafana/dashboards/mtls-security.json${NC}"
echo ""
echo -e "4. Review documentation:"
echo -e "   ${BLUE}cat docs/mTLS_Service_Mesh.md${NC}"
echo ""
echo -e "${GREEN}✓ Istio and mTLS successfully installed!${NC}"
