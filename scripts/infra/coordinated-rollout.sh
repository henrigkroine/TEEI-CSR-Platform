#!/usr/bin/env bash
# Regional Coordinated Rollout Script
# Performs phased rollouts across multiple regions with validation

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLLOUT_TIMEOUT=${ROLLOUT_TIMEOUT:-1800}  # 30 minutes
ANALYSIS_WAIT=${ANALYSIS_WAIT:-300}       # 5 minutes between regions
NOTIFICATION_WEBHOOK=${NOTIFICATION_WEBHOOK:-""}

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

    if [[ -n "$NOTIFICATION_WEBHOOK" ]]; then
        local color="good"
        [[ "$status" == "error" ]] && color="danger"
        [[ "$status" == "warning" ]] && color="warning"

        curl -X POST "$NOTIFICATION_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{\"text\":\"$message\",\"color\":\"$color\"}" \
            --silent --output /dev/null || true
    fi
}

# Get rollout status
get_rollout_status() {
    local rollout_name="$1"
    local namespace="${2:-default}"
    local context="$3"

    kubectl --context="$context" get rollout "$rollout_name" \
        -n "$namespace" \
        -o jsonpath='{.status.phase}' 2>/dev/null || echo "Unknown"
}

# Wait for rollout to complete
wait_for_rollout() {
    local rollout_name="$1"
    local namespace="${2:-default}"
    local context="$3"
    local timeout="${4:-$ROLLOUT_TIMEOUT}"

    log_info "Waiting for rollout $rollout_name in context $context..."

    if kubectl --context="$context" argo rollouts wait "$rollout_name" \
        -n "$namespace" \
        --timeout="${timeout}s" 2>&1; then
        log_success "Rollout $rollout_name completed successfully"
        return 0
    else
        log_error "Rollout $rollout_name failed or timed out"
        return 1
    fi
}

# Check analysis results
check_analysis_status() {
    local rollout_name="$1"
    local namespace="${2:-default}"
    local context="$3"

    local analysis_status
    analysis_status=$(kubectl --context="$context" get analysisrun \
        -n "$namespace" \
        -l rollout="$rollout_name" \
        --sort-by=.metadata.creationTimestamp \
        -o jsonpath='{.items[-1].status.phase}' 2>/dev/null || echo "Unknown")

    if [[ "$analysis_status" == "Successful" ]]; then
        log_success "Analysis passed for $rollout_name in $context"
        return 0
    elif [[ "$analysis_status" == "Failed" ]]; then
        log_error "Analysis failed for $rollout_name in $context"
        return 1
    else
        log_warning "Analysis status unknown for $rollout_name: $analysis_status"
        return 2
    fi
}

# Promote rollout (manual approval)
promote_rollout() {
    local rollout_name="$1"
    local namespace="${2:-default}"
    local context="$3"

    log_info "Promoting rollout $rollout_name in context $context..."

    if kubectl --context="$context" argo rollouts promote "$rollout_name" \
        -n "$namespace"; then
        log_success "Rollout $rollout_name promoted"
        return 0
    else
        log_error "Failed to promote rollout $rollout_name"
        return 1
    fi
}

# Abort rollout
abort_rollout() {
    local rollout_name="$1"
    local namespace="${2:-default}"
    local context="$3"
    local reason="${4:-Manual abort}"

    log_warning "Aborting rollout $rollout_name in context $context: $reason"

    kubectl --context="$context" argo rollouts abort "$rollout_name" \
        -n "$namespace" || true

    send_notification "Rollout ABORTED: $rollout_name in $context - $reason" "error"
}

# Execute rollout in single region
execute_region_rollout() {
    local rollout_name="$1"
    local namespace="${2:-default}"
    local context="$3"
    local region="$4"
    local image_tag="$5"

    log_info "===================================================="
    log_info "Starting rollout in region: $region"
    log_info "Rollout: $rollout_name"
    log_info "Namespace: $namespace"
    log_info "Context: $context"
    log_info "Image tag: $image_tag"
    log_info "===================================================="

    send_notification "Starting rollout: $rollout_name in $region (tag: $image_tag)" "info"

    # Update image tag
    log_info "Updating image tag to $image_tag..."
    kubectl --context="$context" argo rollouts set image "$rollout_name" \
        "*=$image_tag" \
        -n "$namespace"

    # Wait for rollout to progress
    sleep 10

    # Get rollout status
    local status
    status=$(get_rollout_status "$rollout_name" "$namespace" "$context")
    log_info "Rollout status: $status"

    # Wait for rollout to complete (or pause for manual approval)
    if wait_for_rollout "$rollout_name" "$namespace" "$context"; then
        log_success "Rollout completed in $region"

        # Check analysis results
        sleep 5
        if check_analysis_status "$rollout_name" "$namespace" "$context"; then
            send_notification "Rollout SUCCESS: $rollout_name in $region" "success"
            return 0
        else
            log_error "Analysis failed in $region"
            send_notification "Rollout FAILED (analysis): $rollout_name in $region" "error"
            return 1
        fi
    else
        log_error "Rollout failed in $region"
        send_notification "Rollout FAILED: $rollout_name in $region" "error"
        return 1
    fi
}

