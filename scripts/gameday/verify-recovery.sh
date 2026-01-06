#!/bin/bash
################################################################################
# verify-recovery.sh
#
# Comprehensive health checks and verification after regional failover.
# Tests database, ClickHouse, NATS, application APIs, and end-to-end flows.
#
# Usage:
#   ./verify-recovery.sh --region eu-central-1
#   ./verify-recovery.sh --quick  # Fast health checks only
#   ./verify-recovery.sh --full   # Complete verification suite
#
# Author: backup-restore-auditor
# Version: 1.0
# Date: 2025-11-15
################################################################################

set -euo pipefail

# Configuration
REGION="${REGION:-eu-central-1}"
MODE="${MODE:-quick}"
EVIDENCE_DIR="/home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${EVIDENCE_DIR}/verification.log"

# Test endpoints (adjust to your actual endpoints)
API_BASE_URL="${API_BASE_URL:-https://api.teei.example.com}"
COCKPIT_URL="${COCKPIT_URL:-https://cockpit.teei.example.com}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Test results tracking
declare -A TEST_RESULTS
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_SKIPPED=0

################################################################################
# Helper Functions
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*" | tee -a "$LOG_FILE"
}

test_passed() {
    local test_name="$1"
    TEST_RESULTS["$test_name"]="PASS"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    log "✓ PASS: $test_name"
}

test_failed() {
    local test_name="$1"
    local reason="${2:-Unknown failure}"
    TEST_RESULTS["$test_name"]="FAIL"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    error "✗ FAIL: $test_name - $reason"
}

test_skipped() {
    local test_name="$1"
    TEST_RESULTS["$test_name"]="SKIP"
    TESTS_SKIPPED=$((TESTS_SKIPPED + 1))
    warn "⊘ SKIP: $test_name"
}

show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Verify system health and functionality after regional failover.

Options:
    --region REGION         Target region to verify (default: eu-central-1)
    --quick                 Quick health checks only (< 30 seconds)
    --full                  Full verification suite (1-2 minutes)
    --help                  Show this help message

Examples:
    # Quick health check
    $0 --region eu-central-1 --quick

    # Full verification
    $0 --region eu-central-1 --full

Environment Variables:
    API_BASE_URL            API endpoint to test (default: https://api.teei.example.com)
    TEST_TOKEN              Bearer token for API authentication
EOF
}

################################################################################
# Kubernetes Context Helpers
################################################################################

get_context_for_region() {
    local region="$1"
    if [[ "$region" == "us-east-1" ]]; then
        echo "prod-us-east-1"
    elif [[ "$region" == "eu-central-1" ]]; then
        echo "prod-eu-central-1"
    else
        error "Unknown region: $region"
        exit 1
    fi
}

get_namespace_for_region() {
    local region="$1"
    if [[ "$region" == "us-east-1" ]]; then
        echo "teei-prod-us"
    elif [[ "$region" == "eu-central-1" ]]; then
        echo "teei-prod-eu"
    else
        error "Unknown region: $region"
        exit 1
    fi
}

################################################################################
# Infrastructure Health Checks
################################################################################

check_kubernetes_nodes() {
    local test_name="Kubernetes Nodes"
    local ctx=$(get_context_for_region "$REGION")

    info "Checking Kubernetes nodes in $REGION..."

    local ready_nodes=$(kubectl --context "$ctx" get nodes --no-headers 2>/dev/null | grep -c " Ready" || echo "0")
    local total_nodes=$(kubectl --context "$ctx" get nodes --no-headers 2>/dev/null | wc -l || echo "0")

    if [[ $ready_nodes -ge 2 && $ready_nodes -eq $total_nodes ]]; then
        test_passed "$test_name ($ready_nodes/$total_nodes Ready)"
    else
        test_failed "$test_name" "Only $ready_nodes/$total_nodes nodes Ready"
    fi
}

