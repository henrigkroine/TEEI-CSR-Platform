#!/bin/bash
#
# Cost Optimization Recommendations Engine
# Part of FinOps Phase G: AI Budget & Cloud Cost Controls
#
# Purpose: Analyze K8s resource usage and AWS spend to generate cost-saving recommendations
#
# Features:
# - Detect overprovisioned pods (CPU/memory <40% utilization)
# - Identify unused resources (PVCs, load balancers, elastic IPs)
# - Suggest Spot instance migrations for non-critical workloads
# - Consolidate low-traffic services
# - Generate weekly CSV report with savings potential
#
# Usage: ./cost-recommendations.sh [--format=csv|json|markdown]
#

set -euo pipefail

FORMAT="${1:-csv}"
FORMAT="${FORMAT#--format=}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/finops-reports}"
REPORT_DATE=$(date +%Y%m%d)
REPORT_FILE="$OUTPUT_DIR/cost-recommendations-$REPORT_DATE.$FORMAT"

mkdir -p "$OUTPUT_DIR"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" >&2
}

error() {
  echo "[ERROR] $*" >&2
  exit 1
}

# ==========================================
# 1. Analyze Pod Resource Utilization
# ==========================================
analyze_pod_utilization() {
  log "Analyzing pod resource utilization..."

  kubectl top pods --all-namespaces --containers 2>/dev/null | tail -n +2 | while read -r ns pod container cpu mem; do
    # Get pod resource requests/limits
    requests=$(kubectl get pod -n "$ns" "$pod" -o json 2>/dev/null | jq -r "
      .spec.containers[] |
      select(.name == \"$container\") |
      {cpu_req: .resources.requests.cpu, mem_req: .resources.requests.memory}
    ")

    cpu_req=$(echo "$requests" | jq -r '.cpu_req // "0"' | sed 's/m//')
    mem_req=$(echo "$requests" | jq -r '.mem_req // "0"' | sed 's/Mi//')

    # Parse current usage
    cpu_usage=$(echo "$cpu" | sed 's/m//')
    mem_usage=$(echo "$mem" | sed 's/Mi//')

    # Skip if no requests set
    [ "$cpu_req" = "0" ] && continue

    # Calculate utilization percentage
    cpu_util=$(awk "BEGIN {printf \"%.0f\", ($cpu_usage / $cpu_req) * 100}")
    mem_util=$(awk "BEGIN {printf \"%.0f\", ($mem_usage / $mem_req) * 100}")

    # Flag overprovisioned (< 40% utilization)
    if [ "$cpu_util" -lt 40 ] || [ "$mem_util" -lt 40 ]; then
      suggested_cpu=$(awk "BEGIN {printf \"%.0f\", $cpu_usage * 1.5}")  # 50% headroom
      suggested_mem=$(awk "BEGIN {printf \"%.0f\", $mem_usage * 1.5}")

      # Estimate savings (rough: $0.04/vCPU-hour, $0.005/GB-hour)
      cpu_saved_millicores=$((cpu_req - suggested_cpu))
      mem_saved_mb=$((mem_req - suggested_mem))

      monthly_savings=$(awk "BEGIN {
        cpu_cost = ($cpu_saved_millicores / 1000) * 0.04 * 730;
        mem_cost = ($mem_saved_mb / 1024) * 0.005 * 730;
        printf \"%.2f\", cpu_cost + mem_cost
      }")

      echo "$ns|$pod|$container|$cpu_util|$mem_util|$cpu_req|$suggested_cpu|$mem_req|$suggested_mem|$monthly_savings"
    fi
  done > /tmp/overprovisioned-pods.txt
}

# ==========================================
# 2. Find Unused PVCs
# ==========================================
find_unused_pvcs() {
  log "Finding unused PVCs..."

  kubectl get pvc --all-namespaces -o json | jq -r '
    .items[] |
    select(.status.phase == "Bound") |
    {
      namespace: .metadata.namespace,
      name: .metadata.name,
      size: .spec.resources.requests.storage,
      storageClass: .spec.storageClassName,
      volumeName: .spec.volumeName
    } |
    "\(.namespace)|\(.name)|\(.size)|\(.storageClass)"
  ' | while IFS='|' read -r ns name size storage_class; do
    # Check if any pod is using this PVC
    used=$(kubectl get pods -n "$ns" -o json 2>/dev/null | jq -r "
      .items[] |
      select(.spec.volumes[]?.persistentVolumeClaim?.claimName == \"$name\") |
      .metadata.name
    " | head -1)

    if [ -z "$used" ]; then
      # Estimate cost: $0.10/GB-month for gp3
      size_gb=$(echo "$size" | sed 's/Gi//')
      monthly_cost=$(awk "BEGIN {printf \"%.2f\", $size_gb * 0.10}")
      echo "$ns|$name|$size|$storage_class|unused|$monthly_cost"
    fi
  done > /tmp/unused-pvcs.txt
}

# ==========================================
# 3. Identify Idle Load Balancers
# ==========================================
find_idle_load_balancers() {
  log "Checking for idle load balancers..."

  kubectl get svc --all-namespaces -o json | jq -r '
    .items[] |
    select(.spec.type == "LoadBalancer") |
    {
      namespace: .metadata.namespace,
      name: .metadata.name,
      ip: .status.loadBalancer.ingress[0].ip // .status.loadBalancer.ingress[0].hostname
    } |
    "\(.namespace)|\(.name)|\(.ip)"
  ' | while IFS='|' read -r ns name ip; do
    # Query Prometheus for request rate (last 7 days)
    request_rate=$(curl -sG --data-urlencode "query=sum(rate(http_requests_total{service=\"$name\"}[7d]))" \
      "http://prometheus:9090/api/v1/query" 2>/dev/null | jq -r '.data.result[0].value[1] // "0"')

    rate_num=$(printf "%.0f" "$request_rate")

    # Flag if < 1 request/sec average
    if [ "$rate_num" -lt 1 ]; then
      monthly_cost="18.00"  # ~$18/month per LB
      echo "$ns|$name|$ip|$rate_num|idle|$monthly_cost"
    fi
  done > /tmp/idle-load-balancers.txt
}

# ==========================================
# 4. Suggest Spot Instance Migrations
# ==========================================
suggest_spot_instances() {
  log "Identifying workloads suitable for Spot instances..."

  # Non-critical deployments (no "critical" label)
  kubectl get deployments --all-namespaces -o json | jq -r '
    .items[] |
    select(.metadata.labels.critical != "true") |
    select(.spec.replicas > 1) |
    {
      namespace: .metadata.namespace,
      name: .metadata.name,
      replicas: .spec.replicas,
      nodeSelector: .spec.template.spec.nodeSelector
    } |
    select(.nodeSelector["node.kubernetes.io/instance-type"] != "spot") |
    "\(.namespace)|\(.name)|\(.replicas)"
  ' | while IFS='|' read -r ns name replicas; do
    # Estimate 60% cost savings with Spot
    # Rough: 2 vCPU, 4GB pod = $30/month on-demand -> $12/month spot
    pod_cost=30
    savings=$(awk "BEGIN {printf \"%.2f\", $pod_cost * $replicas * 0.6}")
    echo "$ns|$name|$replicas|spot-candidate|$savings"
  done > /tmp/spot-candidates.txt
}

# ==========================================
# 5. Low-Traffic Service Consolidation
# ==========================================
suggest_consolidation() {
  log "Finding low-traffic services for consolidation..."

  kubectl get deployments --all-namespaces -o json | jq -r '
    .items[] |
    select(.spec.replicas == 1) |
    "\(.metadata.namespace)|\(.metadata.name)"
  ' | while IFS='|' read -r ns name; do
    # Query request rate (last 7 days)
    request_rate=$(curl -sG --data-urlencode "query=sum(rate(http_requests_total{deployment=\"$name\",namespace=\"$ns\"}[7d]))" \
      "http://prometheus:9090/api/v1/query" 2>/dev/null | jq -r '.data.result[0].value[1] // "0"')

    rate_num=$(printf "%.2f" "$request_rate")

    # Flag if < 0.1 requests/sec (very low traffic)
    if (( $(echo "$rate_num < 0.1" | bc -l) )); then
      savings="15.00"  # Consolidating saves ~$15/month
      echo "$ns|$name|$rate_num|consolidate|$savings"
    fi
  done > /tmp/consolidation-candidates.txt
}

# ==========================================
# 6. Generate Report
# ==========================================
generate_report() {
  log "Generating cost optimization report..."

  total_savings=0

  case "$FORMAT" in
    csv)
      generate_csv_report
      ;;
    json)
      generate_json_report
      ;;
    markdown)
      generate_markdown_report
      ;;
    *)
      error "Unknown format: $FORMAT"
      ;;
  esac

  log "Report saved to: $REPORT_FILE"
  log "Total estimated monthly savings: \$$total_savings"
}

