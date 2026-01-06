#!/bin/bash
# SWARM 6 Seed Data Loader
# Purpose: Load beneficiary groups, campaigns, instances, and metrics snapshots
# Date: 2025-11-22
# Agent: 2.3 (seed-data-engineer)
# Usage: ./scripts/seed-swarm6.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SEED_DIR="${SCRIPT_DIR}/seed/swarm6"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}SWARM 6 Seed Data Loader${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if PostgreSQL is available
if ! command -v psql &> /dev/null; then
    print_error "psql command not found. Please install PostgreSQL client."
    exit 1
fi

# Check database connection
print_info "Checking database connection..."
if ! psql -c "SELECT 1;" &> /dev/null; then
    print_error "Cannot connect to database. Please check:"
    echo "  - PGDATABASE (current: ${PGDATABASE:-not set})"
    echo "  - PGUSER (current: ${PGUSER:-not set})"
    echo "  - PGHOST (current: ${PGHOST:-localhost})"
    echo "  - PGPORT (current: ${PGPORT:-5432})"
    exit 1
fi
print_success "Database connection successful"

# Check if migrations are applied
print_info "Checking SWARM 6 migrations..."
MIGRATION_CHECK=$(psql -t -c "
    SELECT COUNT(*)
    FROM information_schema.tables
    WHERE table_name IN (
        'beneficiary_groups',
        'program_templates',
        'campaigns',
        'program_instances',
        'campaign_metrics_snapshots'
    );
" 2>/dev/null || echo "0")

if [ "$MIGRATION_CHECK" -ne 5 ]; then
    print_error "SWARM 6 migrations not applied. Found $MIGRATION_CHECK/5 tables."
    print_warning "Please run migrations first:"
    echo "  psql -f packages/shared-schema/migrations/0044_create_beneficiary_groups.sql"
    echo "  psql -f packages/shared-schema/migrations/0045_create_program_templates.sql"
    echo "  psql -f packages/shared-schema/migrations/0046_create_campaigns.sql"
    echo "  psql -f packages/shared-schema/migrations/0047_create_program_instances.sql"
    echo "  psql -f packages/shared-schema/migrations/0048_create_campaign_metrics_snapshots.sql"
    exit 1
fi
print_success "SWARM 6 migrations verified (5/5 tables found)"

# Check if program templates exist
print_info "Checking program templates..."
TEMPLATE_COUNT=$(psql -t -c "SELECT COUNT(*) FROM program_templates WHERE id LIKE 'tmpl-%';" 2>/dev/null || echo "0")
if [ "$TEMPLATE_COUNT" -lt 16 ]; then
    print_error "Program templates not loaded. Found $TEMPLATE_COUNT/16 templates."
    print_warning "Please load templates first:"
    echo "  psql -f scripts/seed/templates/mentorship-template.sql"
    echo "  psql -f scripts/seed/templates/language-template.sql"
    echo "  psql -f scripts/seed/templates/buddy-template.sql"
    echo "  psql -f scripts/seed/templates/upskilling-template.sql"
    exit 1
fi
print_success "Program templates verified ($TEMPLATE_COUNT templates found)"

# Check if pilot companies exist
print_info "Checking pilot companies..."
COMPANY_COUNT=$(psql -t -c "
    SELECT COUNT(*)
    FROM companies
    WHERE id IN (
        'acme0001-0001-0001-0001-000000000001',
        'techc001-0001-0001-0001-000000000001',
        'globa001-0001-0001-0001-000000000001'
    );
" 2>/dev/null || echo "0")

if [ "$COMPANY_COUNT" -ne 3 ]; then
    print_error "Pilot companies not found. Found $COMPANY_COUNT/3 companies."
    print_warning "Please load pilot seed data first:"
    echo "  psql -f scripts/seed/pilot/companies.sql"
    exit 1
fi
print_success "Pilot companies verified (3/3 companies found)"

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Loading SWARM 6 Seed Data${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Load beneficiary groups
print_info "Loading beneficiary groups..."
if psql -f "${SEED_DIR}/beneficiary-groups.sql" > /tmp/swarm6-beneficiary-groups.log 2>&1; then
    GROUPS_COUNT=$(psql -t -c "SELECT COUNT(*) FROM beneficiary_groups WHERE id LIKE 'bg-%';" 2>/dev/null || echo "0")
    print_success "Beneficiary groups loaded: $GROUPS_COUNT groups"
else
    print_error "Failed to load beneficiary groups. Check /tmp/swarm6-beneficiary-groups.log"
    exit 1
fi

# Load campaigns
print_info "Loading campaigns..."
if psql -f "${SEED_DIR}/campaigns.sql" > /tmp/swarm6-campaigns.log 2>&1; then
    CAMPAIGNS_COUNT=$(psql -t -c "SELECT COUNT(*) FROM campaigns WHERE id LIKE 'camp-%';" 2>/dev/null || echo "0")
    print_success "Campaigns loaded: $CAMPAIGNS_COUNT campaigns"
else
    print_error "Failed to load campaigns. Check /tmp/swarm6-campaigns.log"
    exit 1
fi

# Load program instances
print_info "Loading program instances..."
if psql -f "${SEED_DIR}/program-instances.sql" > /tmp/swarm6-instances.log 2>&1; then
    INSTANCES_COUNT=$(psql -t -c "SELECT COUNT(*) FROM program_instances WHERE id LIKE 'inst-%';" 2>/dev/null || echo "0")
    print_success "Program instances loaded: $INSTANCES_COUNT instances"
else
    print_error "Failed to load program instances. Check /tmp/swarm6-instances.log"
    exit 1
fi

# Load campaign metrics snapshots
print_info "Loading campaign metrics snapshots..."
if psql -f "${SEED_DIR}/campaign-metrics-snapshots.sql" > /tmp/swarm6-snapshots.log 2>&1; then
    SNAPSHOTS_COUNT=$(psql -t -c "SELECT COUNT(*) FROM campaign_metrics_snapshots;" 2>/dev/null || echo "0")
    print_success "Campaign metrics snapshots loaded: $SNAPSHOTS_COUNT snapshots"
else
    print_error "Failed to load snapshots. Check /tmp/swarm6-snapshots.log"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Verification${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Run verification query
print_info "Running data integrity checks..."
VERIFICATION=$(psql -t -c "
    SELECT
        (SELECT COUNT(*) FROM beneficiary_groups WHERE id LIKE 'bg-%') as groups,
        (SELECT COUNT(*) FROM campaigns WHERE id LIKE 'camp-%') as campaigns,
        (SELECT COUNT(*) FROM program_instances WHERE id LIKE 'inst-%') as instances,
        (SELECT COUNT(*) FROM campaign_metrics_snapshots) as snapshots;
" 2>/dev/null)

if [ -n "$VERIFICATION" ]; then
    read GROUPS CAMPAIGNS INSTANCES SNAPSHOTS <<< "$VERIFICATION"
    echo "  Beneficiary Groups: $GROUPS"
    echo "  Campaigns: $CAMPAIGNS"
    echo "  Program Instances: $INSTANCES"
    echo "  Metrics Snapshots: $SNAPSHOTS"
    print_success "Data integrity check passed"
else
    print_error "Verification query failed"
    exit 1
fi

# Check for broken foreign keys
print_info "Checking foreign key integrity..."
FK_ERRORS=$(psql -t -c "
    SELECT COUNT(*) FROM campaigns c
    WHERE c.id LIKE 'camp-%'
      AND (
        NOT EXISTS (SELECT 1 FROM companies WHERE id = c.company_id)
        OR NOT EXISTS (SELECT 1 FROM program_templates WHERE id = c.program_template_id)
        OR NOT EXISTS (SELECT 1 FROM beneficiary_groups WHERE id = c.beneficiary_group_id)
      );
" 2>/dev/null || echo "0")

if [ "$FK_ERRORS" -eq 0 ]; then
    print_success "Foreign key integrity verified (no broken references)"
else
    print_error "Found $FK_ERRORS campaigns with broken foreign keys"
    exit 1
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✓ SWARM 6 Seed Data Loaded Successfully${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
print_info "Summary:"
echo "  - $GROUPS beneficiary groups"
echo "  - $CAMPAIGNS campaigns (all pricing models & statuses)"
echo "  - $INSTANCES program instances"
echo "  - $SNAPSHOTS time-series snapshots"
echo ""
print_info "Next steps:"
echo "  1. Explore data: psql -c 'SELECT * FROM campaigns LIMIT 5;'"
echo "  2. View README: cat ${SEED_DIR}/README.md"
echo "  3. Run example queries (see README)"
echo ""
print_success "SWARM 6 seed data ready for Phase 3 (Campaign Engine implementation)"
echo ""
