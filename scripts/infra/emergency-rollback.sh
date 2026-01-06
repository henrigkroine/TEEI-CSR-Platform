#!/usr/bin/env bash
# Emergency Rollback Script
# Instantly rollback to stable version with data preservation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLLBACK_TIMEOUT=${ROLLBACK_TIMEOUT:-300}  # 5 minutes
NOTIFICATION_WEBHOOK=${NOTIFICATION_WEBHOOK:-""}
DATA_CAPTURE_DIR=${DATA_CAPTURE_DIR:-"/tmp/rollback-data"}

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $*"
}

# Send notification (Slack/Discord)
send_notification() {
    local message="$1"
    local status="${2:-info}"
    local urgency="${3:-normal}"

    if [[ -n "$NOTIFICATION_WEBHOOK" ]]; then
        local color="good"
        [[ "$status" == "error" ]] && color="danger"
        [[ "$status" == "warning" ]] && color="warning"

        local prefix=""
        [[ "$urgency" == "critical" ]] && prefix="🚨 CRITICAL: "

        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"${prefix}${message}\",\"color\":\"$color\"}" \
            --silent --output /dev/null || true
    fi
}

# Create data capture directory
create_capture_dir() {
    local rollout_name="$1"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)

    local capture_dir="$DATA_CAPTURE_DIR/${rollout_name}_${timestamp}"
    mkdir -p "$capture_dir"

    echo "$capture_dir"
}

# Capture rollout state before rollback
capture_rollout_state() {
    local rollout_name="$1"
    local namespace="$2"
    local context="$3"
    local capture_dir="$4"

    log_info "Capturing rollout state for post-mortem analysis..."

    # Capture rollout status
    kubectl --context="$context" get rollout "$rollout_name" \
        -n "$namespace" -o yaml > "$capture_dir/rollout.yaml" 2>&1 || true

    # Capture analysis runs
    kubectl --context="$context" get analysisrun \
        -n "$namespace" -l rollout="$rollout_name" \
        -o yaml > "$capture_dir/analysis-runs.yaml" 2>&1 || true

    # Capture ReplicaSets
    kubectl --context="$context" get replicasets \
        -n "$namespace" -l app="$rollout_name" \
        -o yaml > "$capture_dir/replicasets.yaml" 2>&1 || true

    # Capture pods
    kubectl --context="$context" get pods \
        -n "$namespace" -l app="$rollout_name" \
        -o yaml > "$capture_dir/pods.yaml" 2>&1 || true

    # Capture events
    kubectl --context="$context" get events \
        -n "$namespace" --field-selector involvedObject.name="$rollout_name" \
        -o yaml > "$capture_dir/events.yaml" 2>&1 || true

    log_success "State captured to: $capture_dir"
}

# Capture pod logs before rollback
capture_pod_logs() {
    local rollout_name="$1"
    local namespace="$2"
    local context="$3"
    local capture_dir="$4"

    log_info "Capturing pod logs..."

    local logs_dir="$capture_dir/logs"
    mkdir -p "$logs_dir"

    # Get all pods for this rollout
    local pods
    pods=$(kubectl --context="$context" get pods \
        -n "$namespace" -l app="$rollout_name" \
        -o jsonpath='{.items[*].metadata.name}' 2>/dev/null || echo "")

    if [[ -n "$pods" ]]; then
        for pod in $pods; do
            log_info "Capturing logs from pod: $pod"
            kubectl --context="$context" logs "$pod" \
                -n "$namespace" --all-containers=true \
                > "$logs_dir/${pod}.log" 2>&1 || true

            # Capture previous logs if container restarted
            kubectl --context="$context" logs "$pod" \
                -n "$namespace" --all-containers=true --previous \
                > "$logs_dir/${pod}_previous.log" 2>&1 || true
        done

        log_success "Logs captured to: $logs_dir"
    else
        log_warning "No pods found for rollout: $rollout_name"
    fi
}

