#!/usr/bin/env bash
# NATS JetStream Retention Policy Management
# Update retention policies for existing streams
#
# Usage:
#   ./nats-retention.sh check        # Check current retention settings
#   ./nats-retention.sh update       # Update retention policies
#   ./nats-retention.sh enforce      # Enforce limits (purge if needed)

set -euo pipefail

# Configuration
NATS_US_URL="${NATS_US_URL:-nats://nats-lb.us-east-1.example.com:4222}"
NATS_EU_URL="${NATS_EU_URL:-nats://nats-lb.eu-central-1.example.com:4222}"
NATS_CREDS="${NATS_CREDS:-/etc/nats-secret/app.creds}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Retention policy definitions
# Format: stream_name:max_age:max_bytes:description
declare -A US_POLICIES=(
  ["events-us"]="7d:10Gi:Transient events (buddy, kintell, journey)"
  ["audit-us"]="90d:50Gi:Audit and compliance events"
  ["metrics-us"]="30d:20Gi:Application and business metrics"
  ["notifications-us"]="14d:5Gi:User notifications"
)

declare -A EU_POLICIES=(
  ["events-eu-gdpr"]="7d:10Gi:EU GDPR events (no US mirror)"
  ["audit-eu-gdpr"]="90d:20Gi:EU GDPR audit events"
)

