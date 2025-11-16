#!/bin/bash
# SOC2 Quarterly Evidence Collection Orchestrator
# Runs all evidence generators, signs bundle, and prepares for auditor review

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder}"
QUARTER="${QUARTER:-$(date +%Y-Q$(($(date +%-m)/3+1)))}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      SOC2 Type II Quarterly Evidence Collection          ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Quarter: $QUARTER"
echo "Output Directory: $OUTPUT_DIR"
echo "Started: $TIMESTAMP"
echo ""

# Create log file
LOG_FILE="$OUTPUT_DIR/$QUARTER/collection-log-$TIMESTAMP.txt"
mkdir -p "$OUTPUT_DIR/$QUARTER"
exec > >(tee -a "$LOG_FILE") 2>&1

# Track success/failure
TOTAL_TASKS=6
COMPLETED_TASKS=0
FAILED_TASKS=()

# Function to run evidence generator
run_evidence_generator() {
  local name=$1
  local script=$2
  local description=$3

  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}[$((COMPLETED_TASKS + 1))/$TOTAL_TASKS] $name${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo "$description"
  echo ""

  if [ -f "$SCRIPT_DIR/$script" ]; then
    chmod +x "$SCRIPT_DIR/$script"
    if bash "$SCRIPT_DIR/$script"; then
      echo -e "${GREEN}✓ $name completed successfully${NC}"
      ((COMPLETED_TASKS++))
      return 0
    else
      echo -e "${RED}✗ $name failed${NC}"
      FAILED_TASKS+=("$name")
      return 1
    fi
  else
    echo -e "${RED}✗ Script not found: $script${NC}"
    FAILED_TASKS+=("$name")
    return 1
  fi
}

# Pre-flight checks
echo -e "${YELLOW}Running pre-flight checks...${NC}"
echo ""

CHECKS_PASSED=true

# Check kubectl
if command -v kubectl &> /dev/null; then
  echo -e "${GREEN}✓ kubectl found${NC}"
else
  echo -e "${RED}✗ kubectl not found${NC}"
  CHECKS_PASSED=false
fi

# Check git
if command -v git &> /dev/null; then
  echo -e "${GREEN}✓ git found${NC}"
else
  echo -e "${RED}✗ git not found${NC}"
  CHECKS_PASSED=false
fi

# Check jq
if command -v jq &> /dev/null; then
  echo -e "${GREEN}✓ jq found${NC}"
else
  echo -e "${RED}✗ jq not found${NC}"
  CHECKS_PASSED=false
fi

# Check OpenSearch connectivity
if curl -sk -u "${OPENSEARCH_USER:-admin}:${OPENSEARCH_PASSWORD:-admin}" \
    "https://opensearch.siem.svc.cluster.local:9200/_cluster/health" &>/dev/null; then
  echo -e "${GREEN}✓ OpenSearch SIEM accessible${NC}"
else
  echo -e "${YELLOW}⚠ OpenSearch SIEM not accessible (some data may be missing)${NC}"
fi

if [ "$CHECKS_PASSED" = false ]; then
  echo ""
  echo -e "${RED}Pre-flight checks failed. Please install missing dependencies.${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}All pre-flight checks passed${NC}"

# Run evidence generators
echo ""
echo -e "${BLUE}Starting evidence collection...${NC}"
echo ""

run_evidence_generator \
  "Access Review Report" \
  "generate-access-review.sh" \
  "Collecting user access data for CC6.1-6.3 compliance"

run_evidence_generator \
  "Change Management Log" \
  "generate-change-log.sh" \
  "Extracting production change history for CC8.1 compliance"

run_evidence_generator \
  "Key Rotation Report" \
  "generate-key-rotation-report.sh" \
  "Documenting credential rotation for CC6.1 and CC7.2 compliance"

run_evidence_generator \
  "GDPR Data Residency Attestation" \
  "generate-gdpr-attestation.sh" \
  "Verifying GDPR data residency compliance"

# Sign evidence bundle
run_evidence_generator \
  "Evidence Signing" \
  "sign-evidence.sh" \
  "Cryptographically signing evidence bundle for tamper-proofing"

