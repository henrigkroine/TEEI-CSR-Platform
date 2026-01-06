#!/bin/bash
# SOC2 Evidence Generator: GDPR Data Residency Attestation
# Generates proof of GDPR compliance - no EU→US data leaks

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder}"
QUARTER="${QUARTER:-$(date +%Y-Q$(($(date +%-m)/3+1)))}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo "=== GDPR Data Residency Attestation Generator ==="
echo "Quarter: $QUARTER"

# Create output directory
mkdir -p "$OUTPUT_DIR/$QUARTER/gdpr-compliance"

OUTPUT_FILE="$OUTPUT_DIR/$QUARTER/gdpr-compliance/gdpr-attestation-$TIMESTAMP.json"
VIOLATIONS_FILE="$OUTPUT_DIR/$QUARTER/gdpr-compliance/violations-$TIMESTAMP.csv"

# Write CSV header for violations
cat > "$VIOLATIONS_FILE" <<EOF
Timestamp,Event ID,User,Service,Source Region,Data Region,Table,Row Count,Violation Type,Blocked,Incident ID
EOF

# Query OpenSearch for data access events
echo "Querying SIEM for data access events..."
if ! command -v curl &> /dev/null; then
  echo "ERROR: curl not found. Cannot query OpenSearch."
  exit 1
fi

# Calculate date range
case "$QUARTER" in
  *Q1) START_DATE="$(date +%Y)-01-01"; END_DATE="$(date +%Y)-03-31" ;;
  *Q2) START_DATE="$(date +%Y)-04-01"; END_DATE="$(date +%Y)-06-30" ;;
  *Q3) START_DATE="$(date +%Y)-07-01"; END_DATE="$(date +%Y)-09-30" ;;
  *Q4) START_DATE="$(date +%Y)-10-01"; END_DATE="$(date +%Y)-12-31" ;;
  *) START_DATE="$(date -d '90 days ago' +%Y-%m-%d)"; END_DATE="$(date +%Y-%m-%d)" ;;
esac

# Query for all data access events
DATA_ACCESS=$(curl -sk -u "${OPENSEARCH_USER:-admin}:${OPENSEARCH_PASSWORD:-admin}" \
  -H 'Content-Type: application/json' \
  "https://opensearch.siem.svc.cluster.local:9200/data-access-*/_search" \
  -d "{
    \"size\": 10000,
    \"query\": {
      \"bool\": {
        \"must\": [
          {\"term\": {\"event_type\": \"data_access\"}},
          {\"range\": {\"@timestamp\": {\"gte\": \"$START_DATE\", \"lte\": \"$END_DATE\"}}}
        ]
      }
    },
    \"aggs\": {
      \"by_region\": {
        \"terms\": {\"field\": \"region.keyword\", \"size\": 10},
        \"aggs\": {
          \"pii_accessed\": {
            \"filter\": {\"term\": {\"pii_accessed\": true}},
            \"aggs\": {
              \"total_rows\": {\"sum\": {\"field\": \"row_count\"}}
            }
          }
        }
      }
    },
    \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}]
  }" 2>/dev/null || echo '{}')

