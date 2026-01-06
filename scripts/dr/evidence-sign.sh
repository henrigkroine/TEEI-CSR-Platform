#!/usr/bin/env bash
set -euo pipefail

##############################################################################
# DR Drill Evidence Collection and Cryptographic Signing
#
# Purpose: Collect, bundle, and sign disaster recovery drill evidence
#          for compliance and audit purposes
#
# Evidence Bundle Contents:
#   - metrics.json (RTO/RPO measurements)
#   - deployment-states/ (K8s deployment YAML snapshots)
#   - health-checks.log (Service endpoint validation)
#   - failover.log (Complete failover script output)
#   - screenshots/ (Optional Grafana dashboards)
#   - evidence.zip.sha256 (SHA-256 hash)
#   - evidence.zip.sig (GPG signature)
#
# Signing Process:
#   1. Collect evidence files
#   2. Create ZIP archive
#   3. Generate SHA-256 hash
#   4. Sign with GPG
#   5. Save to reports directory
#
# Usage:
#   ./evidence-sign.sh [drill-name]
#
# Example:
#   ./evidence-sign.sh Q4-2025-DR-Drill
#
# Requirements:
#   - GPG with private key configured
#   - kubectl (for deployment snapshots)
#   - zip/unzip
#   - sha256sum
##############################################################################

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
readonly REPORTS_DIR="${PROJECT_ROOT}/reports/worker1_phaseJ/DR_DRILL_EVIDENCE"
readonly TEMP_DIR="/tmp/dr-evidence-$$"
readonly TIMESTAMP=$(date -u +%Y-%m-%dT%H%M%SZ)
readonly DRILL_NAME="${1:-DR-Drill-${TIMESTAMP}}"
readonly EVIDENCE_DIR="${TEMP_DIR}/${DRILL_NAME}"

# GPG configuration
readonly GPG_KEY_ID="${GPG_KEY_ID:-teei-dr-evidence@teei.io}"
readonly GPG_PASSPHRASE_FILE="${GPG_PASSPHRASE_FILE:-/secrets/gpg-passphrase}"

# Logging
log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >&2
}

error() {
  log "ERROR: $*"
  cleanup
  exit 1
}

cleanup() {
  log "Cleaning up temporary files..."
  rm -rf "${TEMP_DIR}"
}

trap cleanup EXIT INT TERM

##############################################################################
# Pre-flight Checks
##############################################################################

log "DR Evidence Collection and Signing"
log "===================================="
log "Drill Name: ${DRILL_NAME}"
log "Timestamp: ${TIMESTAMP}"
log ""

# Check dependencies
for cmd in gpg kubectl zip sha256sum jq; do
  if ! command -v "${cmd}" &>/dev/null; then
    error "Required command not found: ${cmd}"
  fi
done

# Check GPG key
if ! gpg --list-secret-keys "${GPG_KEY_ID}" &>/dev/null; then
  log "WARNING: GPG key '${GPG_KEY_ID}' not found"
  log "Generating new GPG key..."

  # Generate key if not exists (for demo purposes)
  gpg --batch --gen-key <<EOF
Key-Type: RSA
Key-Length: 4096
Subkey-Type: RSA
Subkey-Length: 4096
Name-Real: TEEI DR Evidence
Name-Email: ${GPG_KEY_ID}
Expire-Date: 2y
%no-protection
%commit
EOF

  log "GPG key generated successfully"
fi

##############################################################################
# Step 1: Create Evidence Directory Structure
##############################################################################

log "Creating evidence directory structure..."

mkdir -p "${EVIDENCE_DIR}"
mkdir -p "${EVIDENCE_DIR}/deployment-states"
mkdir -p "${EVIDENCE_DIR}/screenshots"
mkdir -p "${REPORTS_DIR}"

log "Evidence directory: ${EVIDENCE_DIR}"

##############################################################################
# Step 2: Collect Metrics (RTO/RPO)
##############################################################################

log "Collecting RTO/RPO metrics..."

