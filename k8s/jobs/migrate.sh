#!/bin/bash
# Database Migration Helper Script
# Manages database migrations in Kubernetes

set -e

# Configuration
NAMESPACE="${KUBE_NAMESPACE:-teei-staging}"
JOB_NAME="db-migration"
ROLLBACK_JOB_NAME="db-rollback"
TIMEOUT="600s"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
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

# Show usage
usage() {
  cat <<EOF
Database Migration Helper

Usage: $0 <command> [options]

Commands:
  migrate     Run database migrations
  rollback    Rollback the last migration (interactive)
  status      Show migration job status
  logs        View migration job logs
  cleanup     Delete completed migration jobs
  verify      Verify migration prerequisites

Options:
  -n, --namespace   Kubernetes namespace (default: teei-staging)
  -t, --timeout     Timeout for job completion (default: 600s)
  -h, --help        Show this help message

Examples:
  $0 migrate
  $0 migrate --namespace teei-production
  $0 rollback
  $0 status
  $0 logs
  $0 cleanup

EOF
}

# Parse command line arguments
parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      -n|--namespace)
        NAMESPACE="$2"
        shift 2
        ;;
      -t|--timeout)
        TIMEOUT="$2"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        COMMAND="$1"
        shift
        ;;
    esac
  done
}

# Verify prerequisites
verify_prerequisites() {
  log_info "Verifying prerequisites..."

  # Check kubectl
  if ! command -v kubectl &> /dev/null; then
    log_error "kubectl not found. Please install kubectl."
    exit 1
  fi

  # Check namespace
  if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
    log_error "Namespace '$NAMESPACE' does not exist."
    exit 1
  fi

  # Check database secret
  if ! kubectl get secret teei-shared-db-secrets -n "$NAMESPACE" &> /dev/null; then
    log_error "Database secret 'teei-shared-db-secrets' not found in namespace '$NAMESPACE'."
    log_info "Create the secret with: kubectl create secret generic teei-shared-db-secrets --from-literal=DATABASE_URL=postgresql://..."
    exit 1
  fi

  log_success "Prerequisites verified"
}

# Run migrations
run_migrations() {
  log_info "Starting database migrations in namespace: $NAMESPACE"

  # Delete existing job
  log_info "Cleaning up previous migration job..."
  kubectl delete job "$JOB_NAME" -n "$NAMESPACE" --ignore-not-found=true
  sleep 2

  # Apply migration job
  log_info "Creating migration job..."
  kubectl apply -f "$(dirname "$0")/db-migration.yaml" -n "$NAMESPACE"

  # Wait for pod to be ready
  log_info "Waiting for migration pod to start..."
  kubectl wait --for=condition=Ready pod -l app=db-migration -n "$NAMESPACE" --timeout=60s || {
    log_warning "Pod not ready yet, checking status..."
    kubectl get pods -l app=db-migration -n "$NAMESPACE"
  }

  # Stream logs
  log_info "Streaming migration logs..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  kubectl logs -f job/"$JOB_NAME" -n "$NAMESPACE" --all-containers=true || {
    log_warning "Could not stream logs, will check status..."
  }

  # Wait for completion
  log_info "Waiting for migration job to complete (timeout: $TIMEOUT)..."
  kubectl wait --for=condition=Complete job/"$JOB_NAME" -n "$NAMESPACE" --timeout="$TIMEOUT" || {
    log_error "Migration job failed or timed out!"
    kubectl describe job "$JOB_NAME" -n "$NAMESPACE"
    kubectl logs job/"$JOB_NAME" -n "$NAMESPACE" --all-containers=true --tail=100
    exit 1
  }

  # Verify success
  JOB_STATUS=$(kubectl get job "$JOB_NAME" -n "$NAMESPACE" -o jsonpath='{.status.conditions[?(@.type=="Complete")].status}')
  if [ "$JOB_STATUS" != "True" ]; then
    log_error "Migration job did not complete successfully"
    kubectl describe job "$JOB_NAME" -n "$NAMESPACE"
    exit 1
  fi

  log_success "Database migrations completed successfully!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# Run rollback