# Capture metrics snapshot
capture_metrics() {
    local rollout_name="$1"
    local capture_dir="$2"

    log_info "Capturing metrics snapshot..."

    # Query Prometheus for key metrics (requires promtool or curl)
    local prometheus_url="${PROMETHEUS_URL:-http://prometheus-server.monitoring.svc.cluster.local:9090}"
    local metrics_file="$capture_dir/metrics.txt"

    {
        echo "=== Error Rate ==="
        curl -s "${prometheus_url}/api/v1/query?query=sum(rate(http_requests_total{service=\"${rollout_name}\",status=~\"5..\"}[5m]))" || true

        echo ""
        echo "=== Latency p95 ==="
        curl -s "${prometheus_url}/api/v1/query?query=histogram_quantile(0.95,sum(rate(http_request_duration_ms_bucket{service=\"${rollout_name}\"}[5m]))by(le))" || true

        echo ""
        echo "=== Success Rate ==="
        curl -s "${prometheus_url}/api/v1/query?query=sum(rate(http_requests_total{service=\"${rollout_name}\",status=~\"2..\"}[5m]))" || true
    } > "$metrics_file" 2>&1 || true

    log_info "Metrics snapshot saved to: $metrics_file"
}

# Perform immediate rollback
execute_rollback() {
    local rollout_name="$1"
    local namespace="$2"
    local context="$3"
    local reason="${4:-Emergency rollback}"

    log_warning "===================================================="
    log_warning "INITIATING EMERGENCY ROLLBACK"
    log_warning "Rollout: $rollout_name"
    log_warning "Namespace: $namespace"
    log_warning "Context: $context"
    log_warning "Reason: $reason"
    log_warning "===================================================="

    send_notification "EMERGENCY ROLLBACK: $rollout_name in $context - $reason" "error" "critical"

    # Abort current rollout
    log_info "Aborting current rollout..."
    kubectl --context="$context" argo rollouts abort "$rollout_name" \
        -n "$namespace" || true

    sleep 2

    # Undo rollout (revert to stable)
    log_info "Reverting to stable version..."
    if kubectl --context="$context" argo rollouts undo "$rollout_name" \
        -n "$namespace"; then
        log_success "Rollback initiated"
    else
        log_error "Failed to initiate rollback"
        return 1
    fi

    # Wait for rollback to complete
    log_info "Waiting for rollback to complete (timeout: ${ROLLBACK_TIMEOUT}s)..."
    local start_time
    start_time=$(date +%s)

    while true; do
        local status
        status=$(kubectl --context="$context" get rollout "$rollout_name" \
            -n "$namespace" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")

        if [[ "$status" == "Healthy" ]]; then
            log_success "Rollback completed - service is healthy"
            send_notification "Rollback SUCCESSFUL: $rollout_name in $context" "success" "critical"
            return 0
        fi

        local elapsed
        elapsed=$(($(date +%s) - start_time))
        if [[ $elapsed -gt $ROLLBACK_TIMEOUT ]]; then
            log_error "Rollback timeout exceeded"
            send_notification "Rollback TIMEOUT: $rollout_name in $context" "error" "critical"
            return 1
        fi

        log_info "Rollback status: $status (${elapsed}s elapsed)"
        sleep 5
    done
}

# Verify service health after rollback
verify_service_health() {
    local rollout_name="$1"
    local namespace="$2"
    local context="$3"

    log_info "Verifying service health..."

    # Check rollout status
    local status
    status=$(kubectl --context="$context" get rollout "$rollout_name" \
        -n "$namespace" -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown")

    if [[ "$status" != "Healthy" ]]; then
        log_error "Service is not healthy: $status"
        return 1
    fi

    # Check pods
    local ready_pods
    ready_pods=$(kubectl --context="$context" get pods \
        -n "$namespace" -l app="$rollout_name" \
        -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Ready")].status}{"\n"}{end}' \
        2>/dev/null | grep -c "True" || echo "0")

    local total_pods
    total_pods=$(kubectl --context="$context" get pods \
        -n "$namespace" -l app="$rollout_name" \
        --no-headers 2>/dev/null | wc -l || echo "0")

    log_info "Ready pods: $ready_pods/$total_pods"

    if [[ $ready_pods -eq 0 ]]; then
        log_error "No pods are ready"
        return 1
    fi

    log_success "Service health verified"
    return 0
}

# Multi-region emergency rollback
multi_region_rollback() {
    local rollout_name="$1"
    local namespace="$2"
    local reason="$3"
    local regions="${4:-us-west,us-east,eu-west,eu-central}"

    log_warning "Starting multi-region emergency rollback"

    IFS=',' read -ra REGIONS <<< "$regions"

    local failed_regions=()

    for region_spec in "${REGIONS[@]}"; do
        local region="${region_spec%%:*}"
        local context="${region_spec#*:}"

        [[ "$context" == "$region" ]] && context="k8s-$region"

        log_info "Rolling back region: $region (context: $context)"

        # Create capture directory
        local capture_dir
        capture_dir=$(create_capture_dir "${rollout_name}-${region}")

        # Capture state and logs
        capture_rollout_state "$rollout_name" "$namespace" "$context" "$capture_dir"
        capture_pod_logs "$rollout_name" "$namespace" "$context" "$capture_dir"
        capture_metrics "$rollout_name" "$capture_dir"

        # Execute rollback
        if execute_rollback "$rollout_name" "$namespace" "$context" "$reason"; then
            # Verify health
            if verify_service_health "$rollout_name" "$namespace" "$context"; then
                log_success "Region $region rolled back successfully"
            else
                log_error "Region $region rollback health check failed"
                failed_regions+=("$region")
            fi
        else
            log_error "Region $region rollback failed"
            failed_regions+=("$region")
        fi

        # Small delay between regions
        sleep 2
    done

    # Summary
    log_info "===================================================="
    log_info "Rollback Summary"
    log_info "===================================================="
    log_info "Total regions: ${#REGIONS[@]}"
    log_info "Failed regions: ${#failed_regions[@]}"
    log_info "Data captured to: $DATA_CAPTURE_DIR"

    if [[ ${#failed_regions[@]} -eq 0 ]]; then
        log_success "All regions rolled back successfully"
        return 0
    else
        log_error "Failed regions: ${failed_regions[*]}"
        return 1
    fi
}

# Usage information
usage() {
    cat <<EOF
Usage: $0 [OPTIONS] ROLLOUT_NAME REASON

Performs emergency rollback across one or more regions.

OPTIONS:
    -n, --namespace NAMESPACE      Kubernetes namespace (default: default)
    -c, --context CONTEXT          Single context (default: multi-region)
    -r, --regions REGIONS          Regions to rollback (default: us-west,us-east,eu-west,eu-central)
                                   Format: region1:context1,region2:context2
    -w, --webhook URL              Notification webhook URL (Slack/Discord)
    -d, --data-dir DIR             Data capture directory (default: /tmp/rollback-data)
    -h, --help                     Show this help message

EXAMPLES:
    # Rollback single region
    $0 -c prod-us-west teei-api-gateway "High error rate detected"

    # Rollback all regions
    $0 teei-q2q-ai "Model inference errors"

    # Rollback with notifications
    $0 -w https://hooks.slack.com/services/XXX teei-reporting "GDPR violation"

EOF
}

# Parse arguments
NAMESPACE="default"
CONTEXT=""
REGIONS="us-west,us-east,eu-west,eu-central"

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -c|--context)
            CONTEXT="$2"
            shift 2
            ;;
        -r|--regions)
            REGIONS="$2"
            shift 2
            ;;
        -w|--webhook)
            NOTIFICATION_WEBHOOK="$2"
            shift 2
            ;;
        -d|--data-dir)
            DATA_CAPTURE_DIR="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            break
            ;;
    esac
done

# Validate arguments
if [[ $# -lt 2 ]]; then
    log_error "Missing required arguments"
    usage
    exit 1
fi

ROLLOUT_NAME="$1"
REASON="$2"

# Execute rollback
if [[ -n "$CONTEXT" ]]; then
    # Single region rollback
    capture_dir=$(create_capture_dir "$ROLLOUT_NAME")
    capture_rollout_state "$ROLLOUT_NAME" "$NAMESPACE" "$CONTEXT" "$capture_dir"
    capture_pod_logs "$ROLLOUT_NAME" "$NAMESPACE" "$CONTEXT" "$capture_dir"
    capture_metrics "$ROLLOUT_NAME" "$capture_dir"
    execute_rollback "$ROLLOUT_NAME" "$NAMESPACE" "$CONTEXT" "$REASON"
    verify_service_health "$ROLLOUT_NAME" "$NAMESPACE" "$CONTEXT"
else
    # Multi-region rollback
    multi_region_rollback "$ROLLOUT_NAME" "$NAMESPACE" "$REASON" "$REGIONS"
fi
