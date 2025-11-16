# TEEI Data Residency Enforcement

**Version**: 1.0.0
**Author**: residency-policy-enforcer
**Last Updated**: 2025-11-15

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Data Residency Types](#data-residency-types)
- [Service Endpoints](#service-endpoints)
- [Region Assignment Workflow](#region-assignment-workflow)
- [GDPR Compliance Enforcement](#gdpr-compliance-enforcement)
- [API Gateway Integration](#api-gateway-integration)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Testing Residency Violations](#testing-residency-violations)
- [Monitoring & Audit](#monitoring--audit)
- [Runbook: Migrating Company Between Regions](#runbook-migrating-company-between-regions)
- [Troubleshooting](#troubleshooting)

---

## Overview

The TEEI Data Residency Service enforces strict data locality requirements for GDPR compliance and regulatory adherence. It ensures that:

- **EU customer data never leaves EU regions** (GDPR strict mode)
- **US customers can be served from optimal regions** (flexible mode)
- **All residency checks are audited** (PII-free logging)
- **Cross-border violations are prevented** at the API gateway level

### Key Features

- **Tenant-to-Region Mapping**: Each company/tenant is assigned a data residency region
- **Two Enforcement Modes**:
  - `strict`: Data MUST stay in assigned region (GDPR requirement for EU)
  - `flexible`: Data can be served from any region (latency-based routing)
- **Caching**: 5-minute TTL Redis cache for high-performance lookups
- **Audit Logging**: Every residency validation is logged (PII-free, SHA-256 hashed)
- **Multi-Layer Enforcement**: API Gateway, Database, and Storage layers

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Request                           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway                                │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Residency Middleware                                  │    │
│  │  1. Extract company_id from JWT/header                 │    │
│  │  2. Call Data Residency Service                        │    │
│  │  3. Validate region match                              │    │
│  │  4. Add X-Data-Region header                           │    │
│  │  5. Reject if GDPR violation (403)                     │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────┬───────────────────────────────────────────┘
                      │ (if allowed)
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Data Residency Service                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  GET /api/residency/company/:id                        │    │
│  │  POST /api/residency/validate                          │    │
│  │  PUT /api/residency/company/:id (admin)                │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │ Redis Cache  │◄────────│  Database    │                     │
│  │ (5min TTL)   │         │ (PostgreSQL) │                     │
│  └──────────────┘         └──────────────┘                     │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Request arrives** at API Gateway with company ID
2. **Middleware extracts** company_id from JWT token or header
3. **Residency service called** to validate region
4. **Cache checked first** (Redis, 5min TTL)
5. **Database queried** if cache miss
6. **Validation performed**:
   - If `residency_type = 'strict'` AND `company_region != requested_region` → **403 Forbidden**
   - If `residency_type = 'flexible'` → **Allow**
7. **Audit logged** (SHA-256 hash of company_id, no PII)
8. **Headers added** to response: `X-Data-Region`, `X-Residency-Type`

---

## Data Residency Types

### Strict Residency (GDPR Compliance)

**Use Case**: EU customers under GDPR

```json
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "region": "eu-central-1",
  "residencyType": "strict"
}
```

**Enforcement**:
- Company data **MUST** stay in `eu-central-1`
- API requests to `us-east-1` will be **rejected with 403**
- Database queries, storage, backups all confined to EU region
- Cross-border data transfer is **prohibited**

**Legal Requirement**: GDPR Article 44 (Transfer of personal data to third countries)

### Flexible Residency (Performance Optimization)

**Use Case**: US customers, global enterprises

```json
{
  "companyId": "660e8400-e29b-41d4-a716-446655440001",
  "region": "us-east-1",
  "residencyType": "flexible"
}
```

**Enforcement**:
- Company data can be served from **any region**
- Latency-based routing enabled (CloudFront, Route53)
- Cross-region replication allowed
- Best performance with geo-distributed users

---

## Service Endpoints

### Base URL

```
http://teei-data-residency/api/residency
```

### 1. Get Company Region

**Endpoint**: `GET /api/residency/company/:id`

**Description**: Retrieve the assigned region for a company

**Response**:
```json
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "region": "eu-central-1",
  "residencyType": "strict",
  "source": "cache"  // or "database" or "default"
}
```

**Status Codes**:
- `200 OK`: Company region found (or default returned)

**Example**:
```bash
curl -X GET http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000
```

---

### 2. Validate Residency

**Endpoint**: `POST /api/residency/validate`

**Description**: Validate if an operation is allowed for company+region combination

**Request Body**:
```json
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "requestedRegion": "us-east-1",
  "operation": "data-export"  // optional
}
```

**Response (Allowed)**:
```json
{
  "allowed": true,
  "companyRegion": "us-east-1",
  "requestedRegion": "us-east-1",
  "residencyType": "flexible"
}
```

**Response (Denied - GDPR Violation)**:
```json
{
  "allowed": false,
  "companyRegion": "eu-central-1",
  "requestedRegion": "us-east-1",
  "residencyType": "strict",
  "reason": "Company has strict eu-central-1 residency requirement. Cannot access us-east-1 resources."
}
```

**Status Codes**:
- `200 OK`: Validation successful (allowed = true)
- `403 Forbidden`: Residency violation (allowed = false)

**Example**:
```bash
curl -X POST http://teei-data-residency/api/residency/validate \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "requestedRegion": "us-east-1"
  }'
```

---

### 3. Update Company Region (Admin Only)

**Endpoint**: `PUT /api/residency/company/:id`

**Description**: Update a company's assigned region (requires admin role, audit logged)

**Request Body**:
```json
{
  "region": "eu-central-1",
  "residencyType": "strict"
}
```

**Response**:
```json
{
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "region": "eu-central-1",
  "residencyType": "strict",
  "updatedAt": "2025-11-15T10:30:00Z"
}
```

**Status Codes**:
- `200 OK`: Region updated successfully
- `400 Bad Request`: Invalid region or residency type
- `403 Forbidden`: Insufficient permissions

**Example**:
```bash
curl -X PUT http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "region": "eu-central-1",
    "residencyType": "strict"
  }'
```

---

### 4. Bulk Validate (Batch Operations)

**Endpoint**: `POST /api/residency/validate/bulk`

**Description**: Validate multiple companies in a single request (for batch jobs)

**Request Body**:
```json
{
  "validations": [
    {
      "companyId": "550e8400-e29b-41d4-a716-446655440000",
      "requestedRegion": "eu-central-1",
      "operation": "batch-export"
    },
    {
      "companyId": "660e8400-e29b-41d4-a716-446655440001",
      "requestedRegion": "us-east-1",
      "operation": "batch-export"
    }
  ]
}
```

**Response**:
```json
{
  "results": [
    {
      "companyId": "550e8400-e29b-41d4-a716-446655440000",
      "allowed": true,
      "companyRegion": "eu-central-1",
      "requestedRegion": "eu-central-1",
      "residencyType": "strict"
    },
    {
      "companyId": "660e8400-e29b-41d4-a716-446655440001",
      "allowed": true,
      "companyRegion": "us-east-1",
      "requestedRegion": "us-east-1",
      "residencyType": "flexible"
    }
  ]
}
```

---

## Region Assignment Workflow

### 1. New Company Onboarding

When a new company signs up:

```sql
-- Assign region based on company location
INSERT INTO company_regions (company_id, region, residency_type)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'eu-central-1',  -- Based on company billing address
  'strict'          -- EU companies get strict GDPR enforcement
);
```

**Business Rules**:
- **EU companies** (27 member states + EEA): `region = 'eu-central-1'`, `residency_type = 'strict'`
- **UK companies**: `region = 'eu-central-1'`, `residency_type = 'strict'` (GDPR equivalent)
- **US companies**: `region = 'us-east-1'`, `residency_type = 'flexible'`
- **Other countries**: Default to `us-east-1`, `flexible` (can be updated later)

### 2. Company Requests Region Change

**Scenario**: US company expands to EU, needs EU data residency

**Process**:
1. Company submits data residency change request (support ticket)
2. Admin verifies legal requirements
3. Admin updates region via API:
   ```bash
   curl -X PUT http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000 \
     -H "Authorization: Bearer <admin-token>" \
     -d '{"region": "eu-central-1", "residencyType": "strict"}'
   ```
4. System invalidates cache
5. Data migration initiated (see [Migration Runbook](#runbook-migrating-company-between-regions))
6. Audit log created

---

## GDPR Compliance Enforcement

### Legal Requirements

**GDPR Article 44**: Transfers of personal data to third countries or international organisations

> "Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if... the conditions laid down in this Chapter are complied with by the controller and processor."

### Implementation

1. **Strict Residency for EU Companies**:
   ```json
   {
     "residencyType": "strict",
     "region": "eu-central-1"
   }
   ```

2. **Cross-Border Transfer Prevention**:
   - API Gateway middleware rejects requests with `403 Forbidden`
   - Database queries scoped to region (connection string per region)
   - S3 buckets with region lock: `eu-central-1` only

3. **Audit Trail**:
   - Every residency check logged (SHA-256 hash, no PII)
   - Retention: 7 years (GDPR Article 5.2 - accountability)
   - Violations trigger security alerts

4. **Data Subject Rights**:
   - DSAR (Data Subject Access Requests) respect region boundaries
   - Right to erasure: Data deleted only from assigned region
   - Right to portability: Export from region only

---

## API Gateway Integration

### Setup

**File**: `/services/api-gateway/src/middleware/residency.ts`

```typescript
import { createResidencyMiddleware } from './middleware/residency.js';

const residencyMiddleware = createResidencyMiddleware({
  residencyServiceUrl: process.env.DATA_RESIDENCY_SERVICE_URL || 'http://teei-data-residency/api/residency',
  currentRegion: process.env.AWS_REGION || 'us-east-1',
  cacheEnabled: true,
  cacheTTL: 300, // 5 minutes
  redisUrl: process.env.REDIS_URL,
  enforcement: 'strict', // or 'permissive'
});

// Apply to all routes
app.addHook('onRequest', residencyMiddleware);
```

### Request Flow

1. **Request arrives**: `GET /api/companies/550e8400-e29b-41d4-a716-446655440000/reports`
2. **Extract company_id** from JWT token or header
3. **Call residency service**: `POST /api/residency/validate`
4. **Check cache** (Redis, 5min TTL)
5. **Validate**:
   - Company region: `eu-central-1` (strict)
   - Requested region: `us-east-1`
   - Result: **403 Forbidden** (GDPR violation)
6. **Add headers**:
   ```
   X-Data-Region: eu-central-1
   X-Residency-Type: strict
   ```

### Error Handling

**GDPR Violation (403)**:
```json
{
  "error": "Data Residency Violation",
  "message": "Request violates company data residency policy",
  "companyRegion": "eu-central-1",
  "requestedRegion": "us-east-1"
}
```

**Service Unavailable (503)**:
```json
{
  "error": "Service Unavailable",
  "message": "Data residency validation service is unavailable"
}
```

---

## Database Schema

### Table: `company_regions`

**Purpose**: Maps companies to their data residency region

```sql
CREATE TABLE company_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE,
  region VARCHAR(20) NOT NULL CHECK (region IN ('eu-central-1', 'us-east-1')),
  residency_type VARCHAR(10) NOT NULL CHECK (residency_type IN ('strict', 'flexible')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_regions_company_id ON company_regions(company_id);
CREATE INDEX idx_company_regions_region ON company_regions(region);
```

**Columns**:
- `id`: Primary key (UUID)
- `company_id`: Foreign key to `companies` table (unique)
- `region`: AWS region (`eu-central-1` or `us-east-1`)
- `residency_type`: `strict` (GDPR) or `flexible` (latency-based)
- `created_at`: Timestamp of initial assignment
- `updated_at`: Timestamp of last region change

---

### Table: `residency_audit_logs`

**Purpose**: Audit trail for all residency validation checks (PII-free)

```sql
CREATE TABLE residency_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id_hash VARCHAR(64) NOT NULL,  -- SHA-256 hash (no PII)
  requested_region VARCHAR(20) NOT NULL,
  assigned_region VARCHAR(20) NOT NULL,
  residency_type VARCHAR(10) NOT NULL,
  allowed VARCHAR(5) NOT NULL CHECK (allowed IN ('true', 'false')),
  operation VARCHAR(100),
  request_id VARCHAR(100),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_residency_audit_logs_timestamp ON residency_audit_logs(timestamp DESC);
CREATE INDEX idx_residency_audit_logs_allowed ON residency_audit_logs(allowed);
```

**Columns**:
- `company_id_hash`: SHA-256 hash of company_id (prevents PII in audit logs)
- `requested_region`: Region requested in the operation
- `assigned_region`: Company's assigned region
- `allowed`: `'true'` (allowed) or `'false'` (denied)
- `operation`: Description of operation (e.g., `data-export`, `api-gateway-routing`)

**GDPR Compliance**: No PII stored (company_id is hashed)

---

## Deployment

### 1. Apply Database Migration

```bash
psql -U teei -d teei_platform -f /packages/shared-schema/migrations/0042_company_regions.sql
```

### 2. Deploy Service to Kubernetes

```bash
cd /k8s/base/data-residency
kubectl apply -k .
```

**Resources Created**:
- Deployment: `teei-data-residency` (2 replicas, HPA 2-10)
- Service: `teei-data-residency` (ClusterIP, port 80)
- ConfigMap: Region enforcement settings
- HPA: Auto-scaling on CPU/memory (70%/80%)

### 3. Verify Deployment

```bash
# Check pods
kubectl get pods -l app=teei-data-residency -n teei-platform

# Check health
kubectl exec -it <pod-name> -n teei-platform -- curl http://localhost:3015/health/residency

# Expected output:
# {"status":"healthy","database":true,"cache":true,"cacheRequired":false}
```

### 4. Configure Vault

```bash
# Apply Vault policy
vault policy write teei-data-residency /infra/vault/policies/teei-data-residency.hcl

# Create service AppRole
vault auth enable approle
vault write auth/approle/role/teei-data-residency \
  policies="teei-data-residency" \
  token_ttl=1h \
  token_max_ttl=24h
```

### 5. Seed Data

Update migration file with actual company UUIDs:

```sql
-- Replace example UUIDs with real company IDs
INSERT INTO company_regions (company_id, region, residency_type) VALUES
  ('<EU_COMPANY_UUID>', 'eu-central-1', 'strict'),
  ('<US_COMPANY_UUID>', 'us-east-1', 'flexible');
```

---

## Testing Residency Violations

### Test 1: EU Company Accessing US Resources (Should Fail)

```bash
# Setup: EU company with strict residency
curl -X PUT http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000 \
  -d '{"region": "eu-central-1", "residencyType": "strict"}'

# Test: Request US region access
curl -X POST http://teei-data-residency/api/residency/validate \
  -d '{
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "requestedRegion": "us-east-1"
  }'

# Expected: 403 Forbidden
# {
#   "allowed": false,
#   "companyRegion": "eu-central-1",
#   "requestedRegion": "us-east-1",
#   "residencyType": "strict",
#   "reason": "Company has strict eu-central-1 residency requirement..."
# }
```

### Test 2: US Company Accessing Any Region (Should Pass)

```bash
# Setup: US company with flexible residency
curl -X PUT http://teei-data-residency/api/residency/company/660e8400-e29b-41d4-a716-446655440001 \
  -d '{"region": "us-east-1", "residencyType": "flexible"}'

# Test: Request EU region access
curl -X POST http://teei-data-residency/api/residency/validate \
  -d '{
    "companyId": "660e8400-e29b-41d4-a716-446655440001",
    "requestedRegion": "eu-central-1"
  }'

# Expected: 200 OK
# {
#   "allowed": true,
#   "companyRegion": "us-east-1",
#   "requestedRegion": "eu-central-1",
#   "residencyType": "flexible"
# }
```

### Test 3: Cache Performance

```bash
# First request (cache miss)
time curl -X GET http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000
# Expected: ~50ms (database query)

# Second request (cache hit)
time curl -X GET http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000
# Expected: ~5ms (Redis cache)
```

---

## Monitoring & Audit

### Metrics

**Prometheus Metrics** (exposed at `/metrics`):

- `residency_validations_total{region, allowed}`: Total validations
- `residency_violations_total{region}`: Total GDPR violations
- `residency_cache_hit_rate`: Cache hit rate (target: >90%)
- `residency_validation_duration_seconds`: P50/P95/P99 latency

### Audit Queries

**Recent Violations** (last 24 hours):
```sql
SELECT
  company_id_hash,
  requested_region,
  assigned_region,
  operation,
  timestamp
FROM residency_audit_logs
WHERE allowed = 'false'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;
```

**Validation Stats by Region**:
```sql
SELECT
  assigned_region,
  residency_type,
  allowed,
  COUNT(*) as count
FROM residency_audit_logs
WHERE timestamp > NOW() - INTERVAL '7 days'
GROUP BY assigned_region, residency_type, allowed;
```

**Company Region Distribution**:
```sql
SELECT * FROM v_company_region_distribution;
-- Output:
--  region        | residency_type | company_count
-- ---------------+----------------+---------------
--  eu-central-1  | strict         | 150
--  us-east-1     | flexible       | 300
```

### Alerts

**DataDog/PagerDuty Alerts**:

1. **Residency Violation Rate High**:
   ```
   alert: residency_violations_rate > 1%
   severity: critical
   action: Page on-call engineer
   ```

2. **Cache Miss Rate High**:
   ```
   alert: residency_cache_hit_rate < 80%
   severity: warning
   action: Notify DevOps team
   ```

3. **Service Unavailable**:
   ```
   alert: residency_service_availability < 99.9%
   severity: critical
   action: Page on-call engineer
   ```

---

## Runbook: Migrating Company Between Regions

### Scenario

Company `Acme Corp` (EU-based) is migrating from `us-east-1` to `eu-central-1` for GDPR compliance.

**Company ID**: `550e8400-e29b-41d4-a716-446655440000`

### Pre-Migration Checklist

- [ ] Verify legal requirement for region change
- [ ] Notify company of planned migration (email, support ticket)
- [ ] Schedule migration window (low-traffic period)
- [ ] Backup all company data
- [ ] Verify target region has sufficient capacity

### Step 1: Pre-Migration Validation

```bash
# Check current region
curl -X GET http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000

# Expected:
# {
#   "companyId": "550e8400-e29b-41d4-a716-446655440000",
#   "region": "us-east-1",
#   "residencyType": "flexible"
# }
```

### Step 2: Data Migration

```bash
# Export data from US region
pg_dump -h us-east-1-postgres.teei.com -U teei \
  --where="company_id='550e8400-e29b-41d4-a716-446655440000'" \
  -t companies -t users -t reports \
  > acme_corp_export.sql

# Import data to EU region
psql -h eu-central-1-postgres.teei.com -U teei \
  -f acme_corp_export.sql

# Sync S3 data
aws s3 sync s3://teei-us-east-1/550e8400-e29b-41d4-a716-446655440000 \
             s3://teei-eu-central-1/550e8400-e29b-41d4-a716-446655440000 \
  --region eu-central-1
```

### Step 3: Update Region Assignment

```bash
# Update company region (ATOMIC OPERATION)
curl -X PUT http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "region": "eu-central-1",
    "residencyType": "strict"
  }'

# Expected:
# {
#   "companyId": "550e8400-e29b-41d4-a716-446655440000",
#   "region": "eu-central-1",
#   "residencyType": "strict",
#   "updatedAt": "2025-11-15T14:30:00Z"
# }
```

### Step 4: Invalidate Cache

```bash
# Cache is automatically invalidated by the PUT endpoint
# Verify cache invalidation
redis-cli -h teei-redis.com DEL "api-gateway:residency:550e8400-e29b-41d4-a716-446655440000"
```

### Step 5: Verification

```bash
# Verify new region
curl -X GET http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000

# Test GDPR enforcement (should reject US access)
curl -X POST http://teei-data-residency/api/residency/validate \
  -d '{
    "companyId": "550e8400-e29b-41d4-a716-446655440000",
    "requestedRegion": "us-east-1"
  }'

# Expected: 403 Forbidden
```

### Step 6: Delete Old Data (After Verification)

```bash
# Wait 30 days for verification period
# Then delete US region data
psql -h us-east-1-postgres.teei.com -U teei <<SQL
DELETE FROM companies WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';
DELETE FROM users WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';
DELETE FROM reports WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';
SQL

# Delete S3 data
aws s3 rm s3://teei-us-east-1/550e8400-e29b-41d4-a716-446655440000 --recursive
```

### Step 7: Audit

```bash
# Check audit logs for migration
psql -h eu-central-1-postgres.teei.com -U teei <<SQL
SELECT * FROM residency_audit_logs
WHERE company_id_hash = encode(digest('550e8400-e29b-41d4-a716-446655440000', 'sha256'), 'hex')
  AND timestamp > NOW() - INTERVAL '1 day'
ORDER BY timestamp DESC;
SQL
```

---

## Troubleshooting

### Issue 1: Cache Misses High (>20%)

**Symptoms**:
- Slow response times
- High database load
- `residency_cache_hit_rate < 80%`

**Diagnosis**:
```bash
# Check Redis health
redis-cli -h teei-redis.com PING

# Check cache TTL
redis-cli -h teei-redis.com TTL "api-gateway:residency:550e8400-e29b-41d4-a716-446655440000"
```

**Resolution**:
1. Increase cache TTL: `CACHE_TTL=600` (10 minutes)
2. Scale Redis cluster
3. Verify cache invalidation logic (only on region updates, not reads)

---

### Issue 2: Residency Violations High

**Symptoms**:
- Many `403 Forbidden` errors
- `residency_violations_rate > 1%`

**Diagnosis**:
```bash
# Check recent violations
psql <<SQL
SELECT * FROM v_recent_residency_violations LIMIT 100;
SQL

# Check company region assignments
psql <<SQL
SELECT company_id, region, residency_type
FROM company_regions
WHERE region = 'eu-central-1' AND residency_type = 'strict';
SQL
```

**Resolution**:
1. Verify company regions are correctly assigned
2. Check if EU companies are being routed to US region (DNS/load balancer issue)
3. Review API Gateway configuration (ensure `X-Company-ID` header is set)

---

### Issue 3: Service Unavailable (503)

**Symptoms**:
- API Gateway returns `503 Service Unavailable`
- Residency service health check failing

**Diagnosis**:
```bash
# Check service health
kubectl get pods -l app=teei-data-residency -n teei-platform

# Check logs
kubectl logs -l app=teei-data-residency -n teei-platform --tail=100

# Check database connection
kubectl exec -it <pod-name> -n teei-platform -- \
  psql $DATABASE_URL -c "SELECT 1;"
```

**Resolution**:
1. Scale up replicas: `kubectl scale deployment teei-data-residency --replicas=4`
2. Check database connectivity (network policies, security groups)
3. Verify Vault secrets are accessible

---

### Issue 4: Incorrect Region Assignment

**Symptoms**:
- EU company assigned to `us-east-1`
- Compliance violation

**Diagnosis**:
```bash
# Check company region
curl -X GET http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000

# Check company billing address (from companies table)
psql <<SQL
SELECT id, name, billing_country FROM companies
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
SQL
```

**Resolution**:
```bash
# Update region (admin only)
curl -X PUT http://teei-data-residency/api/residency/company/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "region": "eu-central-1",
    "residencyType": "strict"
  }'

# Follow migration runbook to move data
```

---

## Best Practices

1. **Always use strict mode for EU companies** (GDPR compliance)
2. **Cache aggressively** (5min TTL is optimal balance)
3. **Audit all violations** (7-year retention for GDPR)
4. **Test region migrations** in staging before production
5. **Monitor cache hit rate** (target >90%)
6. **Set up alerts** for violations (target <0.1%)
7. **Document all region changes** (legal compliance)

---

## API Contract Summary

| Endpoint | Method | Description | Auth Required |
|----------|--------|-------------|---------------|
| `/api/residency/company/:id` | GET | Get company region | No |
| `/api/residency/company/:id` | PUT | Update company region | Yes (Admin) |
| `/api/residency/validate` | POST | Validate residency | No |
| `/api/residency/validate/bulk` | POST | Bulk validate | No |
| `/health` | GET | Health check | No |
| `/health/live` | GET | Liveness probe | No |
| `/health/ready` | GET | Readiness probe | No |
| `/health/residency` | GET | Residency health | No |

---

## References

- **GDPR**: [https://gdpr.eu/](https://gdpr.eu/)
- **AWS Regions**: [https://aws.amazon.com/about-aws/global-infrastructure/regions_az/](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/)
- **TEEI Architecture**: `/docs/Architecture.md`
- **TEEI Security**: `/docs/Security.md`

---

**End of Documentation**