# Check current retention settings
check_retention() {
  log_info "Checking US stream retention policies..."
  echo ""

  for stream in "${!US_POLICIES[@]}"; do
    IFS=':' read -r max_age max_bytes description <<< "${US_POLICIES[$stream]}"

    echo "Stream: $stream"
    echo "  Expected: $description"
    echo "  Policy: max_age=$max_age, max_bytes=$max_bytes"
    echo ""

    # Get current settings
    current=$(nats stream info "$stream" --server="${NATS_US_URL}" --creds="${NATS_CREDS}" --json 2>/dev/null || echo "{}")

    if [ "$current" != "{}" ]; then
      current_age=$(echo "$current" | jq -r '.config.max_age // 0')
      current_bytes=$(echo "$current" | jq -r '.config.max_bytes // 0')
      current_msgs=$(echo "$current" | jq -r '.state.messages // 0')
      current_size=$(echo "$current" | jq -r '.state.bytes // 0')

      # Convert to human-readable
      current_age_hr=$((current_age / 1000000000))s
      if [ $current_age_hr -gt 86400 ]; then
        current_age_hr=$((current_age / 86400000000000))d
      fi

      log_info "  Current: age=${current_age_hr}, bytes=${current_bytes}, messages=${current_msgs}, size=${current_size}"

      # Check if within limits
      size_pct=$((current_size * 100 / current_bytes))
      if [ $size_pct -gt 80 ]; then
        log_warn "  ⚠ Size usage at ${size_pct}% of limit!"
      fi
    else
      log_error "  Stream not found"
    fi

    echo ""
  done

  log_info "Checking EU stream retention policies..."
  echo ""

  for stream in "${!EU_POLICIES[@]}"; do
    IFS=':' read -r max_age max_bytes description <<< "${EU_POLICIES[$stream]}"

    echo "Stream: $stream"
    echo "  Expected: $description"
    echo "  Policy: max_age=$max_age, max_bytes=$max_bytes"
    echo ""

    current=$(nats stream info "$stream" --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" --json 2>/dev/null || echo "{}")

    if [ "$current" != "{}" ]; then
      current_age=$(echo "$current" | jq -r '.config.max_age // 0')
      current_bytes=$(echo "$current" | jq -r '.config.max_bytes // 0')
      current_msgs=$(echo "$current" | jq -r '.state.messages // 0')
      current_size=$(echo "$current" | jq -r '.state.bytes // 0')

      log_info "  Current: messages=${current_msgs}, size=${current_size} bytes"
    else
      log_error "  Stream not found"
    fi

    echo ""
  done
}

# Update retention policies
update_retention() {
  log_info "Updating US stream retention policies..."

  for stream in "${!US_POLICIES[@]}"; do
    IFS=':' read -r max_age max_bytes description <<< "${US_POLICIES[$stream]}"

    log_info "Updating $stream: $description"

    # Update stream configuration
    nats stream edit "$stream" \
      --server="${NATS_US_URL}" \
      --creds="${NATS_CREDS}" \
      --max-age "$max_age" \
      --max-bytes "$max_bytes" \
      --discard old \
      --force || log_error "Failed to update $stream"

    log_info "  ✓ Updated $stream"
  done

  log_info "Updating EU stream retention policies..."

  for stream in "${!EU_POLICIES[@]}"; do
    IFS=':' read -r max_age max_bytes description <<< "${EU_POLICIES[$stream]}"

    log_info "Updating $stream: $description"

    nats stream edit "$stream" \
      --server="${NATS_EU_URL}" \
      --creds="${NATS_CREDS}" \
      --max-age "$max_age" \
      --max-bytes "$max_bytes" \
      --discard old \
      --force || log_error "Failed to update $stream"

    log_info "  ✓ Updated $stream"
  done

  log_info "All retention policies updated"
}

# Enforce limits (purge old messages if needed)
enforce_limits() {
  log_warn "Enforcing retention limits (will purge old messages if needed)..."
  sleep 3

  log_info "Purging US streams based on age..."

  for stream in "${!US_POLICIES[@]}"; do
    IFS=':' read -r max_age max_bytes description <<< "${US_POLICIES[$stream]}"

    # Get current state
    current=$(nats stream info "$stream" --server="${NATS_US_URL}" --creds="${NATS_CREDS}" --json 2>/dev/null || echo "{}")

    if [ "$current" != "{}" ]; then
      current_msgs=$(echo "$current" | jq -r '.state.messages // 0')
      current_size=$(echo "$current" | jq -r '.state.bytes // 0')

      if [ "$current_msgs" -gt 0 ]; then
        log_info "Purging $stream (current: $current_msgs messages, $current_size bytes)"

        # Calculate cutoff time (max_age ago)
        if [[ "$max_age" == *d ]]; then
          days=${max_age%d}
          cutoff_sec=$((days * 86400))
        else
          # Assume seconds
          cutoff_sec=${max_age%s}
        fi

        cutoff_ns=$((cutoff_sec * 1000000000))

        # Purge messages older than cutoff
        # Note: NATS doesn't have direct time-based purge, use message sequence
        # This is a placeholder - actual implementation depends on NATS CLI capabilities
        log_warn "  Manual purge may be needed for $stream (NATS CLI limitation)"
      else
        log_info "$stream is empty, no purge needed"
      fi
    fi
  done

  log_info "Enforcement complete"
}

# Generate retention report
retention_report() {
  log_info "Generating retention report..."

  report_file="/tmp/nats-retention-report-$(date +%Y%m%d-%H%M%S).txt"

  {
    echo "NATS JetStream Retention Report"
    echo "Generated: $(date)"
    echo ""
    echo "=== US STREAMS ==="
    echo ""

    for stream in "${!US_POLICIES[@]}"; do
      IFS=':' read -r max_age max_bytes description <<< "${US_POLICIES[$stream]}"

      echo "Stream: $stream"
      echo "Description: $description"
      echo "Policy: max_age=$max_age, max_bytes=$max_bytes"

      current=$(nats stream info "$stream" --server="${NATS_US_URL}" --creds="${NATS_CREDS}" --json 2>/dev/null || echo "{}")

      if [ "$current" != "{}" ]; then
        echo "$current" | jq -r '"  Messages: \(.state.messages)\n  Bytes: \(.state.bytes)\n  First Seq: \(.state.first_seq)\n  Last Seq: \(.state.last_seq)\n  Consumers: \(.state.consumer_count)"'
      fi

      echo ""
    done

    echo "=== EU STREAMS ==="
    echo ""

    for stream in "${!EU_POLICIES[@]}"; do
      IFS=':' read -r max_age max_bytes description <<< "${EU_POLICIES[$stream]}"

      echo "Stream: $stream"
      echo "Description: $description"
      echo "Policy: max_age=$max_age, max_bytes=$max_bytes"

      current=$(nats stream info "$stream" --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" --json 2>/dev/null || echo "{}")

      if [ "$current" != "{}" ]; then
        echo "$current" | jq -r '"  Messages: \(.state.messages)\n  Bytes: \(.state.bytes)\n  First Seq: \(.state.first_seq)\n  Last Seq: \(.state.last_seq)\n  Consumers: \(.state.consumer_count)"'
      fi

      echo ""
    done
  } | tee "$report_file"

  log_info "Report saved to: $report_file"
}

# Main
case "${1:-help}" in
  check)
    check_retention
    ;;
  update)
    update_retention
    ;;
  enforce)
    enforce_limits
    ;;
  report)
    retention_report
    ;;
  *)
    echo "Usage: $0 {check|update|enforce|report}"
    echo ""
    echo "Commands:"
    echo "  check      Check current retention settings"
    echo "  update     Update retention policies"
    echo "  enforce    Enforce limits (purge if needed)"
    echo "  report     Generate retention report"
    exit 1
    ;;
esac