check_pod_health() {
    local test_name="Pod Health"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Checking pod health in $REGION..."

    local running_pods=$(kubectl --context "$ctx" get pods -n "$ns" --no-headers 2>/dev/null | grep -c "Running" || echo "0")
    local total_pods=$(kubectl --context "$ctx" get pods -n "$ns" --no-headers 2>/dev/null | wc -l || echo "0")
    local crashloop_pods=$(kubectl --context "$ctx" get pods -n "$ns" --no-headers 2>/dev/null | grep -c "CrashLoopBackOff" || echo "0")

    if [[ $running_pods -ge 5 && $crashloop_pods -eq 0 ]]; then
        test_passed "$test_name ($running_pods/$total_pods Running, 0 CrashLoop)"
    else
        test_failed "$test_name" "$running_pods/$total_pods Running, $crashloop_pods in CrashLoop"
    fi

    # Save pod details
    kubectl --context "$ctx" get pods -n "$ns" -o wide > "${EVIDENCE_DIR}/pods-status.txt" 2>/dev/null || true
}

################################################################################
# Database Health Checks
################################################################################

check_postgres_primary() {
    local test_name="PostgreSQL Primary Status"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Checking PostgreSQL primary status..."

    local is_recovery=$(kubectl --context "$ctx" exec -it postgres-primary-0 -n "$ns" -- \
        psql -U postgres -t -c "SELECT pg_is_in_recovery();" 2>/dev/null | tr -d ' \r\n' || echo "unknown")

    if [[ "$is_recovery" == "f" ]]; then
        test_passed "$test_name (Primary mode)"
    elif [[ "$is_recovery" == "t" ]]; then
        test_failed "$test_name" "Still in recovery (standby) mode"
    else
        test_failed "$test_name" "Cannot determine recovery status"
    fi
}

check_postgres_write() {
    local test_name="PostgreSQL Write Capability"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Testing PostgreSQL write capability..."

    # Attempt to insert test row
    local write_result=$(kubectl --context "$ctx" exec -it postgres-primary-0 -n "$ns" -- \
        psql -U postgres -d teei -t -c "INSERT INTO dr_test_writes (test_data) VALUES ('Verification test $(date +%s)') RETURNING id;" 2>&1 || echo "FAILED")

    if [[ "$write_result" != "FAILED" && "$write_result" =~ [0-9]+ ]]; then
        test_passed "$test_name"
    else
        test_failed "$test_name" "Write operation failed: $write_result"
    fi
}

check_postgres_connections() {
    local test_name="PostgreSQL Connection Count"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Checking PostgreSQL active connections..."

    local active_conns=$(kubectl --context "$ctx" exec -it postgres-primary-0 -n "$ns" -- \
        psql -U postgres -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' \r\n' || echo "0")

    if [[ $active_conns -ge 1 && $active_conns -le 100 ]]; then
        test_passed "$test_name ($active_conns active connections)"
    elif [[ $active_conns -gt 100 ]]; then
        test_failed "$test_name" "Too many connections: $active_conns (may indicate connection leak)"
    else
        test_failed "$test_name" "No active connections (unexpected)"
    fi
}

################################################################################
# ClickHouse Health Checks
################################################################################

check_clickhouse_query() {
    local test_name="ClickHouse Query Capability"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Testing ClickHouse query capability..."

    local event_count=$(kubectl --context "$ctx" exec -it clickhouse-0 -n "$ns" -- \
        clickhouse-client --query "SELECT count(*) FROM analytics.events_distributed WHERE timestamp > now() - INTERVAL 1 HOUR;" 2>/dev/null | tr -d '\r\n' || echo "FAILED")

    if [[ "$event_count" =~ ^[0-9]+$ ]]; then
        test_passed "$test_name ($event_count events in last hour)"
    else
        test_failed "$test_name" "Query failed or returned invalid result: $event_count"
    fi
}

check_clickhouse_insert() {
    local test_name="ClickHouse Insert Capability"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Testing ClickHouse insert capability..."

    local insert_result=$(kubectl --context "$ctx" exec -it clickhouse-0 -n "$ns" -- \
        clickhouse-client --query "INSERT INTO analytics.events_local (event_id, timestamp, event_type) VALUES (generateUUIDv4(), now(), 'verification_test');" 2>&1 || echo "FAILED")

    if [[ "$insert_result" != "FAILED" ]]; then
        test_passed "$test_name"
    else
        test_failed "$test_name" "Insert failed: $insert_result"
    fi
}

