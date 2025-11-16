#!/usr/bin/env bash
set -euo pipefail

##############################################################################
# DR Drill Evidence Verification Script
#
# Purpose: Verify integrity and authenticity of DR drill evidence bundles
#
# Verification Steps:
#   1. SHA-256 hash verification (data integrity)
#   2. GPG signature verification (authenticity)
#   3. Archive extraction and inspection
#   4. Evidence completeness check
#   5. Metrics validation
#
# Usage:
#   ./evidence-verify.sh <evidence-archive.zip>
#
# Example:
#   ./evidence-verify.sh evidence-DR-Drill-2025-11-16.zip
#
# Exit Codes:
#   0 - All verifications passed
#   1 - Verification failed
#   2 - Invalid usage or missing dependencies
#
# Requirements:
#   - GPG with public key imported
#   - sha256sum
#   - unzip
#   - jq
##############################################################################

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly VERIFY_DIR="/tmp/dr-evidence-verify-$$"
readonly REPORTS_DIR="${PROJECT_ROOT}/reports/worker1_phaseJ/DR_DRILL_EVIDENCE"

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# Verification status
VERIFICATION_PASSED=true

# Logging
log() {
  echo -e "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"
}

log_success() {
  echo -e "${GREEN}✓${NC} $*"
}

log_error() {
  echo -e "${RED}✗${NC} $*"
  VERIFICATION_PASSED=false
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $*"
}

log_info() {
  echo -e "${BLUE}ℹ${NC} $*"
}

error_exit() {
  log_error "$*"
  cleanup
  exit 1
}

cleanup() {
  if [[ -d "${VERIFY_DIR}" ]]; then
    log_info "Cleaning up verification directory..."
    rm -rf "${VERIFY_DIR}"
  fi
}

trap cleanup EXIT INT TERM

##############################################################################
# Usage
##############################################################################

usage() {
  cat >&2 <<EOF
Usage: $0 <evidence-archive.zip>

Verify the integrity and authenticity of a DR drill evidence bundle.

Arguments:
  evidence-archive.zip    Path to the evidence archive (with or without .zip extension)

Examples:
  $0 evidence-DR-Drill-2025-11-16.zip
  $0 /path/to/evidence-DR-Drill-2025-11-16.zip
  $0 evidence-DR-Drill-2025-11-16  (automatic .zip extension)

Exit Codes:
  0 - All verifications passed
  1 - Verification failed
  2 - Invalid usage or missing dependencies
EOF
  exit 2
}

