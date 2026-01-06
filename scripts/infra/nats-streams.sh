#!/usr/bin/env bash
# NATS JetStream Stream Setup
# Creates streams, mirrors, and consumers for cross-region DR architecture
#
# Usage:
#   ./nats-streams.sh create-us     # Create US primary streams
#   ./nats-streams.sh create-eu     # Create EU mirrors and GDPR streams
#   ./nats-streams.sh list          # List all streams
#   ./nats-streams.sh status        # Show stream status and mirror lag

set -euo pipefail

# Configuration
NATS_US_URL="${NATS_US_URL:-nats://nats-lb.us-east-1.example.com:4222}"
NATS_EU_URL="${NATS_EU_URL:-nats://nats-lb.eu-central-1.example.com:4222}"
NATS_CREDS="${NATS_CREDS:-/etc/nats-secret/app.creds}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Create US primary streams
create_us_streams() {
  log_info "Creating US primary streams..."

  # Events stream - transient events from all services
  nats stream add events-us \
    --server="${NATS_US_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "events.*,buddy.*,kintell.*,upskilling.*,journey.*" \
    --storage file \
    --retention limits \
    --max-age 7d \
    --max-bytes 10Gi \
    --max-msgs -1 \
    --discard old \
    --replicas 3 \
    --dupe-window 2m \
    --allow-rollup \
    --deny-delete \
    --deny-purge \
    --no-ack \
    --defaults

  log_info "Created events-us stream (7 day retention, 10Gi limit)"

  # Audit stream - compliance and audit events
  nats stream add audit-us \
    --server="${NATS_US_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "audit.*,compliance.*,access-log.*" \
    --storage file \
    --retention limits \
    --max-age 90d \
    --max-bytes 50Gi \
    --max-msgs -1 \
    --discard old \
    --replicas 3 \
    --dupe-window 5m \
    --deny-delete \
    --deny-purge \
    --no-ack \
    --defaults

  log_info "Created audit-us stream (90 day retention, 50Gi limit)"

  # Metrics stream - application and business metrics
  nats stream add metrics-us \
    --server="${NATS_US_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "metrics.*,telemetry.*,health.*" \
    --storage file \
    --retention limits \
    --max-age 30d \
    --max-bytes 20Gi \
    --max-msgs -1 \
    --discard old \
    --replicas 3 \
    --dupe-window 1m \
    --allow-rollup \
    --no-ack \
    --defaults

  log_info "Created metrics-us stream (30 day retention, 20Gi limit)"

  # Notifications stream - user notifications (email, SMS, push)
  nats stream add notifications-us \
    --server="${NATS_US_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "notifications.*,email.*,sms.*,push.*" \
    --storage file \
    --retention limits \
    --max-age 14d \
    --max-bytes 5Gi \
    --max-msgs -1 \
    --discard old \
    --replicas 3 \
    --dupe-window 2m \
    --no-ack \
    --defaults

  log_info "Created notifications-us stream (14 day retention, 5Gi limit)"

  log_info "All US primary streams created successfully"
}

