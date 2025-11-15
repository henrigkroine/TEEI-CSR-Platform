#!/bin/bash
set -euo pipefail

# PostgreSQL Cross-Region Failover Script
# This script handles disaster recovery failover from US East 1 (primary) to EU Central 1 (replica)
#
# WARNING: This is a critical operation that will:
# 1. Promote EU replica to primary
# 2. Reconfigure applications to use EU as primary
# 3. Optionally set up reverse replication (EU -> US)
#
# Usage:
#   ./postgres-failover.sh [promote|rollback|status|test]
#
# Examples:
#   ./postgres-failover.sh test      # Test failover readiness (dry-run)
#   ./postgres-failover.sh status    # Check current failover status
#   ./postgres-failover.sh promote   # Promote EU to primary (PRODUCTION)
#   ./postgres-failover.sh rollback  # Rollback to US primary

# Configuration
CURRENT_PRIMARY="${CURRENT_PRIMARY:-postgres-primary-us.teei.internal}"
CURRENT_REPLICA="${CURRENT_REPLICA:-postgres-replica-eu.teei.internal}"
NEW_PRIMARY="${CURRENT_REPLICA}"  # EU becomes new primary
NEW_REPLICA="${CURRENT_PRIMARY}"  # US becomes new replica (after recovery)

DATABASE="${POSTGRES_DB:-teei_platform}"
ADMIN_USER="${POSTGRES_USER:-teei_user}"
REPLICATION_USER="${REPLICATION_USER:-replicator}"

# Kubernetes configuration
KUBECTL="${KUBECTL:-kubectl}"
US_NAMESPACE="${US_NAMESPACE:-teei-us-east-1}"
EU_NAMESPACE="${EU_NAMESPACE:-teei-eu-central-1}"

# DNS/LoadBalancer configuration
DNS_UPDATER="${DNS_UPDATER:-external-dns}"  # or route53, cloudflare, etc.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_critical() {
    echo -e "${MAGENTA}[CRITICAL]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Check if running in dry-run mode
DRY_RUN="${DRY_RUN:-false}"

execute_command() {
    local cmd="$1"
    if [ "$DRY_RUN" = "true" ]; then
        log_info "[DRY-RUN] Would execute: $cmd"
    else
        log_info "Executing: $cmd"
        eval "$cmd"
    fi
}

# Pre-flight checks
preflight_checks() {
    log_info "Running pre-flight checks..."

    # Check dependencies
    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client."
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl."
        exit 1
    fi

    # Check connectivity to replica
    log_info "Checking connectivity to EU replica..."
    if ! PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_REPLICA" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" -c "SELECT 1" &> /dev/null; then
        log_error "Cannot connect to EU replica at $CURRENT_REPLICA"
        exit 1
    fi
    log_success "EU replica is accessible"

    # Check replication lag
    log_info "Checking replication lag..."
    LAG_RESULT=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_REPLICA" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" -t -c "
        SELECT COALESCE(
            EXTRACT(EPOCH FROM (NOW() - last_msg_receipt_time)),
            999999
        )
        FROM pg_stat_subscription
        WHERE subname = 'teei_us_subscription'
        LIMIT 1;
    " 2>/dev/null || echo "999999")

    LAG_SECONDS=$(echo "$LAG_RESULT" | xargs)

    if (( $(echo "$LAG_SECONDS > 30" | bc -l) )); then
        log_warning "Replication lag is ${LAG_SECONDS}s (>30s threshold)"
        log_warning "Data may be stale. Recommend waiting for lag to reduce."
    else
        log_success "Replication lag is ${LAG_SECONDS}s (acceptable)"
    fi

    log_success "Pre-flight checks complete"
}

# Test failover readiness
test_failover() {
    log_info "=== FAILOVER READINESS TEST (DRY-RUN) ==="

    DRY_RUN=true
    preflight_checks

    log_info "Checking subscription status on EU replica..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_REPLICA" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" <<-EOSQL
        SELECT
            subname,
            subenabled,
            pid IS NOT NULL AS is_running,
            received_lsn,
            latest_end_lsn
        FROM pg_stat_subscription
        WHERE subname = 'teei_us_subscription';
EOSQL

    log_info "Checking database size on EU replica..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_REPLICA" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" -c "
        SELECT
            pg_size_pretty(pg_database_size('${DATABASE}')) AS database_size,
            (SELECT COUNT(*) FROM pg_stat_activity WHERE datname = '${DATABASE}') AS active_connections;
    "

    log_info "Checking table counts on EU replica..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_REPLICA" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" <<-EOSQL
        SELECT
            schemaname,
            tablename,
            n_live_tup AS row_count
        FROM pg_stat_user_tables
        WHERE n_live_tup > 0
        ORDER BY n_live_tup DESC
        LIMIT 10;
EOSQL

    log_success "Failover readiness test complete"
    log_info "Review the output above to verify EU replica is ready for promotion"
}