if [[ $# -eq 0 ]]; then
  usage
fi

##############################################################################
# Pre-flight Checks
##############################################################################

log "DR Evidence Verification"
log "========================"
log ""

# Check dependencies
for cmd in gpg sha256sum unzip jq; do
  if ! command -v "${cmd}" &>/dev/null; then
    error_exit "Required command not found: ${cmd}"
  fi
done

# Resolve archive path
ARCHIVE_ARG="$1"

# Add .zip extension if not present
if [[ ! "${ARCHIVE_ARG}" =~ \.zip$ ]]; then
  ARCHIVE_ARG="${ARCHIVE_ARG}.zip"
fi

# Check if file exists
if [[ ! -f "${ARCHIVE_ARG}" ]]; then
  # Try in reports directory
  if [[ -f "${REPORTS_DIR}/${ARCHIVE_ARG}" ]]; then
    ARCHIVE_PATH="${REPORTS_DIR}/${ARCHIVE_ARG}"
  elif [[ -f "${REPORTS_DIR}/$(basename "${ARCHIVE_ARG}")" ]]; then
    ARCHIVE_PATH="${REPORTS_DIR}/$(basename "${ARCHIVE_ARG}")"
  else
    error_exit "Evidence archive not found: ${ARCHIVE_ARG}"
  fi
else
  ARCHIVE_PATH="${ARCHIVE_ARG}"
fi

ARCHIVE_PATH="$(realpath "${ARCHIVE_PATH}")"
ARCHIVE_NAME="$(basename "${ARCHIVE_PATH}")"
ARCHIVE_DIR="$(dirname "${ARCHIVE_PATH}")"

log_info "Archive: ${ARCHIVE_PATH}"
log_info "Size: $(du -h "${ARCHIVE_PATH}" | cut -f1)"
log ""

##############################################################################
# Step 1: SHA-256 Hash Verification
##############################################################################

log "Step 1: Verifying SHA-256 Hash"
log "--------------------------------"

HASH_FILE="${ARCHIVE_PATH}.sha256"

if [[ ! -f "${HASH_FILE}" ]]; then
  log_error "SHA-256 hash file not found: ${HASH_FILE}"
  log_warning "Skipping hash verification (NOT RECOMMENDED)"
else
  # Verify hash
  cd "${ARCHIVE_DIR}"
  if sha256sum -c "${ARCHIVE_NAME}.sha256" 2>&1 | grep -q "OK"; then
    log_success "SHA-256 hash verification passed"
    STORED_HASH=$(cut -d' ' -f1 "${HASH_FILE}")
    log_info "Hash: ${STORED_HASH}"
  else
    log_error "SHA-256 hash verification FAILED"
    log_error "Archive may be corrupted or tampered with"
  fi
fi

log ""

##############################################################################
# Step 2: GPG Signature Verification
##############################################################################

log "Step 2: Verifying GPG Signature"
log "--------------------------------"

SIG_FILE="${ARCHIVE_PATH}.sig"

if [[ ! -f "${SIG_FILE}" ]]; then
  log_error "GPG signature file not found: ${SIG_FILE}"
  log_warning "Cannot verify authenticity (NOT RECOMMENDED)"
else
  # Verify signature
  if gpg --verify "${SIG_FILE}" "${ARCHIVE_PATH}" 2>&1; then
    log_success "GPG signature verification passed"

    # Extract signer information
    SIGNER=$(gpg --verify "${SIG_FILE}" "${ARCHIVE_PATH}" 2>&1 | grep "Good signature" | sed -n 's/.*from "\(.*\)"/\1/p')
    FINGERPRINT=$(gpg --verify "${SIG_FILE}" "${ARCHIVE_PATH}" 2>&1 | grep "Primary key fingerprint:" | sed 's/.*: //')

    if [[ -n "${SIGNER}" ]]; then
      log_info "Signed by: ${SIGNER}"
    fi
    if [[ -n "${FINGERPRINT}" ]]; then
      log_info "Fingerprint: ${FINGERPRINT}"
    fi
  else
    log_error "GPG signature verification FAILED"
    log_error "Archive authenticity cannot be confirmed"
  fi
fi

log ""

##############################################################################
# Step 3: Extract and Inspect Archive
##############################################################################

log "Step 3: Extracting Archive"
log "--------------------------------"

mkdir -p "${VERIFY_DIR}"
cd "${VERIFY_DIR}"

if unzip -q "${ARCHIVE_PATH}"; then
  log_success "Archive extracted successfully"

  # Find extracted directory
  EXTRACTED_DIR=$(find . -maxdepth 1 -type d ! -name "." | head -1)
  if [[ -z "${EXTRACTED_DIR}" ]]; then
    log_error "No directory found in archive"
  else
    log_info "Extracted to: ${EXTRACTED_DIR}"
  fi
else
  log_error "Failed to extract archive"
  EXTRACTED_DIR=""
fi

log ""

##############################################################################
# Step 4: Evidence Completeness Check
##############################################################################

log "Step 4: Checking Evidence Completeness"
log "--------------------------------"

if [[ -n "${EXTRACTED_DIR}" && -d "${EXTRACTED_DIR}" ]]; then
  cd "${EXTRACTED_DIR}"

  # Required files
  declare -A REQUIRED_FILES=(
    ["metrics.json"]="RTO/RPO measurements"
    ["health-checks.log"]="Service health validation"
    ["failover.log"]="Failover execution log"
    ["MANIFEST.md"]="Evidence manifest"
  )

  # Check required files
  ALL_REQUIRED_PRESENT=true
  for file in "${!REQUIRED_FILES[@]}"; do
    if [[ -f "${file}" ]]; then
      log_success "${file} - ${REQUIRED_FILES[$file]}"
    else
      log_error "${file} - MISSING (${REQUIRED_FILES[$file]})"
      ALL_REQUIRED_PRESENT=false
    fi
  done

  # Check directories
  log ""
  log_info "Checking directories:"

  if [[ -d "deployment-states" ]]; then
    DEPLOYMENT_COUNT=$(find deployment-states -name "*.yaml" | wc -l)
    log_success "deployment-states/ - ${DEPLOYMENT_COUNT} files"
  else
    log_warning "deployment-states/ - directory not found"
  fi

  if [[ -d "screenshots" ]]; then
    SCREENSHOT_COUNT=$(find screenshots -name "*.png" -o -name "*.jpg" | wc -l)
    if [[ ${SCREENSHOT_COUNT} -gt 0 ]]; then
      log_success "screenshots/ - ${SCREENSHOT_COUNT} files"
    else
      log_info "screenshots/ - no screenshots (optional)"
    fi
  else
    log_info "screenshots/ - directory not found (optional)"
  fi
else
  log_error "Cannot check evidence completeness - extraction failed"
  ALL_REQUIRED_PRESENT=false
fi

log ""

##############################################################################
# Step 5: Metrics Validation
##############################################################################

log "Step 5: Validating Drill Metrics"
log "--------------------------------"

if [[ -f "${EXTRACTED_DIR}/metrics.json" ]]; then
  METRICS_FILE="${EXTRACTED_DIR}/metrics.json"

  # Validate JSON structure
  if jq empty "${METRICS_FILE}" 2>/dev/null; then
    log_success "metrics.json is valid JSON"

    # Extract and display key metrics
    DRILL_NAME=$(jq -r '.drill_name // "N/A"' "${METRICS_FILE}")
    TIMESTAMP=$(jq -r '.timestamp // "N/A"' "${METRICS_FILE}")
    RTO_SECONDS=$(jq -r '.rto_seconds // 0' "${METRICS_FILE}")
    RPO_SECONDS=$(jq -r '.rpo_seconds // 0' "${METRICS_FILE}")
    SERVICES_COUNT=$(jq -r '.services_failed_over // 0' "${METRICS_FILE}")
    HEALTH_SUCCESS=$(jq -r '.health_check_success // false' "${METRICS_FILE}")
    STATUS=$(jq -r '.status // "unknown"' "${METRICS_FILE}")

    log ""
    log_info "Drill Metrics:"
    log_info "  Drill Name: ${DRILL_NAME}"
    log_info "  Timestamp: ${TIMESTAMP}"
    log_info "  Status: ${STATUS}"
    log_info "  RTO: ${RTO_SECONDS} seconds ($(echo "scale=2; ${RTO_SECONDS}/60" | bc 2>/dev/null || echo "0") minutes)"
    log_info "  RPO: ${RPO_SECONDS} seconds"
    log_info "  Services Failed Over: ${SERVICES_COUNT}"
    log_info "  Health Check: ${HEALTH_SUCCESS}"

    # Validate RTO target (should be <15 minutes)
    if [[ "${STATUS}" == "completed" ]]; then
      RTO_TARGET_SECONDS=900  # 15 minutes
      if [[ ${RTO_SECONDS} -le ${RTO_TARGET_SECONDS} ]]; then
        log_success "RTO within target (<15 minutes)"
      else
        log_warning "RTO exceeds target (${RTO_SECONDS}s > ${RTO_TARGET_SECONDS}s)"
      fi

      # Validate health check
      if [[ "${HEALTH_SUCCESS}" == "true" ]]; then
        log_success "Health check passed"
      else
        log_warning "Health check failed or incomplete"
      fi
    else
      log_info "Drill status: ${STATUS} (validation skipped)"
    fi

  else
    log_error "metrics.json is not valid JSON"
  fi
else
  log_error "metrics.json not found - cannot validate metrics"
fi

log ""

##############################################################################
# Step 6: Generate Verification Report
##############################################################################

log "Step 6: Generating Verification Report"
log "--------------------------------"

REPORT_FILE="${ARCHIVE_DIR}/verification-report-$(date -u +%Y%m%d-%H%M%S).txt"

cat > "${REPORT_FILE}" <<EOF
================================================================================
DR EVIDENCE VERIFICATION REPORT
================================================================================

Verification Date:  $(date -u +%Y-%m-%dT%H:%M:%SZ)
Verified By:        $(whoami)@$(hostname)
Archive:            ${ARCHIVE_NAME}

--------------------------------------------------------------------------------
VERIFICATION RESULTS
--------------------------------------------------------------------------------

SHA-256 Hash:       $( [[ -f "${HASH_FILE}" ]] && sha256sum -c "${ARCHIVE_NAME}.sha256" 2>&1 | grep -q "OK" && echo "✓ PASSED" || echo "✗ FAILED or SKIPPED" )
GPG Signature:      $( [[ -f "${SIG_FILE}" ]] && gpg --verify "${SIG_FILE}" "${ARCHIVE_PATH}" &>/dev/null && echo "✓ PASSED" || echo "✗ FAILED or SKIPPED" )
Archive Extraction: $( [[ -n "${EXTRACTED_DIR}" ]] && echo "✓ PASSED" || echo "✗ FAILED" )
Evidence Complete:  $( [[ "${ALL_REQUIRED_PRESENT}" == "true" ]] && echo "✓ PASSED" || echo "✗ FAILED" )

--------------------------------------------------------------------------------
DRILL INFORMATION
--------------------------------------------------------------------------------

EOF

if [[ -f "${EXTRACTED_DIR}/metrics.json" ]]; then
  cat "${EXTRACTED_DIR}/metrics.json" | jq -r 'to_entries | .[] | "\(.key | ascii_upcase): \(.value)"' >> "${REPORT_FILE}"
else
  echo "Metrics not available" >> "${REPORT_FILE}"
fi

cat >> "${REPORT_FILE}" <<EOF

--------------------------------------------------------------------------------
EVIDENCE FILES
--------------------------------------------------------------------------------

EOF

if [[ -n "${EXTRACTED_DIR}" && -d "${EXTRACTED_DIR}" ]]; then
  (cd "${EXTRACTED_DIR}" && find . -type f | sort) >> "${REPORT_FILE}"
else
  echo "Archive contents not available" >> "${REPORT_FILE}"
fi

cat >> "${REPORT_FILE}" <<EOF

--------------------------------------------------------------------------------
VERIFICATION STATUS
--------------------------------------------------------------------------------

Overall Status: $( [[ "${VERIFICATION_PASSED}" == "true" ]] && echo "✓ PASSED - Evidence is authentic and complete" || echo "✗ FAILED - Verification issues detected" )

================================================================================
EOF

log_success "Verification report saved: ${REPORT_FILE}"

log ""

##############################################################################
# Summary
##############################################################################

log "================================"
log "Verification Summary"
log "================================"
log ""

if [[ "${VERIFICATION_PASSED}" == "true" ]]; then
  log_success "All verifications PASSED"
  log ""
  log_info "Evidence bundle is:"
  log_info "  ✓ Authentic (signature verified)"
  log_info "  ✓ Intact (hash verified)"
  log_info "  ✓ Complete (all required files present)"
  log ""
  log_info "Archive contents: ${VERIFY_DIR}/${EXTRACTED_DIR}"
  log_info "Verification report: ${REPORT_FILE}"
  log ""
  log_success "Evidence bundle is ready for audit/compliance review"
  exit 0
else
  log_error "Verification FAILED"
  log ""
  log_warning "Issues detected:"
  log_warning "  - Check verification report for details"
  log_warning "  - Evidence may be incomplete or tampered"
  log_warning "  - DO NOT use for compliance/audit purposes"
  log ""
  log_info "Verification report: ${REPORT_FILE}"
  log ""
  exit 1
fi
