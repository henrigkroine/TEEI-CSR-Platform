#!/bin/bash
# SWARM 6 Migration Script
# Purpose: Execute migrations for Beneficiary Groups, Campaigns & Monetization
# Created: 2025-11-22
# Agent: 2.2 (migration-engineer)

set -e  # Exit on error
set -u  # Exit on undefined variable
set -o pipefail  # Exit on pipe failure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MIGRATIONS_DIR="packages/shared-schema/migrations"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-teei_platform}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"

# Migration files in dependency order
MIGRATIONS=(
  "0044_create_beneficiary_groups.sql"
  "0045_create_program_templates.sql"
  "0046_create_campaigns.sql"
  "0047_create_program_instances.sql"
  "0048_create_campaign_metrics_snapshots.sql"
)

# Rollback files (reverse order)
ROLLBACKS=(
  "0048_rollback_campaign_metrics_snapshots.sql"
  "0047_rollback_program_instances.sql"
  "0046_rollback_campaigns.sql"
  "0045_rollback_program_templates.sql"
  "0044_rollback_beneficiary_groups.sql"
)

# Print with color
print_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Build psql connection string
get_psql_cmd() {
  local cmd="PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -p ${DB_PORT} -U ${DB_USER} -d ${DB_NAME}"
  echo "$cmd"
}

# Check if database is accessible
check_db_connection() {
  print_info "Checking database connection..."

  if eval "$(get_psql_cmd) -c 'SELECT 1;' > /dev/null 2>&1"; then
    print_success "Database connection successful"
    return 0
  else
    print_error "Cannot connect to database"
    print_error "Host: ${DB_HOST}:${DB_PORT}, Database: ${DB_NAME}, User: ${DB_USER}"
    return 1
  fi
}

# Execute a migration file
execute_migration() {
  local migration_file=$1
  local migration_path="${MIGRATIONS_DIR}/${migration_file}"

  if [ ! -f "$migration_path" ]; then
    print_error "Migration file not found: ${migration_path}"
    return 1
  fi

  print_info "Executing migration: ${migration_file}"

  if eval "$(get_psql_cmd) -f '${migration_path}' > /dev/null 2>&1"; then
    print_success "Migration completed: ${migration_file}"
    return 0
  else
    print_error "Migration failed: ${migration_file}"
    return 1
  fi
}

# Execute all migrations
migrate_up() {
  print_info "Starting SWARM 6 migrations..."
  print_info "Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
  echo ""

  local total=${#MIGRATIONS[@]}
  local completed=0

  for migration in "${MIGRATIONS[@]}"; do
    if execute_migration "$migration"; then
      ((completed++))
      echo ""
    else
      print_error "Migration failed. Completed ${completed}/${total} migrations."
      print_warning "Run './scripts/migrate-swarm6.sh rollback' to revert changes"
      return 1
    fi
  done

  echo ""
  print_success "All ${total} migrations completed successfully!"
  print_info "Tables created: beneficiary_groups, program_templates, campaigns, program_instances, campaign_metrics_snapshots"
  print_info "Enums created: 10 enum types"
  print_info "Indexes created: 58 indexes"
  print_info "Foreign keys created: 13 foreign key constraints"
  echo ""
}

# Rollback all migrations
migrate_down() {
  print_warning "Starting SWARM 6 rollback..."
  print_warning "This will DROP all SWARM 6 tables and data!"
  print_warning "Database: ${DB_NAME} on ${DB_HOST}:${DB_PORT}"
  echo ""

  read -p "Are you sure? Type 'YES' to confirm: " confirm

  if [ "$confirm" != "YES" ]; then
    print_info "Rollback cancelled"
    return 0
  fi

  echo ""
  local total=${#ROLLBACKS[@]}
  local completed=0

  for rollback in "${ROLLBACKS[@]}"; do
    if execute_migration "$rollback"; then
      ((completed++))
      echo ""
    else
      print_error "Rollback failed. Completed ${completed}/${total} rollbacks."
      return 1
    fi
  done

  echo ""
  print_success "All ${total} rollbacks completed successfully!"
  print_info "All SWARM 6 tables, enums, and indexes have been removed"
  echo ""
}

# Check migration status
check_status() {
  print_info "Checking SWARM 6 migration status..."
  echo ""

  local psql_cmd=$(get_psql_cmd)

  # Check each table
  local tables=("beneficiary_groups" "program_templates" "campaigns" "program_instances" "campaign_metrics_snapshots")

  for table in "${tables[@]}"; do
    local exists=$(eval "$psql_cmd -t -c \"SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${table}');\"" 2>/dev/null | tr -d ' ')

    if [ "$exists" = "t" ]; then
      local count=$(eval "$psql_cmd -t -c \"SELECT COUNT(*) FROM ${table};\"" 2>/dev/null | tr -d ' ')
      print_success "✓ ${table} (${count} rows)"
    else
      print_warning "✗ ${table} (not found)"
    fi
  done

  echo ""
}

# Show help
show_help() {
  cat << EOF
SWARM 6 Migration Script

Usage: ./scripts/migrate-swarm6.sh [command]

Commands:
  up        Execute all SWARM 6 migrations (default)
  down      Rollback all SWARM 6 migrations
  rollback  Alias for 'down'
  status    Check migration status
  help      Show this help message

Environment Variables:
  DB_HOST      Database host (default: localhost)
  DB_PORT      Database port (default: 5432)
  DB_NAME      Database name (default: teei_platform)
  DB_USER      Database user (default: postgres)
  DB_PASSWORD  Database password (default: empty)

Examples:
  # Run migrations
  ./scripts/migrate-swarm6.sh up

  # Rollback migrations
  ./scripts/migrate-swarm6.sh down

  # Check status
  ./scripts/migrate-swarm6.sh status

  # With custom database
  DB_HOST=prod.db.example.com DB_NAME=teei_prod ./scripts/migrate-swarm6.sh up

Tables Created:
  - beneficiary_groups (GDPR-compliant beneficiary group definitions)
  - program_templates (Reusable program templates)
  - campaigns (Sellable CSR products)
  - program_instances (Runtime execution of campaigns)
  - campaign_metrics_snapshots (Time-series metrics tracking)

EOF
}

# Main execution
main() {
  local command="${1:-up}"

  case "$command" in
    up|migrate)
      check_db_connection || exit 1
      migrate_up
      ;;
    down|rollback)
      check_db_connection || exit 1
      migrate_down
      ;;
    status)
      check_db_connection || exit 1
      check_status
      ;;
    help|-h|--help)
      show_help
      ;;
    *)
      print_error "Unknown command: ${command}"
      echo ""
      show_help
      exit 1
      ;;
  esac
}

# Run main
main "$@"
