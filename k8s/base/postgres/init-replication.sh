#!/bin/bash
set -e

# PostgreSQL Replication Initialization Script
# This script runs on database startup to configure replication based on role

ROLE="${POSTGRES_ROLE:-primary}"
echo "Initializing PostgreSQL with role: $ROLE"

# Wait for PostgreSQL to be ready
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  echo "Waiting for PostgreSQL to be ready..."
  sleep 2
done

if [ "$ROLE" = "primary" ]; then
  echo "Setting up PRIMARY database..."

  # Create replication user if not exists
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create replication user
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${REPLICATION_USER:-replicator}') THEN
        CREATE ROLE ${REPLICATION_USER:-replicator} WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
      END IF;
    END
    \$\$;

    -- Grant necessary permissions
    GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${REPLICATION_USER:-replicator};
    GRANT USAGE ON SCHEMA public TO ${REPLICATION_USER:-replicator};
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO ${REPLICATION_USER:-replicator};
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO ${REPLICATION_USER:-replicator};

    -- Create publication for all tables (can be filtered per region)
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'teei_global') THEN
        CREATE PUBLICATION teei_global FOR ALL TABLES;
      END IF;
    END
    \$\$;

    -- Create replication slot (optional, subscriptions can create them)
    SELECT pg_create_logical_replication_slot('teei_eu_slot', 'pgoutput')
    WHERE NOT EXISTS (
      SELECT 1 FROM pg_replication_slots WHERE slot_name = 'teei_eu_slot'
    );

    -- Enable row-level security for data residency (if needed)
    -- Note: Actual RLS policies should be defined in application migrations

    -- Log replication status
    SELECT * FROM pg_stat_replication;
EOSQL

  echo "PRIMARY database setup complete."
  echo "Publications created:"
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dRp"

elif [ "$ROLE" = "replica" ]; then
  echo "Setting up REPLICA database..."

  # Wait for primary to be available
  PRIMARY_HOST="${PRIMARY_HOST:-postgres-primary.default.svc.cluster.local}"
  until pg_isready -h "$PRIMARY_HOST" -p 5432; do
    echo "Waiting for primary database at $PRIMARY_HOST..."
    sleep 5
  done

  # Create subscription to primary
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create subscription to primary publication
    DO \$\$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_subscription WHERE subname = 'teei_us_subscription') THEN
        CREATE SUBSCRIPTION teei_us_subscription
        CONNECTION 'host=${PRIMARY_HOST} port=5432 user=${REPLICATION_USER:-replicator} password=${REPLICATION_PASSWORD} dbname=${POSTGRES_DB}'
        PUBLICATION teei_global
        WITH (
          copy_data = true,
          create_slot = true,
          enabled = true,
          slot_name = 'teei_us_to_eu_slot'
        );
      END IF;
    END
    \$\$;

    -- Set database to read-only mode (optional, enforce at application level)
    -- ALTER DATABASE ${POSTGRES_DB} SET default_transaction_read_only = on;

    -- Log subscription status
    SELECT * FROM pg_subscription;
    SELECT * FROM pg_stat_subscription;
EOSQL

  echo "REPLICA database setup complete."
  echo "Subscriptions created:"
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dRs"

else
  echo "Unknown role: $ROLE. Skipping replication setup."
fi

echo "PostgreSQL replication initialization complete for role: $ROLE"
