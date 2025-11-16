#!/bin/bash
# TEEI CSR Platform - SLO Gate Check Script
# Ref: AGENTS.md § Phase G - slo-gatekeeper
#
# Purpose: Check if deployment is allowed based on SLO status
# Usage:
#   ./slo-gate.sh check                  - Check if deployment is allowed
#   ./slo-gate.sh override <reason>      - Override gate (requires approval)
#   ./slo-gate.sh status                 - Show current SLO status
#   ./slo-gate.sh report                 - Generate weekly SLO report

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.monitoring.svc.cluster.local:9090}"
SLACK_WEBHOOK="${SLACK_WEBHOOK:-}"
AUDIT_LOG_FILE="${AUDIT_LOG_FILE:-/var/log/slo-gate-audit.log}"
GRAFANA_URL="${GRAFANA_URL:-https://grafana.teei.io}"

# SLO Thresholds
GREEN_THRESHOLD=50    # >50% error budget remaining
YELLOW_THRESHOLD=20   # 20-50% error budget remaining
ORANGE_THRESHOLD=10   # 10-20% error budget remaining
RED_THRESHOLD=0       # <10% or exhausted

# Burn Rate Thresholds
FAST_BURN_THRESHOLD=14.4   # 1h window
SLOW_BURN_THRESHOLD=6      # 6h window

# Colors for output
RED='\033[0;31m'
ORANGE='\033[0;33m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_audit() {
    local event_type="$1"
    shift
    local message="$*"

    echo "[$(date +'%Y-%m-%dT%H:%M:%SZ')] EVENT=$event_type MESSAGE=$message" >> "$AUDIT_LOG_FILE"
}

# Query Prometheus
query_prometheus() {
    local query="$1"
    local result

    result=$(curl -s -G --data-urlencode "query=$query" "$PROMETHEUS_URL/api/v1/query" | jq -r '.data.result[0].value[1] // "null"')

    if [[ "$result" == "null" ]]; then
        echo "0"
    else
        echo "$result"
    fi
}

# Convert percentage to color
get_color_for_percentage() {
    local percentage="$1"

    if (( $(echo "$percentage >= $GREEN_THRESHOLD" | bc -l) )); then
        echo "$GREEN"
    elif (( $(echo "$percentage >= $YELLOW_THRESHOLD" | bc -l) )); then
        echo "$YELLOW"
    elif (( $(echo "$percentage >= $ORANGE_THRESHOLD" | bc -l) )); then
        echo "$ORANGE"
    else
        echo "$RED"
    fi
}

# Get status level based on error budget
get_status_level() {
    local percentage="$1"

    if (( $(echo "$percentage >= $GREEN_THRESHOLD" | bc -l) )); then
        echo "GREEN"
    elif (( $(echo "$percentage >= $YELLOW_THRESHOLD" | bc -l) )); then
        echo "YELLOW"
    elif (( $(echo "$percentage >= $ORANGE_THRESHOLD" | bc -l) )); then
        echo "ORANGE"
    else
        echo "RED"
    fi
}

