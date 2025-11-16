#!/usr/bin/env bash
# TEEI CSR Platform - Vault Secrets Rotation Script
# Purpose: Automated rotation of database credentials in HashiCorp Vault
# Ref: Phase J - J5.3 Secrets Rotation Playbooks
# Usage: ./rotate-vault-secrets.sh [--service SERVICE] [--dry-run] [--force]

set -euo pipefail

# Configuration
VAULT_ADDR="${VAULT_ADDR:-http://localhost:8200}"
VAULT_NAMESPACE="${VAULT_NAMESPACE:-teei-platform}"
ROTATION_LOG="${ROTATION_LOG:-/var/log/vault-rotation.log}"
AUDIT_LOG="${AUDIT_LOG:-/var/log/vault-rotation-audit.log}"
DRY_RUN="${DRY_RUN:-false}"
FORCE_ROTATION="${FORCE_ROTATION:-false}"

# Password generation parameters
PASSWORD_LENGTH=32
PASSWORD_CHARS='A-Za-z0-9!@#$%^&*()-_=+[]{}|;:,.<>?'

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

# Generate secure random password
generate_password() {
    openssl rand -base64 48 | tr -dc "${PASSWORD_CHARS}" | head -c "${PASSWORD_LENGTH}"
}

# Test database connection
test_db_connection() {
    local db_type=$1
    local host=$2
    local port=$3
    local database=$4
    local username=$5
    local password=$6

    case "${db_type}" in
        postgresql)
            PGPASSWORD="${password}" psql -h "${host}" -p "${port}" -U "${username}" -d "${database}" -c "SELECT 1;" > /dev/null 2>&1
            return $?
            ;;
        clickhouse)
            clickhouse-client --host="${host}" --port="${port}" --user="${username}" --password="${password}" --query="SELECT 1;" > /dev/null 2>&1
            return $?
            ;;
        *)
            log_error "Unsupported database type: ${db_type}"
            return 1
            ;;
    esac
}

# Rotate PostgreSQL credentials
rotate_postgresql() {
    local service_name=$1
    local secret_path=$2
    local db_host=$3
    local db_port=${4:-5432}
    local db_name=$5
    local db_user=$6

    log_info "Rotating PostgreSQL credentials for ${service_name}..."

    # Get current password from Vault
    local current_password
    current_password=$(vault kv get -field=password "${secret_path}" 2>/dev/null || echo "")

    if [[ -z "${current_password}" ]]; then
        log_warning "No existing password found in Vault, this might be first-time setup"
    fi

    # Generate new password
    local new_password
    new_password=$(generate_password)

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would rotate password for ${db_user}@${db_host}:${db_port}/${db_name}"
        log_info "[DRY-RUN] Would update Vault path: ${secret_path}"
        return 0
    fi

    # Step 1: Update password in PostgreSQL
    log_info "Updating password in PostgreSQL database..."
    if PGPASSWORD="${current_password}" psql -h "${db_host}" -p "${db_port}" -U "${db_user}" -d postgres -c "ALTER USER ${db_user} PASSWORD '${new_password}';" 2>/dev/null; then
        log_success "Database password updated successfully"
    else
        log_error "Failed to update password in PostgreSQL"
        log_audit "${service_name},${secret_path},FAILED,postgresql_update_error"
        return 1
    fi

    # Step 2: Test new credentials
    log_info "Testing new credentials..."
    if test_db_connection "postgresql" "${db_host}" "${db_port}" "${db_name}" "${db_user}" "${new_password}"; then
        log_success "New credentials validated successfully"
    else
        log_error "New credentials failed validation, attempting rollback..."

        # Rollback: restore old password
        if [[ -n "${current_password}" ]]; then
            PGPASSWORD="${new_password}" psql -h "${db_host}" -p "${db_port}" -U "${db_user}" -d postgres -c "ALTER USER ${db_user} PASSWORD '${current_password}';" 2>/dev/null
            log_warning "Rolled back to previous password"
        fi

        log_audit "${service_name},${secret_path},FAILED,credential_validation_error"
        return 1
    fi

    # Step 3: Update Vault with new password
    log_info "Updating Vault secrets..."

    # Get existing secret data to preserve other fields
    local vault_data
    vault_data=$(vault kv get -format=json "${secret_path}" 2>/dev/null | jq -r '.data.data' || echo "{}")

    # Update password field
    vault_data=$(echo "${vault_data}" | jq --arg pwd "${new_password}" '. + {password: $pwd}')

    # Write back to Vault
    if echo "${vault_data}" | vault kv put "${secret_path}" - > /dev/null 2>&1; then
        log_success "Vault secrets updated successfully"
    else
        log_error "Failed to update Vault secrets"
        log_audit "${service_name},${secret_path},FAILED,vault_update_error"
        return 1
    fi

    # Step 4: Final verification
    log_info "Performing final verification..."
    local vault_password
    vault_password=$(vault kv get -field=password "${secret_path}" 2>/dev/null)

    if [[ "${vault_password}" == "${new_password}" ]]; then
        log_success "Final verification passed - password rotation complete"
        log_audit "${service_name},${secret_path},SUCCESS,rotated"
        echo "$(date -Iseconds),${secret_path},rotated" >> "${ROTATION_LOG}"
        return 0
    else
        log_error "Final verification failed - Vault password mismatch"
        log_audit "${service_name},${secret_path},FAILED,verification_error"
        return 1
    fi
}

