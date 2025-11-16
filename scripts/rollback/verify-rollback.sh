#!/bin/bash
set -euo pipefail

# Verify Rollback Script
# Validates that a rolled-back deployment is healthy and functional
#
# Usage:
#   ./verify-rollback.sh <service>
#
# Examples:
#   ./verify-rollback.sh api-gateway
#   ./verify-rollback.sh reporting

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-teei-csr}"
SERVICE="${1:-}"
FAILED_CHECKS=0

# Validate service name provided
if [ -z "$SERVICE" ]; then
  echo -e "${RED}❌ Error: Service name is required${NC}"
  echo "Usage: $0 <service>"
  exit 1
fi

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Rollback Verification Script${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""
echo -e "Service:    ${GREEN}${SERVICE}${NC}"
echo -e "Namespace:  ${GREEN}${NAMESPACE}${NC}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
  echo -e "${RED}❌ Error: kubectl is not installed${NC}"
  exit 1
fi

# Check if deployment exists
if ! kubectl get deployment "$SERVICE" -n "$NAMESPACE" &> /dev/null; then
  echo -e "${RED}❌ Error: Deployment '$SERVICE' not found${NC}"
  exit 1
fi

# Verification functions
check_passed() {
  echo -e "${GREEN}✓ $1${NC}"
}

check_failed() {
  echo -e "${RED}✗ $1${NC}"
  FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

check_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

echo -e "${BLUE}Check 1: Deployment Status${NC}"
echo "----------------------------"

# Check if deployment has desired replicas
DESIRED_REPLICAS=$(kubectl get deployment "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
READY_REPLICAS=$(kubectl get deployment "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.status.readyReplicas}')
AVAILABLE_REPLICAS=$(kubectl get deployment "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.status.availableReplicas}')

echo "Desired:   $DESIRED_REPLICAS"
echo "Ready:     ${READY_REPLICAS:-0}"
echo "Available: ${AVAILABLE_REPLICAS:-0}"

if [ "${READY_REPLICAS:-0}" -eq "$DESIRED_REPLICAS" ]; then
  check_passed "All replicas are ready"
else
  check_failed "Not all replicas ready ($READY_REPLICAS/$DESIRED_REPLICAS)"
fi

if [ "${AVAILABLE_REPLICAS:-0}" -eq "$DESIRED_REPLICAS" ]; then
  check_passed "All replicas are available"
else
  check_failed "Not all replicas available ($AVAILABLE_REPLICAS/$DESIRED_REPLICAS)"
fi

echo ""

echo -e "${BLUE}Check 2: Pod Health${NC}"
echo "--------------------"

# Check if all pods are running
POD_COUNT=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" --no-headers | wc -l)
RUNNING_COUNT=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" --field-selector=status.phase=Running --no-headers | wc -l)

echo "Total pods:   $POD_COUNT"
echo "Running pods: $RUNNING_COUNT"

if [ "$RUNNING_COUNT" -eq "$DESIRED_REPLICAS" ]; then
  check_passed "All pods are running"
else
  check_failed "Not all pods running ($RUNNING_COUNT/$DESIRED_REPLICAS)"
fi

# Check for pod restarts
RESTART_COUNT=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" -o jsonpath='{.items[*].status.containerStatuses[*].restartCount}' | awk '{s+=$1} END {print s+0}')
echo "Total restarts: $RESTART_COUNT"

if [ "$RESTART_COUNT" -eq 0 ]; then
  check_passed "No pod restarts"
elif [ "$RESTART_COUNT" -lt 3 ]; then
  check_warning "Few pod restarts ($RESTART_COUNT)"
else
  check_failed "Excessive pod restarts ($RESTART_COUNT)"
fi

# Check pod ages
echo ""
echo "Pod ages:"
kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" -o custom-columns=NAME:.metadata.name,AGE:.metadata.creationTimestamp --no-headers | while read -r name timestamp; do
  age=$(( $(date +%s) - $(date -d "$timestamp" +%s) ))
  age_min=$((age / 60))
  echo "  $name: ${age_min}m ago"
done

echo ""

echo -e "${BLUE}Check 3: Container Health${NC}"
echo "--------------------------"

# Check if containers are ready
PODS=$(kubectl get pods -n "$NAMESPACE" -l app="$SERVICE" -o jsonpath='{.items[*].metadata.name}')

for pod in $PODS; do
  READY=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
  CONTAINER_READY=$(kubectl get pod "$pod" -n "$NAMESPACE" -o jsonpath='{.status.containerStatuses[0].ready}')

  if [ "$READY" = "True" ] && [ "$CONTAINER_READY" = "true" ]; then
    check_passed "Pod $pod is ready"
  else
    check_failed "Pod $pod is not ready"
  fi
done

echo ""

echo -e "${BLUE}Check 4: Health Endpoint${NC}"
echo "-------------------------"

# Try to call health endpoint from first pod
FIRST_POD=$(kubectl get pod -n "$NAMESPACE" -l app="$SERVICE" -o jsonpath='{.items[0].metadata.name}')

if [ -n "$FIRST_POD" ]; then
  echo "Testing health endpoint on $FIRST_POD..."

  # Try common health endpoint patterns
  for endpoint in "/health" "/ready" "/healthz"; do
    if kubectl exec -it "$FIRST_POD" -n "$NAMESPACE" -- curl -sf http://localhost:3000$endpoint &> /dev/null; then
      check_passed "Health endpoint $endpoint responds"
      break
    elif kubectl exec -it "$FIRST_POD" -n "$NAMESPACE" -- curl -sf http://localhost:8080$endpoint &> /dev/null; then
      check_passed "Health endpoint $endpoint responds (port 8080)"
      break
    fi
  done
else
  check_failed "No pods available to test health endpoint"
fi

echo ""

echo -e "${BLUE}Check 5: Resource Usage${NC}"
echo "------------------------"

# Check resource usage (requires metrics-server)
if kubectl top pod -n "$NAMESPACE" -l app="$SERVICE" &> /dev/null; then
  echo "Resource usage:"
  kubectl top pod -n "$NAMESPACE" -l app="$SERVICE"

  # Check for memory issues
  HIGH_MEM_PODS=$(kubectl top pod -n "$NAMESPACE" -l app="$SERVICE" --no-headers | awk '$3 ~ /[0-9]+Mi/ && $3+0 > 1000 {print $1}')
  if [ -z "$HIGH_MEM_PODS" ]; then
    check_passed "Memory usage is normal"
  else
    check_warning "High memory usage detected: $HIGH_MEM_PODS"
  fi

  # Check for CPU issues
  HIGH_CPU_PODS=$(kubectl top pod -n "$NAMESPACE" -l app="$SERVICE" --no-headers | awk '$2+0 > 1000 {print $1}')
  if [ -z "$HIGH_CPU_PODS" ]; then
    check_passed "CPU usage is normal"
  else
    check_warning "High CPU usage detected: $HIGH_CPU_PODS"
  fi
else
  check_warning "Metrics server not available (skipping resource check)"
fi

echo ""

echo -e "${BLUE}Check 6: Recent Errors${NC}"
echo "-----------------------"

# Check for errors in recent logs
echo "Checking last 50 log lines for errors..."
ERROR_COUNT=$(kubectl logs -n "$NAMESPACE" -l app="$SERVICE" --tail=50 --all-containers=true | grep -iE "(error|exception|fatal|panic)" | wc -l)

echo "Error lines found: $ERROR_COUNT"

if [ "$ERROR_COUNT" -eq 0 ]; then
  check_passed "No errors in recent logs"
elif [ "$ERROR_COUNT" -lt 5 ]; then
  check_warning "Few errors in recent logs ($ERROR_COUNT)"
else
  check_failed "Many errors in recent logs ($ERROR_COUNT)"
  echo "Sample errors:"
  kubectl logs -n "$NAMESPACE" -l app="$SERVICE" --tail=50 --all-containers=true | grep -iE "(error|exception|fatal|panic)" | head -3
fi

echo ""

echo -e "${BLUE}Check 7: Service Connectivity${NC}"
echo "-------------------------------"

# Check if service exists
if kubectl get service "$SERVICE" -n "$NAMESPACE" &> /dev/null; then
  check_passed "Service exists"

  # Get service endpoints
  ENDPOINTS=$(kubectl get endpoints "$SERVICE" -n "$NAMESPACE" -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
  echo "Service endpoints: $ENDPOINTS"

  if [ "$ENDPOINTS" -eq "$DESIRED_REPLICAS" ]; then
    check_passed "All pods registered as service endpoints"
  else
    check_failed "Not all pods registered ($ENDPOINTS/$DESIRED_REPLICAS)"
  fi
else
  check_warning "Service object not found (may not exist for this deployment)"
fi

echo ""

echo -e "${BLUE}Check 8: Recent Events${NC}"
echo "-----------------------"

# Check for warning events in last 5 minutes
echo "Recent events (last 5 minutes):"
RECENT_EVENTS=$(kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$SERVICE" --sort-by='.lastTimestamp' | tail -5)

if [ -n "$RECENT_EVENTS" ]; then
  echo "$RECENT_EVENTS"
else
  echo "No recent events"
fi

WARNING_EVENTS=$(kubectl get events -n "$NAMESPACE" --field-selector involvedObject.name="$SERVICE",type=Warning | tail -1)
if [ -z "$WARNING_EVENTS" ]; then
  check_passed "No warning events"
else
  check_warning "Warning events detected"
fi

echo ""

echo -e "${BLUE}=================================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}=================================================${NC}"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
  echo -e "${GREEN}✅ All checks passed!${NC}"
  echo ""
  echo "Rollback verification successful. Service appears healthy."
  exit 0
else
  echo -e "${RED}❌ $FAILED_CHECKS check(s) failed${NC}"
  echo ""
  echo "Rollback verification found issues. Review failed checks above."
  echo ""
  echo "Recommended actions:"
  echo "  1. Review pod logs: kubectl logs -n $NAMESPACE -l app=$SERVICE --tail=100"
  echo "  2. Check recent events: kubectl get events -n $NAMESPACE --field-selector involvedObject.name=$SERVICE"
  echo "  3. Describe pods: kubectl describe pods -n $NAMESPACE -l app=$SERVICE"
  echo "  4. Consider rolling back further or scaling horizontally"
  echo ""
  exit 1
fi
