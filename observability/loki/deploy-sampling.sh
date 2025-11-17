#!/bin/bash

# ============================================================================
# Loki Log Sampling Deployment Script
# ============================================================================
# Purpose: Deploy log sampling rules to Kubernetes cluster
# Owner: Worker 1 Team 6 (Observability)
# Last Updated: 2025-11-16
# ============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-teei-platform}"
LOKI_APP="teei-loki"
TIMEOUT="${TIMEOUT:-300}"

# ============================================================================
# Functions
# ============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster. Check your kubeconfig."
        exit 1
    fi

    # Check namespace exists
    if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
        log_error "Namespace '$NAMESPACE' does not exist."
        exit 1
    fi

    log_success "Prerequisites check passed"
}

backup_current_config() {
    log_info "Backing up current Loki configuration..."

    BACKUP_DIR="./backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    # Backup Loki ConfigMap
    kubectl get cm teei-loki-config -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/loki-config.yaml" 2>/dev/null || true

    # Backup existing sampling rules (if any)
    kubectl get cm loki-sampling-rules -n "$NAMESPACE" -o yaml > "$BACKUP_DIR/sampling-rules.yaml" 2>/dev/null || true

    log_success "Backup saved to $BACKUP_DIR"
    echo "$BACKUP_DIR" > .last-backup
}

deploy_sampling_rules() {
    log_info "Deploying sampling rules ConfigMap..."

    kubectl apply -f rules/sampling.yaml

    log_success "Sampling rules deployed"
}

update_loki_config() {
    log_info "Updating Loki configuration..."

    # Get the repo root (script is in observability/loki/)
    REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

    kubectl apply -f "$REPO_ROOT/k8s/base/observability/loki/configmap.yaml"

    log_success "Loki configuration updated"
}

restart_loki() {
    log_info "Restarting Loki pods..."

    kubectl rollout restart statefulset/$LOKI_APP -n "$NAMESPACE"

    log_info "Waiting for Loki to be ready (timeout: ${TIMEOUT}s)..."
    if kubectl wait --for=condition=ready pod -l app=$LOKI_APP -n "$NAMESPACE" --timeout="${TIMEOUT}s"; then
        log_success "Loki pods are ready"
    else
        log_error "Loki pods failed to become ready within ${TIMEOUT}s"
        log_warning "Check pod status with: kubectl get pods -l app=$LOKI_APP -n $NAMESPACE"
        exit 1
    fi
}

validate_deployment() {
    log_info "Validating deployment..."

    # Check if sampling rules ConfigMap exists
    if kubectl get cm loki-sampling-rules -n "$NAMESPACE" &> /dev/null; then
        log_success "Sampling rules ConfigMap exists"
    else
        log_error "Sampling rules ConfigMap not found"
        exit 1
    fi

    # Check Loki logs for sampling-related messages
    log_info "Checking Loki logs for sampling initialization..."
    sleep 10  # Wait for Loki to start processing

    if kubectl logs -l app=$LOKI_APP -n "$NAMESPACE" --tail=100 | grep -i "sampling" &> /dev/null; then
        log_success "Sampling configuration loaded"
    else
        log_warning "No sampling-related logs found (may be normal if just started)"
    fi

    log_success "Deployment validation complete"
}

show_next_steps() {
    echo ""
    echo "============================================================================"
    log_success "Log Sampling Deployment Complete!"
    echo "============================================================================"
    echo ""
    echo "Next Steps:"
    echo ""
    echo "1. Monitor sampling effectiveness (wait 10-15 minutes for metrics):"
    echo "   kubectl port-forward svc/teei-loki-headless 3100:3100 -n $NAMESPACE"
    echo "   curl http://localhost:3100/metrics | grep loki_distributor_lines"
    echo ""
    echo "2. Run validation queries in Grafana Explore:"
    echo "   - Total volume: sum(count_over_time({job=~\".+\"}[1h]))"
    echo "   - ERROR retention: sum(count_over_time({level=\"error\"}[1h]))"
    echo "   - WARN retention: sum(count_over_time({level=\"warn\"}[1h]))"
    echo ""
    echo "3. View validation queries:"
    echo "   cat validation-queries.logql"
    echo ""
    echo "4. Monitor for 24 hours before full rollout"
    echo ""
    echo "5. Check detailed analysis:"
    echo "   cat ../../reports/worker1_phaseJ/log_sampling_analysis.md"
    echo ""
    echo "============================================================================"
    echo "Rollback Instructions (if needed):"
    echo "============================================================================"
    echo ""
    echo "If you need to rollback:"
    echo "   ./rollback-sampling.sh $(cat .last-backup 2>/dev/null || echo 'backups/LATEST')"
    echo ""
    echo "============================================================================"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log_info "Starting Loki log sampling deployment..."
    echo ""

    check_prerequisites
    backup_current_config
    deploy_sampling_rules
    update_loki_config
    restart_loki
    validate_deployment
    show_next_steps
}

# Parse command line arguments
SKIP_BACKUP=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-backup)
            SKIP_BACKUP=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --skip-backup    Skip configuration backup"
            echo "  --dry-run        Show what would be done without applying"
            echo "  --namespace NS   Kubernetes namespace (default: teei-platform)"
            echo "  --timeout SEC    Timeout for pod readiness (default: 300)"
            echo "  --help           Show this help message"
            echo ""
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

if [ "$DRY_RUN" = true ]; then
    log_warning "DRY RUN MODE - No changes will be applied"
    echo ""
    echo "Would execute:"
    echo "  1. Check prerequisites (kubectl, cluster connection)"
    echo "  2. Backup current configuration to ./backups/\$(date)"
    echo "  3. Deploy sampling rules ConfigMap (rules/sampling.yaml)"
    echo "  4. Update Loki configuration (k8s/base/observability/loki/configmap.yaml)"
    echo "  5. Restart Loki StatefulSet"
    echo "  6. Wait for pods to be ready (timeout: ${TIMEOUT}s)"
    echo "  7. Validate deployment"
    echo ""
    exit 0
fi

if [ "$SKIP_BACKUP" = true ]; then
    log_warning "Skipping backup (--skip-backup flag set)"
    backup_current_config() { log_info "Backup skipped"; }
fi

# Run main deployment
main

exit 0