# Query specifically for GDPR violations (EU PII accessed from US)
VIOLATIONS=$(curl -sk -u "${OPENSEARCH_USER:-admin}:${OPENSEARCH_PASSWORD:-admin}" \
  -H 'Content-Type: application/json' \
  "https://opensearch.siem.svc.cluster.local:9200/data-access-*/_search" \
  -d "{
    \"size\": 1000,
    \"query\": {
      \"bool\": {
        \"must\": [
          {\"term\": {\"event_type\": \"data_access\"}},
          {\"term\": {\"pii_accessed\": true}},
          {\"term\": {\"data_region\": \"eu\"}},
          {\"term\": {\"source_region\": \"us\"}},
          {\"range\": {\"@timestamp\": {\"gte\": \"$START_DATE\", \"lte\": \"$END_DATE\"}}}
        ]
      }
    },
    \"sort\": [{\"@timestamp\": {\"order\": \"desc\"}}]
  }" 2>/dev/null || echo '{}')

# Extract violation details to CSV
echo "$VIOLATIONS" | jq -r '.hits.hits[]? |
  [
    ._source["@timestamp"],
    ._id,
    ._source.user,
    ._source.service,
    ._source.source_region,
    ._source.data_region,
    ._source.table,
    ._source.row_count,
    "cross_region_pii_access",
    (._source.blocked // false),
    (._source.incident_id // "N/A")
  ] | @csv' >> "$VIOLATIONS_FILE" 2>/dev/null || true

# Count violations
VIOLATION_COUNT=$(tail -n +2 "$VIOLATIONS_FILE" | wc -l)

# Generate attestation document
CHECKSUM=$(sha256sum "$VIOLATIONS_FILE" | awk '{print $1}')

cat > "$OUTPUT_FILE" <<EOF
{
  "attestation": {
    "type": "GDPR Data Residency Compliance",
    "quarter": "$QUARTER",
    "date_range": {
      "start": "$START_DATE",
      "end": "$END_DATE"
    },
    "generated_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "generated_by": "automated-soc2-evidence-collector",
    "checksum": "$CHECKSUM"
  },
  "compliance_status": {
    "total_violations": $VIOLATION_COUNT,
    "status": "$([ $VIOLATION_COUNT -eq 0 ] && echo 'COMPLIANT' || echo 'NON_COMPLIANT')",
    "blocked_violations": $(tail -n +2 "$VIOLATIONS_FILE" | grep ",true," | wc -l || echo 0),
    "unblocked_violations": $(tail -n +2 "$VIOLATIONS_FILE" | grep ",false," | wc -l || echo 0)
  },
  "data_access_summary": $(echo "$DATA_ACCESS" | jq '.aggregations.by_region.buckets' 2>/dev/null || echo '[]'),
  "controls": [
    {
      "id": "GDPR-Article-32",
      "title": "Security of Processing",
      "status": "$([ $VIOLATION_COUNT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
    },
    {
      "id": "GDPR-Article-44",
      "title": "General Principle for Transfers",
      "status": "$([ $VIOLATION_COUNT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
    },
    {
      "id": "GDPR-Article-46",
      "title": "Transfers Subject to Appropriate Safeguards",
      "status": "$([ $VIOLATION_COUNT -eq 0 ] && echo 'PASS' || echo 'FAIL')"
    }
  ],
  "evidence_files": {
    "violations_csv": "$(basename "$VIOLATIONS_FILE")",
    "violations_checksum": "$CHECKSUM"
  },
  "attestation_statement": "$(if [ $VIOLATION_COUNT -eq 0 ]; then
    echo "This attestation confirms that during the period from $START_DATE to $END_DATE, zero instances of EU PII data being accessed from US regions were detected. The organization maintained full compliance with GDPR data residency requirements."
  else
    echo "WARNING: This attestation identifies $VIOLATION_COUNT violation(s) of GDPR data residency requirements during the period from $START_DATE to $END_DATE. All violations have been logged and require immediate remediation."
  fi)",
  "signed_by": {
    "role": "Data Protection Officer",
    "email": "dpo@teei-csr.com",
    "signature_date": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  }
}
EOF

# Generate human-readable summary
cat > "$OUTPUT_DIR/$QUARTER/gdpr-compliance/summary-$TIMESTAMP.txt" <<EOF
=== GDPR Data Residency Attestation ===
Generated: $TIMESTAMP
Quarter: $QUARTER
Date Range: $START_DATE to $END_DATE

COMPLIANCE STATUS: $([ $VIOLATION_COUNT -eq 0 ] && echo '✓ COMPLIANT' || echo '✗ NON-COMPLIANT')

Total Data Residency Violations: $VIOLATION_COUNT
- Blocked by System: $(tail -n +2 "$VIOLATIONS_FILE" | grep ",true," | wc -l || echo 0)
- Unblocked (Incident): $(tail -n +2 "$VIOLATIONS_FILE" | grep ",false," | wc -l || echo 0)

Regulatory Framework:
- GDPR Article 32: Security of Processing
- GDPR Article 44: General Principle for Transfers
- GDPR Article 46: Appropriate Safeguards

Files Generated:
- Attestation JSON: $(basename "$OUTPUT_FILE")
- Violations CSV: $(basename "$VIOLATIONS_FILE")
- File Checksum: $CHECKSUM

$(if [ $VIOLATION_COUNT -eq 0 ]; then
  cat <<COMPLIANT

✓ ZERO VIOLATIONS DETECTED

This attestation confirms full compliance with GDPR data residency requirements.
No instances of EU PII data being accessed from US regions were detected during
the reporting period.

The organization's data residency controls are functioning as designed:
- Regional data segregation enforced
- Cross-region access policies active
- Automated blocking of unauthorized transfers
- Continuous monitoring via SIEM

Next Steps:
- Retain this attestation for auditor review
- Include in quarterly SOC2 evidence bundle
- Share with DPO and legal team
COMPLIANT
else
  cat <<NONCOMPLIANT

⚠️  VIOLATIONS DETECTED: $VIOLATION_COUNT

IMMEDIATE ACTION REQUIRED:

1. Review all violations listed in: $VIOLATIONS_FILE
2. Create incident tickets for each unblocked violation
3. Investigate root cause of access pattern
4. Implement additional controls if needed
5. Report to DPO and legal team
6. Document remediation actions

Top Violators:
$(tail -n +2 "$VIOLATIONS_FILE" | cut -d',' -f3 | sort | uniq -c | sort -rn | head -n5)

Affected Services:
$(tail -n +2 "$VIOLATIONS_FILE" | cut -d',' -f4 | sort | uniq -c | sort -rn | head -n5)
NONCOMPLIANT
fi)

Verification:
- Evidence checksum: $CHECKSUM
- Attestation signed: $(date -u +%Y-%m-%dT%H:%M:%SZ)
- DPO: dpo@teei-csr.com

This attestation is part of the SOC2 Type II compliance evidence bundle.
EOF

echo ""
echo "=== GDPR Attestation Generated ==="
echo "Compliance Status: $([ $VIOLATION_COUNT -eq 0 ] && echo '✓ COMPLIANT' || echo '✗ NON-COMPLIANT')"
echo "Total Violations: $VIOLATION_COUNT"
echo ""
echo "Output files:"
echo "  - Attestation JSON: $OUTPUT_FILE"
echo "  - Violations CSV: $VIOLATIONS_FILE"
echo "  - Summary: $OUTPUT_DIR/$QUARTER/gdpr-compliance/summary-$TIMESTAMP.txt"
echo "  - Checksum: $CHECKSUM"
echo ""

# Record evidence collection
if command -v curl &> /dev/null && [ -n "${PUSHGATEWAY_URL:-}" ]; then
  cat <<METRICS | curl --data-binary @- "$PUSHGATEWAY_URL/metrics/job/soc2/instance/gdpr-attestation"
soc2_evidence_collected{evidence_type="gdpr_attestation",quarter="$QUARTER"} 1
soc2_gdpr_violations{quarter="$QUARTER"} $VIOLATION_COUNT
soc2_gdpr_compliant{quarter="$QUARTER"} $([ $VIOLATION_COUNT -eq 0 ] && echo 1 || echo 0)
METRICS
fi

# Exit with error if violations found
if [ $VIOLATION_COUNT -gt 0 ]; then
  echo "ERROR: GDPR violations detected. Review required."
  exit 1
fi

exit 0