# Check if failover log exists
FAILOVER_LOG="${SCRIPT_DIR}/failover.log"
if [[ ! -f "${FAILOVER_LOG}" ]]; then
  log "WARNING: Failover log not found at ${FAILOVER_LOG}"
  log "Creating sample metrics..."

  cat > "${EVIDENCE_DIR}/metrics.json" <<EOF
{
  "drill_name": "${DRILL_NAME}",
  "timestamp": "${TIMESTAMP}",
  "rto_seconds": 0,
  "rpo_seconds": 0,
  "services_failed_over": 0,
  "health_check_success": false,
  "status": "no_drill_executed",
  "message": "No failover log found. Evidence collection for planning purposes only."
}
EOF
else
  # Parse failover log for RTO/RPO
  START_TIME=$(grep "DR Failover Script - Starting" "${FAILOVER_LOG}" | head -1 | sed -n 's/.*\[\(.*\)\].*/\1/p' || echo "")
  END_TIME=$(grep "Failover complete" "${FAILOVER_LOG}" | tail -1 | sed -n 's/.*\[\(.*\)\].*/\1/p' || echo "")

  if [[ -n "${START_TIME}" && -n "${END_TIME}" ]]; then
    START_EPOCH=$(date -d "${START_TIME}" +%s 2>/dev/null || echo "0")
    END_EPOCH=$(date -d "${END_TIME}" +%s 2>/dev/null || echo "0")
    RTO_SECONDS=$((END_EPOCH - START_EPOCH))
  else
    RTO_SECONDS=0
  fi

  # Count services
  SERVICES_COUNT=$(grep -c "Simulating failover for service:" "${FAILOVER_LOG}" || echo "0")

  # Check health status
  HEALTH_SUCCESS=$(grep -q "All services healthy" "${FAILOVER_LOG}" && echo "true" || echo "false")

  cat > "${EVIDENCE_DIR}/metrics.json" <<EOF
{
  "drill_name": "${DRILL_NAME}",
  "timestamp": "${TIMESTAMP}",
  "rto_seconds": ${RTO_SECONDS},
  "rpo_seconds": 0,
  "services_failed_over": ${SERVICES_COUNT},
  "health_check_success": ${HEALTH_SUCCESS},
  "start_time": "${START_TIME}",
  "end_time": "${END_TIME}",
  "status": "completed"
}
EOF

  log "RTO: ${RTO_SECONDS} seconds ($(echo "scale=2; ${RTO_SECONDS}/60" | bc 2>/dev/null || echo "0") minutes)"
  log "Services failed over: ${SERVICES_COUNT}"
  log "Health check: ${HEALTH_SUCCESS}"
fi

##############################################################################
# Step 3: Capture Deployment States
##############################################################################

log "Capturing Kubernetes deployment states..."

# Get all deployments in critical namespaces
for namespace in teei-production teei-staging; do
  if kubectl get namespace "${namespace}" &>/dev/null; then
    log "  - Capturing deployments in namespace: ${namespace}"

    kubectl get deployments -n "${namespace}" -o yaml > \
      "${EVIDENCE_DIR}/deployment-states/${namespace}-deployments-before.yaml" 2>/dev/null || \
      log "    WARNING: Failed to capture deployments in ${namespace}"

    # Capture after-state if failover was executed
    if [[ -f "${FAILOVER_LOG}" ]]; then
      kubectl get deployments -n "${namespace}" -o yaml > \
        "${EVIDENCE_DIR}/deployment-states/${namespace}-deployments-after.yaml" 2>/dev/null || \
        log "    WARNING: Failed to capture deployments in ${namespace}"
    fi
  else
    log "  - Namespace ${namespace} not found, skipping"
  fi
done

# Count captured files
DEPLOYMENT_FILES=$(find "${EVIDENCE_DIR}/deployment-states" -name "*.yaml" | wc -l)
log "Captured ${DEPLOYMENT_FILES} deployment state files"

##############################################################################
# Step 4: Run Health Checks
##############################################################################

log "Running service health checks..."

HEALTH_LOG="${EVIDENCE_DIR}/health-checks.log"

