# Audit Log Explorer & Compliance Export

## Overview

The Audit Log Explorer provides unified query and compliance export capabilities for audit events across the TEEI CSR Platform. It consolidates audit trails from:

- **Authentication** (login, logout, password resets, MFA)
- **Approval workflows** (report review, approvals, rejections)
- **Reporting edits** (report create, update, delete)
- **Evidence Ledger operations** (evidence add, edit, verify, challenge)
- **DSAR lifecycle** (data subject requests: access, erasure, portability)
- **AI prompt records** (Gen-AI usage with citation tracking)

## Key Features

✅ **Unified Query Interface**: Query audit events with flexible filters (time range, actor, resource type, action)
✅ **Timeline Visualization**: Heatmap showing activity distribution over time
✅ **Event Detail View**: Full event details with before/after diff viewer
✅ **Compliance Export**: Signed ZIP bundles (JSONL + SHA-256 manifest + PDF cover)
✅ **RBAC Enforcement**: `AuditViewer` (read-only) and `AuditAdmin` (read + export) roles
✅ **Tenant Isolation**: Automatic filtering by company/tenant ID
✅ **PII Redaction**: Automatic secret masking, optional PII redaction for exports
✅ **Performance Optimized**: Query p95 ≤250ms for 30-day ranges, export streaming ≤2 MB/s

## Architecture

```
┌─────────────────┐
│  Cockpit UI     │  (React + Astro)
│  /admin/audit   │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────┐
│  API Gateway    │  (Fastify + auth + rate limiting)
│  /v1/audit/*    │
└────────┬────────┘
         │ Internal HTTP
         ▼
┌─────────────────┐
│  Analytics Svc  │  (Fastify + query builder)
│  /v1/audit/*    │
└────────┬────────┘
         │ SQL
         ▼
┌─────────────────┐
│  PostgreSQL     │  (audit_logs table, partitioned by day)
│  audit_logs     │
└─────────────────┘
```

## Database Schema

### `audit_logs` Table

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tenant isolation
  company_id UUID REFERENCES companies(id),

  -- Actor (who performed the action)
  actor_id UUID NOT NULL,
  actor_email VARCHAR(255) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  actor_ip VARCHAR(45),

  -- Action
  action VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL,

  -- Resource (what was affected)
  resource_type VARCHAR(100) NOT NULL,
  resource_id UUID,
  resource_identifier VARCHAR(255),

  -- State tracking
  before_state JSONB,
  after_state JSONB,

  -- Request context
  request_id VARCHAR(100),
  user_agent TEXT,
  endpoint VARCHAR(255),
  metadata JSONB,

  -- Compliance
  gdpr_basis VARCHAR(100),
  retention_until TIMESTAMP WITH TIME ZONE,

  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

### Indexes

Optimized for common query patterns:

```sql
-- Tenant + timestamp (most common)
CREATE INDEX idx_audit_logs_tenant_ts ON audit_logs(company_id, timestamp DESC);

-- Actor queries
CREATE INDEX idx_audit_logs_actor_ts ON audit_logs(actor_id, timestamp DESC);

-- Resource queries
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id, timestamp DESC);

-- Action queries
CREATE INDEX idx_audit_logs_action_category ON audit_logs(action_category, timestamp DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, timestamp DESC);

-- Full-text search (GIN)
CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata jsonb_path_ops);
CREATE INDEX idx_audit_logs_before_state_gin ON audit_logs USING GIN (before_state jsonb_path_ops);
CREATE INDEX idx_audit_logs_after_state_gin ON audit_logs USING GIN (after_state jsonb_path_ops);

-- Compliance export
CREATE INDEX idx_audit_logs_compliance_export ON audit_logs(company_id, timestamp DESC, action_category);
```

### Partitioning Strategy

For tables >100M rows, consider **daily partitioning** by `timestamp`:

```sql
-- Example: Create partitioned table
CREATE TABLE audit_logs (
  -- same columns as above
) PARTITION BY RANGE (timestamp);

-- Create daily partitions
CREATE TABLE audit_logs_2024_01_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-01-01') TO ('2024-01-02');
```

**Benefits**:
- Faster queries on recent data (prune old partitions)
- Simplified retention policy (drop old partitions)
- Parallel query execution

