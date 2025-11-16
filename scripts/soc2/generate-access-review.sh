#!/bin/bash
# SOC2 Evidence Generator: Access Review Report
# Generates monthly report of all user access (CC6.1-6.3)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-/home/user/TEEI-CSR-Platform/ops/soc2/evidence-binder}"
QUARTER="${QUARTER:-$(date +%Y-Q$(($(date +%-m)/3+1)))}"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)

echo "=== SOC2 Access Review Report Generator ==="
echo "Quarter: $QUARTER"
echo "Output Directory: $OUTPUT_DIR"

# Create output directory
mkdir -p "$OUTPUT_DIR/$QUARTER/access-reviews"

OUTPUT_FILE="$OUTPUT_DIR/$QUARTER/access-reviews/access-review-$TIMESTAMP.csv"
JSON_OUTPUT="$OUTPUT_DIR/$QUARTER/access-reviews/access-review-$TIMESTAMP.json"

# Write CSV header
cat > "$OUTPUT_FILE" <<EOF
User,Email,Role,Namespace,Service Account,Last Used,Last Login IP,MFA Enabled,Review Date,Reviewer,Status
EOF

echo "Collecting Kubernetes RBAC data..."

# Get all ServiceAccounts across all namespaces
kubectl get serviceaccounts --all-namespaces -o json | \
  jq -r '.items[] |
    [
      .metadata.name,
      "serviceaccount@teei-csr.com",
      (.metadata.annotations["rbac.authorization.kubernetes.io/role"] // "N/A"),
      .metadata.namespace,
      "true",
      (.metadata.annotations["teei.io/last-used"] // "never"),
      "N/A",
      "N/A",
      (now | strftime("%Y-%m-%d")),
      "automated",
      (if (.metadata.annotations["teei.io/last-used"] // "never") == "never" or
          (now - (.metadata.annotations["teei.io/last-used"] | tonumber? // 0)) > 7776000
       then "REVIEW_REQUIRED"
       else "ACTIVE"
       end)
    ] | @csv' >> "$OUTPUT_FILE"

# Get all RoleBindings and ClusterRoleBindings
echo "Collecting RoleBindings..."
kubectl get rolebindings --all-namespaces -o json | \
  jq -r '.items[] |
    .subjects[]? |
    select(.kind == "User" or .kind == "ServiceAccount") |
    [
      .name,
      (if .kind == "User" then .name + "@teei-csr.com" else "serviceaccount" end),
      (.roleRef.name // "N/A"),
      (.namespace // "cluster-wide"),
      (if .kind == "ServiceAccount" then "true" else "false" end),
      "N/A",
      "N/A",
      "N/A",
      (now | strftime("%Y-%m-%d")),
      "automated",
      "PENDING_REVIEW"
    ] | @csv' >> "$OUTPUT_FILE"

echo "Collecting ClusterRoleBindings..."
kubectl get clusterrolebindings -o json | \
  jq -r '.items[] |
    .subjects[]? |
    select(.kind == "User" or .kind == "ServiceAccount") |
    [
      .name,
      (if .kind == "User" then .name + "@teei-csr.com" else "serviceaccount" end),
      (.roleRef.name // "N/A"),
      "cluster-wide",
      (if .kind == "ServiceAccount" then "true" else "false" end),
      "N/A",
      "N/A",
      "N/A",
      (now | strftime("%Y-%m-%d")),
      "automated",
      "PENDING_REVIEW"
    ] | @csv' >> "$OUTPUT_FILE"

# Query OpenSearch for authentication events to get last login times
echo "Enriching with authentication data from SIEM..."
if command -v curl &> /dev/null; then
  # Get last 90 days of auth events
  AUTH_DATA=$(curl -sk -u "${OPENSEARCH_USER:-admin}:${OPENSEARCH_PASSWORD:-admin}" \
    -H 'Content-Type: application/json' \
    "https://opensearch.siem.svc.cluster.local:9200/auth-events-*/_search" \
    -d '{
      "size": 0,
      "aggs": {
        "users": {
          "terms": {"field": "username.keyword", "size": 10000},
          "aggs": {
            "last_login": {"max": {"field": "@timestamp"}},
            "last_ip": {
              "top_hits": {
                "size": 1,
                "sort": [{"@timestamp": {"order": "desc"}}],
                "_source": ["source_ip", "mfa_used"]
              }
            }
          }
        }
      }
    }' 2>/dev/null || echo '{}')

  # Save enriched data as JSON
  echo "$AUTH_DATA" > "$JSON_OUTPUT"
fi

# Generate summary statistics
TOTAL_USERS=$(tail -n +2 "$OUTPUT_FILE" | wc -l)
ADMIN_USERS=$(tail -n +2 "$OUTPUT_FILE" | grep -i "admin" | wc -l || echo 0)
ORPHANED=$(tail -n +2 "$OUTPUT_FILE" | grep "REVIEW_REQUIRED" | wc -l || echo 0)
SA_COUNT=$(tail -n +2 "$OUTPUT_FILE" | grep ",true," | wc -l || echo 0)

cat > "$OUTPUT_DIR/$QUARTER/access-reviews/summary-$TIMESTAMP.txt" <<EOF
=== SOC2 Access Review Summary ===
Generated: $TIMESTAMP
Quarter: $QUARTER

Total Users/ServiceAccounts: $TOTAL_USERS
Users with Admin Roles: $ADMIN_USERS
Orphaned Accounts (>90 days): $ORPHANED
ServiceAccounts: $SA_COUNT

Control Mapping:
- CC6.1: Logical and Physical Access Controls
- CC6.2: Prior to Issuing System Credentials
- CC6.3: Removes Access When Appropriate

Files Generated:
- Access Review CSV: $(basename "$OUTPUT_FILE")
- Access Review JSON: $(basename "$JSON_OUTPUT")

Next Steps:
1. Review all users with status "REVIEW_REQUIRED"
2. Verify admin access is appropriate
3. Disable/remove orphaned accounts
4. Document findings in JIRA ticket
EOF

echo ""
echo "=== Access Review Report Generated ==="
echo "Total users: $TOTAL_USERS"
echo "Admin users: $ADMIN_USERS"
echo "Orphaned accounts: $ORPHANED"
echo "ServiceAccounts: $SA_COUNT"
echo ""
echo "Output files:"
echo "  - CSV: $OUTPUT_FILE"
echo "  - JSON: $JSON_OUTPUT"
echo "  - Summary: $OUTPUT_DIR/$QUARTER/access-reviews/summary-$TIMESTAMP.txt"
echo ""

# Record evidence collection in Prometheus metrics
if command -v curl &> /dev/null && [ -n "${PUSHGATEWAY_URL:-}" ]; then
  cat <<METRICS | curl --data-binary @- "$PUSHGATEWAY_URL/metrics/job/soc2/instance/access-review"
# HELP soc2_evidence_collected Evidence collection status
# TYPE soc2_evidence_collected gauge
soc2_evidence_collected{evidence_type="access_review",quarter="$QUARTER"} 1
soc2_user_count{quarter="$QUARTER"} $TOTAL_USERS
soc2_admin_count{quarter="$QUARTER"} $ADMIN_USERS
soc2_orphaned_count{quarter="$QUARTER"} $ORPHANED
METRICS
fi

exit 0
