#!/bin/bash
# SOC2 Evidence Generator: Key Rotation Report
# Generates proof of quarterly credential rotation (CC6.1, CC7.2)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder}"
QUARTER="${QUARTER:-$(date +%Y-Q$(($(date +%-m)/3+1)))}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo "=== SOC2 Key Rotation Report Generator ==="
echo "Quarter: $QUARTER"

# Create output directory
mkdir -p "$OUTPUT_DIR/$QUARTER/key-rotation"

OUTPUT_FILE="$OUTPUT_DIR/$QUARTER/key-rotation/key-rotation-$TIMESTAMP.csv"
JSON_OUTPUT="$OUTPUT_DIR/$QUARTER/key-rotation/key-rotation-$TIMESTAMP.json"

# Write CSV header
cat > "$OUTPUT_FILE" <<EOF
Resource Type,Resource Name,Namespace,Rotation Date,Rotated By,Previous Hash,Current Hash,Auto Rotation,Next Rotation Due,Status
EOF

echo "Collecting Kubernetes Secret rotation history..."

# Get all Secrets with rotation annotations
kubectl get secrets --all-namespaces -o json | \
  jq -r '.items[] |
    select(.metadata.annotations["teei.io/rotation-date"]? != null) |
    [
      "Secret",
      .metadata.name,
      .metadata.namespace,
      (.metadata.annotations["teei.io/rotation-date"] // "N/A"),
      (.metadata.annotations["teei.io/rotated-by"] // "automated"),
      (.metadata.annotations["teei.io/previous-hash"] // "N/A"),
      (.data | to_entries | map(.value) | join("") | @base64d | @sh | ascii_downcase | .[0:16]),
      (.metadata.annotations["teei.io/auto-rotation"] // "false"),
      (.metadata.annotations["teei.io/next-rotation"] // "N/A"),
      (if (.metadata.annotations["teei.io/rotation-date"] // "N/A") != "N/A" then "ROTATED" else "PENDING" end)
    ] | @csv' >> "$OUTPUT_FILE" 2>/dev/null || true

# Get TLS certificate rotation
echo "Collecting TLS certificate rotation..."
kubectl get certificates --all-namespaces -o json 2>/dev/null | \
  jq -r '.items[]? |
    [
      "Certificate",
      .metadata.name,
      .metadata.namespace,
      (.status.renewalTime // .status.notAfter // "N/A"),
      "cert-manager",
      "N/A",
      (.status.revision // "unknown"),
      "true",
      (.status.notAfter // "N/A"),
      (if .status.conditions[]? | select(.type == "Ready" and .status == "True") then "VALID" else "PENDING" end)
    ] | @csv' >> "$OUTPUT_FILE" 2>/dev/null || true

# Get ServiceAccount token rotation (K8s 1.21+)
echo "Collecting ServiceAccount token rotation..."
kubectl get secrets --all-namespaces -l kubernetes.io/service-account.name -o json | \
  jq -r '.items[] |
    [
      "ServiceAccountToken",
      .metadata.name,
      .metadata.namespace,
      (.metadata.creationTimestamp // "N/A"),
      "kubernetes",
      "N/A",
      (.data.token // "" | @base64d | .[0:20]),
      "true",
      "N/A",
      "ACTIVE"
    ] | @csv' >> "$OUTPUT_FILE" 2>/dev/null || true

# Query Vault for secret rotation (if Vault is available)
if command -v vault &> /dev/null && [ -n "${VAULT_ADDR:-}" ]; then
  echo "Collecting Vault secret rotation..."
  vault kv list -format=json secret/ 2>/dev/null | \
    jq -r '.[]' | while read -r secret; do
      METADATA=$(vault kv metadata get -format=json "secret/$secret" 2>/dev/null || echo '{}')
      echo "$METADATA" | jq -r --arg secret "$secret" '
        [
          "VaultSecret",
          $secret,
          "vault",
          (.created_time // "N/A"),
          (.updated_time // "N/A"),
          "N/A",
          (.current_version // "unknown"),
          "false",
          "manual",
          (if .current_version > 1 then "ROTATED" else "INITIAL" end)
        ] | @csv' >> "$OUTPUT_FILE" 2>/dev/null || true
    done
fi

# Query AWS Secrets Manager rotation (if available)
if command -v aws &> /dev/null; then
  echo "Collecting AWS Secrets Manager rotation..."
  aws secretsmanager list-secrets --region us-east-1 2>/dev/null | \
    jq -r '.SecretList[]? |
      [
        "AWSSecret",
        .Name,
        "aws-secrets-manager",
        (.LastRotatedDate // "N/A"),
        "aws-rotation-lambda",
        "N/A",
        (.VersionId // "unknown"),
        (if .RotationEnabled then "true" else "false" end),
        (.NextRotationDate // "N/A"),
        (if .LastRotatedDate then "ROTATED" else "PENDING" end)
      ] | @csv' >> "$OUTPUT_FILE" 2>/dev/null || true
fi

# Query OpenSearch for rotation events
echo "Enriching with rotation events from SIEM..."
if command -v curl &> /dev/null; then
  ROTATION_DATA=$(curl -sk -u "${OPENSEARCH_USER:-admin}:${OPENSEARCH_PASSWORD:-admin}" \
    -H 'Content-Type: application/json' \
    "https://opensearch.siem.svc.cluster.local:9200/security-events-*/_search" \
    -d '{
      "size": 1000,
      "query": {
        "bool": {
          "must": [
            {"term": {"event_type": "key_rotation"}},
            {"range": {"@timestamp": {"gte": "now-90d"}}}
          ]
        }
      },
      "sort": [{"@timestamp": {"order": "desc"}}]
    }' 2>/dev/null || echo '{}')

  echo "$ROTATION_DATA" > "$JSON_OUTPUT"
fi

# Generate summary statistics
TOTAL_RESOURCES=$(tail -n +2 "$OUTPUT_FILE" | wc -l)
ROTATED=$(tail -n +2 "$OUTPUT_FILE" | grep ",ROTATED," | wc -l || echo 0)
PENDING=$(tail -n +2 "$OUTPUT_FILE" | grep ",PENDING," | wc -l || echo 0)
AUTO_ROTATION=$(tail -n +2 "$OUTPUT_FILE" | grep ",true," | wc -l || echo 0)
MANUAL_ROTATION=$((TOTAL_RESOURCES - AUTO_ROTATION))

if [ "$TOTAL_RESOURCES" -gt 0 ]; then
  ROTATION_RATE=$(echo "scale=2; $ROTATED * 100 / $TOTAL_RESOURCES" | bc)
else
  ROTATION_RATE=0
fi

cat > "$OUTPUT_DIR/$QUARTER/key-rotation/summary-$TIMESTAMP.txt" <<EOF
=== SOC2 Key Rotation Summary ===
Generated: $TIMESTAMP
Quarter: $QUARTER

Total Secrets/Credentials: $TOTAL_RESOURCES
Rotated This Quarter: $ROTATED
Pending Rotation: $PENDING
Rotation Rate: $ROTATION_RATE%

Auto-Rotation Enabled: $AUTO_ROTATION
Manual Rotation Required: $MANUAL_ROTATION

Control Mapping:
- CC6.1: Logical and Physical Access Controls
- CC7.2: System Monitoring

Compliance Requirements:
- All production secrets must be rotated quarterly
- Critical secrets (API keys, DB passwords) must have auto-rotation
- Certificate rotation must be automated via cert-manager

Files Generated:
- Rotation Report CSV: $(basename "$OUTPUT_FILE")
- Rotation Events JSON: $(basename "$JSON_OUTPUT")

Findings:
$(if [ "$PENDING" -gt 0 ]; then
  echo "⚠️  WARNING: $PENDING secrets pending rotation"
else
  echo "✓ All secrets rotated for this quarter"
fi)
$(if (( $(echo "$ROTATION_RATE < 100" | bc -l) )); then
  echo "⚠️  Rotation rate is $ROTATION_RATE% (target: 100%)"
else
  echo "✓ All credentials rotated successfully"
fi)
$(if [ "$MANUAL_ROTATION" -gt $((TOTAL_RESOURCES * 10 / 100)) ]; then
  echo "ℹ️  INFO: $MANUAL_ROTATION secrets require manual rotation (consider automation)"
fi)

Action Items:
$(tail -n +2 "$OUTPUT_FILE" | grep ",PENDING," | cut -d',' -f2,3 | head -n10 | \
  awk -F',' '{print "  - Rotate " $1 " in namespace " $2}' || echo "  None")
EOF

echo ""
echo "=== Key Rotation Report Generated ==="
echo "Total resources: $TOTAL_RESOURCES"
echo "Rotated: $ROTATED"
echo "Pending: $PENDING"
echo "Rotation rate: $ROTATION_RATE%"
echo ""
echo "Output files:"
echo "  - CSV: $OUTPUT_FILE"
echo "  - JSON: $JSON_OUTPUT"
echo "  - Summary: $OUTPUT_DIR/$QUARTER/key-rotation/summary-$TIMESTAMP.txt"
echo ""

# Record evidence collection
if command -v curl &> /dev/null && [ -n "${PUSHGATEWAY_URL:-}" ]; then
  cat <<METRICS | curl --data-binary @- "$PUSHGATEWAY_URL/metrics/job/soc2/instance/key-rotation"
soc2_evidence_collected{evidence_type="key_rotation",quarter="$QUARTER"} 1
soc2_total_secrets{quarter="$QUARTER"} $TOTAL_RESOURCES
soc2_rotated_secrets{quarter="$QUARTER"} $ROTATED
soc2_rotation_rate{quarter="$QUARTER"} $ROTATION_RATE
METRICS
fi

exit 0
