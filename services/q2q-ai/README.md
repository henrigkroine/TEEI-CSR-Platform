# Q2Q AI Service

Production-ready AI-powered text classification service for learner outcome analysis in the TEEI CSR Platform.

## Overview

The Q2Q AI Service analyzes learner feedback, check-ins, and other text to identify outcome indicators such as confidence changes, belonging, language proficiency, employability signals, and risk cues. It uses a provider-agnostic architecture supporting Claude (Anthropic), OpenAI, and Google Gemini.

## Features

### Core Capabilities
- **Multi-Provider AI Inference**: Seamlessly switch between Claude, OpenAI, and Gemini
- **Structured Classification**: Analyzes text for confidence, belonging, language comfort, employability signals, and risk cues
- **Evidence Extraction**: Identifies specific text snippets supporting each classification
- **Cost Tracking**: Monitors token usage and estimated costs per request
- **Retry Logic**: Exponential backoff with configurable retry policies
- **Calibration System**: Evaluate model performance with precision, recall, F1, and confusion matrices

### Production Label Set
- **Confidence**: `confidence_increase`, `confidence_decrease`
- **Belonging**: `belonging_increase`, `belonging_decrease`
- **Language Comfort**: `low`, `medium`, `high`
- **Employability Signals**: `job_search`, `skills_gained`, `networking`, `resume_improvement`, `interview_prep`, `certification`, `portfolio_building`, `career_goal_setting`
- **Risk Cues**: `isolation`, `frustration`, `disengagement`, `anxiety`, `dropout_indication`, `confusion`, `negative_self_talk`, `lack_of_support`

## Architecture

```
services/q2q-ai/
├── src/
│   ├── inference/          # AI provider infrastructure
│   │   ├── driver.ts       # Main inference coordinator
│   │   ├── types.ts        # Shared interfaces
│   │   ├── prompt.ts       # Prompt engineering & few-shot examples
│   │   ├── retry.ts        # Exponential backoff retry logic
│   │   └── providers/      # Provider adapters
│   │       ├── claude.ts   # Anthropic Claude integration
│   │       ├── openai.ts   # OpenAI integration
│   │       └── gemini.ts   # Google Gemini integration
│   ├── calibration/        # Evaluation harness
│   │   ├── types.ts        # Calibration data structures
│   │   ├── metrics.ts      # Precision, recall, F1, confusion matrix
│   │   ├── storage.ts      # In-memory dataset storage
│   │   └── evaluator.ts    # Batch evaluation runner
│   ├── routes/
│   │   ├── classify.ts     # Classification endpoints
│   │   └── calibration.ts  # Evaluation endpoints
│   ├── labels.ts           # Production label definitions
│   ├── classifier.ts       # Main classification logic
│   ├── taxonomy.ts         # Outcome dimension definitions
│   └── index.ts            # Service entry point
└── __tests__/              # Unit tests
```

## Configuration

### Environment Variables

```bash
# AI Provider Selection
Q2Q_PROVIDER=claude              # Options: claude, openai, gemini (default: claude)

# Provider API Keys (at least one required)
ANTHROPIC_API_KEY=sk-ant-...    # For Claude
OPENAI_API_KEY=sk-...           # For OpenAI
GOOGLE_AI_API_KEY=...           # For Gemini

# Model Configuration (optional)
Q2Q_CLAUDE_MODEL=claude-3-5-sonnet-20241022
Q2Q_OPENAI_MODEL=gpt-4o-mini
Q2Q_GEMINI_MODEL=gemini-1.5-flash
Q2Q_MAX_TOKENS=4096
Q2Q_TEMPERATURE=0.0

# Service Configuration
PORT_Q2Q_AI=3005
```

## API Endpoints

### Classification

#### POST /classify/text
Classify text and store outcome scores.

**Request:**
```json
{
  "text": "I've been applying to jobs every day. My buddy helped me improve my resume.",
  "userId": "uuid",
  "contextId": "uuid",
  "contextType": "conversation"
}
```

**Response:**
```json
{
  "success": true,
  "classification": {
    "scores": {
      "confidence": 0.8,
      "belonging": 0.8,
      "lang_level_proxy": 0.9,
      "job_readiness": 0.75,
      "well_being": 0.9
    },
    "metadata": {
      "provider": "claude",
      "modelName": "claude-3-5-sonnet-20241022",
      "tokens": { "inputTokens": 250, "outputTokens": 150 },
      "cost": { "totalCost": 0.00125 },
      "latencyMs": 850
    },
    "rawLabels": {
      "confidence_increase": true,
      "belonging_increase": true,
      "employability_signals": ["job_search", "resume_improvement"]
    },
    "scoreIds": { ... }
  }
}
```

#### GET /taxonomy
Get outcome dimension definitions.

