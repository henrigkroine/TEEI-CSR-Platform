#!/bin/bash
set -euo pipefail

# PostgreSQL Logical Replication Setup Script
# This script sets up cross-region logical replication between US East 1 (primary) and EU Central 1 (replica)
#
# Usage:
#   ./setup-postgres-replication.sh [primary|replica|verify|status]
#
# Examples:
#   ./setup-postgres-replication.sh primary   # Setup primary in US East 1
#   ./setup-postgres-replication.sh replica   # Setup replica in EU Central 1
#   ./setup-postgres-replication.sh verify    # Verify replication health
#   ./setup-postgres-replication.sh status    # Show replication status

# Configuration
PRIMARY_HOST="${PRIMARY_HOST:-postgres-primary-us.teei.internal}"
PRIMARY_PORT="${PRIMARY_PORT:-5432}"
REPLICA_HOST="${REPLICA_HOST:-postgres-replica-eu.teei.internal}"
REPLICA_PORT="${REPLICA_PORT:-5432}"
DATABASE="${POSTGRES_DB:-teei_platform}"
PRIMARY_USER="${POSTGRES_USER:-teei_user}"
REPLICATION_USER="${REPLICATION_USER:-replicator}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check dependencies
check_dependencies() {
    log_info "Checking dependencies..."

    if ! command -v psql &> /dev/null; then
        log_error "psql not found. Please install PostgreSQL client."
        exit 1
    fi

    if ! command -v kubectl &> /dev/null; then
        log_warning "kubectl not found. Some features may not work."
    fi

    log_success "Dependencies check complete"
}

# Setup PRIMARY database
setup_primary() {
    log_info "Setting up PRIMARY database at $PRIMARY_HOST:$PRIMARY_PORT"

    # Create replication user
    log_info "Creating replication user..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
        -- Create replication user if not exists
        DO \$\$
        BEGIN
          IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${REPLICATION_USER}') THEN
            CREATE ROLE ${REPLICATION_USER} WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
            RAISE NOTICE 'Created replication user: ${REPLICATION_USER}';
          ELSE
            RAISE NOTICE 'Replication user already exists: ${REPLICATION_USER}';
          END IF;
        END
        \$\$;

        -- Grant necessary permissions
        GRANT CONNECT ON DATABASE ${DATABASE} TO ${REPLICATION_USER};
        GRANT USAGE ON SCHEMA public TO ${REPLICATION_USER};
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${REPLICATION_USER};
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${REPLICATION_USER};
EOSQL

    log_success "Replication user created and configured"

    # Create publication for all tables
    log_info "Creating publication 'teei_global' for all tables..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
        -- Create publication for all tables
        DO \$\$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'teei_global') THEN
            CREATE PUBLICATION teei_global FOR ALL TABLES;
            RAISE NOTICE 'Created publication: teei_global';
          ELSE
            RAISE NOTICE 'Publication already exists: teei_global';
          END IF;
        END
        \$\$;

        -- Create replication slot (optional, subscriptions can create them)
        SELECT pg_create_logical_replication_slot('teei_eu_slot', 'pgoutput')
        WHERE NOT EXISTS (
          SELECT 1 FROM pg_replication_slots WHERE slot_name = 'teei_eu_slot'
        );
EOSQL

    log_success "Publication created successfully"

    # Show publications
    log_info "Current publications:"
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER" -d "$DATABASE" -c "\dRp+"

    log_success "PRIMARY setup complete!"
}

# Setup REPLICA database
setup_replica() {
    log_info "Setting up REPLICA database at $REPLICA_HOST:$REPLICA_PORT"

    # Wait for primary to be available
    log_info "Checking primary database availability..."
    until PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER" -d "$DATABASE" -c "SELECT 1" &> /dev/null; do
        log_warning "Waiting for primary database at $PRIMARY_HOST..."
        sleep 5
    done
    log_success "Primary database is available"

    # Create subscription to primary
    log_info "Creating subscription to primary publication..."

    CONNECTION_STRING="host=${PRIMARY_HOST} port=${PRIMARY_PORT} user=${REPLICATION_USER} password=${REPLICATION_PASSWORD} dbname=${DATABASE}"

    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$REPLICA_HOST" -p "$REPLICA_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
        -- Create subscription to primary publication
        DO \$\$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_subscription WHERE subname = 'teei_us_subscription') THEN
            CREATE SUBSCRIPTION teei_us_subscription
            CONNECTION '${CONNECTION_STRING}'
            PUBLICATION teei_global
            WITH (
              copy_data = true,
              create_slot = true,
              enabled = true,
              slot_name = 'teei_us_to_eu_slot'
            );
            RAISE NOTICE 'Created subscription: teei_us_subscription';
          ELSE
            RAISE NOTICE 'Subscription already exists: teei_us_subscription';
          END IF;
        END
        \$\$;