# Send Slack notification
send_slack_notification() {
    local message="$1"

    if [[ -n "$SLACK_WEBHOOK" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\"}" \
            "$SLACK_WEBHOOK" || true
    fi
}

# ============================================================================
# SLO STATUS CHECK
# ============================================================================

check_slo_status() {
    log "Checking SLO status..."

    # Query error budget remaining for each service
    local api_gateway_budget
    local reporting_service_budget
    local data_residency_budget

    api_gateway_budget=$(query_prometheus "error_budget:api_gateway:remaining_ratio * 100")
    reporting_service_budget=$(query_prometheus "error_budget:reporting_service:remaining_ratio * 100")
    data_residency_budget=$(query_prometheus "error_budget:data_residency:remaining_ratio * 100")

    # Query burn rates
    local api_gateway_burn_1h
    local reporting_burn_1h
    local data_residency_burn_1h

    api_gateway_burn_1h=$(query_prometheus "burn_rate:api_gateway:1h")
    reporting_burn_1h=$(query_prometheus "burn_rate:reporting_service:1h")
    data_residency_burn_1h=$(query_prometheus "burn_rate:data_residency:1h")

    # Query GDPR violations
    local gdpr_violations
    gdpr_violations=$(query_prometheus "sli:gdpr_violations:count")

    # Query availability SLIs
    local api_gateway_sli
    local reporting_sli
    local data_residency_sli

    api_gateway_sli=$(query_prometheus "sli:availability:api_gateway:ratio * 100")
    reporting_sli=$(query_prometheus "sli:availability:reporting_service:ratio * 100")
    data_residency_sli=$(query_prometheus "sli:availability:data_residency:ratio * 100")

    # Store results globally for other functions
    export API_GATEWAY_BUDGET="$api_gateway_budget"
    export REPORTING_SERVICE_BUDGET="$reporting_service_budget"
    export DATA_RESIDENCY_BUDGET="$data_residency_budget"
    export API_GATEWAY_BURN_1H="$api_gateway_burn_1h"
    export REPORTING_BURN_1H="$reporting_burn_1h"
    export DATA_RESIDENCY_BURN_1H="$data_residency_burn_1h"
    export GDPR_VIOLATIONS="$gdpr_violations"
    export API_GATEWAY_SLI="$api_gateway_sli"
    export REPORTING_SLI="$reporting_sli"
    export DATA_RESIDENCY_SLI="$data_residency_sli"
}

# ============================================================================
# DEPLOYMENT GATE CHECK
# ============================================================================

check_deployment_gate() {
    log "Checking deployment gate..."

    check_slo_status

    local gate_status="ALLOWED"
    local gate_reasons=()

    # Check error budgets
    if (( $(echo "$API_GATEWAY_BUDGET < $ORANGE_THRESHOLD" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("API Gateway error budget <${ORANGE_THRESHOLD}% (current: ${API_GATEWAY_BUDGET}%)")
    fi

    if (( $(echo "$REPORTING_SERVICE_BUDGET < $ORANGE_THRESHOLD" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("Reporting Service error budget <${ORANGE_THRESHOLD}% (current: ${REPORTING_SERVICE_BUDGET}%)")
    fi

    if (( $(echo "$DATA_RESIDENCY_BUDGET < $ORANGE_THRESHOLD" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("Data Residency error budget <${ORANGE_THRESHOLD}% (current: ${DATA_RESIDENCY_BUDGET}%) [GDPR CRITICAL]")
    fi

    # Check burn rates (fast burn)
    if (( $(echo "$API_GATEWAY_BURN_1H >= $FAST_BURN_THRESHOLD" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("API Gateway fast burn detected (${API_GATEWAY_BURN_1H}x > ${FAST_BURN_THRESHOLD}x)")
    fi

    if (( $(echo "$REPORTING_BURN_1H >= $FAST_BURN_THRESHOLD" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("Reporting Service fast burn detected (${REPORTING_BURN_1H}x > ${FAST_BURN_THRESHOLD}x)")
    fi

    if (( $(echo "$DATA_RESIDENCY_BURN_1H >= $FAST_BURN_THRESHOLD" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("Data Residency fast burn detected (${DATA_RESIDENCY_BURN_1H}x > ${FAST_BURN_THRESHOLD}x) [GDPR CRITICAL]")
    fi

    # Check GDPR violations (zero tolerance)
    if (( $(echo "$GDPR_VIOLATIONS > 0" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("GDPR violations detected (count: ${GDPR_VIOLATIONS}) [ZERO TOLERANCE]")
    fi

    # Check availability SLOs
    if (( $(echo "$API_GATEWAY_SLI < 99.9" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("API Gateway SLO breaching (${API_GATEWAY_SLI}% < 99.9%)")
    fi

    if (( $(echo "$REPORTING_SLI < 99.5" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("Reporting Service SLO breaching (${REPORTING_SLI}% < 99.5%)")
    fi

    if (( $(echo "$DATA_RESIDENCY_SLI < 99.99" | bc -l) )); then
        gate_status="BLOCKED"
        gate_reasons+=("Data Residency SLO breaching (${DATA_RESIDENCY_SLI}% < 99.99%) [GDPR CRITICAL]")
    fi

    # Output results
    echo ""
    echo "============================================================"
    echo "  SLO DEPLOYMENT GATE CHECK"
    echo "============================================================"
    echo ""

    if [[ "$gate_status" == "ALLOWED" ]]; then
        log_success "Deployment gate: ALLOWED ✅"
        echo ""
        echo "All SLOs are healthy. Deployment may proceed."
        log_audit "deployment_gate_check" "ALLOWED"
        return 0
    else
        log_error "Deployment gate: BLOCKED 🚫"
        echo ""
        echo "Reasons:"
        for reason in "${gate_reasons[@]}"; do
            echo "  ❌ $reason"
        done
        echo ""
        echo "Action Required:"
        echo "  1. Fix SLO breaches before deploying"
        echo "  2. Or use './slo-gate.sh override <reason>' for emergency deployments"
        echo ""
        echo "Dashboard: ${GRAFANA_URL}/d/slo-overview"
        echo ""

        log_audit "deployment_gate_check" "BLOCKED: ${gate_reasons[*]}"

        # Send Slack notification
        send_slack_notification "🚫 Deployment gate BLOCKED: ${gate_reasons[0]}"

        return 1
    fi
}

# ============================================================================
# SHOW STATUS
# ============================================================================

show_status() {
    log "Fetching SLO status..."

    check_slo_status

    echo ""
    echo "============================================================"
    echo "  SLO STATUS OVERVIEW"
    echo "============================================================"
    echo ""

    # API Gateway
    local api_gateway_color
    local api_gateway_status
    api_gateway_color=$(get_color_for_percentage "$API_GATEWAY_BUDGET")
    api_gateway_status=$(get_status_level "$API_GATEWAY_BUDGET")
    echo -e "API Gateway:"
    echo -e "  Availability:     ${API_GATEWAY_SLI}% (SLO: 99.9%)"
    echo -e "  Error Budget:     ${api_gateway_color}${API_GATEWAY_BUDGET}%${NC} remaining [$api_gateway_status]"
    echo -e "  Burn Rate (1h):   ${API_GATEWAY_BURN_1H}x (threshold: ${FAST_BURN_THRESHOLD}x)"
    echo ""

    # Reporting Service
    local reporting_color
    local reporting_status
    reporting_color=$(get_color_for_percentage "$REPORTING_SERVICE_BUDGET")
    reporting_status=$(get_status_level "$REPORTING_SERVICE_BUDGET")
    echo -e "Reporting Service:"
    echo -e "  Availability:     ${REPORTING_SLI}% (SLO: 99.5%)"
    echo -e "  Error Budget:     ${reporting_color}${REPORTING_SERVICE_BUDGET}%${NC} remaining [$reporting_status]"
    echo -e "  Burn Rate (1h):   ${REPORTING_BURN_1H}x (threshold: ${FAST_BURN_THRESHOLD}x)"
    echo ""

    # Data Residency
    local data_residency_color
    local data_residency_status
    data_residency_color=$(get_color_for_percentage "$DATA_RESIDENCY_BUDGET")
    data_residency_status=$(get_status_level "$DATA_RESIDENCY_BUDGET")
    echo -e "Data Residency (GDPR):"
    echo -e "  Availability:     ${DATA_RESIDENCY_SLI}% (SLO: 99.99%)"
    echo -e "  Error Budget:     ${data_residency_color}${DATA_RESIDENCY_BUDGET}%${NC} remaining [$data_residency_status]"
    echo -e "  Burn Rate (1h):   ${DATA_RESIDENCY_BURN_1H}x (threshold: ${FAST_BURN_THRESHOLD}x)"
    echo -e "  GDPR Violations:  ${GDPR_VIOLATIONS} (tolerance: 0)"
    echo ""

    echo "============================================================"
    echo "Legend:"
    echo -e "  ${GREEN}🟢 Green${NC}   (>50%): Normal operations"
    echo -e "  ${YELLOW}🟡 Yellow${NC}  (20-50%): Require approval for deployments"
    echo -e "  ${ORANGE}🟠 Orange${NC}  (10-20%): Freeze deployments"
    echo -e "  ${RED}🔴 Red${NC}     (<10%): Incident response mode"
    echo ""
    echo "Dashboard: ${GRAFANA_URL}/d/slo-overview"
    echo ""
}

# ============================================================================
# OVERRIDE GATE (Emergency)
# ============================================================================

override_gate() {
    local reason="$1"
    local approver="${2:-}"
    local incident_id="${3:-}"

    log_warning "SLO gate override requested"

    # Validate reason
    local allowed_reasons=("security_vulnerability" "data_loss_prevention" "gdpr_compliance_fix" "production_outage_fix")
    if [[ ! " ${allowed_reasons[*]} " =~ ${reason} ]]; then
        log_error "Invalid override reason: $reason"
        echo "Allowed reasons:"
        for r in "${allowed_reasons[@]}"; do
            echo "  - $r"
        done
        return 1
    fi

    # Require approver
    if [[ -z "$approver" ]]; then
        log_error "Approver email required for override"
        echo "Usage: ./slo-gate.sh override <reason> <approver_email> [incident_id]"
        return 1
    fi

    # Log audit trail
    log_audit "slo_gate_override" "reason=$reason approver=$approver incident=$incident_id"

    echo ""
    echo "============================================================"
    echo "  SLO GATE OVERRIDE"
    echo "============================================================"
    echo ""
    echo "Reason:       $reason"
    echo "Approver:     $approver"
    echo "Incident ID:  ${incident_id:-N/A}"
    echo "Timestamp:    $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    echo ""
    echo "⚠️  OVERRIDE APPROVED - Deployment may proceed"
    echo ""
    echo "Post-Mortem Required: YES (within 48 hours)"
    echo "Audit Log: $AUDIT_LOG_FILE"
    echo ""

    # Send Slack notification
    send_slack_notification "⚠️ SLO gate OVERRIDE: reason=$reason approver=$approver incident=$incident_id"

    log_success "Override granted"
    return 0
}

# ============================================================================
# WEEKLY REPORT
# ============================================================================

generate_report() {
    log "Generating weekly SLO report..."

    check_slo_status

    # Calculate weekly error budget consumption
    local api_gateway_consumed
    local reporting_consumed
    local data_residency_consumed

    api_gateway_consumed=$(echo "100 - $API_GATEWAY_BUDGET" | bc)
    reporting_consumed=$(echo "100 - $REPORTING_SERVICE_BUDGET" | bc)
    data_residency_consumed=$(echo "100 - $DATA_RESIDENCY_BUDGET" | bc)

    echo ""
    echo "============================================================"
    echo "  WEEKLY SLO REPORT"
    echo "============================================================"
    echo "Report Date: $(date +'%Y-%m-%d')"
    echo ""

    echo "Error Budget Summary:"
    echo "  API Gateway:         ${api_gateway_consumed}% consumed (${API_GATEWAY_BUDGET}% remaining)"
    echo "  Reporting Service:   ${reporting_consumed}% consumed (${REPORTING_SERVICE_BUDGET}% remaining)"
    echo "  Data Residency:      ${data_residency_consumed}% consumed (${DATA_RESIDENCY_BUDGET}% remaining)"
    echo ""

    echo "Burn Rate (1h):"
    echo "  API Gateway:         ${API_GATEWAY_BURN_1H}x"
    echo "  Reporting Service:   ${REPORTING_BURN_1H}x"
    echo "  Data Residency:      ${DATA_RESIDENCY_BURN_1H}x"
    echo ""

    echo "Compliance:"
    echo "  GDPR Violations:     ${GDPR_VIOLATIONS} (zero tolerance)"
    echo ""

    echo "Recommendations:"
    local worst_budget=$(echo -e "${API_GATEWAY_BUDGET}\n${REPORTING_SERVICE_BUDGET}\n${DATA_RESIDENCY_BUDGET}" | sort -n | head -1)
    if (( $(echo "$worst_budget < $YELLOW_THRESHOLD" | bc -l) )); then
        echo "  ⚠️  WARNING: Error budget low - prioritize reliability work"
    elif (( $(echo "$worst_budget < $GREEN_THRESHOLD" | bc -l) )); then
        echo "  ⚠️  CAUTION: Monitor error budget consumption closely"
    else
        echo "  ✅  All error budgets healthy"
    fi
    echo ""

    echo "Dashboard: ${GRAFANA_URL}/d/slo-overview"
    echo ""
}

# ============================================================================
# MAIN
# ============================================================================

main() {
    local command="${1:-}"

    case "$command" in
        check)
            check_deployment_gate
            ;;
        status)
            show_status
            ;;
        override)
            override_gate "${2:-}" "${3:-}" "${4:-}"
            ;;
        report)
            generate_report
            ;;
        *)
            echo "Usage: $0 {check|status|override|report}"
            echo ""
            echo "Commands:"
            echo "  check              - Check if deployment is allowed"
            echo "  status             - Show current SLO status"
            echo "  override <reason> <approver> [incident_id]"
            echo "                     - Override gate for emergency deployment"
            echo "  report             - Generate weekly SLO report"
            echo ""
            echo "Examples:"
            echo "  $0 check"
            echo "  $0 status"
            echo "  $0 override security_vulnerability john.doe@teei.io CVE-2025-12345"
            echo "  $0 report"
            echo ""
            exit 1
            ;;
    esac
}

main "$@"
