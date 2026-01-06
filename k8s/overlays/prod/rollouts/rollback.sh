#!/bin/bash
#
# Automated Rollback Script for Argo Rollouts
# Usage: ./rollback.sh <service-name> [revision]
#
# Examples:
#   ./rollback.sh api-gateway        # Rollback to previous revision
#   ./rollback.sh reporting 5        # Rollback to specific revision

set -euo pipefail

SERVICE_NAME="${1:-}"
REVISION="${2:-}"
NAMESPACE="teei-prod"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Validate inputs
if [ -z "$SERVICE_NAME" ]; then
  echo -e "${RED}Error: Service name is required${NC}"
  echo "Usage: $0 <service-name> [revision]"
  echo ""
  echo "Available services:"
  echo "  - api-gateway"
  echo "  - reporting"
  echo "  - q2q-ai"
  echo "  - impact-in"
  exit 1
fi

# Validate service exists
VALID_SERVICES=("api-gateway" "reporting" "q2q-ai" "impact-in")
if [[ ! " ${VALID_SERVICES[@]} " =~ " ${SERVICE_NAME} " ]]; then
  echo -e "${RED}Error: Invalid service name '${SERVICE_NAME}'${NC}"
  echo "Valid services: ${VALID_SERVICES[*]}"
  exit 1
fi

echo -e "${YELLOW}======================================${NC}"
echo -e "${YELLOW}Argo Rollouts - Rollback${NC}"
echo -e "${YELLOW}======================================${NC}"
echo ""
echo "Service:   $SERVICE_NAME"
echo "Namespace: $NAMESPACE"
echo ""

# Get current status
echo -e "${YELLOW}Current rollout status:${NC}"
kubectl argo rollouts get rollout "$SERVICE_NAME" -n "$NAMESPACE" || {
  echo -e "${RED}Error: Rollout not found${NC}"
  exit 1
}
echo ""

# List revisions
echo -e "${YELLOW}Available revisions:${NC}"
kubectl argo rollouts history rollout "$SERVICE_NAME" -n "$NAMESPACE"
echo ""

# Confirm rollback
if [ -z "$REVISION" ]; then
  echo -e "${YELLOW}Rolling back to previous revision...${NC}"
  read -p "Continue? (yes/no): " -r
else
  echo -e "${YELLOW}Rolling back to revision $REVISION...${NC}"
  read -p "Continue? (yes/no): " -r
fi

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${RED}Rollback cancelled${NC}"
  exit 0
fi

# Execute rollback
echo ""
echo -e "${YELLOW}Executing rollback...${NC}"
if [ -z "$REVISION" ]; then
  kubectl argo rollouts undo rollout "$SERVICE_NAME" -n "$NAMESPACE"
else
  kubectl argo rollouts undo rollout "$SERVICE_NAME" --to-revision="$REVISION" -n "$NAMESPACE"
fi

# Wait for rollback
echo ""
echo -e "${YELLOW}Waiting for rollback to complete...${NC}"
kubectl argo rollouts status rollout "$SERVICE_NAME" -n "$NAMESPACE" --watch --timeout=10m

# Verify health
echo ""
echo -e "${YELLOW}Verifying service health...${NC}"
sleep 10

# Check metrics
echo ""
echo -e "${YELLOW}Post-rollback metrics:${NC}"
kubectl argo rollouts get rollout "$SERVICE_NAME" -n "$NAMESPACE"

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Rollback completed successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Monitor service metrics in Grafana"
echo "  2. Check error rates and latency"
echo "  3. Verify business KPIs"
echo "  4. Update incident documentation"