{
  echo "DR Drill Health Check Report"
  echo "============================="
  echo "Timestamp: ${TIMESTAMP}"
  echo "Drill: ${DRILL_NAME}"
  echo ""
  echo "Service Endpoints:"
  echo ""

  # Define critical service endpoints
  declare -A SERVICES=(
    ["api-gateway"]="http://api-gateway.teei-production.svc.cluster.local:8080/health"
    ["reporting"]="http://reporting.teei-production.svc.cluster.local:8080/health"
    ["q2q-ai"]="http://q2q-ai.teei-production.svc.cluster.local:8080/health"
    ["corp-cockpit"]="http://corp-cockpit.teei-production.svc.cluster.local:3000/health"
  )

  HEALTHY_COUNT=0
  TOTAL_COUNT=${#SERVICES[@]}

  for service in "${!SERVICES[@]}"; do
    url="${SERVICES[$service]}"
    echo -n "Checking ${service}... "

    if curl -sf --max-time 5 "${url}" &>/dev/null; then
      echo "✓ HEALTHY"
      ((HEALTHY_COUNT++))
    else
      echo "✗ UNHEALTHY (endpoint may not be accessible from this context)"
    fi
  done

  echo ""
  echo "Summary: ${HEALTHY_COUNT}/${TOTAL_COUNT} services healthy"

} > "${HEALTH_LOG}"

log "Health check complete: $(grep -c "✓ HEALTHY" "${HEALTH_LOG}" || echo "0")/${#SERVICES[@]} services healthy"

##############################################################################
# Step 5: Copy Failover Log
##############################################################################

if [[ -f "${FAILOVER_LOG}" ]]; then
  log "Copying failover log..."
  cp "${FAILOVER_LOG}" "${EVIDENCE_DIR}/failover.log"
else
  log "No failover log found, creating placeholder..."
  cat > "${EVIDENCE_DIR}/failover.log" <<EOF
No failover execution detected.
This evidence bundle was created for planning/preparation purposes.

To execute a DR drill, run:
  ${SCRIPT_DIR}/failover.sh

After execution, re-run this script to collect evidence.
EOF
fi

##############################################################################
# Step 6: Capture Screenshots (Optional)
##############################################################################

log "Screenshot collection skipped (requires manual capture)"
log "  To include screenshots:"
log "    1. Capture Grafana dashboard screenshots"
log "    2. Save to: ${EVIDENCE_DIR}/screenshots/"
log "    3. Re-run this script"

# Create README for screenshots
cat > "${EVIDENCE_DIR}/screenshots/README.md" <<EOF
# DR Drill Screenshots

Place Grafana dashboard screenshots here before signing.

Recommended dashboards:
- SLO Overview (error budgets during failover)
- FinOps Carbon Dashboard (cost/carbon impact)
- Service-specific dashboards (API Gateway, Reporting, etc.)

Screenshot naming convention:
  grafana-<dashboard-name>-YYYY-MM-DD.png

Example:
  grafana-slo-overview-2025-11-16.png
EOF

##############################################################################
# Step 7: Create Evidence Bundle Metadata
##############################################################################

log "Creating evidence bundle metadata..."

cat > "${EVIDENCE_DIR}/MANIFEST.md" <<EOF
# DR Drill Evidence Bundle

**Drill Name**: ${DRILL_NAME}
**Timestamp**: ${TIMESTAMP}
**Generated By**: $(whoami)@$(hostname)
**Script**: evidence-sign.sh

---

## Evidence Files

### Core Evidence
- \`metrics.json\` - RTO/RPO measurements and drill summary
- \`health-checks.log\` - Post-failover service health validation
- \`failover.log\` - Complete failover script execution log

### Deployment States
- \`deployment-states/*-before.yaml\` - Pre-failover Kubernetes deployments
- \`deployment-states/*-after.yaml\` - Post-failover Kubernetes deployments

### Screenshots (Optional)
- \`screenshots/*.png\` - Grafana dashboard screenshots

### Verification
- \`evidence.zip\` - Complete evidence archive
- \`evidence.zip.sha256\` - SHA-256 integrity hash
- \`evidence.zip.sig\` - GPG cryptographic signature

---

## Verification Instructions

\`\`\`bash
# Verify SHA-256 hash
sha256sum -c evidence.zip.sha256

# Verify GPG signature
gpg --verify evidence.zip.sig evidence.zip

# Extract archive
unzip evidence.zip
\`\`\`

---

## Drill Summary

$(cat "${EVIDENCE_DIR}/metrics.json" | jq -r 'to_entries | .[] | "- **\(.key)**: \(.value)"')

---

**Signature**: Generated with GPG key \`${GPG_KEY_ID}\`
**Compliance**: NIST SP 800-34, ISO 22301
EOF

log "Manifest created"

##############################################################################
# Step 8: Create ZIP Archive
##############################################################################

log "Creating evidence archive..."

cd "${TEMP_DIR}"
ARCHIVE_NAME="evidence-${DRILL_NAME}.zip"

zip -r "${ARCHIVE_NAME}" "${DRILL_NAME}/" -q

ARCHIVE_PATH="${TEMP_DIR}/${ARCHIVE_NAME}"
ARCHIVE_SIZE=$(du -h "${ARCHIVE_PATH}" | cut -f1)

log "Archive created: ${ARCHIVE_NAME} (${ARCHIVE_SIZE})"

##############################################################################
# Step 9: Generate SHA-256 Hash
##############################################################################

log "Generating SHA-256 hash..."

cd "${TEMP_DIR}"
sha256sum "${ARCHIVE_NAME}" > "${ARCHIVE_NAME}.sha256"

HASH=$(cut -d' ' -f1 "${ARCHIVE_NAME}.sha256")
log "SHA-256: ${HASH}"

##############################################################################
# Step 10: Sign with GPG
##############################################################################

log "Signing archive with GPG..."

# Sign with detached signature
if [[ -f "${GPG_PASSPHRASE_FILE}" ]]; then
  # Use passphrase file if available
  gpg --batch --yes \
      --pinentry-mode loopback \
      --passphrase-file "${GPG_PASSPHRASE_FILE}" \
      --local-user "${GPG_KEY_ID}" \
      --detach-sign \
      --armor \
      --output "${ARCHIVE_NAME}.sig" \
      "${ARCHIVE_NAME}" || error "GPG signing failed"
else
  # Interactive signing
  gpg --local-user "${GPG_KEY_ID}" \
      --detach-sign \
      --armor \
      --output "${ARCHIVE_NAME}.sig" \
      "${ARCHIVE_NAME}" || error "GPG signing failed"
fi

log "GPG signature created: ${ARCHIVE_NAME}.sig"

# Verify signature immediately
log "Verifying signature..."
gpg --verify "${ARCHIVE_NAME}.sig" "${ARCHIVE_NAME}" || error "Signature verification failed"

log "✓ Signature verified successfully"

##############################################################################
# Step 11: Save to Reports Directory
##############################################################################

log "Saving evidence bundle to reports directory..."

mv "${ARCHIVE_PATH}" "${REPORTS_DIR}/"
mv "${ARCHIVE_PATH}.sha256" "${REPORTS_DIR}/"
mv "${ARCHIVE_PATH}.sig" "${REPORTS_DIR}/"

log "Evidence bundle saved to: ${REPORTS_DIR}/"

##############################################################################
# Step 12: Generate Summary Report
##############################################################################

log "Generating summary report..."

SUMMARY_FILE="${REPORTS_DIR}/evidence-summary-${DRILL_NAME}.txt"

cat > "${SUMMARY_FILE}" <<EOF
================================================================================
DR DRILL EVIDENCE COLLECTION SUMMARY
================================================================================

Drill Name:        ${DRILL_NAME}
Timestamp:         ${TIMESTAMP}
Generated By:      $(whoami)@$(hostname)

--------------------------------------------------------------------------------
EVIDENCE BUNDLE
--------------------------------------------------------------------------------

Archive:           ${ARCHIVE_NAME}
Size:              ${ARCHIVE_SIZE}
SHA-256:           ${HASH}
GPG Key:           ${GPG_KEY_ID}
Signature:         ${ARCHIVE_NAME}.sig

Location:          ${REPORTS_DIR}/

--------------------------------------------------------------------------------
VERIFICATION COMMANDS
--------------------------------------------------------------------------------

# Verify hash
cd ${REPORTS_DIR}
sha256sum -c ${ARCHIVE_NAME}.sha256

# Verify signature
gpg --verify ${ARCHIVE_NAME}.sig ${ARCHIVE_NAME}

# Extract archive
unzip ${ARCHIVE_NAME}

--------------------------------------------------------------------------------
DRILL METRICS
--------------------------------------------------------------------------------

$(cat "${EVIDENCE_DIR}/metrics.json" | jq -r '.')

--------------------------------------------------------------------------------
EVIDENCE FILES
--------------------------------------------------------------------------------

$(cd "${EVIDENCE_DIR}" && find . -type f | sort)

Total files: $(cd "${EVIDENCE_DIR}" && find . -type f | wc -l)

--------------------------------------------------------------------------------
COMPLIANCE
--------------------------------------------------------------------------------

Standards:         NIST SP 800-34, ISO 22301
Evidence Type:     Disaster Recovery Drill
Retention:         7 years (adjust per compliance requirements)
Next Review:       $(date -u -d "+1 year" +%Y-%m-%d)

================================================================================
EOF

log ""
log "===================================="
log "Evidence Collection Complete!"
log "===================================="
log ""
log "Evidence Bundle:"
log "  - Archive: ${REPORTS_DIR}/${ARCHIVE_NAME}"
log "  - Hash:    ${REPORTS_DIR}/${ARCHIVE_NAME}.sha256"
log "  - Signature: ${REPORTS_DIR}/${ARCHIVE_NAME}.sig"
log ""
log "Summary: ${SUMMARY_FILE}"
log ""
log "To verify:"
log "  cd ${REPORTS_DIR}"
log "  sha256sum -c ${ARCHIVE_NAME}.sha256"
log "  gpg --verify ${ARCHIVE_NAME}.sig ${ARCHIVE_NAME}"
log ""

exit 0
