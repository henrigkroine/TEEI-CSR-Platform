# AI Explainability & Guardrails

**Worker 10: AI/ML Explainability & Guardrails**

## Overview

This system provides complete audit trails, explainability, and safety guardrails for all AI operations across the TEEI CSR Platform. It ensures:

- **Traceability**: Every AI generation is audited with inputs, outputs, and evidence
- **Safety**: Content moderation prevents policy violations
- **Cost Control**: Budget enforcement prevents overspending
- **Quality**: Evidence gates ensure factual accuracy
- **Compliance**: Full audit trail for regulatory requirements

## Architecture

### Components

1. **Audit Trail** (`packages/observability/ai/`)
   - `AuditPersister`: Stores prompt records in `ai_prompt_audit` table
   - Records: model, version, prompt hash, output hash, evidence IDs, costs, latency

2. **Guardrails** (`packages/observability/ai/`)
   - `SafetyChecker`: Content moderation (hate, violence, self-harm)
   - `EvidenceGate`: Citation validation
   - `BudgetEnforcer`: Per-tenant cost limits
   - `GuardrailsOrchestrator`: Coordinates all three

3. **Safety Moderation** (`services/safety-moderation/`)
   - Pattern-based checks (fast, local)
   - Optional OpenAI Moderation API integration
   - Tenant-specific and global policies

4. **Budget Management** (`services/ai-budget/`)
   - Daily and monthly limits per tenant
   - Usage tracking and reset automation
   - Alert webhooks at threshold (default 80%)

5. **OpenTelemetry** (`packages/observability/ai/otel-spans.ts`)
   - Span creation for AI operations
   - Token and cost attributes
   - Guardrail outcome tracking

## Database Schema

### ai_prompt_audit

Stores complete audit record for each AI operation:

```sql
CREATE TABLE ai_prompt_audit (
  id UUID PRIMARY KEY,
  request_id VARCHAR(255) UNIQUE NOT NULL,
  company_id UUID NOT NULL,
  user_id UUID,
  
  -- Model config
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  provider VARCHAR(50) NOT NULL,
  region VARCHAR(50),
  
  -- Prompt/output (masked, no PII)
  prompt_template VARCHAR(255),
  prompt_hash VARCHAR(64) NOT NULL,  -- SHA256
  prompt_variables JSONB,
  output_hash VARCHAR(64) NOT NULL,
  output_summary TEXT,
  
  -- Evidence & citations
  evidence_ids TEXT[],
  citation_count INTEGER DEFAULT 0,
  top_k INTEGER,
  
  -- Costs
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  tokens_total INTEGER NOT NULL,
  cost_usd DECIMAL(10, 6) NOT NULL,
  latency_ms INTEGER NOT NULL,
  
  -- Guardrails
  safety_check_passed BOOLEAN NOT NULL,
  safety_check_details JSONB,
  evidence_gate_passed BOOLEAN NOT NULL,
  evidence_gate_details JSONB,
  budget_check_passed BOOLEAN NOT NULL,
  budget_check_details JSONB,
  
  -- Status
  status VARCHAR(50) NOT NULL,  -- success, failed, blocked_*
  error_message TEXT,
  
  -- Explainability
  section_explanations JSONB,
  retry_count INTEGER DEFAULT 0,
  parent_request_id VARCHAR(255),
  
  operation VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ai_budget_config

Per-tenant budget configuration:

```sql
CREATE TABLE ai_budget_config (
  id UUID PRIMARY KEY,
  company_id UUID UNIQUE NOT NULL,
  
  daily_limit_usd DECIMAL(10, 2) DEFAULT 10.00,
  monthly_limit_usd DECIMAL(10, 2) DEFAULT 100.00,
  
  daily_used_usd DECIMAL(10, 6) DEFAULT 0,
  monthly_used_usd DECIMAL(10, 6) DEFAULT 0,
  
  daily_reset_at TIMESTAMPTZ,
  monthly_reset_at TIMESTAMPTZ,
  
  alert_threshold_pct INTEGER DEFAULT 80,
  enabled BOOLEAN DEFAULT true
);
```

### ai_safety_policy

Safety moderation policies:

```sql
CREATE TABLE ai_safety_policy (
  id UUID PRIMARY KEY,
  company_id UUID,  -- NULL for global policy
  is_global BOOLEAN DEFAULT false,
  
  blocked_categories TEXT[],  -- ['hate', 'violence', ...]
  warning_categories TEXT[],
  
  min_confidence_threshold DECIMAL(3, 2) DEFAULT 0.7,
  block_on_violation BOOLEAN DEFAULT true,
  enabled BOOLEAN DEFAULT true
);
```

## Usage

### 1. Initialize Services

```typescript
import { createSafetyChecker } from '@teei/safety-moderation';
import { createBudgetEnforcer } from '@teei/ai-budget';
import { createEvidenceGate, GuardrailsOrchestrator } from '@teei/observability/ai';
import { AuditPersister } from '@teei/observability/ai';
import { Pool } from 'pg';

