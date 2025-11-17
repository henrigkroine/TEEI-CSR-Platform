#!/usr/bin/env bash
# TEEI CSR Platform - Secrets Rotation Audit Script
# Purpose: Audit secrets age and flag those requiring rotation
# Ref: Phase J - J5.3 Secrets Rotation Playbooks
# Usage: ./secrets-rotation-audit.sh [--output OUTPUT_FILE] [--format csv|json]

set -euo pipefail

# Configuration
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ROTATION_POLICY_DAYS="${ROTATION_POLICY_DAYS:-90}"
WARNING_THRESHOLD_DAYS="${WARNING_THRESHOLD_DAYS:-80}"
OUTPUT_FILE="${OUTPUT_FILE:-/tmp/secrets-audit-$(date +%Y%m%d-%H%M%S).csv}"
OUTPUT_FORMAT="${OUTPUT_FORMAT:-csv}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" >&2
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" >&2
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" >&2
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Calculate age in days from ISO 8601 timestamp
calculate_age_days() {
    local timestamp=$1
    local current_epoch=$(date +%s)
    local secret_epoch=$(date -d "${timestamp}" +%s 2>/dev/null || echo "0")

    if [[ "${secret_epoch}" == "0" ]]; then
        echo "999"  # Unknown age
        return
    fi

    local age_seconds=$((current_epoch - secret_epoch))
    local age_days=$((age_seconds / 86400))

    echo "${age_days}"
}

# Determine status based on age
get_status() {
    local age_days=$1

    if [[ ${age_days} -ge ${ROTATION_POLICY_DAYS} ]]; then
        echo "CRITICAL"
    elif [[ ${age_days} -ge ${WARNING_THRESHOLD_DAYS} ]]; then
        echo "WARNING"
    else
        echo "OK"
    fi
}

# Audit Vault secrets
audit_vault_secrets() {
    log_info "Auditing HashiCorp Vault secrets..."

    # Check Vault connectivity
    if ! vault status > /dev/null 2>&1; then
        log_error "Vault is not accessible at ${VAULT_ADDR}"
        return 1
    fi

    # List all secrets under secret/teei/
    local vault_paths
    vault_paths=$(vault kv list -format=json secret/teei/ 2>/dev/null | jq -r '.[]' || echo "")

    if [[ -z "${vault_paths}" ]]; then
        log_warning "No secrets found in Vault under secret/teei/"
        return 0
    fi

    local vault_results=()

    while IFS= read -r path; do
        if [[ -z "${path}" ]]; then
            continue
        fi

        local full_path="secret/teei/${path}"

        # Get secret metadata
        local metadata
        metadata=$(vault kv metadata get -format=json "${full_path}" 2>/dev/null || echo "{}")

        if [[ "${metadata}" == "{}" ]]; then
            log_warning "Failed to get metadata for ${full_path}"
            continue
        fi

        # Extract creation and update timestamps
        local created_time
        local updated_time
        created_time=$(echo "${metadata}" | jq -r '.created_time // .data.created_time // "unknown"')
        updated_time=$(echo "${metadata}" | jq -r '.updated_time // .data.updated_time // .created_time // "unknown"')

        # Use the most recent timestamp (updated_time)
        local last_rotated="${updated_time}"

        if [[ "${last_rotated}" == "unknown" || "${last_rotated}" == "null" ]]; then
            local age_days=999
            local status="UNKNOWN"
        else
            local age_days
            age_days=$(calculate_age_days "${last_rotated}")
            local status
            status=$(get_status "${age_days}")
        fi

        # Format last rotated date
        local last_rotated_formatted
        if [[ "${last_rotated}" == "unknown" || "${last_rotated}" == "null" ]]; then
            last_rotated_formatted="unknown"
        else
            last_rotated_formatted=$(date -d "${last_rotated}" +%Y-%m-%d 2>/dev/null || echo "unknown")
        fi

        vault_results+=("vault:${full_path},${age_days},${status},${last_rotated_formatted}")

    done <<< "${vault_paths}"

    # Output Vault results
    for result in "${vault_results[@]}"; do
        echo "${result}"
    done
}