# Promote EU replica to primary
promote_to_primary() {
    log_critical "=== INITIATING FAILOVER: EU REPLICA -> PRIMARY ==="
    log_critical "This will promote EU Central 1 to PRIMARY"

    if [ "$DRY_RUN" != "true" ]; then
        log_warning "This is NOT a dry-run. Proceeding in 10 seconds..."
        log_warning "Press Ctrl+C to cancel"
        sleep 10
    fi

    # Step 1: Disable subscription on EU
    log_info "Step 1/6: Disabling subscription on EU replica..."
    execute_command "PGPASSWORD=\"\${POSTGRES_PASSWORD}\" psql -h \"$CURRENT_REPLICA\" -p 5432 -U \"$ADMIN_USER\" -d \"$DATABASE\" -c \"
        ALTER SUBSCRIPTION teei_us_subscription DISABLE;
    \""

    log_info "Step 1/6: Dropping subscription on EU replica..."
    execute_command "PGPASSWORD=\"\${POSTGRES_PASSWORD}\" psql -h \"$CURRENT_REPLICA\" -p 5432 -U \"$ADMIN_USER\" -d \"$DATABASE\" -c \"
        DROP SUBSCRIPTION IF EXISTS teei_us_subscription;
    \""

    log_success "Subscription disabled and dropped"

    # Step 2: Promote replica to primary
    log_info "Step 2/6: Promoting EU replica to primary..."

    # In Kubernetes, we need to update the StatefulSet to change POSTGRES_ROLE
    execute_command "$KUBECTL set env statefulset/postgres POSTGRES_ROLE=primary -n $EU_NAMESPACE"

    log_success "EU replica promoted to primary"

    # Step 3: Create publication on new primary (EU)
    log_info "Step 3/6: Creating publication on new primary (EU)..."
    execute_command "PGPASSWORD=\"\${POSTGRES_PASSWORD}\" psql -h \"$NEW_PRIMARY\" -p 5432 -U \"$ADMIN_USER\" -d \"$DATABASE\" -c \"
        CREATE PUBLICATION IF NOT EXISTS teei_global FOR ALL TABLES;
    \""

    log_success "Publication created on new primary"

    # Step 4: Update DNS/LoadBalancer
    log_info "Step 4/6: Updating DNS to point to new primary..."

    # Update service labels to redirect traffic
    execute_command "$KUBECTL label service postgres-primary teei.platform/active-region=eu-central-1 -n $EU_NAMESPACE --overwrite"

    # If using external-dns, annotation update will trigger DNS change
    execute_command "$KUBECTL annotate service postgres-primary external-dns.alpha.kubernetes.io/hostname=postgres-primary.teei.internal -n $EU_NAMESPACE --overwrite"

    log_success "DNS/LoadBalancer updated"

    # Step 5: Update application configuration
    log_info "Step 5/6: Updating application configuration..."

    # Update ConfigMap for applications
    execute_command "$KUBECTL set env deployment --all PRIMARY_DB_HOST=$NEW_PRIMARY -n $EU_NAMESPACE"

    log_success "Application configuration updated"

    # Step 6: Verify new primary is operational
    log_info "Step 6/6: Verifying new primary..."

    if [ "$DRY_RUN" != "true" ]; then
        sleep 5  # Wait for changes to propagate

        PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$NEW_PRIMARY" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" <<-EOSQL
            -- Verify we can write
            CREATE TABLE IF NOT EXISTS failover_test (
                id SERIAL PRIMARY KEY,
                failover_time TIMESTAMPTZ DEFAULT NOW(),
                message TEXT
            );

            INSERT INTO failover_test (message)
            VALUES ('Failover completed at $(date)');

            SELECT * FROM failover_test ORDER BY id DESC LIMIT 1;
EOSQL

        log_success "New primary is operational and accepting writes"
    fi

    log_critical "=== FAILOVER COMPLETE ==="
    log_success "EU Central 1 is now the PRIMARY database"
    log_info "Next steps:"
    log_info "1. Monitor application health"
    log_info "2. Verify data integrity"
    log_info "3. Set up reverse replication (US as replica) when US region recovers"
    log_info "4. Update documentation with new topology"
}