## API Reference

### Authentication

All endpoints require a valid Bearer token with appropriate RBAC roles:

```http
Authorization: Bearer <jwt-token>
```

### Roles

- **AuditViewer**: Can query and view audit events
- **AuditAdmin**: Can query, view, and export audit events

### Endpoints

#### `GET /v1/audit/events`

Query audit events with filters.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | ISO 8601 datetime | Start timestamp |
| `to` | ISO 8601 datetime | End timestamp |
| `tenantId` | UUID | Tenant/company ID (auto-filled for non-admin users) |
| `actorId` | UUID | Filter by actor user ID |
| `actorEmail` | string | Filter by actor email (partial match) |
| `resourceType` | string | Filter by resource type (user, report, evidence, etc.) |
| `resourceId` | UUID | Filter by resource ID |
| `action` | string | Filter by action (LOGIN, CREATE, UPDATE, etc.) |
| `actionCategory` | string | Filter by action category (AUTH, DATA_MODIFICATION, etc.) |
| `search` | string | Full-text search in metadata |
| `limit` | integer | Max results (1-1000, default: 100) |
| `offset` | integer | Pagination offset (default: 0) |

**Example Request:**

```bash
curl -X GET "https://api.teei.io/v1/audit/events?from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z&action=LOGIN&limit=50" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "timestamp": "2024-01-15T10:30:00Z",
        "tenantId": "acme-corp-id",
        "actor": {
          "id": "user-123",
          "email": "john.doe@acme.com",
          "role": "admin"
        },
        "resource": {
          "type": "user",
          "id": "user-123",
          "identifier": "john.doe@acme.com"
        },
        "action": "LOGIN",
        "actionCategory": "AUTH",
        "origin": {
          "ip": "192.168.1.100",
          "userAgent": "Mozilla/5.0...",
          "requestId": "req-abc123"
        },
        "metadata": {
          "success": true
        }
      }
    ],
    "total": 1523,
    "hasMore": true,
    "nextOffset": 50
  },
  "meta": {
    "queryTime": 87,
    "filters": { ... }
  }
}
```

#### `GET /v1/audit/events/:id`

Get a single audit event by ID with full details.

**Example Request:**

```bash
curl -X GET "https://api.teei.io/v1/audit/events/550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-15T10:30:00Z",
    "actor": { ... },
    "resource": { ... },
    "action": "UPDATE",
    "actionCategory": "DATA_MODIFICATION",
    "before": {
      "status": "draft",
      "title": "Q3 Report"
    },
    "after": {
      "status": "published",
      "title": "Q3 Impact Report"
    },
    "origin": { ... }
  }
}
```

#### `GET /v1/audit/timeline`

Get timeline aggregation for heatmap visualization.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | ISO 8601 datetime | Start timestamp |
| `to` | ISO 8601 datetime | End timestamp |
| `tenantId` | UUID | Tenant/company ID |
| `bucketSize` | string | Bucket size: `hour`, `day` (default), `week` |

**Example Request:**

```bash
curl -X GET "https://api.teei.io/v1/audit/timeline?from=2024-01-01T00:00:00Z&to=2024-01-31T23:59:59Z&bucketSize=day" \
  -H "Authorization: Bearer <token>"
```

**Example Response:**

```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2024-01-01T00:00:00Z",
      "count": 152,
      "actionCounts": {
        "LOGIN": 45,
        "READ": 100,
        "UPDATE": 7
      }
    },
    {
      "timestamp": "2024-01-02T00:00:00Z",
      "count": 203,
      "actionCounts": {
        "LOGIN": 50,
        "READ": 140,
        "UPDATE": 13
      }
    }
  ]
}
```

#### `GET /v1/audit/stats`

Get audit statistics for a given filter.

**Example Response:**