const pgPool = new Pool({ connectionString: process.env.DATABASE_URL });

// Safety checker
const safetyChecker = createSafetyChecker({
  pgPool,
  openaiApiKey: process.env.OPENAI_API_KEY,
  enableOpenAIMod: true,
});

// Budget enforcer
const budgetEnforcer = createBudgetEnforcer({
  pgPool,
  alertWebhookUrl: process.env.BUDGET_ALERT_WEBHOOK,
});

// Evidence gate
const evidenceGate = createEvidenceGate({
  minCitationsPerParagraph: 1,
  minCitationDensity: 0.5,
  failFast: true,
});

// Orchestrator
const guardrails = new GuardrailsOrchestrator({
  safetyChecker,
  evidenceGate,
  budgetEnforcer,
});

// Audit persister
const auditor = new AuditPersister(pgPool);
```

### 2. Run Guardrails (Pre-generation)

```typescript
const preChecks = await guardrails.runPreChecks({
  text: promptText,
  companyId: 'company-uuid',
  operation: 'report-generation',
  estimatedCostUsd: 0.02,
});

if (!preChecks.overallPassed) {
  throw new Error(preChecks.blockedReason);
}
```

### 3. Generate Content with LLM

```typescript
const response = await llmClient.generate({
  model: 'gpt-4o-mini',
  messages: [
    { role: 'system', content: 'You are an expert analyst.' },
    { role: 'user', content: promptText },
  ],
});
```

### 4. Run Evidence Gate (Post-generation)

```typescript
const evidenceCheck = await guardrails.runPostChecks({
  generatedText: response.content,
  availableEvidenceIds: evidenceSnippets.map(e => e.id),
});

if (!evidenceCheck.passed) {
  throw new Error('Evidence validation failed: ' + evidenceCheck.errors.join('; '));
}
```

### 5. Persist Audit Record

```typescript
import { AuditPersister } from '@teei/observability/ai';

const promptRecord = await auditor.store({
  requestId: crypto.randomUUID(),
  companyId: 'company-uuid',
  userId: 'user-uuid',
  
  modelName: 'gpt-4o-mini',
  modelVersion: '2024-07-18',
  provider: 'openai',
  region: 'us-east-1',
  
  promptHash: AuditPersister.hash(promptText),
  outputHash: AuditPersister.hash(response.content),
  
  evidenceIds: evidenceSnippets.map(e => e.id),
  citationCount: evidenceCheck.citationCount,
  
  tokensInput: response.usage.promptTokens,
  tokensOutput: response.usage.completionTokens,
  tokensTotal: response.usage.totalTokens,
  costUsd: 0.0195,
  latencyMs: 2340,
  
  safetyCheckPassed: preChecks.safety.passed,
  safetyCheckDetails: preChecks.safety,
  
  evidenceGatePassed: evidenceCheck.passed,
  evidenceGateDetails: evidenceCheck,
  
  budgetCheckPassed: preChecks.budget.allowed,
  budgetCheckDetails: preChecks.budget,
  
  status: 'success',
  operation: 'report-generation',
});
```

### 6. Record Budget Usage

```typescript
await budgetEnforcer.recordUsage(companyId, actualCostUsd);
```

### 7. Query Audit Trail

```typescript
const records = await auditor.query({
  companyId: 'company-uuid',
  since: '2025-11-01T00:00:00Z',
  operation: 'report-generation',
  limit: 100,
});

