# Q2Q AI & Gen-Reports Service Implementation Guide

**Version**: 1.0
**Last Updated**: 2024-11-14
**Status**: Production Ready

---

## Executive Summary

This document provides a comprehensive guide to the Q2Q AI outcome classification system and the Gen-Reports AI service for generating narrative CSR impact reports with citations, redaction, and full lineage tracking.

### Key Components

1. **Q2Q AI Service** - Real LLM-based outcome classifier (upgraded from stub)
2. **Reporting Service** - AI-powered report generation with citations
3. **Database Schema** - Report lineage and citation tracking
4. **Supporting Libraries** - LLM client, citation extractor, redaction enforcer, lineage tracker

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             │ POST /classify/text            │ POST /gen-reports/generate
             │                                │
┌────────────▼────────────┐      ┌───────────▼──────────────┐
│   Q2Q AI Service        │      │  Reporting Service        │
│   Port: 3005            │      │  Port: 3007               │
│                         │      │                           │
│  ┌──────────────────┐   │      │  ┌────────────────────┐  │
│  │ Real Classifier  │   │      │  │ Report Generator   │  │
│  │ (LLM-based)      │   │      │  │                    │  │
│  └────────┬─────────┘   │      │  └────┬──────┬────────┘  │
│           │             │      │       │      │            │
│  ┌────────▼─────────┐   │      │  ┌────▼──┐ ┌▼─────────┐  │
│  │ Stub Classifier  │   │      │  │ LLM   │ │Citations │  │
│  │ (Random scores)  │   │      │  │Client │ │Extractor │  │
│  └──────────────────┘   │      │  └───────┘ └──────────┘  │
└─────────┬───────────────┘      └───────────┬──────────────┘
          │                                  │
          │ Stores outcome_scores            │ Queries evidence_snippets
          │ and evidence_snippets            │ Stores report_lineage
          │                                  │
          └──────────────┬───────────────────┘
                         │
                ┌────────▼─────────┐
                │   PostgreSQL     │
                │                  │
                │ - outcome_scores │
                │ - evidence_      │
                │   snippets       │
                │ - report_lineage │
                │ - report_        │
                │   sections       │
                │ - report_        │
                │   citations      │
                └──────────────────┘
```

---

## Q2Q AI Service - Real LLM Classifier

### Overview

The Q2Q AI service classifies text across five outcome dimensions using LLM-based analysis. It can operate in two modes:

- **Stub Mode** (default): Returns random scores for development/testing
- **Real Mode** (production): Uses OpenAI or Anthropic Claude for actual classification

### Configuration

Set these environment variables to enable real classification:

```bash
# Enable real classifier
USE_REAL_CLASSIFIER=true

# LLM Provider (openai or anthropic)
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo

# API Keys
OPENAI_API_KEY=sk-...
# OR
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/teei
```

### Outcome Dimensions

1. **CONFIDENCE** - Self-confidence, belief in abilities
2. **BELONGING** - Sense of community, social connection
3. **LANG_LEVEL_PROXY** - Language proficiency improvements
4. **JOB_READINESS** - Employment preparation, professional skills
5. **WELL_BEING** - Mental health, happiness, life satisfaction

### API Endpoints

#### POST /v1/classify/text

Classify text and store outcome scores.

**Request**:
```json
{
  "text": "I feel much more confident now and part of the community. I'm preparing for job interviews.",
  "userId": "uuid",
  "contextId": "uuid",
  "contextType": "conversation"
}
```

**Response**:
```json
{
  "success": true,
  "classification": {
    "scores": {
      "CONFIDENCE": 0.85,
      "BELONGING": 0.78,
      "LANG_LEVEL_PROXY": 0.62,
      "JOB_READINESS": 0.71,
      "WELL_BEING": 0.80
    },
    "metadata": {
      "textLength": 98,
      "wordCount": 18,
      "timestamp": "2024-11-14T10:30:00Z",
      "modelName": "gpt-4-turbo",
      "tokensUsed": 450
    },
    "scoreIds": {
      "CONFIDENCE": "uuid",
      "BELONGING": "uuid",
      ...
    }
  }
}
```

#### GET /v1/taxonomy

Get outcome dimension definitions.

**Response**:
```json
{
  "success": true,
  "dimensions": [
    {
      "dimension": "CONFIDENCE",
      "label": "Self-Confidence",
      "description": "Measures participant's self-esteem..."
    },
    ...
  ]
}
```

### Implementation Details

**Files**:
- `/services/q2q-ai/src/classifier-real.ts` - Real LLM classifier
- `/services/q2q-ai/src/classifier.ts` - Stub classifier
- `/services/q2q-ai/src/prompts/outcome-classification.hbs` - Classification prompt
- `/services/q2q-ai/src/routes/classify.ts` - API routes

**Key Features**:
- Handlebars prompt templates
- JSON-structured LLM responses
- Confidence scores per dimension
- Evidence snippet extraction
- Token usage tracking
- Automatic fallback to stub mode

---

## Reporting Service - Gen-AI Reports

### Overview

The Reporting Service generates narrative CSR impact reports with:
- **Citations**: Every claim backed by evidence snippets
- **Redaction**: PII scrubbed before LLM calls
- **Lineage**: Full audit trail of model, prompts, tokens, costs
- **Multi-locale**: Support for English, Spanish, French

### Configuration

```bash
# LLM Provider
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=4000