```json
{
  "success": true,
  "data": {
    "totalEvents": 15234,
    "eventsByCategory": {
      "AUTH": 3421,
      "DATA_ACCESS": 9832,
      "DATA_MODIFICATION": 1523,
      "PRIVACY": 234,
      "EVIDENCE": 224
    },
    "eventsByAction": {
      "LOGIN": 2890,
      "READ": 8543,
      "UPDATE": 1234,
      "CREATE": 289
    },
    "eventsByResourceType": {
      "user": 3421,
      "report": 7654,
      "evidence": 4159
    },
    "topActors": [
      {
        "actorId": "user-123",
        "actorEmail": "john.doe@acme.com",
        "count": 542
      }
    ],
    "dateRange": {
      "from": "2024-01-01T00:00:00Z",
      "to": "2024-01-31T23:59:59Z"
    }
  }
}
```

#### `POST /v1/audit/export`

Create compliance export bundle (ZIP).

**Requires**: `AuditAdmin` role
**Rate Limit**: 5 exports per hour per user

**Request Body:**

```json
{
  "tenantId": "acme-corp-id",
  "from": "2024-01-01T00:00:00Z",
  "to": "2024-01-31T23:59:59Z",
  "maskPII": false,
  "filters": {
    "actorId": "user-123",
    "resourceType": "report",
    "action": "UPDATE"
  }
}
```

**Example Request:**

```bash
curl -X POST "https://api.teei.io/v1/audit/export" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp-id",
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-01-31T23:59:59Z",
    "maskPII": false
  }' \
  --output audit_export.zip
```

**Response Headers:**

```
Content-Type: application/zip
Content-Disposition: attachment; filename="audit_export_acme-corp-id_2024-01-01_2024-01-31.zip"
X-Export-ID: 550e8400-e29b-41d4-a716-446655440000
X-Export-Event-Count: 1523
X-Export-SHA256: a1b2c3d4...
```

**Export Contents:**

```
audit_export_acme-corp-id_2024-01-01_2024-01-31.zip
├── events.jsonl          # Audit events (one JSON object per line)
├── manifest.json         # Export metadata + SHA-256 hash
├── cover.pdf             # Cover page summary
└── README.md             # Export documentation
```

### Export Verification

To verify the integrity of an export:

```bash
# 1. Unzip the export
unzip audit_export_acme-corp-id_2024-01-01_2024-01-31.zip

# 2. Compute SHA-256 of events.jsonl
sha256sum events.jsonl

# 3. Compare with hash in manifest.json
cat manifest.json | jq '.files."events.jsonl".sha256'

# Hashes should match exactly
```

## UI Usage

### Accessing the Explorer

Navigate to: **`/admin/audit`**

**Requirements**:
- Authenticated user
- Role: `AuditViewer` or `AuditAdmin`

### Filtering Events

Use the filter panel to narrow down results:

1. **Time Range**: Select start/end dates (defaults to last 30 days)
2. **Actor Email**: Search by user email (partial match)
3. **Resource Type**: Filter by affected resource (user, report, evidence, etc.)
4. **Action**: Filter by action type (LOGIN, CREATE, UPDATE, etc.)
5. **Search**: Full-text search in metadata and identifiers

### Timeline Heatmap

The heatmap shows activity distribution over time:
- **Darker colors** = more events
- **Hover** to see count for each day
- **Click** (future feature) to drill down to that day

### Event Table

The table shows:
- **Timestamp**: When the event occurred
- **Actor**: Who performed the action (email + role)
- **Action**: What action was performed (with category badge)
- **Resource**: What was affected (type + identifier)
- **Details**: Click "View" to see full event details

### Event Detail Modal

Shows:
- **Event Information**: ID, timestamp, action, category
- **Actor Details**: Email, role, ID
- **Resource Details**: Type, ID, identifier
- **Origin**: IP address, user agent, request ID
- **Changes**: Before/after diff (if applicable)
- **Metadata**: Additional context

### Exporting Audit Logs

**For AuditAdmin users only:**

1. Click **"Export Compliance Bundle"** button
2. ZIP file downloads automatically
3. Verify integrity using SHA-256 hash (see above)

## Security & Compliance

### Secret Redaction

All audit events automatically redact sensitive fields:

**Always redacted:**
- `password`, `passwordHash`
- `apiKey`, `secret`, `token`
- `accessToken`, `refreshToken`
- `ssn`, `creditCard`, `bankAccount`

**Example:**

```json
{
  "before": {
    "username": "john.doe",
    "password": "***REDACTED***",
    "apiKey": "***REDACTED***"
  }
}
```