check_clickhouse_cluster() {
    local test_name="ClickHouse Cluster Health"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Checking ClickHouse cluster health..."

    local healthy_shards=$(kubectl --context "$ctx" exec -it clickhouse-0 -n "$ns" -- \
        clickhouse-client --query "SELECT count(*) FROM system.clusters WHERE cluster = 'analytics_cluster' AND errors_count = 0;" 2>/dev/null | tr -d '\r\n' || echo "0")

    if [[ $healthy_shards -ge 3 ]]; then
        test_passed "$test_name ($healthy_shards healthy shards)"
    else
        test_failed "$test_name" "Only $healthy_shards healthy shards (expected >= 3)"
    fi
}

################################################################################
# NATS Health Checks
################################################################################

check_nats_stream() {
    local test_name="NATS Stream Status"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Checking NATS stream status..."

    local stream_state=$(kubectl --context "$ctx" exec -it nats-0 -n "$ns" -- \
        nats --server nats://localhost:4222 --creds /etc/nats/creds/admin.creds \
        stream info CSR_EVENTS_MIRROR --json 2>/dev/null | jq -r '.state.messages' || echo "FAILED")

    if [[ "$stream_state" =~ ^[0-9]+$ ]]; then
        test_passed "$test_name ($stream_state messages)"
    else
        test_failed "$test_name" "Cannot retrieve stream info: $stream_state"
    fi
}

check_nats_publish() {
    local test_name="NATS Publish Capability"
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")

    info "Testing NATS publish capability..."

    local pub_result=$(kubectl --context "$ctx" exec -it nats-0 -n "$ns" -- \
        nats --server nats://localhost:4222 --creds /etc/nats/creds/admin.creds \
        pub csr.events.verification.test "Test message $(date +%s)" 2>&1 || echo "FAILED")

    if [[ "$pub_result" != "FAILED" && "$pub_result" =~ "Published" ]]; then
        test_passed "$test_name"
    else
        test_failed "$test_name" "Publish failed: $pub_result"
    fi
}

################################################################################
# Application API Health Checks
################################################################################

check_api_health_endpoint() {
    local test_name="API Health Endpoint"

    info "Checking API health endpoint at $API_BASE_URL/health..."

    local http_status=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE_URL/health" --max-time 10 || echo "000")

    if [[ "$http_status" == "200" ]]; then
        test_passed "$test_name (HTTP $http_status)"
    else
        test_failed "$test_name" "HTTP $http_status (expected 200)"
    fi
}

check_api_auth_flow() {
    local test_name="API Authentication Flow"

    if [[ -z "${TEST_TOKEN:-}" ]]; then
        test_skipped "$test_name (TEST_TOKEN not set)"
        return
    fi

    info "Testing API authentication..."

    local http_status=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        "$API_BASE_URL/v1/profile" --max-time 10 || echo "000")

    if [[ "$http_status" == "200" ]]; then
        test_passed "$test_name (HTTP $http_status)"
    else
        test_failed "$test_name" "HTTP $http_status (expected 200)"
    fi
}

check_api_database_connectivity() {
    local test_name="API Database Connectivity"

    if [[ -z "${TEST_TOKEN:-}" ]]; then
        test_skipped "$test_name (TEST_TOKEN not set)"
        return
    fi

    info "Testing API database connectivity via /v1/tenants endpoint..."

    local http_status=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        "$API_BASE_URL/v1/tenants" --max-time 10 || echo "000")

    if [[ "$http_status" == "200" ]]; then
        test_passed "$test_name (HTTP $http_status)"
    else
        test_failed "$test_name" "HTTP $http_status (expected 200)"
    fi
}

check_cockpit_accessibility() {
    local test_name="Corporate Cockpit Accessibility"

    info "Checking cockpit accessibility at $COCKPIT_URL..."

    local http_status=$(curl -s -o /dev/null -w "%{http_code}" "$COCKPIT_URL" --max-time 10 || echo "000")

    if [[ "$http_status" == "200" || "$http_status" == "302" ]]; then
        test_passed "$test_name (HTTP $http_status)"
    else
        test_failed "$test_name" "HTTP $http_status (expected 200 or 302)"
    fi
}

################################################################################
# End-to-End Verification
################################################################################