# API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/teei

# Redaction
REDACTION_AGGRESSIVE=false  # Set true to redact possible names

# Service Port
PORT_REPORTING=3007
```

### Report Sections

1. **impact-summary** - 2-3 paragraph overview of key outcomes
2. **sroi-narrative** - Social Return on Investment analysis
3. **outcome-trends** - Longitudinal trend analysis across dimensions

### API Endpoints

#### POST /v1/gen-reports/generate

Generate AI report with citations.

**Request**:
```json
{
  "companyId": "uuid",
  "period": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "locale": "en",
  "sections": ["impact-summary", "sroi-narrative", "outcome-trends"],
  "deterministic": false,
  "temperature": 0.7,
  "maxTokens": 4000
}
```

**Response**:
```json
{
  "reportId": "uuid",
  "sections": [
    {
      "type": "impact-summary",
      "content": "The program achieved significant outcomes across all dimensions. Confidence scores improved by 23% [cite:abc-123], with participants reporting increased self-belief [cite:def-456]. Social integration metrics show 78% of participants feel a strong sense of belonging [cite:ghi-789]...",
      "citations": [
        {
          "id": "cite-0",
          "snippetId": "abc-123",
          "text": "I feel much more confident in my abilities now",
          "relevanceScore": 0.87
        },
        {
          "id": "cite-1",
          "snippetId": "def-456",
          "text": "I believe in myself and my future",
          "relevanceScore": 0.82
        }
      ],
      "wordCount": 245,
      "characterCount": 1523
    }
  ],
  "lineage": {
    "modelName": "gpt-4-turbo",
    "promptVersion": "impact-summary-v1.0",
    "timestamp": "2024-11-14T10:30:00Z",
    "tokensUsed": 2450,
    "tokensInput": 850,
    "tokensOutput": 1600,
    "estimatedCostUsd": "0.034500"
  },
  "warnings": []
}
```

#### GET /v1/gen-reports/cost-summary

Get cost summary for generated reports.

**Response**:
```json
{
  "totalCost": "1.234560",
  "totalTokens": 125430,
  "requestCount": 42,
  "avgCostPerRequest": "0.029394",
  "avgTokensPerRequest": 2987
}
```

### Implementation Details

**Service Structure**:
```
/services/reporting/
├── src/
│   ├── index.ts                    # Service entry point
│   ├── routes/
│   │   └── gen-reports.ts          # API routes
│   ├── lib/
│   │   ├── llm-client.ts           # LLM wrapper with retry
│   │   ├── citations.ts            # Citation extractor
│   │   ├── redaction.ts            # PII scrubbing
│   │   ├── lineage.ts              # Provenance tracking
│   │   └── prompts/
│   │       ├── index.ts            # Template manager
│   │       ├── impact-summary.en.hbs
│   │       ├── impact-summary.es.hbs
│   │       ├── sroi-narrative.en.hbs
│   │       └── outcome-trends.en.hbs
│   ├── middleware/
│   │   └── cost-tracking.ts        # Token/cost tracking
│   └── health/
│       └── index.ts                # Health endpoints
└── package.json
```

### Key Components

#### 1. LLM Client (`llm-client.ts`)

- Supports OpenAI and Anthropic Claude
- Exponential backoff retry (3 attempts)
- Configurable temperature and max tokens
- Deterministic seed option
- Token usage tracking
- Cost estimation

**Usage**:
```typescript
import { createLLMClient } from './lib/llm-client.js';