generate_csv_report() {
  {
    echo "Category,Namespace,Resource,Current,Suggested,Monthly Savings"

    # Overprovisioned pods
    if [ -s /tmp/overprovisioned-pods.txt ]; then
      while IFS='|' read -r ns pod container cpu_util mem_util cpu_req suggested_cpu mem_req suggested_mem savings; do
        echo "Overprovisioned Pod,$ns,$pod/$container,CPU ${cpu_req}m / Mem ${mem_req}Mi,CPU ${suggested_cpu}m / Mem ${suggested_mem}Mi,\$$savings"
        total_savings=$(awk "BEGIN {printf \"%.2f\", $total_savings + $savings}")
      done < /tmp/overprovisioned-pods.txt
    fi

    # Unused PVCs
    if [ -s /tmp/unused-pvcs.txt ]; then
      while IFS='|' read -r ns name size storage_class status savings; do
        echo "Unused PVC,$ns,$name,$size,$status,\$$savings"
        total_savings=$(awk "BEGIN {printf \"%.2f\", $total_savings + $savings}")
      done < /tmp/unused-pvcs.txt
    fi

    # Idle load balancers
    if [ -s /tmp/idle-load-balancers.txt ]; then
      while IFS='|' read -r ns name ip rate status savings; do
        echo "Idle Load Balancer,$ns,$name,$ip,$status,\$$savings"
        total_savings=$(awk "BEGIN {printf \"%.2f\", $total_savings + $savings}")
      done < /tmp/idle-load-balancers.txt
    fi

    # Spot candidates
    if [ -s /tmp/spot-candidates.txt ]; then
      while IFS='|' read -r ns name replicas status savings; do
        echo "Spot Instance Candidate,$ns,$name,$replicas replicas,$status,\$$savings"
        total_savings=$(awk "BEGIN {printf \"%.2f\", $total_savings + $savings}")
      done < /tmp/spot-candidates.txt
    fi

    # Consolidation candidates
    if [ -s /tmp/consolidation-candidates.txt ]; then
      while IFS='|' read -r ns name rate status savings; do
        echo "Consolidation Candidate,$ns,$name,$rate req/s,$status,\$$savings"
        total_savings=$(awk "BEGIN {printf \"%.2f\", $total_savings + $savings}")
      done < /tmp/consolidation-candidates.txt
    fi

    echo ",,,,TOTAL,\$$total_savings"
  } > "$REPORT_FILE"
}