# Audit AWS Secrets Manager secrets
audit_aws_secrets() {
    log_info "Auditing AWS Secrets Manager secrets..."

    # Check AWS CLI connectivity
    if ! aws sts get-caller-identity --region "${AWS_REGION}" > /dev/null 2>&1; then
        log_error "AWS CLI not configured or no valid credentials"
        return 1
    fi

    # List all secrets with teei prefix
    local secrets_list
    secrets_list=$(aws secretsmanager list-secrets \
        --region "${AWS_REGION}" \
        --query 'SecretList[?starts_with(Name, `teei/`)].Name' \
        --output json 2>/dev/null || echo "[]")

    if [[ "${secrets_list}" == "[]" ]]; then
        log_warning "No secrets found in AWS Secrets Manager with 'teei/' prefix"
        return 0
    fi

    local aws_results=()

    while IFS= read -r secret_name; do
        if [[ -z "${secret_name}" || "${secret_name}" == "null" ]]; then
            continue
        fi

        # Remove quotes from jq output
        secret_name=$(echo "${secret_name}" | tr -d '"')

        # Get secret metadata
        local metadata
        metadata=$(aws secretsmanager describe-secret \
            --secret-id "${secret_name}" \
            --region "${AWS_REGION}" \
            --output json 2>/dev/null || echo "{}")

        if [[ "${metadata}" == "{}" ]]; then
            log_warning "Failed to get metadata for ${secret_name}"
            continue
        fi

        # Extract last rotated or last changed date
        local last_rotated
        last_rotated=$(echo "${metadata}" | jq -r '.LastRotatedDate // .LastChangedDate // .CreatedDate // "unknown"')

        if [[ "${last_rotated}" == "unknown" || "${last_rotated}" == "null" ]]; then
            local age_days=999
            local status="UNKNOWN"
            local last_rotated_formatted="unknown"
        else
            local age_days
            age_days=$(calculate_age_days "${last_rotated}")
            local status
            status=$(get_status "${age_days}")
            local last_rotated_formatted
            last_rotated_formatted=$(date -d "${last_rotated}" +%Y-%m-%d 2>/dev/null || echo "unknown")
        fi

        aws_results+=("aws:${secret_name},${age_days},${status},${last_rotated_formatted}")

    done <<< $(echo "${secrets_list}" | jq -r '.[]')

    # Output AWS results
    for result in "${aws_results[@]}"; do
        echo "${result}"
    done
}

# Generate CSV report
generate_csv_report() {
    local results=("$@")

    # Write CSV header
    echo "secret_name,age_days,status,last_rotated"

    # Write results
    for result in "${results[@]}"; do
        echo "${result}"
    done
}

# Generate JSON report
generate_json_report() {
    local results=("$@")

    echo "{"
    echo '  "audit_timestamp": "'$(date -Iseconds)'",'
    echo '  "rotation_policy_days": '${ROTATION_POLICY_DAYS}','
    echo '  "warning_threshold_days": '${WARNING_THRESHOLD_DAYS}','
    echo '  "secrets": ['

    local first=true
    for result in "${results[@]}"; do
        IFS=',' read -r secret_name age_days status last_rotated <<< "${result}"

        if [[ "${first}" == "true" ]]; then
            first=false
        else
            echo ","
        fi

        echo -n '    {'
        echo -n '"secret_name": "'${secret_name}'", '
        echo -n '"age_days": '${age_days}', '
        echo -n '"status": "'${status}'", '
        echo -n '"last_rotated": "'${last_rotated}'"'
        echo -n '}'
    done

    echo ""
    echo "  ]"
    echo "}"
}

# Display summary
display_summary() {
    local results=("$@")

    local total=0
    local ok_count=0
    local warning_count=0
    local critical_count=0
    local unknown_count=0

    for result in "${results[@]}"; do
        IFS=',' read -r secret_name age_days status last_rotated <<< "${result}"

        ((total++))

        case "${status}" in
            OK)
                ((ok_count++))
                ;;
            WARNING)
                ((warning_count++))
                ;;
            CRITICAL)
                ((critical_count++))
                ;;
            UNKNOWN)
                ((unknown_count++))
                ;;
        esac
    done

    log_info ""
    log_info "=== Secrets Rotation Audit Summary ==="
    log_info "Total secrets audited: ${total}"
    log_success "OK (< ${WARNING_THRESHOLD_DAYS} days): ${ok_count}"

    if [[ ${warning_count} -gt 0 ]]; then
        log_warning "WARNING (${WARNING_THRESHOLD_DAYS}-${ROTATION_POLICY_DAYS} days): ${warning_count}"
    fi

    if [[ ${critical_count} -gt 0 ]]; then
        log_error "CRITICAL (>= ${ROTATION_POLICY_DAYS} days): ${critical_count}"
    fi

    if [[ ${unknown_count} -gt 0 ]]; then
        log_warning "UNKNOWN age: ${unknown_count}"
    fi

    log_info ""
    log_info "Rotation Policy: Secrets must be rotated every ${ROTATION_POLICY_DAYS} days"
    log_info "Warning Threshold: ${WARNING_THRESHOLD_DAYS} days"
    log_info ""

    if [[ ${critical_count} -gt 0 ]]; then
        log_error "ACTION REQUIRED: ${critical_count} secret(s) are overdue for rotation!"
        log_info "Run rotation scripts immediately:"
        log_info "  - Vault: ./scripts/infra/rotate-vault-secrets.sh"
        log_info "  - AWS SM: ./scripts/infra/rotate-aws-secrets.sh"
    elif [[ ${warning_count} -gt 0 ]]; then
        log_warning "ATTENTION: ${warning_count} secret(s) will require rotation soon"
        log_info "Plan rotation within the next $((ROTATION_POLICY_DAYS - WARNING_THRESHOLD_DAYS)) days"
    else
        log_success "All secrets are within rotation policy!"
    fi

    log_info ""
    log_info "Report saved to: ${OUTPUT_FILE}"
}