for (const record of records) {
  console.log(record.requestId, record.status, record.costUsd);
}
```

## Explainability

### Prompt Reconstruction

Store template and variables for replay:

```typescript
await auditor.store({
  // ...other fields
  promptTemplate: 'quarterly-report.en',
  promptVariables: AuditPersister.maskVariables({
    companyName: 'Acme Corp',
    periodStart: '2025-Q1',
    evidenceCount: 23,
  }),
  sectionExplanations: [
    {
      sectionType: 'impact-summary',
      whyThisSection: 'High-level overview for executive audience',
      topEvidenceIds: ['ev-1', 'ev-2', 'ev-3'],
      variablesUsed: { companyName: 'Acme Corp', participantsCount: 150 },
    },
  ],
});
```

### Retrieve Explanation

```typescript
const record = await auditor.getById(promptRecordId);

console.log('Model:', record.modelName);
console.log('Template:', record.promptTemplate);
console.log('Evidence IDs:', record.evidenceIds);
console.log('Citations:', record.citationCount);
console.log('Cost:', record.costUsd);
console.log('Sections:', record.sectionExplanations);
```

## OpenTelemetry Integration

### Create Span

```typescript
import { AISpanHelper } from '@teei/observability/ai';

const span = AISpanHelper.startSpan('ai.generate.report', {
  operation: 'report-generation',
  model: 'gpt-4o-mini',
  provider: 'openai',
  companyId: 'company-uuid',
  requestId: requestId,
});

try {
  // AI generation
  const response = await llmClient.generate(...);
  
  AISpanHelper.recordTokens(span, tokensInput, tokensOutput, costUsd);
  AISpanHelper.recordGuardrails(span, safetyPassed, evidencePassed, budgetPassed);
  AISpanHelper.endSpan(span, promptRecordId);
} catch (error) {
  AISpanHelper.recordError(span, error);
  span.end();
  throw error;
}
```

## Eval Harness

### Fixture Format

```json
{
  "id": "report-gen-001",
  "name": "Quarterly report with high evidence density",
  "operation": "report-generation",
  "promptTemplate": "quarterly-report.en",
  "promptVariables": {
    "companyName": "Test Co",
    "periodStart": "2025-Q1"
  },
  "evidenceSnippets": [
    { "id": "ev-1", "text": "Participant feedback..." }
  ],
  "expectedCitations": 5,
  "seed": 42
}
```

### Run Eval

```bash
pnpm ai:eval reporting
```

Scores:
- **Factuality**: Citation coverage (0.0–1.0)
- **Structure**: Output format match (0.0–1.0)
- **Safety**: No violations (0.0–1.0)

## API Endpoints

### GET /ai/audit/:id

Retrieve single audit record:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.teei.io/ai/audit/550e8400-e29b-41d4-a716-446655440000
```

### GET /ai/audit?since=...&model=...

Query audit records:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.teei.io/ai/audit?companyId=$COMPANY_ID&since=2025-11-01T00:00:00Z&operation=report-generation&limit=50"
```

### GET /ai/audit/:id/explain

Get explainability bundle:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://api.teei.io/ai/audit/550e8400-e29b-41d4-a716-446655440000/explain
```

Response includes:
- Prompt template + variables
- Evidence snippets used
- Section-level reasoning
- Guardrail outcomes

## Performance

- **Audit overhead**: <30ms p95 (async write)
- **Safety check**: 50–200ms (local patterns + optional OpenAI API)
- **Evidence gate**: <10ms (regex + validation)
- **Budget check**: <5ms (in-memory + DB lookup)

## Security

- **No PII in logs**: Prompt variables are masked before storage
- **Hash-based deduplication**: SHA256 of prompt/output
- **Tenant isolation**: All queries scoped by company_id
- **RLS**: Row-level security on audit tables

## Monitoring

### Grafana Dashboards

- **AI Operations**: Request counts, latency, costs by model
- **Guardrails**: Block rates (safety, evidence, budget)
- **Budget Health**: Usage vs. limits, alert triggers

### Prometheus Metrics

- `ai_requests_total{company_id, model, operation, status}`
- `ai_tokens_used_total{company_id, model}`
- `ai_cost_dollars_total{company_id, model}`
- `ai_budget_remaining_dollars{company_id}`

## Compliance

- **GDPR**: DSAR support via `evidence_ids` linking
- **SOC 2**: Full audit trail with immutable records
- **ISO 27001**: Access controls + encryption at rest

## References

- Database schema: `packages/shared-schema/migrations/0043_ai_prompt_audit.sql`
- Types: `packages/shared-types/src/ai/`
- Guardrails: `packages/observability/src/ai/`
- OpenAPI: `packages/openapi/ai-audit.yaml`