check_end_to_end_write_flow() {
    local test_name="End-to-End Write Flow"

    if [[ -z "${TEST_TOKEN:-}" ]]; then
        test_skipped "$test_name (TEST_TOKEN not set)"
        return
    fi

    info "Testing end-to-end write flow (create event via API)..."

    local response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
        -X POST "$API_BASE_URL/events" \
        -H "Authorization: Bearer $TEST_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"event_type\":\"verification_test\",\"timestamp\":\"$(date -Iseconds)\"}" \
        --max-time 10 || echo "FAILED")

    local http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)

    if [[ "$http_status" == "201" || "$http_status" == "200" ]]; then
        test_passed "$test_name (HTTP $http_status)"
    else
        test_failed "$test_name" "HTTP $http_status (expected 201 or 200)"
    fi
}

################################################################################
# DNS Verification
################################################################################

check_dns_resolution() {
    local test_name="DNS Resolution"

    info "Verifying DNS resolution for api.teei.example.com..."

    local resolved_ip=$(dig +short api.teei.example.com @8.8.8.8 | head -1 || echo "FAILED")

    if [[ "$resolved_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        test_passed "$test_name (resolves to $resolved_ip)"
        echo "api.teei.example.com -> $resolved_ip" > "${EVIDENCE_DIR}/dns-resolution.txt"
    else
        test_failed "$test_name" "Cannot resolve DNS: $resolved_ip"
    fi
}

################################################################################
# Main Execution
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --region)
                REGION="$2"
                shift 2
                ;;
            --quick)
                MODE="quick"
                shift
                ;;
            --full)
                MODE="full"
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
}

run_quick_checks() {
    log "Running QUICK health checks..."

    check_kubernetes_nodes
    check_pod_health
    check_postgres_primary
    check_api_health_endpoint
    check_dns_resolution
}

run_full_checks() {
    log "Running FULL verification suite..."

    # Infrastructure
    check_kubernetes_nodes
    check_pod_health

    # Database
    check_postgres_primary
    check_postgres_write
    check_postgres_connections

    # ClickHouse
    check_clickhouse_query
    check_clickhouse_insert
    check_clickhouse_cluster

    # NATS
    check_nats_stream
    check_nats_publish

    # Application APIs
    check_api_health_endpoint
    check_api_auth_flow
    check_api_database_connectivity
    check_cockpit_accessibility

    # End-to-end
    check_end_to_end_write_flow

    # DNS
    check_dns_resolution
}

generate_report() {
    log "==================================================================="
    log "VERIFICATION SUMMARY"
    log "==================================================================="
    log "Region: $REGION"
    log "Mode: $MODE"
    log "Tests Passed: $TESTS_PASSED"
    log "Tests Failed: $TESTS_FAILED"
    log "Tests Skipped: $TESTS_SKIPPED"
    log "==================================================================="

    # Generate JSON report
    cat > "${EVIDENCE_DIR}/verification-report.json" <<EOF
{
  "region": "$REGION",
  "mode": "$MODE",
  "timestamp": "$(date -Iseconds)",
  "summary": {
    "passed": $TESTS_PASSED,
    "failed": $TESTS_FAILED,
    "skipped": $TESTS_SKIPPED,
    "total": $((TESTS_PASSED + TESTS_FAILED + TESTS_SKIPPED))
  },
  "results": $(
    echo "{"
    for test_name in "${!TEST_RESULTS[@]}"; do
        echo "  \"$test_name\": \"${TEST_RESULTS[$test_name]}\","
    done | sed '$ s/,$//'
    echo "}"
  )
}
EOF

    log "Detailed report saved to: ${EVIDENCE_DIR}/verification-report.json"

    if [[ $TESTS_FAILED -gt 0 ]]; then
        error "Verification FAILED: $TESTS_FAILED test(s) failed"
        return 1
    else
        log "✓ All tests PASSED"
        return 0
    fi
}

main() {
    parse_args "$@"

    mkdir -p "$EVIDENCE_DIR"

    log "==================================================================="
    log "POST-FAILOVER VERIFICATION"
    log "==================================================================="
    log "Region: $REGION"
    log "Mode: $MODE"
    log "Evidence Directory: $EVIDENCE_DIR"
    log "==================================================================="

    if [[ "$MODE" == "quick" ]]; then
        run_quick_checks
    elif [[ "$MODE" == "full" ]]; then
        run_full_checks
    else
        error "Invalid mode: $MODE"
        exit 1
    fi

    generate_report
}

# Run main
main "$@"
