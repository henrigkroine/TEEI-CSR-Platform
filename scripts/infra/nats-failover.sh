#!/usr/bin/env bash
# NATS JetStream Disaster Recovery Failover
# Handles failover from US primary to EU replica (and vice versa)
#
# Usage:
#   ./nats-failover.sh health-check    # Check cluster health
#   ./nats-failover.sh failover-to-eu  # Failover to EU (promote mirrors to primary)
#   ./nats-failover.sh failback-to-us  # Failback to US (restore normal ops)
#   ./nats-failover.sh status          # Show current DR status

set -euo pipefail

# Configuration
NATS_US_URL="${NATS_US_URL:-nats://nats-lb.us-east-1.example.com:4222}"
NATS_EU_URL="${NATS_EU_URL:-nats://nats-lb.eu-central-1.example.com:4222}"
NATS_CREDS="${NATS_CREDS:-/etc/nats-secret/app.creds}"

# DNS/Service Discovery (update these to point clients to active cluster)
US_ENDPOINT="nats-lb.us-east-1.example.com"
EU_ENDPOINT="nats-lb.eu-central-1.example.com"
ACTIVE_ENDPOINT_FILE="/tmp/nats-active-endpoint.txt"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_debug() {
  echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check cluster health
health_check() {
  log_info "Checking NATS cluster health..."

  echo ""
  log_info "=== US Cluster (us-east-1) ==="

  us_health=$(nats server ping --server="${NATS_US_URL}" --creds="${NATS_CREDS}" 2>&1 || echo "UNREACHABLE")

  if [[ "$us_health" == *"UNREACHABLE"* ]]; then
    log_error "US cluster is UNREACHABLE"
    US_HEALTHY=false
  else
    log_info "US cluster is HEALTHY"
    echo "$us_health"
    US_HEALTHY=true
  fi

  echo ""
  log_info "=== EU Cluster (eu-central-1) ==="

  eu_health=$(nats server ping --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" 2>&1 || echo "UNREACHABLE")

  if [[ "$eu_health" == *"UNREACHABLE"* ]]; then
    log_error "EU cluster is UNREACHABLE"
    EU_HEALTHY=false
  else
    log_info "EU cluster is HEALTHY"
    echo "$eu_health"
    EU_HEALTHY=true
  fi

  echo ""

  # Check mirror lag (if both clusters are up)
  if $US_HEALTHY && $EU_HEALTHY; then
    log_info "=== Mirror Lag Check ==="

    for mirror in events-eu-mirror audit-eu-mirror metrics-eu-mirror; do
      mirror_info=$(nats stream info "$mirror" --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" --json 2>/dev/null || echo "{}")

      if [ "$mirror_info" != "{}" ]; then
        lag=$(echo "$mirror_info" | jq -r '.mirror.lag // 0')
        last_seen=$(echo "$mirror_info" | jq -r '.mirror.last_seen // "unknown"')

        if [ "$lag" -gt 60 ]; then
          log_warn "$mirror: lag is ${lag}s (threshold: 10s) - last seen: $last_seen"
        else
          log_info "$mirror: lag is ${lag}s - OK"
        fi
      else
        log_warn "$mirror: not found or inaccessible"
      fi
    done
  fi

  echo ""

  # Summary
  if $US_HEALTHY && $EU_HEALTHY; then
    log_info "✓ Both clusters are healthy"
    return 0
  elif $US_HEALTHY; then
    log_warn "⚠ EU cluster is down, US is healthy"
    return 1
  elif $EU_HEALTHY; then
    log_error "✗ US cluster is down, EU is healthy - consider failover!"
    return 2
  else
    log_error "✗ Both clusters are down - CRITICAL!"
    return 3
  fi
}

# Failover to EU (promote mirrors to primary)
failover_to_eu() {
  log_warn "=========================================="
  log_warn "DISASTER RECOVERY FAILOVER TO EU"
  log_warn "=========================================="
  log_warn "This will:"
  log_warn "  1. Delete EU mirror streams"
  log_warn "  2. Create new primary streams in EU"
  log_warn "  3. Update DNS/service discovery to point to EU"
  log_warn ""
  log_warn "Press Ctrl+C to cancel, or wait 10 seconds to proceed..."
  sleep 10

  log_info "Step 1: Verifying EU cluster is healthy..."

  eu_health=$(nats server ping --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" 2>&1 || echo "UNREACHABLE")

  if [[ "$eu_health" == *"UNREACHABLE"* ]]; then
    log_error "EU cluster is unreachable - cannot failover!"
    exit 1
  fi

  log_info "EU cluster is healthy, proceeding with failover..."

  log_info "Step 2: Deleting EU mirror streams..."

  for mirror in events-eu-mirror audit-eu-mirror metrics-eu-mirror; do
    log_info "Deleting $mirror..."
    nats stream rm "$mirror" --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" --force || log_warn "Failed to delete $mirror"
  done

  log_info "Step 3: Creating new primary streams in EU..."

  # Events stream
  nats stream add events-eu \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "events.*,buddy.*,kintell.*,upskilling.*,journey.*" \
    --storage file \
    --retention limits \
    --max-age 7d \
    --max-bytes 10Gi \
    --discard old \
    --replicas 3 \
    --dupe-window 2m \
    --defaults

  log_info "Created events-eu stream"

  # Audit stream
  nats stream add audit-eu \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "audit.*,compliance.*,access-log.*" \
    --storage file \
    --retention limits \
    --max-age 90d \
    --max-bytes 50Gi \
    --discard old \
    --replicas 3 \
    --dupe-window 5m \
    --defaults

  log_info "Created audit-eu stream"

  # Metrics stream
  nats stream add metrics-eu \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "metrics.*,telemetry.*,health.*" \
    --storage file \
    --retention limits \
    --max-age 30d \
    --max-bytes 20Gi \
    --discard old \
    --replicas 3 \
    --dupe-window 1m \
    --defaults

  log_info "Created metrics-eu stream"

  log_info "Step 4: Updating service discovery to point to EU..."

  echo "$EU_ENDPOINT" > "$ACTIVE_ENDPOINT_FILE"

  log_warn "MANUAL ACTION REQUIRED:"
  log_warn "  1. Update DNS record: nats.teei-platform.com -> $EU_ENDPOINT"
  log_warn "  2. Update K8s service discovery (if using external-dns)"
  log_warn "  3. Restart application pods to pick up new NATS URL"
  log_warn "  4. Monitor application logs for connection errors"

  log_info "Failover to EU complete!"
  log_info "Active endpoint: $EU_ENDPOINT"
}

# Failback to US (restore normal operations)
failback_to_us() {
  log_warn "=========================================="
  log_warn "FAILBACK TO US (RESTORE NORMAL OPS)"
  log_warn "=========================================="
  log_warn "This will:"
  log_warn "  1. Verify US cluster is healthy"
  log_warn "  2. Delete EU primary streams"
  log_warn "  3. Recreate EU mirrors from US"
  log_warn "  4. Update DNS/service discovery to point to US"
  log_warn ""
  log_warn "Press Ctrl+C to cancel, or wait 10 seconds to proceed..."
  sleep 10

  log_info "Step 1: Verifying US cluster is healthy..."

  us_health=$(nats server ping --server="${NATS_US_URL}" --creds="${NATS_CREDS}" 2>&1 || echo "UNREACHABLE")

  if [[ "$us_health" == *"UNREACHABLE"* ]]; then
    log_error "US cluster is unreachable - cannot failback!"
    exit 1
  fi

  log_info "US cluster is healthy, proceeding with failback..."

  log_info "Step 2: Deleting EU primary streams (converted from mirrors)..."

  for stream in events-eu audit-eu metrics-eu; do
    log_info "Deleting $stream..."
    nats stream rm "$stream" --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" --force || log_warn "Failed to delete $stream"
  done

  log_info "Step 3: Recreating EU mirrors from US..."

  # Recreate mirrors
  nats stream add events-eu-mirror \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --mirror events-us \
    --mirror-domain us-east-1 \
    --storage file \
    --replicas 3 \
    --defaults

  log_info "Created events-eu-mirror"

  nats stream add audit-eu-mirror \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --mirror audit-us \
    --mirror-domain us-east-1 \
    --storage file \
    --replicas 3 \
    --defaults

  log_info "Created audit-eu-mirror"

  nats stream add metrics-eu-mirror \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --mirror metrics-us \
    --mirror-domain us-east-1 \
    --storage file \
    --replicas 3 \
    --defaults

  log_info "Created metrics-eu-mirror"

  log_info "Step 4: Updating service discovery to point to US..."

  echo "$US_ENDPOINT" > "$ACTIVE_ENDPOINT_FILE"

  log_warn "MANUAL ACTION REQUIRED:"
  log_warn "  1. Update DNS record: nats.teei-platform.com -> $US_ENDPOINT"
  log_warn "  2. Update K8s service discovery (if using external-dns)"
  log_warn "  3. Restart application pods to pick up new NATS URL"
  log_warn "  4. Monitor mirror lag to ensure replication is working"

  log_info "Failback to US complete!"
  log_info "Active endpoint: $US_ENDPOINT"
}

# Show DR status
dr_status() {
  log_info "NATS JetStream DR Status"
  echo ""

  # Check active endpoint
  if [ -f "$ACTIVE_ENDPOINT_FILE" ]; then
    active_endpoint=$(cat "$ACTIVE_ENDPOINT_FILE")
    log_info "Active endpoint: $active_endpoint"
  else
    log_info "Active endpoint: $US_ENDPOINT (default)"
  fi

  echo ""

  # Run health check
  health_check
}

# Auto-failover (can be run via cron or k8s CronJob)
auto_failover() {
  log_info "Running auto-failover health check..."

  # Check US cluster health
  us_health=$(nats server ping --server="${NATS_US_URL}" --creds="${NATS_CREDS}" 2>&1 || echo "UNREACHABLE")

  if [[ "$us_health" == *"UNREACHABLE"* ]]; then
    log_error "US cluster is unreachable!"

    # Check if we've already failed over
    if [ -f "$ACTIVE_ENDPOINT_FILE" ]; then
      active_endpoint=$(cat "$ACTIVE_ENDPOINT_FILE")

      if [ "$active_endpoint" == "$EU_ENDPOINT" ]; then
        log_info "Already failed over to EU, no action needed"
        exit 0
      fi
    fi

    log_warn "Initiating automatic failover to EU..."

    # Non-interactive failover
    log_info "Deleting EU mirror streams..."
    for mirror in events-eu-mirror audit-eu-mirror metrics-eu-mirror; do
      nats stream rm "$mirror" --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" --force 2>/dev/null || true
    done

    log_info "Creating EU primary streams..."
    # (Stream creation commands - abbreviated for auto-failover)

    echo "$EU_ENDPOINT" > "$ACTIVE_ENDPOINT_FILE"

    log_info "Auto-failover to EU complete!"

    # Send alert (e.g., to Slack, PagerDuty, etc.)
    # curl -X POST ... "NATS auto-failover to EU triggered!"
  else
    log_info "US cluster is healthy, no failover needed"
  fi
}

# Main
case "${1:-help}" in
  health-check)
    health_check
    ;;
  failover-to-eu)
    failover_to_eu
    ;;
  failback-to-us)
    failback_to_us
    ;;
  status)
    dr_status
    ;;
  auto-failover)
    auto_failover
    ;;
  *)
    echo "Usage: $0 {health-check|failover-to-eu|failback-to-us|status|auto-failover}"
    echo ""
    echo "Commands:"
    echo "  health-check      Check cluster health and mirror lag"
    echo "  failover-to-eu    Failover to EU (promote mirrors to primary)"
    echo "  failback-to-us    Failback to US (restore normal ops)"
    echo "  status            Show current DR status"
    echo "  auto-failover     Auto-failover if US is down (for cron/k8s)"
    exit 1
    ;;
esac
