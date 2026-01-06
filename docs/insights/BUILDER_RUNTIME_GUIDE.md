# Builder Runtime API Guide

## Overview

The Builder Runtime service compiles Cockpit's Builder JSON to safe query execution graphs, provides SSE streams for live updates, and generates export payloads for PDF/PPTX.

**Service**: `builder-runtime`
**Port**: `3016`
**Base Path**: `/v1/builder`

## Key Features

- ✅ Builder JSON schema v1.0.0
- ✅ Query graph compilation
- ✅ SSE live dashboard execution
- ✅ PDF/PPTX export with citations
- ✅ RBAC enforcement
- ✅ PII tracking & redaction

## Builder JSON Schema

### Dashboard Structure

```typescript
{
  version: "1.0.0",
  id: "dash_123",
  name: "Q1 2024 Impact Dashboard",
  tenantId: "tenant_123",
  createdBy: "user_456",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  blocks: Block[],
  layout: Layout,
  rbac: RbacConfig,
  tags: ["quarterly", "executive"]
}
```

### Block Types

#### 1. KPI Block

```json
{
  "type": "kpi",
  "id": "kpi_1",
  "title": "Total Volunteer Hours",
  "metricId": "volunteer_hours",
  "aggregation": "sum",
  "timeRange": {
    "start": "2024-01-01",
    "end": "2024-03-31"
  },
  "comparison": {
    "enabled": true,
    "baseline": "previous_period"
  },
  "formatting": {
    "decimals": 0,
    "notation": "compact"
  },
  "dataSource": {
    "type": "metric",
    "config": {},
    "cache": true
  }
}
```

#### 2. Chart Block

```json
{
  "type": "chart",
  "id": "chart_1",
  "title": "Volunteer Hours Trend",
  "chartType": "line",
  "metrics": [
    {
      "metricId": "volunteer_hours",
      "aggregation": "sum",
      "label": "Hours",
      "color": "#4CAF50"
    }
  ],
  "dimensions": ["region"],
  "timeRange": {
    "start": "2024-01-01",
    "end": "2024-12-31",
    "granularity": "month"
  },
  "dataSource": {
    "type": "metric",
    "config": {},
    "cache": true
  }
}
```

#### 3. Q2Q Insight Block

```json
{
  "type": "q2q_insight",
  "id": "q2q_1",
  "title": "Feedback Insights",
  "feedbackText": "Employees loved the beach cleanup event",
  "outcomeFilters": ["environmental", "engagement"],
  "confidenceThreshold": 0.7,
  "dataSource": {
    "type": "q2q",
    "config": {},
    "cache": false
  },
  "piiSensitive": true
}
```

#### 4. Narrative Block

```json
{
  "type": "narrative",
  "id": "narrative_1",
  "title": "Executive Summary",
  "template": "quarterly",
  "dataInputs": {
    "metrics": ["volunteer_hours", "donation_amount"],
    "timeRange": "Q1 2024"
  },
  "tone": "formal",
  "maxLength": 500,
  "locale": "en",
  "dataSource": {
    "type": "nlq",
    "config": {},
    "cache": true
  }
}
```

## API Endpoints

### POST /v1/builder/compile

Compile dashboard JSON to query graph.

**Request:**
```json
{
  "version": "1.0.0",
  "id": "dash_123",
  "name": "Impact Dashboard",
  "tenantId": "tenant_123",
  "blocks": [...],
  "layout": {...},
  "rbac": {...}
}
```

**Response:**
```json
{
  "success": true,
  "graph": {
    "dashboardId": "dash_123",
    "nodes": [
      {
        "id": "node_kpi_1",
        "blockId": "kpi_1",
        "queryType": "metric",
        "query": {...},
        "cache": true,
        "piiFlags": {
          "containsPii": false,
          "redactedFields": []
        }
      }
    ],
    "executionOrder": [["node_kpi_1"], ["node_chart_1"]],
    "estimatedCost": 45,
    "estimatedTimeMs": 1500
  },
  "validation": {
    "valid": true,
    "violations": []
  },
  "metadata": {
    "compileTimeMs": 150,
    "nodeCount": 2
  }
}
```

### POST /v1/builder/execute

Execute dashboard with SSE live updates.

**Request:**
```json
{
  "dashboardId": "dash_123",
  "graph": {...}
}
```