# Main audit execution
main() {
    log_info "=== TEEI Secrets Rotation Audit ==="
    log_info "Rotation Policy: ${ROTATION_POLICY_DAYS} days"
    log_info "Warning Threshold: ${WARNING_THRESHOLD_DAYS} days"
    log_info ""

    local all_results=()

    # Audit Vault secrets
    while IFS= read -r result; do
        if [[ -n "${result}" ]]; then
            all_results+=("${result}")
        fi
    done < <(audit_vault_secrets)

    # Audit AWS Secrets Manager
    while IFS= read -r result; do
        if [[ -n "${result}" ]]; then
            all_results+=("${result}")
        fi
    done < <(audit_aws_secrets)

    # Generate report
    log_info "Generating ${OUTPUT_FORMAT^^} report..."

    case "${OUTPUT_FORMAT}" in
        csv)
            generate_csv_report "${all_results[@]}" > "${OUTPUT_FILE}"
            ;;
        json)
            generate_json_report "${all_results[@]}" > "${OUTPUT_FILE}"
            ;;
        *)
            log_error "Unsupported output format: ${OUTPUT_FORMAT}"
            exit 1
            ;;
    esac

    # Display summary
    display_summary "${all_results[@]}"

    # Determine exit code
    local critical_count=0
    local warning_count=0

    for result in "${all_results[@]}"; do
        IFS=',' read -r secret_name age_days status last_rotated <<< "${result}"

        case "${status}" in
            WARNING)
                ((warning_count++))
                ;;
            CRITICAL)
                ((critical_count++))
                ;;
        esac
    done

    if [[ ${critical_count} -gt 0 ]]; then
        exit 2  # Critical - immediate action required
    elif [[ ${warning_count} -gt 0 ]]; then
        exit 1  # Warning - plan rotation soon
    else
        exit 0  # All OK
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --format)
            OUTPUT_FORMAT="$2"
            shift 2
            ;;
        --policy-days)
            ROTATION_POLICY_DAYS="$2"
            shift 2
            ;;
        --warning-threshold)
            WARNING_THRESHOLD_DAYS="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --output FILE              Output file path (default: /tmp/secrets-audit-TIMESTAMP.csv)"
            echo "  --format FORMAT            Output format: csv|json (default: csv)"
            echo "  --policy-days DAYS         Rotation policy in days (default: 90)"
            echo "  --warning-threshold DAYS   Warning threshold in days (default: 80)"
            echo "  --help                     Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  VAULT_ADDR                 Vault address (default: http://localhost:8200)"
            echo "  AWS_REGION                 AWS region (default: us-east-1)"
            echo ""
            echo "Exit Codes:"
            echo "  0 - All secrets OK (within policy)"
            echo "  1 - Warnings (secrets approaching rotation deadline)"
            echo "  2 - Critical (secrets overdue for rotation)"
            echo ""
            echo "Examples:"
            echo "  $0                                           # Default CSV audit"
            echo "  $0 --format json                             # JSON output"
            echo "  $0 --output /tmp/audit.csv                   # Custom output file"
            echo "  $0 --policy-days 60 --warning-threshold 50   # Custom thresholds"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create output directory if it doesn't exist
mkdir -p "$(dirname "${OUTPUT_FILE}")"

# Run main audit
main
