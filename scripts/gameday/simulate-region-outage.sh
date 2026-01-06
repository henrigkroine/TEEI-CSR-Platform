#!/bin/bash
################################################################################
# simulate-region-outage.sh
#
# Simulates a regional outage by blocking network traffic to the primary region
# using Kubernetes NetworkPolicies. This is for GAMEDAY DRILLS ONLY.
#
# Usage:
#   ./simulate-region-outage.sh --region us-east-1 --duration 300
#   ./simulate-region-outage.sh --restore
#
# Requirements:
#   - kubectl configured with access to both clusters
#   - Chaos Mesh installed (optional, for advanced fault injection)
#
# Author: dr-gameday-lead
# Version: 1.0
# Date: 2025-11-15
################################################################################

set -euo pipefail

# Configuration
REGION="${1:-us-east-1}"
DURATION="${2:-300}"  # Default: 5 minutes
EVIDENCE_DIR="/home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${EVIDENCE_DIR}/simulate-outage.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" | tee -a "$LOG_FILE"
}

show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Simulate a regional outage for disaster recovery gameday drills.

Options:
    --region REGION         AWS region to simulate outage (default: us-east-1)
    --duration SECONDS      Duration of simulated outage (default: 300)
    --restore               Restore region (undo simulation)
    --chaos-mesh            Use Chaos Mesh for advanced fault injection
    --help                  Show this help message

Examples:
    # Simulate 5-minute outage in US region
    $0 --region us-east-1 --duration 300

    # Restore region after simulation
    $0 --restore --region us-east-1

    # Use Chaos Mesh for pod failure simulation
    $0 --chaos-mesh --region us-east-1

WARNING: This script will disrupt production-like traffic. Only use in
         designated gameday drill environments or with explicit approval.
EOF
}

# Parse arguments
MODE="simulate"
USE_CHAOS_MESH=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --region)
            REGION="$2"
            shift 2
            ;;
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --restore)
            MODE="restore"
            shift
            ;;
        --chaos-mesh)
            USE_CHAOS_MESH=true
            shift
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Determine Kubernetes context based on region
if [[ "$REGION" == "us-east-1" ]]; then
    CONTEXT="prod-us-east-1"
    NAMESPACE="teei-prod-us"
elif [[ "$REGION" == "eu-central-1" ]]; then
    CONTEXT="prod-eu-central-1"
    NAMESPACE="teei-prod-eu"
else
    error "Invalid region: $REGION. Supported: us-east-1, eu-central-1"
    exit 1
fi

# Create evidence directory
mkdir -p "$EVIDENCE_DIR"

################################################################################
# Safety Checks
################################################################################

safety_check() {
    log "Running safety checks..."

    # Check if this is a gameday drill (environment variable must be set)
    if [[ -z "${GAMEDAY_DRILL:-}" ]]; then
        error "GAMEDAY_DRILL environment variable not set!"
        error "To prevent accidental production outages, you must explicitly set:"
        error "  export GAMEDAY_DRILL=true"
        error "before running this script."
        exit 1
    fi

    # Verify kubectl access
    if ! kubectl --context "$CONTEXT" get nodes &>/dev/null; then
        error "Cannot access Kubernetes cluster with context: $CONTEXT"
        exit 1
    fi

    # Confirm with user
    if [[ "$MODE" == "simulate" ]]; then
        warn "This will simulate a region outage in: $REGION"
        warn "Duration: $DURATION seconds"
        warn "Context: $CONTEXT"
        warn "Namespace: $NAMESPACE"
        echo -n "Are you sure you want to proceed? (type 'YES' to confirm): "
        read -r CONFIRMATION

        if [[ "$CONFIRMATION" != "YES" ]]; then
            log "Simulation aborted by user."
            exit 0
        fi
    fi
}

################################################################################
# Simulation Functions
################################################################################

simulate_network_partition() {
    log "Simulating network partition using NetworkPolicy..."

    # Create NetworkPolicy to deny all ingress/egress traffic
    kubectl --context "$CONTEXT" apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: gameday-deny-all
  namespace: $NAMESPACE
  labels:
    gameday: "true"
    simulation-id: "$(date +%s)"
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
  ingress: []
  egress: []
EOF

    log "NetworkPolicy applied. All traffic to/from pods in $NAMESPACE is blocked."

    # Save NetworkPolicy for evidence
    kubectl --context "$CONTEXT" get networkpolicy gameday-deny-all -n "$NAMESPACE" -o yaml \
        > "${EVIDENCE_DIR}/networkpolicy-applied.yaml"
}

simulate_pod_failures() {
    log "Simulating pod failures by scaling down critical deployments..."

    # Get list of deployments
    DEPLOYMENTS=$(kubectl --context "$CONTEXT" get deployments -n "$NAMESPACE" -o name)

    # Save original replica counts
    for DEPLOY in $DEPLOYMENTS; do
        REPLICAS=$(kubectl --context "$CONTEXT" get "$DEPLOY" -n "$NAMESPACE" -o jsonpath='{.spec.replicas}')
        echo "$DEPLOY=$REPLICAS" >> "${EVIDENCE_DIR}/original-replicas.txt"
    done

    # Scale down all deployments to 0
    log "Scaling down all deployments to simulate pod failures..."
    for DEPLOY in $DEPLOYMENTS; do
        kubectl --context "$CONTEXT" scale "$DEPLOY" -n "$NAMESPACE" --replicas=0
    done

    log "All deployments scaled to 0 replicas."
}