### Calibration & Evaluation

#### POST /q2q/eval/upload
Upload a calibration dataset.

**Request:**
```json
{
  "name": "Test Dataset v1",
  "samples": [
    {
      "text": "I feel more confident now",
      "true_label": "confidence_increase"
    }
  ]
}
```

#### GET /q2q/eval/datasets
List all calibration datasets.

#### POST /q2q/eval/run
Run evaluation on a dataset.

**Request:**
```json
{
  "datasetId": "uuid",
  "provider": "claude",
  "batchSize": 10
}
```

#### GET /q2q/eval/results/:id
Get evaluation results with metrics.

**Response:**
```json
{
  "run": {
    "status": "completed",
    "results": {
      "accuracy": 0.85,
      "totalSamples": 100,
      "correctPredictions": 85,
      "labelMetrics": [
        {
          "label": "confidence_increase",
          "precision": 0.90,
          "recall": 0.85,
          "f1Score": 0.87,
          "support": 30
        }
      ],
      "averageLatencyMs": 750,
      "totalCost": 0.125
    }
  }
}
```

#### GET /q2q/eval/results/:id/report
Get human-readable evaluation report (plain text).

## Usage Examples

### Basic Classification

```typescript
import { getInferenceDriver } from './inference';

const driver = getInferenceDriver();
const result = await driver.classify({
  text: 'I completed my resume and applied for 3 jobs today!',
  userId: 'user-123'
});

console.log('Classification:', result.classification);
console.log('Cost:', result.cost.totalCost);
```

### Provider Selection

```typescript
import { getInferenceDriver, AIProvider } from './inference';

const driver = getInferenceDriver();

// Use specific provider
const result = await driver.classifyWithProvider(
  AIProvider.OPENAI,
  { text: 'Sample text' }
);
```

### Cost Estimation

```typescript
const driver = getInferenceDriver();
const estimate = driver.estimateCost('Sample text to classify');

console.log(`Estimated cost: $${estimate.estimate.totalCost}`);
```

## Database Schema

### outcome_scores Table
```sql
CREATE TABLE outcome_scores (
  id UUID PRIMARY KEY,
  text_id UUID NOT NULL,
  text_type VARCHAR(50),
  dimension VARCHAR(50) NOT NULL,
  score DECIMAL(4,3) NOT NULL,
  confidence DECIMAL(4,3),
  model_version VARCHAR(50),
  method classification_method DEFAULT 'ai_classifier',
  provider_used VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### evidence_snippets Table
```sql
CREATE TABLE evidence_snippets (
  id UUID PRIMARY KEY,
  outcome_score_id UUID REFERENCES outcome_scores(id),
  snippet_text TEXT,
  snippet_hash VARCHAR(64) UNIQUE,
  embedding_ref VARCHAR(255),
  embedding TEXT,
  source_ref VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Testing

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test labels.test.ts

# Run tests in watch mode
pnpm test --watch
```

## Performance

### Typical Latencies (95th percentile)
- Claude 3.5 Sonnet: 800-1200ms
- GPT-4o Mini: 500-800ms
- Gemini 1.5 Flash: 400-700ms

### Cost per Classification (estimated)
- Claude 3.5 Sonnet: $0.001-0.002
- GPT-4o Mini: $0.0001-0.0003
- Gemini 1.5 Flash: $0.00005-0.0001

### Rate Limits
- Automatic retry with exponential backoff
- Configurable batch sizes for evaluation
- 1-second delay between evaluation batches

## Monitoring

All AI requests are logged with:
- Correlation ID for tracing
- Provider and model used
- Token usage (input/output)
- Cost estimate
- Latency
- Success/failure status

Example log:
```
[classify-user-123-1234567890] Starting inference with claude (claude-3-5-sonnet-20241022)
[classify-user-123-1234567890] Inference completed in 850ms { provider: 'claude', tokens: {...}, cost: {...} }
```

## Error Handling

The service implements graceful degradation:
1. Retry logic for transient errors (rate limits, 5xx errors)
2. Fallback to neutral scores if all providers fail
3. Detailed error logging with correlation IDs
4. Provider-specific error handling

## Security

- API keys stored as environment variables only
- No keys transmitted to frontend
- Server-side inference only
- Request validation with Zod schemas
- Hash-based deduplication of evidence snippets

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Start production server
pnpm start
```

## Future Enhancements

- [ ] Embedding generation for semantic search
- [ ] Fine-tuned models for domain-specific classification
- [ ] Real-time streaming responses
- [ ] Persistent storage for calibration datasets
- [ ] A/B testing framework for prompt variants
- [ ] Multi-language support
- [ ] Confidence calibration based on historical accuracy

## License

Internal use only - TEEI CSR Platform
