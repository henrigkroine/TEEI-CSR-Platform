#!/bin/bash
set -euo pipefail

# Rollback Deployment Script
# Safely rolls back a Kubernetes deployment to a previous version
#
# Usage:
#   ./rollback-deployment.sh <service> [--revision=N] [--dry-run]
#
# Examples:
#   ./rollback-deployment.sh api-gateway
#   ./rollback-deployment.sh api-gateway --revision=2
#   ./rollback-deployment.sh api-gateway --dry-run

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-teei-csr}"
SERVICE="${1:-}"
REVISION=""
DRY_RUN=false

# Parse arguments
for arg in "$@"; do
  case $arg in
    --revision=*)
      REVISION="${arg#*=}"
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
  esac
done

# Validate service name provided
if [ -z "$SERVICE" ]; then
  echo -e "${RED}❌ Error: Service name is required${NC}"
  echo ""
  echo "Usage: $0 <service> [--revision=N] [--dry-run]"
  echo ""
  echo "Available services:"
  echo "  - api-gateway"
  echo "  - corp-cockpit-astro"
  echo "  - reporting"
  echo "  - impact-calculator"
  echo "  - q2q-ai"
  echo "  - analytics"
  echo "  - journey-engine"
  echo "  - notifications"
  echo "  - unified-profile"
  exit 1
fi

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Rollback Deployment Script${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "Service:    ${GREEN}${SERVICE}${NC}"
echo -e "Namespace:  ${GREEN}${NAMESPACE}${NC}"
echo -e "Dry run:    ${GREEN}${DRY_RUN}${NC}"
if [ -n "$REVISION" ]; then
  echo -e "Revision:   ${GREEN}${REVISION}${NC}"
else
  echo -e "Revision:   ${GREEN}Previous${NC}"
fi
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}❌ Error: kubectl is not installed${NC}"
  exit 1
fi

# Check if deployment exists
if ! kubectl get deployment "$SERVICE" -n "$NAMESPACE" &> /dev/null; then
  echo -e "${RED}❌ Error: Deployment '$SERVICE' not found in namespace '$NAMESPACE'${NC}"
  exit 1
fi

echo -e "${BLUE}Step 1: Current Deployment Status${NC}"
echo "-----------------------------------"

# Get current deployment info
CURRENT_REPLICAS=$(kubectl get deployment "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
READY_REPLICAS=$(kubectl get deployment "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
CURRENT_IMAGE=$(kubectl get deployment "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')

echo -e "Current image:    ${YELLOW}${CURRENT_IMAGE}${NC}"
echo -e "Replicas:         ${YELLOW}${READY_REPLICAS}/${CURRENT_REPLICAS}${NC}"
echo ""

# Show rollout history
echo -e "${BLUE}Step 2: Rollout History${NC}"
echo "------------------------"
kubectl rollout history deployment/"$SERVICE" -n "$NAMESPACE"
echo ""

# Get revision to rollback to
if [ -z "$REVISION" ]; then
  # No specific revision provided, rollback to previous
  ROLLBACK_CMD="kubectl rollout undo deployment/$SERVICE -n $NAMESPACE"
else
  # Specific revision provided
  ROLLBACK_CMD="kubectl rollout undo deployment/$SERVICE -n $NAMESPACE --to-revision=$REVISION"

  # Verify revision exists
  if ! kubectl rollout history deployment/"$SERVICE" -n "$NAMESPACE" | grep -q "^$REVISION"; then
    echo -e "${RED}❌ Error: Revision $REVISION not found in rollout history${NC}"
    exit 1
  fi
fi

echo -e "${BLUE}Step 3: Rollback Confirmation${NC}"
echo "-------------------------------"
echo -e "Rollback command: ${YELLOW}${ROLLBACK_CMD}${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo -e "${YELLOW}⚠️  DRY RUN MODE - No changes will be made${NC}"
  echo ""
  echo "The following would be executed:"
  echo "  $ROLLBACK_CMD"
  exit 0
fi

# Confirm rollback (skip if running in CI)
if [ -t 0 ] && [ -z "${CI:-}" ]; then
  read -p "Proceed with rollback? (yes/no): " -r
  echo
  if [[ ! $REPLY =~ ^[Yy]es$ ]]; then
    echo -e "${YELLOW}⚠️  Rollback cancelled${NC}"
    exit 0
  fi
fi

echo -e "${BLUE}Step 4: Executing Rollback${NC}"
echo "---------------------------"

# Execute rollback
echo "Executing: $ROLLBACK_CMD"
eval "$ROLLBACK_CMD"
echo ""

# Wait for rollback to complete
echo "Waiting for rollback to complete..."
if kubectl rollout status deployment/"$SERVICE" -n "$NAMESPACE" --timeout=5m; then
  echo -e "${GREEN}✓ Rollback completed successfully${NC}"
else
  echo -e "${RED}✗ Rollback timed out or failed${NC}"
  echo "Check deployment status with: kubectl get pods -n $NAMESPACE -l app=$SERVICE"
  exit 1
fi
echo ""

# Get new deployment info
echo -e "${BLUE}Step 5: Post-Rollback Status${NC}"
echo "-----------------------------"

NEW_IMAGE=$(kubectl get deployment "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.spec.template.spec.containers[0].image}')
NEW_READY_REPLICAS=$(kubectl get deployment "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')

echo -e "Previous image:   ${YELLOW}${CURRENT_IMAGE}${NC}"
echo -e "Current image:    ${GREEN}${NEW_IMAGE}${NC}"
echo -e "Ready replicas:   ${GREEN}${NEW_READY_REPLICAS}/${CURRENT_REPLICAS}${NC}"
echo ""

# Show pod status
echo "Pod status:"
kubectl get pods -n "$NAMESPACE" -l app="$SERVICE"
echo ""

# Check for pod restarts
RESTART_COUNT=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}' | awk '{s+=$1} END {print s}')
if [ "$RESTART_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}⚠️  Warning: Pods have restarted ${RESTART_COUNT} times${NC}"
  echo "Check logs: kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=50"
else
  echo -e "${GREEN}✓ No pod restarts detected${NC}"
fi
echo ""

echo -e "${BLUE}Step 6: Verification Checklist${NC}"
echo "--------------------------------"
echo ""
echo "Run these commands to verify rollback:"
echo ""
echo -e "  ${YELLOW}# Check pod logs${NC}"
echo "  kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=50"
echo ""
echo -e "  ${YELLOW}# Check service health${NC}"
echo "  kubectl exec -it -n $NAMESPACE \$(kubectl get pod -n $NAMESPACE -l app=$SERVICE -o jsonpath='{.items[0].metadata.name}') -- curl http://localhost:3000/health"
echo ""
echo -e "  ${YELLOW}# Run synthetic checks${NC}"
echo "  ./scripts/synthetics/uptime-probe.sh"
echo ""
echo -e "  ${YELLOW}# Run smoke tests${NC}"
echo "  pnpm test:smoke"
echo ""

echo -e "${GREEN}✅ Rollback script completed${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Verify service is working (run verification script)"
echo "  2. Check metrics and logs"
echo "  3. Update status page"
echo "  4. Document incident and root cause"
echo ""
