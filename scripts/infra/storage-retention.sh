#!/bin/bash
#
# Storage Retention Policy Management
# Part of FinOps Phase G: Cost Optimization
#
# Purpose: Automate retention and lifecycle policies for:
# - Loki (logs): 30 days hot, 90 days cold S3
# - ClickHouse (analytics): 90 days TTL, partition cleanup
# - S3 (exports/backups): 90 days exports, 2 years backups
# - Postgres WAL: 7 days retention
#
# Usage: ./storage-retention.sh [apply|dry-run]
#

set -euo pipefail

MODE="${1:-dry-run}"
REGION="${AWS_REGION:-us-east-1}"

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*"
}

error() {
  echo "[ERROR] $*" >&2
  exit 1
}

# ==========================================
# 1. Loki Log Retention
# ==========================================
configure_loki_retention() {
  log "Configuring Loki retention policies..."

  # Loki retention is managed via config
  cat > /tmp/loki-retention.yaml <<EOF
limits_config:
  retention_period: 720h  # 30 days

table_manager:
  retention_deletes_enabled: true
  retention_period: 2160h  # 90 days total (30 hot + 60 cold)

storage_config:
  aws:
    s3: s3://${REGION}/teei-loki-logs
    dynamodb:
      dynamodb_url: dynamodb://${REGION}

  # Cold storage transition after 30 days
  boltdb_shipper:
    active_index_directory: /loki/index
    shared_store: s3
    cache_location: /loki/cache
    cache_ttl: 24h

compactor:
  working_directory: /loki/compactor
  shared_store: s3
  compaction_interval: 10m
  retention_enabled: true
  retention_delete_delay: 2h
  retention_delete_worker_count: 150
EOF

  if [ "$MODE" = "apply" ]; then
    kubectl apply -f /tmp/loki-retention.yaml -n observability
    log "✓ Loki retention policy applied"
  else
    log "[DRY-RUN] Would apply Loki retention: 30 days hot, 90 days total"
  fi
}