EOSQL

    log_success "Subscription created successfully"

    # Show subscriptions
    log_info "Current subscriptions:"
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$REPLICA_HOST" -p "$REPLICA_PORT" -U "$PRIMARY_USER" -d "$DATABASE" -c "\dRs+"

    log_success "REPLICA setup complete!"
}

# Verify replication health
verify_replication() {
    log_info "Verifying replication health..."

    # Check primary replication status
    log_info "Checking PRIMARY replication status..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
        SELECT
          client_addr,
          application_name,
          state,
          sync_state,
          pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS sent_lag_bytes,
          pg_wal_lsn_diff(sent_lsn, write_lsn) AS write_lag_bytes,
          pg_wal_lsn_diff(write_lsn, flush_lsn) AS flush_lag_bytes,
          pg_wal_lsn_diff(flush_lsn, replay_lsn) AS replay_lag_bytes
        FROM pg_stat_replication
        WHERE application_name LIKE 'teei%';
EOSQL

    # Check replica subscription status
    log_info "Checking REPLICA subscription status..."
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$REPLICA_HOST" -p "$REPLICA_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
        SELECT
          subname,
          pid,
          received_lsn,
          latest_end_lsn,
          last_msg_send_time,
          last_msg_receipt_time
        FROM pg_stat_subscription
        WHERE subname = 'teei_us_subscription';
EOSQL

    # Calculate and display replication lag
    log_info "Calculating replication lag..."

    # Insert test row on primary
    TEST_TIMESTAMP=$(date +%s%N)
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
        CREATE TABLE IF NOT EXISTS replication_test (
          id BIGINT PRIMARY KEY,
          timestamp TIMESTAMPTZ DEFAULT NOW()
        );
        INSERT INTO replication_test (id) VALUES (${TEST_TIMESTAMP})
        ON CONFLICT (id) DO UPDATE SET timestamp = NOW();
EOSQL

    # Wait a moment for replication
    sleep 2

    # Check if row exists on replica
    REPLICA_RESULT=$(PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$REPLICA_HOST" -p "$REPLICA_PORT" -U "$PRIMARY_USER" -d "$DATABASE" -t -c "SELECT COUNT(*) FROM replication_test WHERE id = ${TEST_TIMESTAMP}")

    if [ "$REPLICA_RESULT" -eq 1 ]; then
        log_success "Replication is working! Test row replicated successfully."

        # Calculate time lag
        PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$REPLICA_HOST" -p "$REPLICA_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
            SELECT
              'Replication lag: ' ||
              EXTRACT(EPOCH FROM (NOW() - timestamp)) || ' seconds'
            FROM replication_test
            WHERE id = ${TEST_TIMESTAMP};
EOSQL
    else
        log_error "Replication may not be working. Test row not found on replica."
        return 1
    fi

    # Cleanup test table
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER" -d "$DATABASE" -c "DROP TABLE IF EXISTS replication_test"

    log_success "Replication verification complete!"
}

# Show replication status
show_status() {
    log_info "=== PostgreSQL Replication Status ==="
    echo ""

    log_info "--- PRIMARY (US East 1) ---"
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
        -- Publications
        SELECT 'Publications:' AS info;
        SELECT pubname, puballtables FROM pg_publication;

        -- Replication slots
        SELECT 'Replication Slots:' AS info;
        SELECT
          slot_name,
          slot_type,
          active,
          pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
        FROM pg_replication_slots;

        -- Active replication connections
        SELECT 'Active Replication Connections:' AS info;
        SELECT
          client_addr,
          application_name,
          state,
          sync_state,
          pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)) AS lag_bytes
        FROM pg_stat_replication;
EOSQL

    echo ""
    log_info "--- REPLICA (EU Central 1) ---"
    PGPASSWORD="${POSTGRES_PASSWORD}" psql -h "$REPLICA_HOST" -p "$REPLICA_PORT" -U "$PRIMARY_USER" -d "$DATABASE" <<-EOSQL
        -- Subscriptions
        SELECT 'Subscriptions:' AS info;
        SELECT subname, subenabled FROM pg_subscription;

        -- Subscription status
        SELECT 'Subscription Status:' AS info;
        SELECT
          subname,
          pid IS NOT NULL AS is_running,
          received_lsn,
          latest_end_lsn,
          last_msg_receipt_time
        FROM pg_stat_subscription;
EOSQL

    echo ""
    log_success "Status report complete!"
}

# Main script logic
main() {
    check_dependencies

    case "${1:-}" in
        primary)
            setup_primary
            ;;
        replica)
            setup_replica
            ;;
        verify)
            verify_replication
            ;;
        status)
            show_status
            ;;
        *)
            echo "Usage: $0 {primary|replica|verify|status}"
            echo ""
            echo "Commands:"
            echo "  primary  - Setup primary database (US East 1)"
            echo "  replica  - Setup replica database (EU Central 1)"
            echo "  verify   - Verify replication health"
            echo "  status   - Show replication status"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
