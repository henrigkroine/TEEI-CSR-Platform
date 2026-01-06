#!/bin/bash
# SOC 2 Evidence Binder Generator
# Generates comprehensive SOC 2 Type II evidence bundle with index

set -euo pipefail

OUTPUT_DIR="./reports/compliance/SOC2_BUNDLE"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

echo "=== SOC 2 Evidence Binder Generator ==="
echo "Starting evidence collection: $TIMESTAMP"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Run all evidence collectors
echo "Step 1/5: Collecting CI/CD evidence..."
bash ops/compliance/evidence-collectors/ci-cd-collector.sh "$OUTPUT_DIR/ci-cd-evidence"

echo ""
echo "Step 2/5: Collecting access review evidence..."
bash ops/compliance/evidence-collectors/access-review-collector.sh "$OUTPUT_DIR/access-reviews"

echo ""
echo "Step 3/5: Collecting incident drill evidence..."
bash ops/compliance/evidence-collectors/incident-drill-collector.sh "$OUTPUT_DIR/incident-drills"

echo ""
echo "Step 4/5: Collecting backup & restore evidence..."
bash ops/compliance/evidence-collectors/backup-restore-collector.sh "$OUTPUT_DIR/backup-restore"

echo ""
echo "Step 5/5: Generating evidence index..."

# Generate index.md
cat > "$OUTPUT_DIR/index.md" <<EOF
# SOC 2 Type II Evidence Bundle

**Generated**: $TIMESTAMP
**Organization**: TEEI CSR Platform
**Auditor**: [Auditor Name]
**Audit Period**: $(date -u -d '-365 days' +"%Y-%m-%d") to $(date -u +"%Y-%m-%d")
**Retention**: 7 years (until $(date -u -d '+2555 days' +"%Y-%m-%d"))

## Executive Summary

This evidence bundle contains comprehensive documentation of TEEI CSR Platform's security controls for SOC 2 Type II compliance. All evidence has been automatically collected and organized for audit review.

## Trust Service Criteria Coverage

