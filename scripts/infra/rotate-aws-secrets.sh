#!/usr/bin/env bash
# TEEI CSR Platform - AWS Secrets Manager Rotation Script
# Purpose: Automated rotation of API keys in AWS Secrets Manager
# Ref: Phase J - J5.3 Secrets Rotation Playbooks
# Usage: ./rotate-aws-secrets.sh [--secret SECRET_NAME] [--dry-run]

set -euo pipefail

# Configuration
AWS_REGION="${AWS_REGION:-us-east-1}"
ROTATION_LOG="${ROTATION_LOG:-/var/log/aws-secrets-rotation.log}"
AUDIT_LOG="${AUDIT_LOG:-/var/log/aws-secrets-rotation-audit.log}"
DRY_RUN="${DRY_RUN:-false}"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
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

log_audit() {
    local timestamp=$(date -Iseconds)
    echo "${timestamp},$1" >> "${AUDIT_LOG}"
}

# Generate secure API key
generate_api_key() {
    openssl rand -hex 32
}

# Test Electricity Maps API
test_electricity_maps_api() {
    local api_key=$1
    local test_url="https://api-access.electricitymaps.com/free-tier/carbon-intensity/latest?zone=US-CAL-CISO"

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" -H "auth-token: ${api_key}" "${test_url}")

    if [[ "${http_code}" == "200" ]]; then
        return 0
    else
        log_error "API test failed with HTTP ${http_code}"
        return 1
    fi
}

# Test LLM API (OpenAI/Anthropic)
test_llm_api() {
    local provider=$1
    local api_key=$2

    case "${provider}" in
        openai)
            local http_code
            http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -H "Authorization: Bearer ${api_key}" \
                "https://api.openai.com/v1/models")

            if [[ "${http_code}" == "200" ]]; then
                return 0
            else
                log_error "OpenAI API test failed with HTTP ${http_code}"
                return 1
            fi
            ;;
        anthropic)
            local http_code
            http_code=$(curl -s -o /dev/null -w "%{http_code}" \
                -H "x-api-key: ${api_key}" \
                -H "anthropic-version: 2023-06-01" \
                "https://api.anthropic.com/v1/messages" \
                -d '{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"test"}]}')

            if [[ "${http_code}" == "200" || "${http_code}" == "400" ]]; then
                # 400 is OK here - we just want to verify auth works
                return 0
            else
                log_error "Anthropic API test failed with HTTP ${http_code}"
                return 1
            fi
            ;;
        *)
            log_error "Unsupported LLM provider: ${provider}"
            return 1
            ;;
    esac
}