### PII Masking

For compliance exports, enable `maskPII: true` to additionally redact:

- Actor email → `***PII_MASKED***`
- IP addresses → `***PII_MASKED***`
- `email`, `phone`, `address` fields in before/after states

### GDPR Compliance

Audit events support GDPR Article 30 record-keeping:

- **Legal Basis**: Tracked via `gdprBasis` field (consent, contract, legitimate_interest, etc.)
- **Retention**: Configurable TTL via `retentionUntil` field
- **DSAR Integration**: Audit events for data subject requests are automatically logged

### Retention Policy

**Default Retention**:
- **Verbose fields** (before_state, after_state, metadata): 90 days
- **Event digests** (id, timestamp, actor, action, resource): 7 years

**Custom Retention**:
- Set `retentionUntil` on individual events
- Automated cleanup job deletes expired events

## Performance & Scalability

### Query Performance

**SLO**: p95 ≤250ms for 30-day ranges

**Optimization Strategies**:
1. **Use composite indexes**: Queries on (company_id, timestamp) use `idx_audit_logs_tenant_ts`
2. **Limit time ranges**: Queries >90 days may exceed SLO
3. **Use pagination**: Max `limit=1000`, recommended `limit=50-100`
4. **Avoid full-text search**: Use specific filters when possible

### Export Performance

**SLO**: ≤2 MB/s sustained streaming

**Large Exports**:
- Exports stream in batches of 1000 events
- No memory accumulation (generator-based)
- Safety limit: 1M events per export

### Slow Query Monitoring

Queries exceeding 250ms are logged with:
- Query time
- Filters applied
- Result count

Admins can review slow queries in observability dashboards.

## Troubleshooting

### Error: "Insufficient permissions"

**Cause**: User lacks `AuditViewer` or `AuditAdmin` role
**Solution**: Contact admin to assign appropriate role

### Error: "Cannot query audit logs for other tenants"

**Cause**: Non-admin user attempting to query another tenant's logs
**Solution**: Ensure `tenantId` matches your own, or request admin access

### Error: "Rate limit exceeded"

**Cause**: Too many requests (100/min for queries, 5/hour for exports)
**Solution**: Wait for rate limit window to reset

### Slow Queries

**Cause**: Large time range or full-text search
**Solution**:
- Narrow time range to ≤30 days
- Use specific filters instead of search
- Increase pagination limit cautiously

### Missing Events

**Cause**: Events may not have been logged, or filters are too restrictive
**Solution**:
- Verify event source is instrumented (check `/reports/worker20_...`)
- Broaden filters (remove actor/resource filters)
- Check retention policy (events may have been deleted)

## Examples

### Example 1: Find all logins by a specific user

```bash
curl -X GET "https://api.teei.io/v1/audit/events?action=LOGIN&actorEmail=john.doe@acme.com&from=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer <token>"
```

### Example 2: Track all report modifications

```bash
curl -X GET "https://api.teei.io/v1/audit/events?resourceType=report&actionCategory=DATA_MODIFICATION&from=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer <token>"
```

### Example 3: Export all DSAR requests

```bash
curl -X POST "https://api.teei.io/v1/audit/export" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "acme-corp-id",
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-12-31T23:59:59Z",
    "filters": {
      "actionCategory": "PRIVACY"
    }
  }' \
  --output dsar_export.zip
```

### Example 4: Audit AI prompt usage

```bash
curl -X GET "https://api.teei.io/v1/audit/events?actionCategory=AI_GENERATION&from=2024-01-01T00:00:00Z" \
  -H "Authorization: Bearer <token>"
```

## Further Reading

- **OpenAPI Spec**: `/packages/openapi/audit.yaml`
- **Database Schema**: `/packages/shared-schema/src/schema/audits.ts`
- **Query Builder**: `/services/analytics/src/audit/query-builder.ts`
- **Redaction Logic**: `/services/analytics/src/audit/redaction.ts`
- **UI Component**: `/apps/corp-cockpit-astro/src/admin/audit/AuditExplorer.tsx`

---

**Questions?** Contact the TEEI Platform Team or file an issue in the GitHub repo.