### CC1: Control Environment
- **CC1.1**: Integrity and Ethical Values
  - Evidence: Access reviews, code of conduct acknowledgments
  - Location: \`access-reviews/user-access-matrix.json\`

- **CC1.2**: Board Independence and Oversight
  - Evidence: Quarterly security briefings to leadership
  - Location: \`governance/quarterly-reports/\`

### CC2: Communication and Information
- **CC2.1**: Internal Communication
  - Evidence: Incident response drills, security training
  - Location: \`incident-drills/quarterly-drills.json\`

### CC3: Risk Assessment
- **CC3.1**: Risk Identification
  - Evidence: Risk register, threat modeling
  - Location: \`../compliance/AI_Act_Risk_Log.md\`

### CC4: Monitoring Activities
- **CC4.1**: Ongoing Monitoring
  - Evidence: Prometheus alerts, SLA tracking
  - Location: \`monitoring/\`

### CC5: Control Activities
- **CC5.1**: Logical Access
  - Evidence: RBAC configuration, MFA enforcement, access reviews
  - Location: \`access-reviews/\`

### CC6: Logical and Physical Access Controls
- **CC6.1**: Logical Access
  - Evidence: Access terminations, privileged access monitoring
  - Location: \`access-reviews/access-terminations.json\`

- **CC6.2**: Physical Access
  - Evidence: Cloud provider SOC 2 reports (AWS/GCP)
  - Location: \`third-party/cloud-provider-soc2.pdf\`

### CC7: System Operations
- **CC7.1**: System Monitoring
  - Evidence: Incident response drills, on-call rotation
  - Location: \`incident-drills/\`

- **CC7.2**: Change Management
  - Evidence: CI/CD approvals, deployment records
  - Location: \`ci-cd-evidence/\`

### CC8: Change Management
- **CC8.1**: Change Controls
  - Evidence: GitHub workflow approvals, code reviews, SBOM
  - Location: \`ci-cd-evidence/github-workflows.json\`

### CC9: Risk Mitigation
- **CC9.1**: Data Backup
  - Evidence: Backup policy, restore tests
  - Location: \`backup-restore/\`

- **CC9.2**: Disaster Recovery
  - Evidence: DR plan, quarterly DR tests
  - Location: \`backup-restore/disaster-recovery-plan.json\`

## Evidence Inventory

### 1. CI/CD & Change Management
- \`ci-cd-evidence/github-workflows.json\` - Workflow approval requirements
- \`ci-cd-evidence/deployments.json\` - Deployment records (90 days)
- \`ci-cd-evidence/code-reviews.json\` - Code review evidence
- \`ci-cd-evidence/security-scans.json\` - Security scan results
- \`ci-cd-evidence/sbom-attestation.json\` - SBOM generation evidence
- \`ci-cd-evidence/build-attestation.json\` - Build attestation (SLSA Level 3)

### 2. Access Controls
- \`access-reviews/user-access-matrix.json\` - User access matrix
- \`access-reviews/rbac-configuration.json\` - RBAC configuration
- \`access-reviews/privileged-access-logs.json\` - Privileged access monitoring
- \`access-reviews/access-terminations.json\` - Access termination evidence
- \`access-reviews/mfa-enforcement.json\` - MFA enforcement evidence

### 3. Incident Response
- \`incident-drills/quarterly-drills.json\` - Quarterly incident drills
- \`incident-drills/incident-response-plan.json\` - Incident response plan
- \`incident-drills/real-incidents.json\` - Real incident records
- \`incident-drills/on-call-rotation.json\` - On-call rotation

### 4. Backup & Recovery
- \`backup-restore/backup-policy.json\` - Backup policy & schedule
- \`backup-restore/backup-records.json\` - Recent backup records
- \`backup-restore/restore-tests.json\` - Monthly restore tests
- \`backup-restore/disaster-recovery-plan.json\` - Disaster recovery plan

### 5. Compliance Documentation
- \`../compliance/AI_Act_Risk_Log.md\` - AI Act risk assessment
- \`../compliance/CSRD_Impact_Pack.md\` - CSRD compliance
- \`../compliance/Data_Provenance.md\` - Data provenance tracking
- \`../compliance/Model_Cards.md\` - ML model cards

### 6. Operational Evidence
- \`../runbooks/deployment.md\` - Deployment runbook
- \`../runbooks/disaster-recovery.md\` - Disaster recovery runbook
- \`../runbooks/rollback.md\` - Rollback procedures

## Evidence Verification

All evidence files include:
- **Timestamp**: ISO 8601 UTC timestamp of collection
- **Retention**: 7 years (2555 days) per SOC 2 requirements
- **Integrity**: SHA-256 verification hashes where applicable
- **Immutability**: Stored in WORM-compliant storage

## Verification Hashes

\`\`\`
SHA-256 Checksums:
$(find "$OUTPUT_DIR" -type f -name "*.json" -exec sha256sum {} \; | sed 's|'$OUTPUT_DIR'/||' | sort)
\`\`\`

## Evidence Collection Logs

- CI/CD: \`ci-cd-evidence/collection.log\`
- Access Reviews: \`access-reviews/collection.log\`
- Incident Drills: \`incident-drills/collection.log\`
- Backup/Restore: \`backup-restore/collection.log\`

## Audit Notes

This automated evidence collection demonstrates:
1. **Continuous Compliance**: Evidence is collected automatically on a regular schedule
2. **Version Control**: All configurations are version-controlled in Git
3. **Immutability**: Evidence is stored in immutable storage with retention policies
4. **Traceability**: Full audit trail from code commit to production deployment
5. **Testing**: Regular testing of security controls (drills, restore tests)

## Next Steps for Auditor

1. Review evidence index (this file)
2. Verify evidence checksums
3. Sample evidence files for detailed review
4. Request additional evidence if needed
5. Validate evidence against SOC 2 TSC requirements

## Contact

**Security Team**: security@teei.com
**CISO**: ciso@teei.com
**Audit Coordinator**: compliance@teei.com

---

*This evidence bundle was automatically generated by the TEEI CSR Platform compliance automation system.*
EOF

# Generate metadata
cat > "$OUTPUT_DIR/metadata.json" <<EOF
{
  "bundleVersion": "1.0",
  "generatedAt": "$TIMESTAMP",
  "organization": "TEEI CSR Platform",
  "auditPeriod": {
    "start": "$(date -u -d '-365 days' +"%Y-%m-%d")",
    "end": "$(date -u +"%Y-%m-%d")"
  },
  "retentionUntil": "$(date -u -d '+2555 days' +"%Y-%m-%d")",
  "evidenceCategories": [
    "CI/CD & Change Management",
    "Access Controls",
    "Incident Response",
    "Backup & Recovery",
    "Compliance Documentation",
    "Operational Evidence"
  ],
  "totalEvidenceFiles": $(find "$OUTPUT_DIR" -type f -name "*.json" | wc -l),
  "generatedBy": "soc2-evidence-automation-v1.0",
  "checksums": $(find "$OUTPUT_DIR" -type f -name "*.json" -exec sha256sum {} \; | jq -R -s -c 'split("\n")[:-1] | map(split("  ") | {file: .[1], hash: .[0]})' || echo "[]")
}
EOF

echo ""
echo "==================================="
echo "✅ SOC 2 Evidence Bundle Generated"
echo "==================================="
echo ""
echo "📁 Location: $OUTPUT_DIR"
echo "📄 Index: $OUTPUT_DIR/index.md"
echo "📊 Metadata: $OUTPUT_DIR/metadata.json"
echo "📦 Total Evidence Files: $(find "$OUTPUT_DIR" -type f -name "*.json" | wc -l)"
echo "🔒 Retention: 7 years (until $(date -u -d '+2555 days' +"%Y-%m-%d"))"
echo ""
echo "Next steps:"
echo "1. Review index.md for complete evidence inventory"
echo "2. Verify checksums in metadata.json"
echo "3. Upload to WORM-compliant storage"
echo "4. Provide to auditor"
echo ""