const client = createLLMClient();
const response = await client.generateCompletion([
  { role: 'system', content: 'You are an expert analyst.' },
  { role: 'user', content: 'Generate a summary...' }
]);
```

#### 2. Citation Extractor (`citations.ts`)

- Queries `evidence_snippets` table
- Scores relevance (outcome score + confidence + text quality)
- Balances snippets across dimensions
- Validates citations in generated content
- Ensures every paragraph has citations

**Usage**:
```typescript
import { createCitationExtractor } from './lib/citations.js';

const extractor = createCitationExtractor();
const snippets = await extractor.extractEvidence(
  companyId,
  periodStart,
  periodEnd,
  ['CONFIDENCE', 'BELONGING']
);

const validation = extractor.validateCitations(content, snippets);
```

#### 3. Redaction Enforcer (`redaction.ts`)

- Scrubs PII before LLM calls:
  - Email addresses
  - Phone numbers
  - SSN, credit cards
  - IP addresses
  - Possible names (in aggressive mode)
- Maintains redaction map for restoration
- Validates no PII remains after redaction

**Usage**:
```typescript
import { createRedactionEnforcer } from './lib/redaction.js';

const enforcer = createRedactionEnforcer();
const result = enforcer.redact(text);
// result.redactedText - safe for LLM
// result.redactionMap - for restoration
```

#### 4. Lineage Tracker (`lineage.ts`)

- Stores complete audit trail in database:
  - Model name, version, provider
  - Prompt version and template
  - Token counts and estimated cost
  - All citation IDs used
  - Request duration
- Enables reproducibility and compliance

**Usage**:
```typescript
import { createLineageTracker, buildLineageMetadata } from './lib/lineage.js';