# Rotate ClickHouse credentials
rotate_clickhouse() {
    local service_name=$1
    local secret_path=$2
    local db_host=$3
    local db_port=${4:-9000}
    local db_name=$5
    local db_user=$6

    log_info "Rotating ClickHouse credentials for ${service_name}..."

    # Get current password from Vault
    local current_password
    current_password=$(vault kv get -field=password "${secret_path}" 2>/dev/null || echo "")

    if [[ -z "${current_password}" ]]; then
        log_warning "No existing password found in Vault"
    fi

    # Generate new password
    local new_password
    new_password=$(generate_password)

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_info "[DRY-RUN] Would rotate password for ${db_user}@${db_host}:${db_port}/${db_name}"
        log_info "[DRY-RUN] Would update Vault path: ${secret_path}"
        return 0
    fi

    # Step 1: Update password in ClickHouse
    log_info "Updating password in ClickHouse database..."
    if clickhouse-client --host="${db_host}" --port="${db_port}" --user="${db_user}" --password="${current_password}" --query="ALTER USER ${db_user} IDENTIFIED BY '${new_password}';" 2>/dev/null; then
        log_success "Database password updated successfully"
    else
        log_error "Failed to update password in ClickHouse"
        log_audit "${service_name},${secret_path},FAILED,clickhouse_update_error"
        return 1
    fi

    # Step 2: Test new credentials
    log_info "Testing new credentials..."
    if test_db_connection "clickhouse" "${db_host}" "${db_port}" "${db_name}" "${db_user}" "${new_password}"; then
        log_success "New credentials validated successfully"
    else
        log_error "New credentials failed validation, attempting rollback..."

        # Rollback: restore old password
        if [[ -n "${current_password}" ]]; then
            clickhouse-client --host="${db_host}" --port="${db_port}" --user="${db_user}" --password="${new_password}" --query="ALTER USER ${db_user} IDENTIFIED BY '${current_password}';" 2>/dev/null
            log_warning "Rolled back to previous password"
        fi

        log_audit "${service_name},${secret_path},FAILED,credential_validation_error"
        return 1
    fi

    # Step 3: Update Vault
    log_info "Updating Vault secrets..."

    local vault_data
    vault_data=$(vault kv get -format=json "${secret_path}" 2>/dev/null | jq -r '.data.data' || echo "{}")
    vault_data=$(echo "${vault_data}" | jq --arg pwd "${new_password}" '. + {password: $pwd}')

    if echo "${vault_data}" | vault kv put "${secret_path}" - > /dev/null 2>&1; then
        log_success "Vault secrets updated successfully"
    else
        log_error "Failed to update Vault secrets"
        log_audit "${service_name},${secret_path},FAILED,vault_update_error"
        return 1
    fi

    # Step 4: Final verification
    local vault_password
    vault_password=$(vault kv get -field=password "${secret_path}" 2>/dev/null)

    if [[ "${vault_password}" == "${new_password}" ]]; then
        log_success "Final verification passed - password rotation complete"
        log_audit "${service_name},${secret_path},SUCCESS,rotated"
        echo "$(date -Iseconds),${secret_path},rotated" >> "${ROTATION_LOG}"
        return 0
    else
        log_error "Final verification failed - Vault password mismatch"
        log_audit "${service_name},${secret_path},FAILED,verification_error"
        return 1
    fi
}