# Create EU mirrors and GDPR-specific streams
create_eu_streams() {
  log_info "Creating EU mirror streams..."

  # Mirror: events-us -> events-eu-mirror
  nats stream add events-eu-mirror \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --mirror events-us \
    --mirror-domain us-east-1 \
    --storage file \
    --replicas 3 \
    --defaults

  log_info "Created events-eu-mirror (mirrors events-us)"

  # Mirror: audit-us -> audit-eu-mirror
  nats stream add audit-eu-mirror \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --mirror audit-us \
    --mirror-domain us-east-1 \
    --storage file \
    --replicas 3 \
    --defaults

  log_info "Created audit-eu-mirror (mirrors audit-us)"

  # Mirror: metrics-us -> metrics-eu-mirror
  nats stream add metrics-eu-mirror \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --mirror metrics-us \
    --mirror-domain us-east-1 \
    --storage file \
    --replicas 3 \
    --defaults

  log_info "Created metrics-eu-mirror (mirrors metrics-us)"

  # EU-native GDPR stream (NO US mirror for data sovereignty)
  log_info "Creating EU GDPR-specific streams (no US mirror)..."

  nats stream add events-eu-gdpr \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "eu.events.*,eu.pii.*,gdpr.*" \
    --storage file \
    --retention limits \
    --max-age 7d \
    --max-bytes 10Gi \
    --max-msgs -1 \
    --discard old \
    --replicas 3 \
    --dupe-window 2m \
    --deny-delete \
    --deny-purge \
    --no-ack \
    --defaults

  log_info "Created events-eu-gdpr stream (EU-only, 7 day retention)"

  nats stream add audit-eu-gdpr \
    --server="${NATS_EU_URL}" \
    --creds="${NATS_CREDS}" \
    --subjects "eu.audit.*,eu.compliance.*,gdpr.access-log.*" \
    --storage file \
    --retention limits \
    --max-age 90d \
    --max-bytes 20Gi \
    --max-msgs -1 \
    --discard old \
    --replicas 3 \
    --dupe-window 5m \
    --deny-delete \
    --deny-purge \
    --no-ack \
    --defaults

  log_info "Created audit-eu-gdpr stream (EU-only, 90 day retention)"

  log_info "All EU streams created successfully"
}

# List all streams
list_streams() {
  log_info "Listing US streams..."
  nats stream list --server="${NATS_US_URL}" --creds="${NATS_CREDS}" || log_warn "Failed to list US streams"

  echo ""
  log_info "Listing EU streams..."
  nats stream list --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" || log_warn "Failed to list EU streams"
}

# Show stream status and mirror lag
stream_status() {
  log_info "Checking US stream status..."

  for stream in events-us audit-us metrics-us notifications-us; do
    echo ""
    log_info "Stream: $stream"
    nats stream info "$stream" --server="${NATS_US_URL}" --creds="${NATS_CREDS}" || log_warn "Failed to get info for $stream"
  done

  echo ""
  log_info "Checking EU stream status and mirror lag..."

  for stream in events-eu-mirror audit-eu-mirror metrics-eu-mirror events-eu-gdpr audit-eu-gdpr; do
    echo ""
    log_info "Stream: $stream"
    nats stream info "$stream" --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" || log_warn "Failed to get info for $stream"
  done

  # Check mirror lag specifically
  echo ""
  log_info "Mirror lag summary:"
  nats stream report --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" | grep -E "(mirror|lag)" || log_warn "No mirror lag data"
}

# Delete all streams (dangerous!)
delete_all_streams() {
  log_warn "This will DELETE all streams. Press Ctrl+C to cancel, or wait 5 seconds..."
  sleep 5

  log_info "Deleting US streams..."
  for stream in events-us audit-us metrics-us notifications-us; do
    nats stream rm "$stream" --server="${NATS_US_URL}" --creds="${NATS_CREDS}" --force || log_warn "Failed to delete $stream"
  done

  log_info "Deleting EU streams..."
  for stream in events-eu-mirror audit-eu-mirror metrics-eu-mirror events-eu-gdpr audit-eu-gdpr; do
    nats stream rm "$stream" --server="${NATS_EU_URL}" --creds="${NATS_CREDS}" --force || log_warn "Failed to delete $stream"
  done

  log_info "All streams deleted"
}

# Main
case "${1:-help}" in
  create-us)
    create_us_streams
    ;;
  create-eu)
    create_eu_streams
    ;;
  list)
    list_streams
    ;;
  status)
    stream_status
    ;;
  delete-all)
    delete_all_streams
    ;;
  *)
    echo "Usage: $0 {create-us|create-eu|list|status|delete-all}"
    echo ""
    echo "Commands:"
    echo "  create-us    Create US primary streams"
    echo "  create-eu    Create EU mirrors and GDPR streams"
    echo "  list         List all streams"
    echo "  status       Show stream status and mirror lag"
    echo "  delete-all   Delete all streams (dangerous!)"
    exit 1
    ;;
esac
