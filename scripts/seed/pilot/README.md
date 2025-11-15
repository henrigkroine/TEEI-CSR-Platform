# Pilot Seed Data Scripts

This directory contains SQL seed data scripts for setting up pilot company environments with realistic demo data.

## Overview

The pilot seed scripts create a complete demo environment with:
- **3 pilot companies** from different industries (Technology, Finance, Healthcare)
- **10 users** with various roles (3 admins, 4 company users, 3 viewers)
- **15 programs** (5 per company: 2 buddy, 2 kintell, 1 upskilling)
- **Sample SROI/VIS data** with realistic metrics and evidence
- **Q2Q evidence** with anonymized feedback and testimonials

## Files

### 1. `companies.sql`
Creates 3 pilot companies with full profiles:
- **Acme Corp** (Technology, USA) - 5000 employees
- **TechCo Financial Services** (Finance, UK) - 3200 employees
- **GlobalCare Health** (Healthcare, Norway) - 1500 employees

Each company includes:
- Industry-specific theme presets
- Feature flags configuration
- Custom SROI multipliers
- Notification settings

### 2. `users.sql`
Creates 10 pilot users mapped to companies:
- 3 company admins (full access)
- 4 company users (read/write access)
- 3 viewers (read-only access)

All users include:
- Company-user mappings
- Role-based permissions
- Invitation history
- Last access timestamps

### 3. `programs.sql`
Creates 15 active programs across companies:
- **6 buddy programs** (mentorship, peer support)
- **6 kintell programs** (community impact, education)
- **3 upskilling programs** (certification, training)

Each program includes:
- Participant counts and targets
- Budget allocation and spending
- Program settings and metadata
- Date ranges (last 6 months)

### 4. `reports.sql`
Creates sample reporting data:
- **SROI calculations** (7 records, ratios 2.0-4.0)
- **VIS scores** (4 records, scores 78-96)
- **Q2Q evidence** (20+ anonymized feedback items)

All data includes:
- Realistic metrics and confidence scores
- Linked outcomes and evidence
- Sentiment analysis
- Timestamps over last 6 months

## Usage

### Running All Scripts

Execute scripts in order (dependencies must be respected):

```bash
# Navigate to project root
cd /home/user/TEEI-CSR-Platform

# Set database connection (adjust for your environment)
export DATABASE_URL="postgresql://user:password@localhost:5432/teei_csr"

# Run scripts in order
psql $DATABASE_URL -f scripts/seed/pilot/companies.sql
psql $DATABASE_URL -f scripts/seed/pilot/users.sql
psql $DATABASE_URL -f scripts/seed/pilot/programs.sql
psql $DATABASE_URL -f scripts/seed/pilot/reports.sql
```

### Running Individual Scripts

```bash
# Company data only
psql $DATABASE_URL -f scripts/seed/pilot/companies.sql

# Users and access control
psql $DATABASE_URL -f scripts/seed/pilot/users.sql

# Programs
psql $DATABASE_URL -f scripts/seed/pilot/programs.sql

# Reporting data
psql $DATABASE_URL -f scripts/seed/pilot/reports.sql
```

### Running from Docker

If using Docker Compose:

```bash
# Copy scripts into container
docker cp scripts/seed/pilot postgres:/tmp/seed/

# Execute in container
docker exec -i postgres psql -U postgres -d teei_csr < /tmp/seed/companies.sql
docker exec -i postgres psql -U postgres -d teei_csr < /tmp/seed/users.sql
docker exec -i postgres psql -U postgres -d teei_csr < /tmp/seed/programs.sql
docker exec -i postgres psql -U postgres -d teei_csr < /tmp/seed/reports.sql
```

## Test Credentials

For demo/testing purposes, use these user emails:

### Acme Corp
- **Admin**: sarah.admin@acmecorp.example.com
- **Manager**: james.manager@acmecorp.example.com
- **User**: emily.user@acmecorp.example.com
- **Viewer**: michael.viewer@acmecorp.example.com

### TechCo Financial Services
- **Admin**: olivia.admin@techco.example.com
- **User**: david.user@techco.example.com
- **Viewer**: sophia.viewer@techco.example.com

### GlobalCare Health
- **Admin**: anders.admin@globalcare.example.com
- **User**: ingrid.user@globalcare.example.com
- **Viewer**: lars.viewer@globalcare.example.com

## Company IDs

For direct database access or API testing:

- **Acme Corp**: `acme0001-0001-0001-0001-000000000001`
- **TechCo**: `techc001-0001-0001-0001-000000000001`
- **GlobalCare**: `globa001-0001-0001-0001-000000000001`

## Data Characteristics

### Realistic Timestamps
- All data spans last 6 months
- Staggered start dates for programs
- Recent activity (hours to days ago)

### Realistic Metrics
- SROI ratios: 2.0 to 4.0 (industry benchmarks)
- VIS scores: 78 to 96 (high engagement)
- Confidence levels: 75% to 99%
- Mix of positive (80%+), mixed, and neutral feedback

### Privacy & Anonymization
- All Q2Q evidence is anonymized
- No PII in feedback/testimonials
- Sources described generically ("Program Participant", "Workshop Volunteer")

## Verification

Each script includes verification blocks that output:
- Record counts
- Summary statistics
- Data integrity checks
- Quick reference information

Look for `✓` checkmarks in the output to confirm successful execution.

## Cleanup

To remove pilot seed data:

```sql
-- Remove in reverse order of dependencies
DELETE FROM q2q_evidence WHERE company_id LIKE '%0001-0001-0001-0001-000000000001';
DELETE FROM vis_scores WHERE company_id LIKE '%0001-0001-0001-0001-000000000001';
DELETE FROM sroi_calculations WHERE company_id LIKE '%0001-0001-0001-0001-000000000001';
DELETE FROM programs WHERE id LIKE 'prog-%';
DELETE FROM company_users WHERE id LIKE 'pilot-cu-%';
DELETE FROM users WHERE id LIKE 'pilot%';
DELETE FROM companies WHERE id IN (
  'acme0001-0001-0001-0001-000000000001',
  'techc001-0001-0001-0001-000000000001',
  'globa001-0001-0001-0001-000000000001'
);
```

## Notes

- **Environment**: These scripts are for PILOT/DEMO environments only
- **Production**: DO NOT run in production without review
- **Conflicts**: Scripts use `ON CONFLICT DO NOTHING` or `DO UPDATE` for idempotency
- **Dependencies**: Requires base schema tables to exist
- **Modifications**: Feel free to adjust data for your specific demo needs

## Support

For questions or issues:
1. Check verification output for error messages
2. Review database logs for constraint violations
3. Ensure scripts run in correct order
4. Verify database schema matches expectations

## License

Part of TEEI CSR Platform - Internal use only