simulate_chaos_mesh_network_chaos() {
    log "Simulating network chaos using Chaos Mesh..."

    # Check if Chaos Mesh is installed
    if ! kubectl --context "$CONTEXT" get ns chaos-mesh &>/dev/null; then
        error "Chaos Mesh is not installed. Please install it first or use --restore mode."
        exit 1
    fi

    # Create NetworkChaos to simulate partition
    kubectl --context "$CONTEXT" apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: gameday-network-partition
  namespace: $NAMESPACE
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - $NAMESPACE
  direction: both
  duration: "${DURATION}s"
EOF

    log "Chaos Mesh NetworkChaos applied for ${DURATION} seconds."
}

simulate_database_failure() {
    log "Simulating database failure by cordoning database pods..."

    # Get Postgres StatefulSet pods
    POSTGRES_PODS=$(kubectl --context "$CONTEXT" get pods -n "$NAMESPACE" -l app=postgres -o name)

    for POD in $POSTGRES_PODS; do
        log "Deleting pod: $POD"
        kubectl --context "$CONTEXT" delete "$POD" -n "$NAMESPACE" --grace-period=0 --force
    done

    log "Database pods deleted (will recreate, simulating temporary failure)."
}

################################################################################
# Restoration Functions
################################################################################

restore_network_policy() {
    log "Restoring network access by removing NetworkPolicy..."

    if kubectl --context "$CONTEXT" get networkpolicy gameday-deny-all -n "$NAMESPACE" &>/dev/null; then
        kubectl --context "$CONTEXT" delete networkpolicy gameday-deny-all -n "$NAMESPACE"
        log "NetworkPolicy removed. Network access restored."
    else
        warn "NetworkPolicy gameday-deny-all not found. Nothing to remove."
    fi
}

restore_pod_replicas() {
    log "Restoring pod replicas to original counts..."

    if [[ ! -f "${EVIDENCE_DIR}/original-replicas.txt" ]]; then
        # Try to find latest evidence directory
        LATEST_EVIDENCE=$(find /home/user/TEEI-CSR-Platform/ops/gameday/evidence -name "original-replicas.txt" | sort -r | head -1)
        if [[ -n "$LATEST_EVIDENCE" ]]; then
            warn "Using replica counts from: $LATEST_EVIDENCE"
            cp "$LATEST_EVIDENCE" "${EVIDENCE_DIR}/original-replicas.txt"
        else
            error "Cannot find original replica counts. Manual restoration required."
            exit 1
        fi
    fi

    while IFS='=' read -r DEPLOY REPLICAS; do
        log "Scaling $DEPLOY to $REPLICAS replicas..."
        kubectl --context "$CONTEXT" scale "$DEPLOY" -n "$NAMESPACE" --replicas="$REPLICAS"
    done < "${EVIDENCE_DIR}/original-replicas.txt"

    log "All deployments restored to original replica counts."
}

restore_chaos_mesh() {
    log "Removing Chaos Mesh NetworkChaos..."

    if kubectl --context "$CONTEXT" get networkchaos gameday-network-partition -n "$NAMESPACE" &>/dev/null; then
        kubectl --context "$CONTEXT" delete networkchaos gameday-network-partition -n "$NAMESPACE"
        log "NetworkChaos removed."
    else
        warn "NetworkChaos gameday-network-partition not found. Nothing to remove."
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    log "==================================================================="
    log "Region Outage Simulation Script"
    log "==================================================================="
    log "Mode: $MODE"
    log "Region: $REGION"
    log "Context: $CONTEXT"
    log "Namespace: $NAMESPACE"
    log "Evidence Directory: $EVIDENCE_DIR"
    log "==================================================================="

    if [[ "$MODE" == "simulate" ]]; then
        safety_check

        log "Starting simulation..."
        START_TIME=$(date +%s)

        # Capture pre-simulation state
        kubectl --context "$CONTEXT" get pods -n "$NAMESPACE" -o wide > "${EVIDENCE_DIR}/pods-before-simulation.txt"
        kubectl --context "$CONTEXT" get nodes > "${EVIDENCE_DIR}/nodes-before-simulation.txt"

        if [[ "$USE_CHAOS_MESH" == true ]]; then
            simulate_chaos_mesh_network_chaos
        else
            # Use NetworkPolicy method
            simulate_network_partition
            # Optionally simulate pod failures
            # simulate_pod_failures
        fi

        END_TIME=$(date +%s)
        ELAPSED=$((END_TIME - START_TIME))

        log "Simulation started successfully in ${ELAPSED} seconds."
        log "Outage will last for ${DURATION} seconds."
        log "To restore, run: $0 --restore --region $REGION"

        # Optionally auto-restore after duration (if not using Chaos Mesh auto-cleanup)
        if [[ "$USE_CHAOS_MESH" == false ]]; then
            log "Simulation will NOT auto-restore. Manual restoration required."
        fi

    elif [[ "$MODE" == "restore" ]]; then
        log "Restoring region..."

        if [[ "$USE_CHAOS_MESH" == true ]]; then
            restore_chaos_mesh
        else
            restore_network_policy
            # restore_pod_replicas
        fi

        # Capture post-restoration state
        kubectl --context "$CONTEXT" get pods -n "$NAMESPACE" -o wide > "${EVIDENCE_DIR}/pods-after-restoration.txt"

        log "Region restored successfully."
    fi

    log "==================================================================="
    log "Simulation complete. Evidence saved to: $EVIDENCE_DIR"
    log "==================================================================="
}

# Run main
main
