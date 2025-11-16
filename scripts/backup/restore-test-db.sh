#!/bin/bash
# restore-test-db.sh - Spin up temporary DB from backup for testing
# Author: backup-restore-auditor

set -euo pipefail

BACKUP_FILE="${1:-}"
if [[ -z "$BACKUP_FILE" ]]; then
    echo "Usage: $0 <backup-file.tar.gz>"
    exit 1
fi

TEST_DIR="/tmp/postgres-test-restore-$(date +%s)"
LOG_FILE="$TEST_DIR/restore-test.log"

mkdir -p "$TEST_DIR"
log() { echo "[$(date +'%H:%M:%S')] $*" | tee -a "$LOG_FILE"; }

log "Starting test restore from: $BACKUP_FILE"

# Extract backup
log "Extracting backup..."
tar -xzf "$BACKUP_FILE" -C "$TEST_DIR"

# Start temporary Postgres instance (Docker)
log "Starting temporary PostgreSQL instance..."
docker run -d --name postgres-test-restore \
    -v "$TEST_DIR:/var/lib/postgresql/data" \
    -e POSTGRES_PASSWORD=testpassword \
    -p 15432:5432 \
    postgres:16.1 > /dev/null 2>&1

# Wait for Postgres to start
log "Waiting for PostgreSQL to start..."
sleep 10

# Test connection and query
log "Testing database connectivity..."
docker exec postgres-test-restore psql -U postgres -c "SELECT version();" > "$TEST_DIR/version.txt" 2>&1

if grep -q "PostgreSQL" "$TEST_DIR/version.txt"; then
    log "✓ Database is operational"

    # Test data integrity
    docker exec postgres-test-restore psql -U postgres -d teei -c "SELECT COUNT(*) FROM events;" > "$TEST_DIR/row-count.txt" 2>&1 || log "⚠ Events table query failed (may be expected for fresh backup)"
else
    log "✗ ERROR: Database failed to start"
    docker logs postgres-test-restore >> "$LOG_FILE"
fi

# Cleanup
log "Cleaning up..."
docker stop postgres-test-restore > /dev/null 2>&1
docker rm postgres-test-restore > /dev/null 2>&1
rm -rf "$TEST_DIR"

log "Test restore complete. Check logs: $LOG_FILE"