# Main coordinated rollout function
coordinated_rollout() {
    local rollout_name="$1"
    local namespace="${2:-default}"
    local image_tag="$3"
    local rollout_order="${4:-us-west,us-east,eu-west,eu-central}"

    log_info "Starting coordinated multi-region rollout"
    log_info "Rollout: $rollout_name"
    log_info "Image tag: $image_tag"
    log_info "Rollout order: $rollout_order"

    # Parse rollout order (comma-separated: region1:context1,region2:context2)
    IFS=',' read -ra REGIONS <<< "$rollout_order"

    local failed_regions=()

    for region_spec in "${REGIONS[@]}"; do
        # Parse region:context
        local region="${region_spec%%:*}"
        local context="${region_spec#*:}"

        # If no context specified, use region as context
        [[ "$context" == "$region" ]] && context="k8s-$region"

        log_info "Processing region: $region (context: $context)"

        # Execute rollout in region
        if execute_region_rollout "$rollout_name" "$namespace" "$context" "$region" "$image_tag"; then
            log_success "Region $region completed successfully"

            # Wait before next region (analysis window)
            if [[ "$region" != "${REGIONS[-1]}" ]]; then
                log_info "Waiting $ANALYSIS_WAIT seconds before next region..."
                sleep "$ANALYSIS_WAIT"
            fi
        else
            log_error "Region $region failed"
            failed_regions+=("$region")

            # Ask for continuation
            read -p "Continue to next region? (y/N): " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                log_warning "Rollout halted by user"
                break
            fi
        fi
    done

    # Summary
    log_info "===================================================="
    log_info "Rollout Summary"
    log_info "===================================================="
    log_info "Total regions: ${#REGIONS[@]}"
    log_info "Failed regions: ${#failed_regions[@]}"

    if [[ ${#failed_regions[@]} -eq 0 ]]; then
        log_success "All regions deployed successfully!"
        send_notification "Multi-region rollout COMPLETED: $rollout_name" "success"
        return 0
    else
        log_error "Failed regions: ${failed_regions[*]}"
        send_notification "Multi-region rollout PARTIAL: $rollout_name (failed: ${failed_regions[*]})" "warning"
        return 1
    fi
}

# Usage information
usage() {
    cat <<EOF
Usage: $0 [OPTIONS] ROLLOUT_NAME IMAGE_TAG

Performs coordinated multi-region rollout with validation.

OPTIONS:
    -n, --namespace NAMESPACE      Kubernetes namespace (default: default)
    -o, --order REGION_ORDER       Rollout order (default: us-west,us-east,eu-west,eu-central)
                                   Format: region1:context1,region2:context2
    -w, --webhook URL              Notification webhook URL (Slack/Discord)
    -t, --timeout SECONDS          Rollout timeout per region (default: 1800)
    -a, --analysis-wait SECONDS    Wait time between regions (default: 300)
    -h, --help                     Show this help message

EXAMPLES:
    # Deploy API Gateway to all regions
    $0 teei-api-gateway ghcr.io/henrigkroine/teei-api-gateway:v1.2.3

    # Deploy with custom order
    $0 -o eu-west:prod-eu,us-west:prod-us teei-reporting ghcr.io/henrigkroine/teei-reporting:v2.0.0

    # Deploy with notifications
    $0 -w https://hooks.slack.com/services/XXX teei-q2q-ai ghcr.io/henrigkroine/teei-q2q-ai:v1.5.0

EOF
}

# Parse arguments
NAMESPACE="default"
ROLLOUT_ORDER="us-west,us-east,eu-west,eu-central"

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -o|--order)
            ROLLOUT_ORDER="$2"
            shift 2
            ;;
        -w|--webhook)
            NOTIFICATION_WEBHOOK="$2"
            shift 2
            ;;
        -t|--timeout)
            ROLLOUT_TIMEOUT="$2"
            shift 2
            ;;
        -a|--analysis-wait)
            ANALYSIS_WAIT="$2"
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
IMAGE_TAG="$2"

# Execute coordinated rollout
coordinated_rollout "$ROLLOUT_NAME" "$NAMESPACE" "$IMAGE_TAG" "$ROLLOUT_ORDER"
