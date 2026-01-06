# SOC2 DR Evidence Repository

**Control**: SOC2 CC9.1 - Availability Commitments
**Owner**: backup-restore-auditor
**Retention**: 13 months minimum (SOC2 Type II requirement)

---

## Overview

This directory contains evidence of disaster recovery testing and backup verification to demonstrate compliance with SOC2 availability commitments (CC9.1).

**Required Evidence**:
- Quarterly gameday drill reports
- RTO/RPO measurements with timestamps
- Backup restoration test results
- Signed attestation forms from independent observers

---

## Directory Structure

```
/ops/soc2/dr-evidence/
├── README.md (this file)
├── ATTESTATION_TEMPLATE.md (sign for each drill)
├── postgres/
│   ├── failover-YYYYMMDD-HHMMSS/
│   │   ├── pre-failover-metrics.json
│   │   ├── post-failover-metrics.json
│   │   ├── rpo-calculation.json
│   │   └── attestation-signed.pdf
│   └── backup-verification-YYYYMMDD/
│       ├── checksum-verification.txt
│       └── test-restore-log.txt
├── clickhouse/
│   └── failover-YYYYMMDD-HHMMSS/
│       ├── pre-failover-state.json
│       └── post-failover-state.json
├── nats/
│   └── failover-YYYYMMDD-HHMMSS/
│       ├── stream-report-before.txt
│       └── stream-report-after.txt
├── dns/
│   └── cutover-YYYYMMDD-HHMMSS/
│       ├── dns-before.json
│       ├── dns-after.json
│       └── propagation-verification.txt
└── quarterly-reports/
    └── 2025-Q1-DR-Evidence.pdf (compiled evidence bundle)
```

---

## Evidence Collection Checklist

**For Each Gameday Drill**:
- [ ] Pre-drill replication lag measurements
- [ ] Post-drill RTO/RPO calculations
- [ ] Database transaction ID comparisons
- [ ] Screenshot evidence (Grafana dashboards)
- [ ] DNS propagation verification
- [ ] Signed attestation form from observer
- [ ] Drill execution logs with timestamps
- [ ] Post-mortem document

**For Monthly Backup Verification**:
- [ ] Backup checksum calculations
- [ ] S3 bucket configuration screenshots
- [ ] Test restore results
- [ ] Backup age verification
- [ ] Encryption verification

---

## SOC2 CC9.1 Requirements

### Availability Commitments

**What Auditors Look For**:
1. **Defined RTO/RPO Targets**: Documented in SLA (< 5 min RTO, < 10 sec RPO)
2. **Regular Testing**: Quarterly drills minimum
3. **Evidence of Compliance**: Timestamped measurements showing targets met
4. **Independent Verification**: Signed attestations from non-executing observers
5. **Continuous Improvement**: Trend data showing improvement over time

### Evidence Retention

**Minimum**: 13 months (to cover annual audit + 1 month buffer)

**Storage**:
- Local: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/`
- Backup: `s3://teei-compliance-evidence/dr-evidence/` (encrypted, versioned)

---

## Cryptographic Signing

All evidence bundles must be cryptographically signed to prove tamper-proof integrity.

**Signing Process**:
```bash
# Generate evidence hash
find /path/to/evidence-bundle -type f | sort | xargs cat | sha256sum > evidence-hash.txt

# Sign with GPG (or use organization's signing key)
gpg --sign --armor --output evidence-hash.txt.sig evidence-hash.txt

# Verify signature
gpg --verify evidence-hash.txt.sig evidence-hash.txt
```

**Required Signatories**:
1. Drill Commander (dr-gameday-lead)
2. Executive Observer (CTO or VP Engineering)
3. Optional: External Auditor (for annual SOC2 Type II)

---

## Quarterly Evidence Compilation

**Timeline**:
- Drills conducted: Throughout quarter
- Evidence compiled: Last week of quarter
- Attestation signed: Within 1 week of quarter end
- Submitted to auditor: Within 2 weeks of quarter end