# Rollback to US primary
rollback_to_us() {
    log_critical "=== INITIATING ROLLBACK: US -> PRIMARY ==="
    log_warning "This will demote EU back to replica and restore US as primary"

    if [ "$DRY_RUN" != "true" ]; then
        log_warning "This is NOT a dry-run. Proceeding in 10 seconds..."
        log_warning "Press Ctrl+C to cancel"
        sleep 10
    fi

    # Step 1: Verify US is available
    log_info "Step 1/5: Verifying US database is available..."
    if ! PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_PRIMARY" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" -c "SELECT 1" &> /dev/null; then
        log_error "Cannot connect to US database at $CURRENT_PRIMARY"
        log_error "Rollback aborted. US must be operational before rollback."
        exit 1
    fi
    log_success "US database is available"

    # Step 2: Stop writes to EU
    log_info "Step 2/5: Stopping writes to EU..."

    # Set EU to read-only
    execute_command "PGPASSWORD=\"\${POSTGRES_PASSWORD}\" psql -h \"$NEW_PRIMARY\" -p 5432 -U \"$ADMIN_USER\" -d \"$DATABASE\" -c \"
        ALTER DATABASE ${DATABASE} SET default_transaction_read_only = on;
    \""

    log_success "EU set to read-only"

    # Step 3: Set up subscription from EU to US (reverse replication)
    log_info "Step 3/5: Setting up reverse replication (EU -> US)..."

    execute_command "PGPASSWORD=\"\${POSTGRES_PASSWORD}\" psql -h \"$CURRENT_PRIMARY\" -p 5432 -U \"$ADMIN_USER\" -d \"$DATABASE\" -c \"
        DROP SUBSCRIPTION IF EXISTS teei_eu_subscription;
        CREATE SUBSCRIPTION teei_eu_subscription
        CONNECTION 'host=${NEW_PRIMARY} port=5432 user=${REPLICATION_USER} password=${REPLICATION_PASSWORD} dbname=${DATABASE}'
        PUBLICATION teei_global
        WITH (copy_data = true, create_slot = true, enabled = true);
    \""

    log_success "Reverse replication configured"

    # Step 4: Wait for sync and promote US
    log_info "Step 4/5: Waiting for US to sync..."
    sleep 10

    # Promote US back to primary
    execute_command "$KUBECTL set env statefulset/postgres POSTGRES_ROLE=primary -n $US_NAMESPACE"

    # Demote EU back to replica
    execute_command "$KUBECTL set env statefulset/postgres POSTGRES_ROLE=replica -n $EU_NAMESPACE"

    log_success "US promoted back to primary"

    # Step 5: Update DNS back to US
    log_info "Step 5/5: Updating DNS back to US..."

    execute_command "$KUBECTL label service postgres-primary teei.platform/active-region=us-east-1 -n $US_NAMESPACE --overwrite"
    execute_command "$KUBECTL annotate service postgres-primary external-dns.alpha.kubernetes.io/hostname=postgres-primary.teei.internal -n $US_NAMESPACE --overwrite"

    execute_command "$KUBECTL set env deployment --all PRIMARY_DB_HOST=$CURRENT_PRIMARY -n $US_NAMESPACE"

    log_success "DNS updated back to US"

    log_critical "=== ROLLBACK COMPLETE ==="
    log_success "US East 1 is now the PRIMARY database again"
    log_info "EU Central 1 is now a REPLICA again"
}

# Show failover status
show_status() {
    log_info "=== FAILOVER STATUS ==="

    log_info "Checking US database..."
    if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_PRIMARY" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" -c "SELECT 1" &> /dev/null; then
        US_STATUS=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_PRIMARY" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" -t -c "
            SELECT CASE
                WHEN EXISTS (SELECT 1 FROM pg_publication) THEN 'PRIMARY'
                WHEN EXISTS (SELECT 1 FROM pg_subscription) THEN 'REPLICA'
                ELSE 'STANDALONE'
            END;
        " | xargs)
        log_success "US East 1: $US_STATUS (accessible)"
    else
        log_error "US East 1: UNREACHABLE"
        US_STATUS="UNREACHABLE"
    fi

    log_info "Checking EU database..."
    if PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_REPLICA" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" -c "SELECT 1" &> /dev/null; then
        EU_STATUS=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$CURRENT_REPLICA" -p 5432 -U "$ADMIN_USER" -d "$DATABASE" -t -c "
            SELECT CASE
                WHEN EXISTS (SELECT 1 FROM pg_publication) THEN 'PRIMARY'
                WHEN EXISTS (SELECT 1 FROM pg_subscription) THEN 'REPLICA'
                ELSE 'STANDALONE'
            END;
        " | xargs)
        log_success "EU Central 1: $EU_STATUS (accessible)"
    else
        log_error "EU Central 1: UNREACHABLE"
        EU_STATUS="UNREACHABLE"
    fi

    echo ""
    log_info "Current Topology:"
    echo "  US East 1:    $US_STATUS"
    echo "  EU Central 1: $EU_STATUS"

    # Determine current primary
    if [ "$US_STATUS" = "PRIMARY" ]; then
        log_info "Active Primary: US East 1 (normal configuration)"
    elif [ "$EU_STATUS" = "PRIMARY" ]; then
        log_warning "Active Primary: EU Central 1 (failover active!)"
    else
        log_error "No clear primary detected! Manual intervention required."
    fi
}

# Main script logic
main() {
    case "${1:-}" in
        test)
            test_failover
            ;;
        promote)
            preflight_checks
            promote_to_primary
            ;;
        rollback)
            rollback_to_us
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 {test|promote|rollback|status}"
            echo ""
            echo "Commands:"
            echo "  test     - Test failover readiness (dry-run)"
            echo "  promote  - Promote EU to primary (PRODUCTION FAILOVER)"
            echo "  rollback - Rollback to US primary (PRODUCTION ROLLBACK)"
            echo "  status   - Show current failover status"
            echo ""
            echo "Environment variables:"
            echo "  DRY_RUN=true  - Run in dry-run mode (test only)"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
