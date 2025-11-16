#!/bin/bash

# ============================================================================
# Loki Log Sampling Rollback Script
# ============================================================================
# Purpose: Rollback log sampling rules to previous configuration
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

confirm_rollback() {
    echo ""
    log_warning "⚠️  ROLLBACK CONFIRMATION REQUIRED ⚠️"
    echo ""
    echo "This will:"
    echo "  1. Remove sampling rules ConfigMap"
    echo "  2. Restore previous Loki configuration"
    echo "  3. Restart Loki pods"
    echo "  4. Return to full log ingestion (no sampling)"
    echo ""
    echo "Namespace: $NAMESPACE"
    echo "Backup: ${BACKUP_DIR:-none}"
    echo ""

    read -p "Are you sure you want to rollback? (yes/no): " -r
    echo

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_info "Rollback cancelled by user"
        exit 0
    fi
}

remove_sampling_rules() {
    log_info "Removing sampling rules ConfigMap..."

    if kubectl get cm loki-sampling-rules -n "$NAMESPACE" &> /dev/null; then
        kubectl delete cm loki-sampling-rules -n "$NAMESPACE"
        log_success "Sampling rules ConfigMap removed"
    else
        log_warning "Sampling rules ConfigMap not found (may already be removed)"
    fi
}

restore_loki_config() {
    log_info "Restoring Loki configuration..."

    if [ -n "${BACKUP_DIR:-}" ] && [ -f "$BACKUP_DIR/loki-config.yaml" ]; then
        # Restore from backup
        log_info "Restoring from backup: $BACKUP_DIR/loki-config.yaml"
        kubectl apply -f "$BACKUP_DIR/loki-config.yaml"
        log_success "Loki configuration restored from backup"
    else
        # Revert using git
        log_info "No backup found, reverting via git..."

        REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
        cd "$REPO_ROOT"

        if git diff --quiet k8s/base/observability/loki/configmap.yaml; then
            log_warning "No changes detected in Loki config, using git HEAD~1"
            git checkout HEAD~1 -- k8s/base/observability/loki/configmap.yaml
        else
            log_info "Reverting uncommitted changes"
            git checkout -- k8s/base/observability/loki/configmap.yaml
        fi

        kubectl apply -f k8s/base/observability/loki/configmap.yaml
        log_success "Loki configuration reverted via git"
    fi
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

validate_rollback() {
    log_info "Validating rollback..."

    # Verify sampling rules ConfigMap is gone
    if kubectl get cm loki-sampling-rules -n "$NAMESPACE" &> /dev/null; then
        log_error "Sampling rules ConfigMap still exists!"
        exit 1
    else
        log_success "Sampling rules ConfigMap removed"
    fi

    # Check Loki is ingesting logs normally
    log_info "Checking log ingestion rate..."
    sleep 15  # Wait for metrics to update

    # Port-forward to Loki metrics endpoint
    log_info "Checking Loki metrics..."
    kubectl port-forward -n "$NAMESPACE" svc/teei-loki-headless 3100:3100 &
    PF_PID=$!
    sleep 3

    if curl -s http://localhost:3100/metrics | grep -q "loki_distributor_lines_received_total"; then
        log_success "Loki is ingesting logs"
    else
        log_warning "Could not verify log ingestion (may be normal if just started)"
    fi

    # Kill port-forward
    kill $PF_PID 2>/dev/null || true

    log_success "Rollback validation complete"
}

show_post_rollback_info() {
    echo ""
    echo "============================================================================"
    log_success "Rollback Complete!"
    echo "============================================================================"
    echo ""
    echo "Log sampling has been disabled. Loki is now ingesting all logs."
    echo ""
    echo "Next Steps:"
    echo ""
    echo "1. Monitor log ingestion rate (should return to baseline ~6370 logs/sec):"
    echo "   kubectl port-forward -n $NAMESPACE svc/teei-loki-headless 3100:3100"
    echo "   curl http://localhost:3100/metrics | grep loki_distributor_lines_received_total"
    echo ""
    echo "2. Check total log volume in Grafana Explore:"
    echo "   sum(rate({job=~\".+\"}[5m]))"
    echo "   Expected: ~6370 logs/sec (baseline, no sampling)"
    echo ""
    echo "3. Monitor for 1 hour to confirm full restoration"
    echo ""
    echo "4. If issues persist, check Loki logs:"
    echo "   kubectl logs -l app=$LOKI_APP -n $NAMESPACE"
    echo ""
    echo "============================================================================"
    echo "To re-deploy sampling:"
    echo "============================================================================"
    echo ""
    echo "   cd observability/loki"
    echo "   ./deploy-sampling.sh"
    echo ""
    echo "============================================================================"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log_info "Starting Loki log sampling rollback..."
    echo ""

    confirm_rollback
    remove_sampling_rules
    restore_loki_config
    restart_loki
    validate_rollback
    show_post_rollback_info
}

# Parse command line arguments
FORCE=false
BACKUP_DIR=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
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
        --backup)
            BACKUP_DIR="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS] [BACKUP_DIR]"
            echo ""
            echo "Options:"
            echo "  --force          Skip confirmation prompt"
            echo "  --namespace NS   Kubernetes namespace (default: teei-platform)"
            echo "  --timeout SEC    Timeout for pod readiness (default: 300)"
            echo "  --backup DIR     Path to backup directory to restore from"
            echo "  --help           Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Interactive rollback"
            echo "  $0 --force                            # Rollback without confirmation"
            echo "  $0 --backup backups/20251116_143022   # Restore from specific backup"
            echo ""
            exit 0
            ;;
        *)
            # Treat first positional argument as backup directory
            if [ -z "$BACKUP_DIR" ]; then
                BACKUP_DIR="$1"
            else
                log_error "Unknown option: $1"
                echo "Use --help for usage information"
                exit 1
            fi
            shift
            ;;
    esac
done

# Skip confirmation if --force flag is set
if [ "$FORCE" = true ]; then
    log_warning "Force mode enabled - skipping confirmation"
    confirm_rollback() { log_info "Confirmation skipped (--force)"; }
fi

# Use .last-backup if no backup directory specified
if [ -z "$BACKUP_DIR" ] && [ -f ".last-backup" ]; then
    BACKUP_DIR=$(cat .last-backup)
    log_info "Using last backup: $BACKUP_DIR"
fi

# Validate backup directory if specified
if [ -n "$BACKUP_DIR" ] && [ ! -d "$BACKUP_DIR" ]; then
    log_error "Backup directory not found: $BACKUP_DIR"
    log_info "Proceeding with git-based rollback instead"
    BACKUP_DIR=""
fi

# Run main rollback
main

exit 0