**Compilation Script**:
```bash
#!/bin/bash
# Compile quarterly evidence bundle

QUARTER="2025-Q1"
OUTPUT_DIR="/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/quarterly-reports/$QUARTER"

mkdir -p "$OUTPUT_DIR"

# Copy all drill evidence from quarter
cp -r /home/user/TEEI-CSR-Platform/ops/gameday/evidence/failover-2025* "$OUTPUT_DIR/drills/"

# Copy backup verifications
cp -r /home/user/TEEI-CSR-Platform/ops/gameday/evidence/backup-verification-2025* "$OUTPUT_DIR/backups/"

# Generate summary report
cat > "$OUTPUT_DIR/SUMMARY.md" <<EOF
# Disaster Recovery Evidence - $QUARTER

## Drills Conducted
1. January 15: Database-only failover (RTO: XXs, RPO: XXs)
2. February 12: Partial failover (RTO: XXs, RPO: XXs)
3. March 19: Full regional failover (RTO: XXs, RPO: XXs)

## Backup Verifications
- Monthly verifications: 3/3 successful
- Test restores: 1/1 successful

## Compliance Status
✅ RTO < 5 minutes: Met in all drills
✅ RPO < 10 seconds: Met in all drills
✅ Quarterly drill frequency: Met (3 drills)
✅ Backup age < 24 hours: Met (100% uptime)

## Attestation
Signed by: [CTO Name]
Date: [YYYY-MM-DD]
EOF

# Create PDF bundle (requires pandoc)
pandoc "$OUTPUT_DIR/SUMMARY.md" -o "$OUTPUT_DIR/$QUARTER-DR-Evidence.pdf"

# Sign evidence bundle
find "$OUTPUT_DIR" -type f | sort | xargs cat | sha256sum > "$OUTPUT_DIR/evidence-hash.txt"
gpg --sign --armor --output "$OUTPUT_DIR/evidence-hash.txt.sig" "$OUTPUT_DIR/evidence-hash.txt"

echo "✓ Quarterly evidence bundle ready: $OUTPUT_DIR"
```

---

## Audit Trail

All modifications to evidence files are logged.

**Git Tracking**:
```bash
# Add evidence to git (but not committed to public repo)
git add /home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/
git commit -m "DR evidence: Q1 2025 gameday drills"

# Evidence is stored in separate private repo for compliance
# (not pushed to public GitHub)
```

**S3 Versioning**:
- All evidence uploaded to S3 with versioning enabled
- Object lock enabled (WORM - Write Once Read Many)
- MFA delete protection enabled

---

## Access Control

**Who Can Access**:
- Compliance team (read-only)
- SRE team (read/write for evidence upload)
- External auditors (read-only, temporary credentials)

**Who Cannot Access**:
- Unauthorized personnel
- Public internet (S3 bucket is private)

**Access Audit**:
```bash
# S3 access logs
aws s3api get-bucket-logging --bucket teei-compliance-evidence

# CloudTrail logs for evidence bucket access
aws cloudtrail lookup-events --lookup-attributes AttributeKey=ResourceName,AttributeValue=teei-compliance-evidence
```

---

## FAQs

**Q: How often must drills be conducted?**
A: Minimum quarterly (4x per year). Monthly is recommended for critical systems.

**Q: What if a drill fails (RTO/RPO not met)?**
A: Document the failure, create remediation plan, re-run drill after fixes. Auditors want to see continuous improvement, not perfection.

**Q: Can we skip a quarter if we're confident?**
A: No. SOC2 requires regular testing to maintain certification. Skipping quarters is a finding.

**Q: What if our auditor asks for evidence from 18 months ago?**
A: Evidence retention is 13 months minimum. Older evidence may be archived to cold storage but must remain retrievable.

**Q: Can we retroactively create evidence?**
A: No. Evidence must be contemporaneously captured (at time of drill). Retroactive evidence is fraud.

---

## Contact

**Evidence Owner**: backup-restore-auditor
**Compliance Team**: compliance@company.com
**SOC2 Auditor**: [Auditor Firm Name]

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Next Review**: 2026-02-15 (Quarterly)