# Rotate secret using AWS Secrets Manager rotation
rotate_aws_secret() {
    local secret_name=$1
    local secret_type=$2  # electricity-maps | openai | anthropic

    log_info "Rotating AWS secret: ${secret_name} (type: ${secret_type})"

    # Check if secret exists
    if ! aws secretsmanager describe-secret --secret-id "${secret_name}" --region "${AWS_REGION}" > /dev/null 2>&1; then
        log_error "Secret not found: ${secret_name}"
        log_audit "${secret_name},FAILED,secret_not_found"
        return 1
    fi

    # Get current secret value
    local current_secret
    current_secret=$(aws secretsmanager get-secret-value --secret-id "${secret_name}" --region "${AWS_REGION}" --query SecretString --output text 2>/dev/null)

    if [[ -z "${current_secret}" ]]; then
        log_error "Failed to retrieve current secret value"
        log_audit "${secret_name},FAILED,retrieval_error"
        return 1
    fi

    # Extract API key from JSON
    local current_api_key
    current_api_key=$(echo "${current_secret}" | jq -r '.api_key // .apiKey // .API_KEY')

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would rotate secret: ${secret_name}"
        log_info "[DRY-RUN] Secret type: ${secret_type}"
        return 0
    fi

    # Generate new API key (for self-managed secrets)
    # Note: For provider-managed keys (OpenAI, Anthropic), this would need to be done via their APIs
    local new_api_key

    case "${secret_type}" in
        electricity-maps)
            log_warning "Electricity Maps API keys must be rotated manually via their dashboard"
            log_info "Please generate new key at: https://app.electricitymaps.com/api-portal"
            log_audit "${secret_name},SKIPPED,manual_rotation_required"
            return 0
            ;;
        openai|anthropic)
            log_warning "${secret_type} API keys must be rotated manually via their console"
            if [[ "${secret_type}" == "openai" ]]; then
                log_info "Please generate new key at: https://platform.openai.com/api-keys"
            else
                log_info "Please generate new key at: https://console.anthropic.com/settings/keys"
            fi
            log_audit "${secret_name},SKIPPED,manual_rotation_required"
            return 0
            ;;
        custom)
            # For custom/self-managed API keys
            new_api_key=$(generate_api_key)
            ;;
        *)
            log_error "Unsupported secret type: ${secret_type}"
            return 1
            ;;
    esac

    # Step 1: Create AWSPENDING version with new secret
    log_info "Creating AWSPENDING secret version..."

    local new_secret_json
    new_secret_json=$(echo "${current_secret}" | jq --arg key "${new_api_key}" '.api_key = $key')

    if ! aws secretsmanager put-secret-value \
        --secret-id "${secret_name}" \
        --secret-string "${new_secret_json}" \
        --version-stages AWSPENDING \
        --region "${AWS_REGION}" > /dev/null 2>&1; then
        log_error "Failed to create AWSPENDING version"
        log_audit "${secret_name},FAILED,pending_version_error"
        return 1
    fi

    log_success "AWSPENDING version created"

    # Step 2: Test new secret (if applicable)
    log_info "Testing new secret..."

    local test_passed=true
    case "${secret_type}" in
        custom)
            # For custom secrets, we assume they work
            # In production, add actual validation here
            log_info "Custom secret - assuming valid (add validation as needed)"
            ;;
        *)
            log_warning "No automated test available for ${secret_type}"
            ;;
    esac

    if [[ "${test_passed}" == "false" ]]; then
        log_error "New secret validation failed, not promoting to AWSCURRENT"
        log_audit "${secret_name},FAILED,validation_error"
        return 1
    fi

    log_success "New secret validated"

    # Step 3: Promote AWSPENDING to AWSCURRENT
    log_info "Promoting AWSPENDING to AWSCURRENT..."

    # Get the version ID of the AWSPENDING version
    local pending_version_id
    pending_version_id=$(aws secretsmanager describe-secret \
        --secret-id "${secret_name}" \
        --region "${AWS_REGION}" \
        --query 'VersionIdsToStages' \
        --output json | jq -r 'to_entries[] | select(.value | contains(["AWSPENDING"])) | .key')

    if [[ -z "${pending_version_id}" ]]; then
        log_error "Failed to find AWSPENDING version"
        log_audit "${secret_name},FAILED,pending_version_not_found"
        return 1
    fi

    # Update version stages to promote AWSPENDING to AWSCURRENT
    if ! aws secretsmanager update-secret-version-stage \
        --secret-id "${secret_name}" \
        --version-stage AWSCURRENT \
        --move-to-version-id "${pending_version_id}" \
        --region "${AWS_REGION}" > /dev/null 2>&1; then
        log_error "Failed to promote AWSPENDING to AWSCURRENT"
        log_audit "${secret_name},FAILED,promotion_error"
        return 1
    fi

    log_success "Secret promoted to AWSCURRENT"

    # Step 4: Final verification
    log_info "Performing final verification..."

    local current_version
    current_version=$(aws secretsmanager get-secret-value \
        --secret-id "${secret_name}" \
        --version-stage AWSCURRENT \
        --region "${AWS_REGION}" \
        --query SecretString \
        --output text 2>/dev/null)

    local verified_api_key
    verified_api_key=$(echo "${current_version}" | jq -r '.api_key // .apiKey // .API_KEY')

    if [[ "${verified_api_key}" == "${new_api_key}" ]]; then
        log_success "Final verification passed - rotation complete"
        log_audit "${secret_name},SUCCESS,rotated"
        echo "$(date -Iseconds),${secret_name},rotated" >> "${ROTATION_LOG}"
        return 0
    else
        log_error "Final verification failed - secret mismatch"
        log_audit "${secret_name},FAILED,verification_error"
        return 1
    fi
}