# Main rotation orchestration
rotate_all_services() {
    log_info "=== TEEI Secrets Rotation - Starting ==="
    log_info "Vault Address: ${VAULT_ADDR}"
    log_info "Namespace: ${VAULT_NAMESPACE}"

    if [[ "${DRY_RUN}" == "true" ]]; then
        log_warning "DRY-RUN MODE - No changes will be made"
    fi

    # Check Vault connectivity
    if ! vault status > /dev/null 2>&1; then
        log_error "Vault is not accessible at ${VAULT_ADDR}"
        exit 1
    fi
    log_success "Vault connectivity verified"

    # Check required tools
    for tool in psql clickhouse-client jq; do
        if ! command -v "${tool}" > /dev/null 2>&1; then
            log_error "Required tool not found: ${tool}"
            exit 1
        fi
    done
    log_success "All required tools available"

    local total_rotations=0
    local successful_rotations=0
    local failed_rotations=0

    # Rotate PostgreSQL credentials
    declare -A pg_services=(
        ["reporting"]="secret/teei/reporting:postgres-service:5432:teei_reporting:teei_reporting"
        ["unified-profile"]="secret/teei/unified-profile:postgres-service:5432:teei_profiles:teei_profiles"
        ["analytics"]="secret/teei/analytics:postgres-service:5432:teei_analytics:teei_analytics"
        ["impact-calculator"]="secret/teei/impact-calculator:postgres-service:5432:teei_impact:teei_impact"
    )

    for service in "${!pg_services[@]}"; do
        IFS=':' read -r secret_path db_host db_port db_name db_user <<< "${pg_services[$service]}"

        ((total_rotations++))

        if rotate_postgresql "${service}" "${secret_path}" "${db_host}" "${db_port}" "${db_name}" "${db_user}"; then
            ((successful_rotations++))
        else
            ((failed_rotations++))
            log_error "Failed to rotate credentials for ${service}"
        fi

        echo ""
    done

    # Rotate ClickHouse credentials
    declare -A ch_services=(
        ["analytics"]="secret/teei/analytics/clickhouse:clickhouse-service:9000:teei_analytics:teei_analytics"
        ["reporting"]="secret/teei/reporting/clickhouse:clickhouse-service:9000:teei_reporting:teei_reporting"
    )

    for service in "${!ch_services[@]}"; do
        IFS=':' read -r secret_path db_host db_port db_name db_user <<< "${ch_services[$service]}"

        ((total_rotations++))

        if rotate_clickhouse "${service}-clickhouse" "${secret_path}" "${db_host}" "${db_port}" "${db_name}" "${db_user}"; then
            ((successful_rotations++))
        else
            ((failed_rotations++))
            log_error "Failed to rotate ClickHouse credentials for ${service}"
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

# Rotate single service
rotate_single_service() {
    local service_name=$1

    log_info "Rotating credentials for service: ${service_name}"

    # Add logic to rotate specific service
    # This is a placeholder for service-specific rotation
    log_error "Single service rotation not yet implemented for: ${service_name}"
    exit 1
}

# Parse command line arguments
SERVICE=""
while [[ $# -gt 0 ]]; do
    case $1 in
        --service)
            SERVICE="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN="true"
            shift
            ;;
        --force)
            FORCE_ROTATION="true"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --service SERVICE   Rotate credentials for specific service"
            echo "  --dry-run          Simulate rotation without making changes"
            echo "  --force            Force rotation even if not due"
            echo "  --help             Show this help message"
            echo ""
            echo "Examples:"
            echo "  $0                                 # Rotate all services"
            echo "  $0 --dry-run                       # Dry run for all services"
            echo "  $0 --service reporting             # Rotate specific service"
            echo "  $0 --service reporting --dry-run   # Dry run for specific service"
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
if [[ -n "${SERVICE}" ]]; then
    rotate_single_service "${SERVICE}"
else
    rotate_all_services
fi