**Response (SSE stream):**
```
data: {"type":"block_start","blockId":"kpi_1","timestamp":"2024-01-01T00:00:00Z"}

data: {"type":"block_complete","blockId":"kpi_1","data":{...},"timestamp":"2024-01-01T00:00:01Z"}

data: {"type":"block_start","blockId":"chart_1","timestamp":"2024-01-01T00:00:01Z"}

data: {"type":"block_complete","blockId":"chart_1","data":{...},"timestamp":"2024-01-01T00:00:03Z"}

data: {"type":"dashboard_complete","data":{"blockCount":2},"timestamp":"2024-01-01T00:00:03Z"}
```

### POST /v1/builder/export/pdf

Generate PDF export payload.

**Request:**
```json
{
  "dashboard": {...},
  "results": {
    "kpi_1": {...},
    "chart_1": {...}
  },
  "options": {
    "author": "John Doe",
    "watermark": "CONFIDENTIAL",
    "includeCitations": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "payload": {
    "dashboardId": "dash_123",
    "title": "Impact Dashboard",
    "author": "John Doe",
    "sections": [...],
    "metadata": {
      "evidenceHash": "aGFzaF8xMjM0"
    }
  }
}
```

### POST /v1/builder/export/pptx

Generate PPTX export payload.

**Request:**
```json
{
  "dashboard": {...},
  "results": {...},
  "options": {
    "author": "John Doe",
    "template": "corporate",
    "brandColors": ["#4CAF50", "#2196F3"],
    "includeCitations": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "payload": {
    "slides": [
      {
        "slideNumber": 1,
        "layout": "title",
        "title": "Impact Dashboard",
        "content": {...}
      },
      {
        "slideNumber": 2,
        "layout": "chart",
        "title": "Volunteer Hours Trend",
        "content": {
          "blocks": [...],
          "notes": "Evidence: [cite_123] ..."
        }
      }
    ]
  }
}
```

### GET /v1/builder/schema

Get schema version and documentation.

**Response:**
```json
{
  "success": true,
  "version": "1.0.0",
  "blockTypes": ["kpi", "chart", "q2q_insight", "impact_tile", "narrative", "table"],
  "chartTypes": ["line", "bar", "area", "pie", "donut", "scatter", "heatmap"]
}
```

## Layout System

Grid-based responsive layout:

```json
{
  "cols": 12,
  "rowHeight": 80,
  "items": [
    {
      "blockId": "kpi_1",
      "x": 0,
      "y": 0,
      "w": 4,
      "h": 2,
      "minW": 2,
      "minH": 1
    }
  ],
  "responsive": true
}
```

## RBAC Configuration

```json
{
  "roles": ["analyst", "manager"],
  "users": ["user_123"],
  "minPermission": "view"
}
```

**Permission Levels:**
- `view`: Can view dashboard
- `edit`: Can edit layout/blocks
- `admin`: Can manage permissions
- `owner`: Full control

## Integration Example

```typescript
import { BuilderRuntimeClient } from '@teei/clients';

const client = new BuilderRuntimeClient({
  baseUrl: 'http://localhost:3016',
});

// Compile dashboard
const { graph } = await client.compile(dashboard);

// Execute with SSE
const eventSource = await client.executeWithSse(dashboard.id, graph);

eventSource.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'block_complete') {
    console.log(`Block ${data.blockId} completed:`, data.data);
  }
});

// Export to PDF
const pdfPayload = await client.exportPdf(dashboard, results, {
  author: 'John Doe',
  includeCitations: true,
});
```

## Performance

**Compilation:**
- Average: <200ms
- P95: <500ms

**Execution:**
- Depends on block count and query complexity
- SSE allows parallel block execution
- Typical dashboard (5-10 blocks): 2-5s

**Cost Limits:**
- Max cost per dashboard: 500 points
- Max execution time: 30s
- Max blocks: 50

## Validation Rules

**Dashboard validation:**
- ✅ Version must match schema
- ✅ All block IDs unique
- ✅ All layout items reference valid blocks
- ✅ RBAC configuration valid
- ✅ No circular dependencies

**Safety checks:**
- ✅ PII fields flagged
- ✅ Tenant isolation enforced
- ✅ Query budgets enforced
- ✅ RBAC permissions checked

## Error Handling

### 400 Bad Request

**Invalid dashboard:**
```json
{
  "success": false,
  "error": "Dashboard validation failed",
  "errors": [
    "blocks.0.timeRange.start: Invalid date format",
    "layout.items.0.blockId: Block not found"
  ]
}
```

### 500 Internal Server Error

**Compilation failed:**
```json
{
  "success": false,
  "error": "Circular dependency detected in query graph"
}
```

## Monitoring

**Metrics:**
- `builder_compile_time_ms`
- `builder_execute_time_ms`
- `builder_block_count`
- `builder_cost_points`

**Alerts:**
- Compile time > 500ms
- Validation failures > 5%
- Cost exceeds budget