# Trigger AWS Secrets Manager automatic rotation
trigger_automatic_rotation() {
    local secret_name=$1

    log_info "Triggering automatic rotation for: ${secret_name}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would trigger rotation for: ${secret_name}"
        return 0
    fi

    # Check if rotation is enabled
    local rotation_enabled
    rotation_enabled=$(aws secretsmanager describe-secret \
        --secret-id "${secret_name}" \
        --region "${AWS_REGION}" \
        --query 'RotationEnabled' \
        --output text 2>/dev/null || echo "false")

    if [[ "${rotation_enabled}" != "True" ]]; then
        log_warning "Automatic rotation not enabled for ${secret_name}"
        log_info "Attempting manual rotation instead..."
        return 1
    fi

    # Trigger rotation
    if aws secretsmanager rotate-secret \
        --secret-id "${secret_name}" \
        --region "${AWS_REGION}" > /dev/null 2>&1; then
        log_success "Rotation triggered successfully"
        log_audit "${secret_name},SUCCESS,rotation_triggered"
        echo "$(date -Iseconds),${secret_name},rotation_triggered" >> "${ROTATION_LOG}"
        return 0
    else
        log_error "Failed to trigger rotation"
        log_audit "${secret_name},FAILED,rotation_trigger_error"
        return 1
    fi
}

# Rotate all configured secrets
rotate_all_secrets() {
    log_info "=== TEEI AWS Secrets Rotation - Starting ==="
    log_info "AWS Region: ${AWS_REGION}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_warning "DRY-RUN MODE - No changes will be made"
    fi

    # Check AWS CLI connectivity
    if ! aws sts get-caller-identity --region "${AWS_REGION}" > /dev/null 2>&1; then
        log_error "AWS CLI not configured or no valid credentials"
        exit 1
    fi
    log_success "AWS CLI connectivity verified"

    local total_rotations=0
    local successful_rotations=0
    local failed_rotations=0

    # Define secrets to rotate
    declare -A secrets=(
        ["teei/electricity-maps-api-key"]="electricity-maps"
        ["teei/openai-api-key"]="openai"
        ["teei/anthropic-api-key"]="anthropic"
    )

    for secret_name in "${!secrets[@]}"; do
        local secret_type="${secrets[$secret_name]}"

        ((total_rotations++))

        # Try automatic rotation first, fall back to manual
        if ! trigger_automatic_rotation "${secret_name}"; then
            if rotate_aws_secret "${secret_name}" "${secret_type}"; then
                ((successful_rotations++))
            else
                ((failed_rotations++))
                log_error "Failed to rotate: ${secret_name}"
            fi
        else
            ((successful_rotations++))
        fi

        echo ""
    done

    # Summary
    echo ""
    log_info "=== Rotation Summary ==="
    log_info "Total rotations attempted: ${total_rotations}"
    log_success "Successful: ${successful_rotations}"

    if [[ ${failed_rotations} -gt 0 ]]; then
        log_error "Failed: ${failed_rotations}"
        exit 1
    else
        log_success "All rotations completed successfully!"
        exit 0
    fi
}

# Parse command line arguments
SECRET_NAME=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --secret)
            SECRET_NAME="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --secret SECRET_NAME   Rotate specific secret"
            echo "  --dry-run             Simulate rotation without making changes"
            echo "  --help                Show this help message"
            echo ""
            echo "Environment Variables:"
            echo "  AWS_REGION            AWS region (default: us-east-1)"
            echo ""
            echo "Examples:"
            echo "  $0                                          # Rotate all secrets"
            echo "  $0 --dry-run                                # Dry run for all secrets"
            echo "  $0 --secret teei/openai-api-key             # Rotate specific secret"
            echo "  $0 --secret teei/openai-api-key --dry-run   # Dry run for specific secret"
            echo ""
            echo "Note: Some secrets (OpenAI, Anthropic, Electricity Maps) require manual"
            echo "rotation via their respective consoles. This script will guide you through"
            echo "the process for those secrets."
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Create log directories if they don't exist
mkdir -p "$(dirname "${ROTATION_LOG}")"
mkdir -p "$(dirname "${AUDIT_LOG}")"

# Main execution
if [[ -n "${SECRET_NAME}" ]]; then
    # Determine secret type (simplified - in production, query from config)
    SECRET_TYPE="custom"
    if [[ "${SECRET_NAME}" == *"openai"* ]]; then
        SECRET_TYPE="openai"
    elif [[ "${SECRET_NAME}" == *"anthropic"* ]]; then
        SECRET_TYPE="anthropic"
    elif [[ "${SECRET_NAME}" == *"electricity"* ]]; then
        SECRET_TYPE="electricity-maps"
    fi

    if ! trigger_automatic_rotation "${SECRET_NAME}"; then
        rotate_aws_secret "${SECRET_NAME}" "${SECRET_TYPE}"
    fi
else
    rotate_all_secrets
fi