run_rollback() {
  log_warning "⚠️  ROLLBACK REQUESTED ⚠️"
  echo ""
  echo "This will rollback the most recent database migration."
  echo "This operation may cause data loss!"
  echo ""
  echo "Before proceeding, ensure:"
  echo "  1. You have a recent database backup"
  echo "  2. All services are stopped or scaled to 0"
  echo "  3. You have notified the team"
  echo ""
  read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

  if [ "$confirm" != "yes" ]; then
    log_info "Rollback cancelled"
    exit 0
  fi

  log_info "Starting database rollback in namespace: $NAMESPACE"

  # Ask which migration to rollback
  echo ""
  echo "Available rollback scripts:"
  echo "  1. 0013_rollback.sql - RBAC and privacy tables"
  echo "  2. 0012_rollback_saved_views_share_links.sql - Saved views"
  echo "  3. 0011_rollback_sroi_tables.sql - SROI tables"
  echo "  4. 0010_rollback_unified_profile_linking.sql - Profile linking"
  echo "  5. Other (manual entry)"
  echo ""
  read -p "Which migration do you want to rollback? (1-5): " choice

  case $choice in
    1) ROLLBACK_SCRIPT="0013_rollback.sql" ;;
    2) ROLLBACK_SCRIPT="0012_rollback_saved_views_share_links.sql" ;;
    3) ROLLBACK_SCRIPT="0011_rollback_sroi_tables.sql" ;;
    4) ROLLBACK_SCRIPT="0010_rollback_unified_profile_linking.sql" ;;
    5)
      read -p "Enter rollback script filename: " ROLLBACK_SCRIPT
      ;;
    *)
      log_error "Invalid choice"
      exit 1
      ;;
  esac

  log_info "Selected rollback script: $ROLLBACK_SCRIPT"

  # Delete existing rollback job
  log_info "Cleaning up previous rollback job..."
  kubectl delete job "$ROLLBACK_JOB_NAME" -n "$NAMESPACE" --ignore-not-found=true
  sleep 2

  # Apply rollback job (with updated script)
  log_info "Creating rollback job..."
  cat "$(dirname "$0")/db-rollback.yaml" | \
    sed "s/value: \".*\.sql\"/value: \"$ROLLBACK_SCRIPT\"/" | \
    kubectl apply -f - -n "$NAMESPACE"

  # Wait for pod to be ready
  log_info "Waiting for rollback pod to start..."
  sleep 5

  # Stream logs
  log_info "Streaming rollback logs..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  kubectl logs -f job/"$ROLLBACK_JOB_NAME" -n "$NAMESPACE" --all-containers=true || {
    log_warning "Could not stream logs, will check status..."
  }

  # Wait for completion
  log_info "Waiting for rollback job to complete..."
  kubectl wait --for=condition=Complete job/"$ROLLBACK_JOB_NAME" -n "$NAMESPACE" --timeout="$TIMEOUT" || {
    log_error "Rollback job failed or timed out!"
    kubectl describe job "$ROLLBACK_JOB_NAME" -n "$NAMESPACE"
    kubectl logs job/"$ROLLBACK_JOB_NAME" -n "$NAMESPACE" --all-containers=true --tail=100
    exit 1
  fi

  log_success "Database rollback completed!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  log_warning "Next steps:"
  echo "  1. Verify application functionality"
  echo "  2. Redeploy services with compatible code"
  echo "  3. Document the rollback in incident report"
}

# Show migration status
show_status() {
  log_info "Migration job status in namespace: $NAMESPACE"
  echo ""

  # Check if job exists
  if kubectl get job "$JOB_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo "Migration Job:"
    kubectl get job "$JOB_NAME" -n "$NAMESPACE"
    echo ""

    echo "Job Details:"
    kubectl describe job "$JOB_NAME" -n "$NAMESPACE" | grep -A 10 "Status:"
    echo ""

    echo "Pods:"
    kubectl get pods -n "$NAMESPACE" -l app=db-migration
  else
    log_info "No migration job found"
  fi

  # Check if rollback job exists
  if kubectl get job "$ROLLBACK_JOB_NAME" -n "$NAMESPACE" &> /dev/null; then
    echo ""
    echo "Rollback Job:"
    kubectl get job "$ROLLBACK_JOB_NAME" -n "$NAMESPACE"
  fi
}

# View logs
view_logs() {
  log_info "Viewing migration logs in namespace: $NAMESPACE"

  if kubectl get job "$JOB_NAME" -n "$NAMESPACE" &> /dev/null; then
    kubectl logs job/"$JOB_NAME" -n "$NAMESPACE" --all-containers=true --tail=100
  else
    log_error "No migration job found"
    exit 1
  fi
}

# Cleanup completed jobs
cleanup_jobs() {
  log_info "Cleaning up completed migration jobs in namespace: $NAMESPACE"

  # Delete migration job
  if kubectl get job "$JOB_NAME" -n "$NAMESPACE" &> /dev/null; then
    kubectl delete job "$JOB_NAME" -n "$NAMESPACE"
    log_success "Deleted migration job"
  fi

  # Delete rollback job
  if kubectl get job "$ROLLBACK_JOB_NAME" -n "$NAMESPACE" &> /dev/null; then
    kubectl delete job "$ROLLBACK_JOB_NAME" -n "$NAMESPACE"
    log_success "Deleted rollback job"
  fi

  log_success "Cleanup complete"
}

# Main script
main() {
  parse_args "$@"

  case "$COMMAND" in
    migrate)
      verify_prerequisites
      run_migrations
      ;;
    rollback)
      verify_prerequisites
      run_rollback
      ;;
    status)
      show_status
      ;;
    logs)
      view_logs
      ;;
    cleanup)
      cleanup_jobs
      ;;
    verify)
      verify_prerequisites
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
