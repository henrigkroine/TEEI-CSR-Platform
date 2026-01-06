#!/bin/bash

# ClickHouse Multi-Region Deployment Script
# TEEI CSR Platform - Automated deployment and verification

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_BASE_DIR="${SCRIPT_DIR}/../../k8s/base/clickhouse"
NAMESPACE="teei-platform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*"
}

# ============================================================================
# STEP 1: Pre-deployment checks
# ============================================================================

check_prerequisites() {
    log "Checking prerequisites..."

    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    # Check kustomize
    if ! command -v kustomize &> /dev/null; then
        log_warn "kustomize not found. Using kubectl apply -k instead."
    fi

    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster."
        exit 1
    fi

    log "Prerequisites check passed ✓"
}

# ============================================================================
# STEP 2: Create namespace
# ============================================================================

create_namespace() {
    log "Creating namespace: ${NAMESPACE}..."

    if kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        log_warn "Namespace ${NAMESPACE} already exists, skipping creation."
    else
        kubectl create namespace "${NAMESPACE}"
        log "Namespace created ✓"
    fi
}

# ============================================================================
# STEP 3: Deploy ZooKeeper (if not exists)
# ============================================================================

deploy_zookeeper() {
    log "Checking ZooKeeper deployment..."

    if kubectl get statefulset zookeeper -n "${NAMESPACE}" &> /dev/null; then
        log "ZooKeeper already deployed ✓"
    else
        log_warn "ZooKeeper not found. Please deploy ZooKeeper first:"
        log_warn "  kubectl apply -f ${SCRIPT_DIR}/../../k8s/base/observability/zookeeper/"
        read -p "Continue without ZooKeeper? (y/N) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# ============================================================================
# STEP 4: Deploy ClickHouse
# ============================================================================

deploy_clickhouse() {
    log "Deploying ClickHouse clusters..."

    # Apply Kustomize configuration
    kubectl apply -k "${K8S_BASE_DIR}"

    log "ClickHouse manifests applied ✓"
}

# ============================================================================
# STEP 5: Wait for pods to be ready
# ============================================================================

wait_for_pods() {
    log "Waiting for ClickHouse pods to be ready (timeout: 5 minutes)..."

    if kubectl wait --for=condition=ready pod \
        -l app=clickhouse \
        -n "${NAMESPACE}" \
        --timeout=300s; then
        log "All ClickHouse pods are ready ✓"
    else
        log_error "Timeout waiting for pods. Check pod status:"
        kubectl get pods -n "${NAMESPACE}" -l app=clickhouse
        exit 1
    fi
}

# ============================================================================
# STEP 6: Initialize tables
# ============================================================================

initialize_tables() {
    log "Initializing ClickHouse tables..."

    local pod_name="clickhouse-us-0"

    # Check if pod exists
    if ! kubectl get pod "${pod_name}" -n "${NAMESPACE}" &> /dev/null; then
        log_error "Pod ${pod_name} not found."
        exit 1
    fi

    # Create tables
    log "Creating tables (this may take a few minutes)..."
    kubectl exec -i "${pod_name}" -n "${NAMESPACE}" -- clickhouse-client \
        < "${SCRIPT_DIR}/clickhouse-tables.sql" || {
        log_error "Failed to create tables. Check ClickHouse logs."
        exit 1
    }

    log "Tables created ✓"

    # Apply TTL policies
    log "Applying TTL policies..."
    kubectl exec -i "${pod_name}" -n "${NAMESPACE}" -- clickhouse-client \
        < "${SCRIPT_DIR}/clickhouse-ttl.sql" || {
        log_error "Failed to apply TTL policies."
        exit 1
    }

    log "TTL policies applied ✓"
}

# ============================================================================
# STEP 7: Verify deployment
# ============================================================================

verify_deployment() {
    log "Verifying ClickHouse deployment..."

    local pod_name="clickhouse-us-0"

    # Check cluster configuration
    log "Checking cluster configuration..."
    kubectl exec -i "${pod_name}" -n "${NAMESPACE}" -- clickhouse-client --query "
SELECT cluster, count() AS shard_count
FROM system.clusters
WHERE cluster LIKE 'teei%'
GROUP BY cluster
ORDER BY cluster;
" || {
        log_error "Failed to query cluster configuration."
        exit 1
    }

    # Check replication status
    log "Checking replication status..."
    kubectl exec -i "${pod_name}" -n "${NAMESPACE}" -- clickhouse-client --query "
SELECT
    database,
    table,
    is_leader,
    absolute_delay,
    queue_size
FROM system.replicas
WHERE database = 'default'
ORDER BY table;
" || log_warn "No replicated tables found yet (expected on first deploy)."

    # Check disk usage
    log "Checking disk usage..."
    kubectl exec -i "${pod_name}" -n "${NAMESPACE}" -- clickhouse-client --query "
SELECT
    name,
    path,
    formatReadableSize(total_space) AS total,
    formatReadableSize(free_space) AS free,
    round(free_space / total_space * 100, 2) AS free_percent
FROM system.disks;
"

    log "Verification complete ✓"
}

# ============================================================================
# STEP 8: Display access information
# ============================================================================

display_access_info() {
    log "ClickHouse deployment complete!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Access Information"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  US Cluster:"
    echo "    kubectl exec -it clickhouse-us-0 -n ${NAMESPACE} -- clickhouse-client"
    echo ""
    echo "  EU Cluster:"
    echo "    kubectl exec -it clickhouse-eu-0 -n ${NAMESPACE} -- clickhouse-client"
    echo ""
    echo "  HTTP Interface (port-forward):"
    echo "    kubectl port-forward svc/clickhouse-us-lb 8123:8123 -n ${NAMESPACE}"
    echo "    curl http://localhost:8123/ping"
    echo ""
    echo "  Native Protocol (port-forward):"
    echo "    kubectl port-forward svc/clickhouse-us-lb 9000:9000 -n ${NAMESPACE}"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Next Steps"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  1. Configure backup (edit clickhouse-backup-config.yaml)"
    echo "  2. Set up Grafana dashboard (import clickhouse-replication.json)"
    echo "  3. Configure Prometheus alerts"
    echo "  4. Review documentation: docs/ClickHouse_Replication.md"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ============================================================================
# Main execution
# ============================================================================

main() {
    echo ""
    log "Starting ClickHouse Multi-Region Deployment"
    echo ""

    check_prerequisites
    create_namespace
    deploy_zookeeper
    deploy_clickhouse
    wait_for_pods
    initialize_tables
    verify_deployment
    display_access_info
}

# Parse command line arguments
if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
    cat <<EOF
Usage: $0 [options]

Deploys ClickHouse multi-region cluster with sharding and replication.

Options:
    --help, -h          Show this help message
    --skip-init         Skip table initialization (deploy only)
    --verify-only       Only verify existing deployment

Environment Variables:
    NAMESPACE           Kubernetes namespace (default: teei-platform)

Examples:
    # Full deployment
    $0

    # Deploy without initializing tables
    $0 --skip-init

    # Verify existing deployment
    $0 --verify-only

EOF
    exit 0
fi

if [[ "${1:-}" == "--verify-only" ]]; then
    check_prerequisites
    verify_deployment
    exit 0
fi

if [[ "${1:-}" == "--skip-init" ]]; then
    main_without_init() {
        check_prerequisites
        create_namespace
        deploy_zookeeper
        deploy_clickhouse
        wait_for_pods
        display_access_info
    }
    main_without_init
    exit 0
fi

# Run full deployment
main