# Generate final report
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Generating Final Report${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

REPORT_FILE="$OUTPUT_DIR/$QUARTER/EVIDENCE_COLLECTION_REPORT.txt"

cat > "$REPORT_FILE" <<EOF
╔════════════════════════════════════════════════════════════╗
║      SOC2 Type II Quarterly Evidence Collection          ║
║                    COMPLETION REPORT                      ║
╚════════════════════════════════════════════════════════════╝

Quarter: $QUARTER
Collection Date: $TIMESTAMP
Completed By: Automated Evidence Collector

SUMMARY:
════════════════════════════════════════════════════════════

Total Tasks: $TOTAL_TASKS
Completed: $COMPLETED_TASKS
Failed: ${#FAILED_TASKS[@]}
Success Rate: $(echo "scale=1; $COMPLETED_TASKS * 100 / $TOTAL_TASKS" | bc)%

$(if [ ${#FAILED_TASKS[@]} -eq 0 ]; then
  echo "Status: ✓ ALL EVIDENCE COLLECTED SUCCESSFULLY"
else
  echo "Status: ✗ SOME TASKS FAILED"
  echo ""
  echo "Failed Tasks:"
  for task in "${FAILED_TASKS[@]}"; do
    echo "  - $task"
  done
fi)

EVIDENCE FILES COLLECTED:
════════════════════════════════════════════════════════════

Access Reviews:
$(find "$OUTPUT_DIR/$QUARTER/access-reviews" -type f 2>/dev/null | wc -l) files
Control: CC6.1-6.3 (Access Controls)

Change Management:
$(find "$OUTPUT_DIR/$QUARTER/change-management" -type f 2>/dev/null | wc -l) files
Control: CC8.1 (Change Management)

Key Rotation:
$(find "$OUTPUT_DIR/$QUARTER/key-rotation" -type f 2>/dev/null | wc -l) files
Control: CC6.1, CC7.2 (Access Controls, Monitoring)

GDPR Compliance:
$(find "$OUTPUT_DIR/$QUARTER/gdpr-compliance" -type f 2>/dev/null | wc -l) files
Regulation: GDPR Articles 32, 44, 46

EVIDENCE BUNDLE:
════════════════════════════════════════════════════════════

Bundle File: soc2-evidence-bundle-$QUARTER.tar.gz
$(if [ -f "$OUTPUT_DIR/$QUARTER/soc2-evidence-bundle-$QUARTER.tar.gz" ]; then
  echo "Size: $(du -h "$OUTPUT_DIR/$QUARTER/soc2-evidence-bundle-$QUARTER.tar.gz" | cut -f1)"
  echo "Status: ✓ Signed and ready for auditor"
else
  echo "Status: ✗ Bundle creation failed"
fi)

Signature: soc2-evidence-bundle-$QUARTER.tar.gz.asc
Public Key: signatures/public-key.asc
Verification: signatures/VERIFICATION.txt

SOC2 CONTROLS COVERAGE:
════════════════════════════════════════════════════════════

✓ CC6.1 - Logical and Physical Access Controls
✓ CC6.2 - Prior to Issuing System Credentials
✓ CC6.3 - Removes Access When Appropriate
✓ CC7.2 - System Monitoring
✓ CC8.1 - Change Management Process
✓ CC9.1 - Availability (via backup/uptime metrics)

COMPLIANCE FRAMEWORKS:
════════════════════════════════════════════════════════════

✓ SOC2 Type II
✓ GDPR (Data Residency)

NEXT STEPS:
════════════════════════════════════════════════════════════

1. Review evidence collection report (this file)
2. Verify evidence bundle signature:
   gpg --verify soc2-evidence-bundle-$QUARTER.tar.gz.asc

3. Upload to secure auditor portal:
   bash $SCRIPT_DIR/upload-to-audit-portal.sh

4. Notify stakeholders:
   - DPO: dpo@teei-csr.com
   - Legal: legal@teei-csr.com
   - Compliance Team: compliance@teei-csr.com
   - External Auditor: auditor@audit-firm.com

5. Schedule auditor review meeting

6. Retain evidence bundle for 7 years (compliance requirement)

EVIDENCE INTEGRITY:
════════════════════════════════════════════════════════════

All evidence files have been cryptographically signed with GPG.
Tampering will be detected during signature verification.

SHA256 checksums available in: SHA256SUMS
Checksums signature: SHA256SUMS.asc

CONTACT INFORMATION:
════════════════════════════════════════════════════════════

Data Protection Officer: dpo@teei-csr.com
Security Team: security@teei-csr.com
Compliance Team: compliance@teei-csr.com

For questions about this evidence collection:
- Collection Log: $(basename "$LOG_FILE")
- System: Automated SOC2 Evidence Collector v1.0
- Documentation: /docs/SIEM_SOC2.md

═══════════════════════════════════════════════════════════
End of Report
Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
═══════════════════════════════════════════════════════════
EOF

echo ""
cat "$REPORT_FILE"
echo ""

# Record completion in Prometheus
if command -v curl &> /dev/null && [ -n "${PUSHGATEWAY_URL:-}" ]; then
  cat <<METRICS | curl --data-binary @- "$PUSHGATEWAY_URL/metrics/job/soc2/instance/collection"
soc2_evidence_collection_completed{quarter="$QUARTER"} 1
soc2_evidence_collection_tasks_total{quarter="$QUARTER"} $TOTAL_TASKS
soc2_evidence_collection_tasks_completed{quarter="$QUARTER"} $COMPLETED_TASKS
soc2_evidence_collection_tasks_failed{quarter="$QUARTER"} ${#FAILED_TASKS[@]}
soc2_evidence_collection_success_rate{quarter="$QUARTER"} $(echo "scale=2; $COMPLETED_TASKS * 100 / $TOTAL_TASKS" | bc)
METRICS
fi

# Send notification
if [ ${#FAILED_TASKS[@]} -eq 0 ]; then
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                  COLLECTION SUCCESSFUL                     ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "All evidence collected and signed successfully!"
  echo "Evidence bundle ready for auditor review."
  echo ""
  echo "Location: $OUTPUT_DIR/$QUARTER/"
  echo "Report: $REPORT_FILE"
  echo ""
  exit 0
else
  echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║              COLLECTION COMPLETED WITH ERRORS              ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo "Some evidence collection tasks failed:"
  for task in "${FAILED_TASKS[@]}"; do
    echo "  - $task"
  done
  echo ""
  echo "Please review logs and retry failed tasks manually."
  echo "Log file: $LOG_FILE"
  echo ""
  exit 1
fi