const tracker = createLineageTracker();
const metadata = buildLineageMetadata({...});
await tracker.storeLineage(metadata, sections, citations);
```

---

## Database Schema

### New Tables

#### report_lineage

Stores provenance metadata for each generated report.

```sql
CREATE TABLE report_lineage (
  id UUID PRIMARY KEY,
  report_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  provider_name VARCHAR(50) NOT NULL,
  prompt_version VARCHAR(100) NOT NULL,
  prompt_template TEXT,
  locale VARCHAR(10) DEFAULT 'en',
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  tokens_total INTEGER NOT NULL,
  estimated_cost_usd VARCHAR(20),
  deterministic JSONB DEFAULT 'false',
  temperature VARCHAR(10),
  sections JSONB NOT NULL,
  citation_count INTEGER DEFAULT 0,
  evidence_snippet_ids JSONB,
  request_id VARCHAR(100),
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);
```

#### report_sections

Stores individual sections of generated reports.

```sql
CREATE TABLE report_sections (
  id UUID PRIMARY KEY,
  lineage_id UUID NOT NULL REFERENCES report_lineage(id),
  section_type VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  citation_ids JSONB,
  word_count INTEGER,
  character_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### report_citations

Stores citation linkages for auditability.

```sql
CREATE TABLE report_citations (
  id UUID PRIMARY KEY,
  lineage_id UUID NOT NULL REFERENCES report_lineage(id),
  section_id UUID REFERENCES report_sections(id),
  citation_number INTEGER NOT NULL,
  snippet_id UUID NOT NULL,  -- References evidence_snippets.id
  snippet_text TEXT,
  relevance_score VARCHAR(10),
  position_in_text INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Migration

Run migration:
```bash
psql $DATABASE_URL -f packages/shared-schema/migrations/0005_add_report_lineage_tables.sql
```

Rollback:
```bash
psql $DATABASE_URL -f packages/shared-schema/migrations/rollback/0005_rollback_report_lineage.sql
```

---

## Deployment

### Local Development

1. **Install dependencies**:
```bash
pnpm install
```

2. **Configure environment**:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. **Run migrations**:
```bash
psql $DATABASE_URL -f packages/shared-schema/migrations/0005_add_report_lineage_tables.sql
```

4. **Start services**:
```bash
# Q2Q AI Service
pnpm --filter @teei/q2q-ai dev

# Reporting Service
pnpm --filter @teei/reporting dev
```

### Production Deployment

1. **Build services**:
```bash
pnpm --filter @teei/q2q-ai build
pnpm --filter @teei/reporting build
```

2. **Set environment variables**:
```bash
USE_REAL_CLASSIFIER=true
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
REDACTION_AGGRESSIVE=false
```

3. **Start services**:
```bash
pnpm --filter @teei/q2q-ai start
pnpm --filter @teei/reporting start
```

4. **Health checks**:
- Q2Q AI: `http://localhost:3005/health`
- Reporting: `http://localhost:3007/health`

---

## Testing

### Unit Tests

```bash
# Test citation extractor
pnpm --filter @teei/reporting test src/lib/citations.test.ts

# Test redaction enforcer
pnpm --filter @teei/reporting test src/lib/redaction.test.ts
```

### Integration Tests

```bash
# Test full report generation pipeline
curl -X POST http://localhost:3007/v1/gen-reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "companyId": "uuid",
    "period": {"start": "2024-01-01", "end": "2024-12-31"},
    "locale": "en",
    "sections": ["impact-summary"]
  }'
```

### Quality Evaluation

See `/reports/gen_reports_eval.md` for comprehensive quality evaluation results.

---

## Monitoring & Observability

### Metrics to Track

1. **Token Usage**:
   - Per company, per period
   - Per section type
   - Trends over time

2. **Cost**:
   - Total spend per month
   - Cost per report
   - Cost by model

3. **Quality**:
   - Citation count per paragraph
   - Validation pass rate
   - Warning frequency

4. **Performance**:
   - Generation duration
   - LLM latency
   - Database query time

### Logs

All services use structured logging:

```json
{
  "level": "info",
  "service": "reporting",
  "message": "Report generation completed",
  "reportId": "uuid",
  "sectionsCount": 3,
  "citationsCount": 12,
  "tokensTotal": 2450,
  "cost": "0.034500"
}
```

---

## Troubleshooting

### Common Issues

**Issue**: "No citations found in content"
- **Cause**: LLM not following citation format
- **Solution**: Check prompt template, lower temperature

**Issue**: "PII detected after redaction"
- **Cause**: Redaction patterns incomplete
- **Solution**: Enable `REDACTION_AGGRESSIVE=true` or update patterns

**Issue**: "Insufficient evidence found"
- **Cause**: No outcome_scores for period
- **Solution**: Run Q2Q classifier on participant feedback first

**Issue**: "Rate limit exceeded"
- **Cause**: Too many LLM requests
- **Solution**: Implement request queuing, use exponential backoff

---

## Security & Compliance

### PII Protection

1. **Before LLM**: All text redacted using `RedactionEnforcer`
2. **Validation**: Ensures no PII in redacted text
3. **Logging**: Never log original unredacted content
4. **Storage**: Report lineage stores only redacted snippets

### Audit Trail

Every generated report includes:
- Model name and version
- Prompt version used
- All evidence snippet IDs
- Timestamp and duration
- User who requested report

Query audit trail:
```sql
SELECT * FROM report_lineage WHERE report_id = 'uuid';
SELECT * FROM report_citations WHERE lineage_id = 'uuid';
```

### GDPR Compliance

- Evidence snippets stored with surrogate keys
- PII redacted before external API calls
- Full lineage for right-to-explanation
- Deletion cascades from report_lineage

---

## Cost Management

### Token Budget Enforcement

Set limits per request:
```typescript
const response = await client.generateCompletion(messages, {
  maxTokens: 4000  // Hard limit
});
```

### Cost Tracking

Monitor costs:
```bash
curl http://localhost:3007/v1/gen-reports/cost-summary
```

### Optimization Strategies

1. **Model selection**: Use GPT-3.5 Turbo for drafts
2. **Temperature**: Lower temp = fewer tokens
3. **Caching**: Cache reports for duplicate requests
4. **Batching**: Generate multiple sections in one call

---

## Future Enhancements

1. **Multi-modal reports**: Include charts and visualizations
2. **Interactive reports**: Allow user to drill into citations
3. **A/B testing**: Compare different prompt templates
4. **Fine-tuning**: Custom models for better accuracy
5. **Streaming**: Real-time report generation updates
6. **Translations**: Automatic locale conversion
7. **Version control**: Track prompt template changes

---

## Support & Resources

- **Documentation**: `/docs/Q2Q_GenReports_Wiring.md` (this file)
- **Evaluation**: `/reports/gen_reports_eval.md`
- **Integration Report**: `/reports/gen_reports_lead_report.md`
- **API Spec**: OpenAPI spec at `/docs/api-spec.yaml`
- **Examples**: `/examples/gen-reports-samples/`

---

**Document Maintained By**: Gen-Reports Lead
**Last Review**: 2024-11-14
**Next Review**: 2025-01-14