generate_markdown_report() {
  {
    echo "# FinOps Cost Optimization Recommendations"
    echo "**Report Date**: $(date +%Y-%m-%d)"
    echo ""
    echo "## Summary"
    echo "Total estimated monthly savings: **\$$total_savings**"
    echo ""

    echo "## 1. Overprovisioned Pods (<40% utilization)"
    if [ -s /tmp/overprovisioned-pods.txt ]; then
      echo "| Namespace | Pod/Container | CPU Util | Mem Util | Current | Suggested | Savings |"
      echo "|-----------|---------------|----------|----------|---------|-----------|---------|"
      while IFS='|' read -r ns pod container cpu_util mem_util cpu_req suggested_cpu mem_req suggested_mem savings; do
        echo "| $ns | $pod/$container | ${cpu_util}% | ${mem_util}% | ${cpu_req}m/${mem_req}Mi | ${suggested_cpu}m/${suggested_mem}Mi | \$$savings |"
      done < /tmp/overprovisioned-pods.txt
    else
      echo "*No overprovisioned pods detected*"
    fi
    echo ""

    echo "## 2. Unused PVCs"
    if [ -s /tmp/unused-pvcs.txt ]; then
      echo "| Namespace | PVC | Size | Storage Class | Savings |"
      echo "|-----------|-----|------|---------------|---------|"
      while IFS='|' read -r ns name size storage_class status savings; do
        echo "| $ns | $name | $size | $storage_class | \$$savings |"
      done < /tmp/unused-pvcs.txt
    else
      echo "*No unused PVCs detected*"
    fi
    echo ""

    echo "## 3. Idle Load Balancers"
    if [ -s /tmp/idle-load-balancers.txt ]; then
      echo "| Namespace | Service | IP | Request Rate | Savings |"
      echo "|-----------|---------|----|--------------|---------| "
      while IFS='|' read -r ns name ip rate status savings; do
        echo "| $ns | $name | $ip | ${rate} req/s | \$$savings |"
      done < /tmp/idle-load-balancers.txt
    else
      echo "*No idle load balancers detected*"
    fi
    echo ""

    echo "## 4. Spot Instance Candidates"
    if [ -s /tmp/spot-candidates.txt ]; then
      echo "| Namespace | Deployment | Replicas | Savings (60% off) |"
      echo "|-----------|------------|----------|-------------------|"
      while IFS='|' read -r ns name replicas status savings; do
        echo "| $ns | $name | $replicas | \$$savings |"
      done < /tmp/spot-candidates.txt
    else
      echo "*No spot instance candidates*"
    fi
    echo ""

    echo "## 5. Consolidation Opportunities"
    if [ -s /tmp/consolidation-candidates.txt ]; then
      echo "| Namespace | Service | Traffic | Savings |"
      echo "|-----------|---------|---------|---------|"
      while IFS='|' read -r ns name rate status savings; do
        echo "| $ns | $name | ${rate} req/s | \$$savings |"
      done < /tmp/consolidation-candidates.txt
    else
      echo "*No consolidation opportunities*"
    fi

  } > "$REPORT_FILE"
}

# ==========================================
# Main
# ==========================================
main() {
  log "Cost Optimization Recommendations Engine"
  log "Output format: $FORMAT"

  analyze_pod_utilization
  find_unused_pvcs
  find_idle_load_balancers
  suggest_spot_instances
  suggest_consolidation
  generate_report

  log "✓ Analysis complete"
}

main