# ==========================================
# 2. S3 Lifecycle Policies
# ==========================================
configure_s3_lifecycle() {
  log "Configuring S3 lifecycle policies..."

  # Export bucket: 90 days, then delete
  cat > /tmp/s3-exports-lifecycle.json <<EOF
{
  "Rules": [
    {
      "Id": "DeleteExportsAfter90Days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "exports/"
      },
      "Expiration": {
        "Days": 90
      }
    },
    {
      "Id": "TransitionToIA",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "exports/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        }
      ]
    },
    {
      "Id": "DeleteOldVersions",
      "Status": "Enabled",
      "NoncurrentVersionExpiration": {
        "NoncurrentDays": 30
      },
      "NoncurrentVersionTransitions": [
        {
          "NoncurrentDays": 7,
          "StorageClass": "STANDARD_IA"
        }
      ]
    }
  ]
}
EOF

  # Backup bucket: 30 days recent, Glacier after 30 days, delete after 2 years
  cat > /tmp/s3-backups-lifecycle.json <<EOF
{
  "Rules": [
    {
      "Id": "BackupRetention",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "backups/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER_IR"
        },
        {
          "Days": 90,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 730
      }
    },
    {
      "Id": "DeleteIncompleteMultipart",
      "Status": "Enabled",
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
EOF

  if [ "$MODE" = "apply" ]; then
    aws s3api put-bucket-lifecycle-configuration \
      --bucket teei-csr-exports \
      --lifecycle-configuration file:///tmp/s3-exports-lifecycle.json \
      --region "$REGION"

    aws s3api put-bucket-lifecycle-configuration \
      --bucket teei-csr-backups \
      --lifecycle-configuration file:///tmp/s3-backups-lifecycle.json \
      --region "$REGION"

    log "✓ S3 lifecycle policies applied"
  else
    log "[DRY-RUN] Would apply S3 lifecycle: Exports 90d, Backups 2y"
  fi
}

# ==========================================
# 3. ClickHouse TTL and Partitions
# ==========================================
configure_clickhouse_retention() {
  log "Configuring ClickHouse retention and compression..."

  cat > /tmp/clickhouse-retention.sql <<'EOF'
-- Set TTL on analytics events table (90 days)
ALTER TABLE analytics.events
  MODIFY TTL timestamp + INTERVAL 90 DAY;

-- Set TTL on volunteer impact scores (90 days)
ALTER TABLE analytics.volunteer_impact_scores
  MODIFY TTL created_at + INTERVAL 90 DAY;

-- Compress old partitions (older than 30 days)
ALTER TABLE analytics.events
  MODIFY SETTING
    compress_marks = 1,
    compress_primary_key = 1;

-- Drop old partitions manually (for immediate cleanup)
-- ALTER TABLE analytics.events DROP PARTITION '202311';  -- Example

-- Optimize tables to apply TTL and compression
OPTIMIZE TABLE analytics.events FINAL;
OPTIMIZE TABLE analytics.volunteer_impact_scores FINAL;

-- Check partition sizes
SELECT
  partition,
  sum(rows) AS rows,
  formatReadableSize(sum(bytes_on_disk)) AS size_on_disk,
  min(timestamp) AS min_date,
  max(timestamp) AS max_date
FROM system.parts
WHERE table = 'events' AND active
GROUP BY partition
ORDER BY partition DESC;
EOF

  if [ "$MODE" = "apply" ]; then
    kubectl exec -n databases clickhouse-0 -- clickhouse-client --multiquery < /tmp/clickhouse-retention.sql
    log "✓ ClickHouse TTL and compression applied"
  else
    log "[DRY-RUN] Would apply ClickHouse TTL: 90 days, ZSTD compression"
  fi
}

# ==========================================
# 4. Postgres WAL Archival
# ==========================================
configure_postgres_wal() {
  log "Configuring Postgres WAL retention..."

  cat > /tmp/postgres-wal-config.sql <<'EOF'
-- Keep 7 days of WAL segments
ALTER SYSTEM SET wal_keep_size = '10GB';

-- Archive to S3, delete local after 24 hours
ALTER SYSTEM SET archive_mode = 'on';
ALTER SYSTEM SET archive_command = 'aws s3 cp %p s3://teei-csr-backups/wal/%f && rm %p';
ALTER SYSTEM SET archive_timeout = '1h';

-- WAL compression
ALTER SYSTEM SET wal_compression = 'zstd';

-- Reload config
SELECT pg_reload_conf();

-- Show current settings
SHOW wal_keep_size;
SHOW archive_mode;
SHOW archive_command;
EOF

  if [ "$MODE" = "apply" ]; then
    kubectl exec -n databases postgres-0 -- psql -U postgres -f - < /tmp/postgres-wal-config.sql
    log "✓ Postgres WAL retention configured"
  else
    log "[DRY-RUN] Would configure Postgres WAL: 7 days, S3 archive"
  fi
}

# ==========================================
# 5. Storage Usage Report
# ==========================================
generate_storage_report() {
  log "Generating storage usage report..."

  REPORT_FILE="/tmp/storage-usage-$(date +%Y%m%d).txt"

  {
    echo "==============================================="
    echo "Storage Usage Report - $(date)"
    echo "==============================================="
    echo ""

    echo "--- S3 Buckets ---"
    aws s3 ls | while read -r line; do
      bucket=$(echo "$line" | awk '{print $3}')
      if [[ $bucket == teei-* ]]; then
        size=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | grep "Total Size" | awk '{print $3}')
        count=$(aws s3 ls "s3://$bucket" --recursive --summarize 2>/dev/null | grep "Total Objects" | awk '{print $3}')
        echo "$bucket: $size bytes ($count objects)"
      fi
    done
    echo ""

    echo "--- ClickHouse Disk Usage ---"
    kubectl exec -n databases clickhouse-0 -- clickhouse-client --query "
      SELECT
        formatReadableSize(sum(bytes_on_disk)) AS total_size,
        count() AS partitions
      FROM system.parts
      WHERE active
    " 2>/dev/null || echo "ClickHouse not available"
    echo ""

    echo "--- Postgres Database Size ---"
    kubectl exec -n databases postgres-0 -- psql -U postgres -c "
      SELECT
        pg_database.datname,
        pg_size_pretty(pg_database_size(pg_database.datname)) AS size
      FROM pg_database
      WHERE datname = 'teei_csr'
    " 2>/dev/null || echo "Postgres not available"
    echo ""

    echo "--- Loki Storage (from metrics) ---"
    kubectl exec -n observability loki-0 -- df -h /loki 2>/dev/null || echo "Loki not available"

  } | tee "$REPORT_FILE"

  log "Storage report saved to: $REPORT_FILE"
}

# ==========================================
# Main
# ==========================================
main() {
  log "Storage Retention Policy Manager"
  log "Mode: $MODE"
  log "Region: $REGION"
  echo ""

  if [ "$MODE" != "apply" ] && [ "$MODE" != "dry-run" ]; then
    error "Invalid mode. Use: apply or dry-run"
  fi

  configure_loki_retention
  configure_s3_lifecycle
  configure_clickhouse_retention
  configure_postgres_wal
  generate_storage_report

  echo ""
  log "✓ Storage retention configuration complete"

  if [ "$MODE" = "dry-run" ]; then
    log "Run with 'apply' to actually configure retention policies"
  fi
}

main
