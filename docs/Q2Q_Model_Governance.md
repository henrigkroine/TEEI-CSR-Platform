# Q2Q Model Governance Guide

**Version**: 1.0
**Last Updated**: 2025-11-13
**Owner**: NLP Lead - Worker 2

## Table of Contents

1. [Overview](#overview)
2. [Model Registry Concept](#model-registry-concept)
3. [Model Lifecycle](#model-lifecycle)
4. [Adding a New Model](#adding-a-new-model)
5. [Activating and Deactivating Models](#activating-and-deactivating-models)
6. [Drift Monitoring](#drift-monitoring)
7. [Best Practices](#best-practices)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Q2Q Model Governance system provides centralized management of AI models used for learner feedback classification. It enables:

- **Version Control**: Track all model versions and configurations
- **A/B Testing**: Compare different models on production traffic
- **Rollback**: Quickly revert to previous model versions
- **Drift Detection**: Monitor model performance degradation over time
- **Audit Trail**: Complete history of model changes

### Key Components

1. **Model Registry**: YAML-based configuration + database persistence
2. **Activation System**: Control which models are active per provider
3. **Drift Monitor**: PSI and JS divergence calculations
4. **Evaluation Harness**: Per-language F1 scores and metrics

---

## Model Registry Concept

The model registry maintains a catalog of all Q2Q classifier configurations. Each model entry includes:

- **Model ID**: Unique identifier (e.g., `q2q-claude-v2-multilingual`)
- **Provider**: AI provider (claude, openai, gemini)
- **Model Name**: Specific model version (e.g., `claude-3-5-sonnet-20241022`)
- **Prompt Version**: Prompt template version (e.g., `v2.0`)
- **Thresholds**: Confidence thresholds for each label
- **Effective Date**: When model became available
- **Active Status**: Whether model is currently in use

### Why Model Registry?

**Without Model Registry:**
- Hard-coded model configurations
- Manual environment variable updates
- No audit trail of changes
- Difficult to rollback
- A/B testing requires code changes

**With Model Registry:**
- Centralized configuration management
- Database-backed with API access
- Complete change history
- One-click rollback
- Easy A/B testing via activation

---

## Model Lifecycle

```
┌─────────────────┐
│   1. Define     │
│   (YAML)        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   2. Sync to    │
│   Database      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   3. Evaluate   │
│   (Test Data)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   4. Activate   │
│   (Production)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   5. Monitor    │
│   (Drift)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   6. Rollback   │
│   (if needed)   │
└─────────────────┘
```

### Lifecycle Stages

1. **Define**: Create model configuration in YAML
2. **Sync**: Load configuration into database
3. **Evaluate**: Run evaluation on test dataset
4. **Activate**: Set model as active for production use
5. **Monitor**: Track performance drift over time
6. **Rollback**: Deactivate and revert to previous model if issues detected

---

## Adding a New Model

### Step 1: Update models.yaml

Edit `/services/q2q-ai/src/registry/models.yaml`:

```yaml
models:
  - id: q2q-claude-v3-enhanced
    provider: claude
    model: claude-3-5-sonnet-20250101  # New model version
    prompt_version: v3.0
    thresholds:
      confidence_increase: 0.80
      confidence_decrease: 0.80
      belonging_increase: 0.80
      belonging_decrease: 0.80
      language_comfort_high: 0.90
      language_comfort_low: 0.20
      employability_min_signals: 1
      risk_min_cues: 1
    effective_from: "2025-12-01T00:00:00Z"
    active: false  # Start inactive for testing
    description: "Enhanced Q2Q classifier with improved risk detection"
```

### Step 2: Sync to Database

```bash
# Via API
curl -X POST http://localhost:3005/q2q/registry/sync

# Or via command line (if implemented)
pnpm --filter @teei/q2q-ai sync-models
```

### Step 3: Verify Registration

```bash
# List all models
curl http://localhost:3005/q2q/registry/models

# Get specific model
curl http://localhost:3005/q2q/registry/models/q2q-claude-v3-enhanced
```

### Step 4: Evaluate Performance

Run evaluation on test dataset to ensure acceptable performance:

```bash
# Upload test dataset
curl -X POST http://localhost:3005/q2q/eval/upload \
  -F "file=@test_dataset.csv" \
  -F "name=v3_evaluation"

# Run evaluation
curl -X POST http://localhost:3005/q2q/eval/run \
  -H "Content-Type: application/json" \
  -d '{"datasetId": "dataset-id", "modelId": "q2q-claude-v3-enhanced"}'

# Get results
curl http://localhost:3005/q2q/eval/results/run-id
```

### Step 5: Activate for Production

Once evaluation is satisfactory:

```bash
curl -X POST http://localhost:3005/q2q/registry/models/q2q-claude-v3-enhanced/activate
```

---

## Activating and Deactivating Models

### Activation Rules

- **One Active Model per Provider**: Only one model can be active per provider at a time
- **Automatic Deactivation**: Activating a model automatically deactivates others in the same provider
- **Default Provider**: Environment variable `Q2Q_PROVIDER` determines which provider is used

### Activate a Model

```bash
# Activate model (deactivates other claude models)
curl -X POST http://localhost:3005/q2q/registry/models/q2q-claude-v2-multilingual/activate
```

Response:
```json
{
  "success": true,
  "message": "Model q2q-claude-v2-multilingual activated successfully",
  "model": {
    "id": "...",
    "modelId": "q2q-claude-v2-multilingual",
    "active": true,
    "updatedAt": "2025-11-13T10:30:00Z"
  }
}
```

### Deactivate a Model

```bash
curl -X POST http://localhost:3005/q2q/registry/models/q2q-claude-v1/deactivate
```

### Get Active Model

```bash
# Get active model for specific provider
curl http://localhost:3005/q2q/registry/models/active/claude
```

### Rollback Workflow

To rollback to a previous model version:

1. **Identify Previous Model**: Check model registry for previous version
2. **Activate Previous Model**: Use activation endpoint
3. **Verify**: Check active model endpoint
4. **Monitor**: Watch metrics to ensure issue is resolved

```bash
# Example: Rollback from v2 to v1
curl -X POST http://localhost:3005/q2q/registry/models/q2q-claude-v1/activate

# Verify rollback
curl http://localhost:3005/q2q/registry/models/active/claude
```

---

## Drift Monitoring

Drift monitoring detects when model performance degrades over time due to:
- Changes in input data distribution
- Concept drift in learner behavior
- Model staleness

### Drift Metrics

#### Population Stability Index (PSI)

Measures distribution shift between baseline and current data:

```
PSI = Σ (current% - baseline%) × ln(current% / baseline%)
```

**Thresholds:**
- PSI < 0.1: No significant change ✓
- PSI 0.1 - 0.2: Moderate change (monitor) ⚡
- PSI > 0.2: Significant drift (alert) ⚠️

#### Jensen-Shannon Divergence (JS)

Symmetric measure of distribution similarity:

```
JS = 0.5 × KL(P || M) + 0.5 × KL(Q || M)
where M = (P + Q) / 2
```

**Thresholds:**
- JS < 0.05: No significant change ✓
- JS 0.05 - 0.1: Moderate change (monitor) ⚡
- JS > 0.1: Significant drift (alert) ⚠️

### Setting Up Drift Monitoring

#### 1. Establish Baseline

Collect baseline distribution from initial production data:

```typescript
const baseline = {
  positive: 0.30,  // 30% positive
  negative: 0.70   // 70% negative
};
```

#### 2. Schedule Regular Checks

Run drift checks daily/weekly:

```typescript
import { checkDrift, storeDriftCheck } from './eval/drift';

// Check drift for confidence_increase label
const result = checkDrift(
  'confidence_increase',
  'en',
  baseline,
  currentDistribution,
  0.2,  // PSI threshold
  0.1   // JS threshold
);

// Store result in database
await storeDriftCheck(result);

// Alert if drift detected
if (result.alertTriggered) {
  console.warn('DRIFT ALERT:', result);
  // Send notification to team
}
```

#### 3. Review Drift Alerts

```bash
# Get recent drift checks
curl http://localhost:3005/q2q/drift/checks?limit=50

# Get only alerts
curl http://localhost:3005/q2q/drift/alerts?limit=20
```

### Responding to Drift Alerts

When drift is detected:

1. **Investigate Root Cause**:
   - Has input data changed?
   - Are there new types of learner feedback?
   - Is there a seasonal pattern?

2. **Assess Impact**:
   - Check if F1 scores have decreased
   - Review false positive/negative rates
   - Analyze specific examples

3. **Take Action**:
   - **Minor Drift**: Continue monitoring
   - **Moderate Drift**: Adjust thresholds, collect new training data
   - **Severe Drift**: Retrain model, consider rollback

4. **Update Baseline**:
   - If drift is legitimate (e.g., program evolution), update baseline distribution

---

## Best Practices

### Model Versioning

✅ **DO:**
- Use semantic versioning for prompt versions (v1.0, v1.1, v2.0)
- Include descriptive model IDs (e.g., `q2q-claude-v2-multilingual`)
- Document changes in model descriptions
- Keep changelog of model updates

❌ **DON'T:**
- Reuse model IDs for different configurations
- Skip evaluation before activation
- Activate untested models directly in production

### Configuration Management

✅ **DO:**
- Store all configurations in YAML (version controlled)
- Sync YAML to database regularly
- Back up database before major changes
- Test configuration changes in staging first

❌ **DON'T:**
- Manually edit database records
- Use production for testing new models
- Delete old model records (keep for audit trail)

### Threshold Tuning

✅ **DO:**
- Start with conservative thresholds (0.7-0.8)
- Adjust based on precision/recall requirements
- Document business rationale for thresholds
- Re-evaluate thresholds quarterly

❌ **DON'T:**
- Set thresholds too low (many false positives)
- Use same thresholds for all labels
- Change thresholds without evaluation

### A/B Testing

✅ **DO:**
- Define success metrics before test
- Use statistically significant sample sizes
- Run tests for sufficient duration (1-2 weeks)
- Monitor both models in parallel

❌ **DON'T:**
- Switch models based on limited data
- Test too many models simultaneously
- Ignore user feedback during tests

### Monitoring

✅ **DO:**
- Set up automated drift checks (daily/weekly)
- Track key metrics in dashboards
- Alert on-call team for critical issues
- Review model performance monthly

❌ **DON'T:**
- Ignore drift alerts without investigation
- Wait for user complaints before checking metrics
- Skip logging and observability

---

## API Reference

### List All Models

```http
GET /q2q/registry/models
```

Response:
```json
{
  "success": true,
  "count": 4,
  "models": [...]
}
```

### Get Model by ID

```http
GET /q2q/registry/models/:id
```

### Activate Model

```http
POST /q2q/registry/models/:id/activate
```

### Deactivate Model

```http
POST /q2q/registry/models/:id/deactivate
```

### Get Active Model for Provider

```http
GET /q2q/registry/models/active/:provider
```

Parameters:
- `provider`: claude | openai | gemini

### Sync Models from YAML

```http
POST /q2q/registry/sync
```

### Get Drift Checks

```http
GET /q2q/drift/checks?limit=50
```

### Get Drift Alerts

```http
GET /q2q/drift/alerts?limit=20
```

---

## Troubleshooting

### Model Not Found After Sync

**Problem**: Model defined in YAML but not appearing in database.

**Solutions**:
1. Check YAML syntax is valid
2. Verify model ID is unique
3. Review sync logs for errors
4. Manually trigger sync: `POST /q2q/registry/sync`

### Multiple Active Models for Same Provider

**Problem**: More than one model marked as active for a provider.

**Solutions**:
1. Use activation endpoint to reset: `POST /q2q/registry/models/:id/activate`
2. Check for race conditions in concurrent requests
3. Verify database constraints are in place

### Drift Alerts Not Triggering

**Problem**: Expected drift but no alerts.

**Solutions**:
1. Check drift thresholds are set correctly
2. Verify baseline distribution is accurate
3. Ensure drift checks are running (check logs)
4. Review sample size (need sufficient data)

### Model Activation Fails

**Problem**: Activation endpoint returns error.

**Solutions**:
1. Verify model exists: `GET /q2q/registry/models/:id`
2. Check database connection
3. Review API logs for specific error
4. Ensure no locks on model_registry table

### Performance Degradation After Model Update

**Problem**: Metrics decreased after activating new model.

**Solutions**:
1. **Immediate**: Rollback to previous model
2. **Investigate**: Compare evaluation metrics
3. **Fix**: Adjust thresholds or retrain
4. **Prevent**: More thorough evaluation before activation

---

## Appendix: Database Schema

### model_registry Table

```sql
CREATE TABLE model_registry (
  id UUID PRIMARY KEY,
  model_id VARCHAR(100) UNIQUE NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model_name VARCHAR(100) NOT NULL,
  prompt_version VARCHAR(20) NOT NULL,
  thresholds JSONB NOT NULL,
  effective_from TIMESTAMP NOT NULL,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### drift_checks Table

```sql
CREATE TABLE drift_checks (
  id UUID PRIMARY KEY,
  check_date TIMESTAMP DEFAULT NOW(),
  label VARCHAR(50) NOT NULL,
  language VARCHAR(10) NOT NULL,
  psi_score DECIMAL(6, 4),
  js_score DECIMAL(6, 4),
  alert_triggered BOOLEAN DEFAULT false,
  baseline_distribution JSONB,
  current_distribution JSONB,
  sample_size DECIMAL(10, 0),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Further Reading

- [Q2Q Evaluation Report (Phase C)](../reports/q2q_eval_phaseC.md)
- [Platform Architecture](../Platform_Architecture.md)
- [AI Provider Documentation](https://docs.anthropic.com)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-13
**Maintained By**: NLP Lead - Worker 2
**Next Review**: 2025-12-13
