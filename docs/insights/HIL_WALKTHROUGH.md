# Human-in-the-Loop (HIL) Analytics Walkthrough

## Overview

The HIL system provides analysts with tools to adjudicate Q2Q predictions, analyze drift, and compare model versions in production.

**Service**: `q2q-ai`
**Base Path**: `/hil`

## Features

1. **Adjudication Queue**: Review and correct edge cases
2. **Drift Detection & RCA**: Monitor model performance
3. **Canary Comparison**: A/B test model versions

---

## 1. Adjudication Workflow

### Step 1: View Queue

Get pending adjudication items:

```bash
GET /hil/queue?status=pending&priority=high
```

**Response:**
```json
{
  "success": true,
  "queue": [
    {
      "id": "queue_123",
      "feedbackText": "The volunteering event was amazing!",
      "predictedOutcomes": {
        "engagement": 0.85,
        "satisfaction": 0.78
      },
      "confidence": 0.65,
      "modelVersion": "v2.1.0",
      "priority": "high",
      "reason": "low_confidence",
      "status": "pending"
    }
  ]
}
```

**Priority Levels:**
- `high`: Confidence < 0.7, affects critical metrics
- `medium`: Confidence 0.7-0.85, flagged by user
- `low`: Confidence 0.85-0.9, routine review

**Reasons:**
- `low_confidence`: Model uncertain
- `edge_case`: Rare pattern
- `drift_detected`: Drift alert triggered
- `manual_flag`: User flagged

### Step 2: Review & Adjudicate

Submit corrected outcomes:

```bash
POST /hil/adjudicate
```

**Request:**
```json
{
  "predictionId": "queue_123",
  "feedbackText": "The volunteering event was amazing!",
  "predictedOutcomes": {
    "engagement": 0.85,
    "satisfaction": 0.78
  },
  "humanOutcomes": {
    "engagement": 0.90,
    "satisfaction": 0.85,
    "environmental": 0.20
  },
  "decision": "modify",
  "adjudicatedBy": "analyst_456",
  "reason": "Model missed environmental outcome",
  "confidence": 0.65,
  "modelVersion": "v2.1.0",
  "writeToRegistry": true
}
```

**Decisions:**
- `approve`: Prediction correct, no changes
- `reject`: Prediction wrong, major errors
- `modify`: Prediction needs adjustment

**Response:**
```json
{
  "success": true,
  "decision": {
    "id": "adj_789",
    "adjudicatedAt": "2024-01-15T10:30:00Z",
    "writeToRegistry": true
  }
}
```

### Step 3: View Statistics

Track adjudication metrics:

```bash
GET /hil/stats?modelVersion=v2.1.0&startDate=2024-01-01
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "approved": 90,
    "rejected": 20,
    "modified": 40,
    "avgConfidence": 0.72,
    "topReasons": [
      { "reason": "Model missed environmental outcome", "count": 15 },
      { "reason": "Overestimated engagement", "count": 12 }
    ]
  }
}
```

---

## 2. Drift Detection & Root Cause Analysis

### Step 1: Detect Drift

Monitor model performance degradation:

```bash
POST /hil/drift/detect
```

**Request:**
```json
{
  "modelVersion": "v2.1.0",
  "timeWindowDays": 7,
  "baselineWindowDays": 30
}
```

**Response:**
```json
{
  "success": true,
  "driftDetected": true,
  "drift": {
    "id": "drift_456",
    "modelVersion": "v2.1.0",
    "detectedAt": "2024-01-15T12:00:00Z",
    "driftType": "concept_drift",
    "severity": "high",
    "affectedOutcomes": ["engagement", "satisfaction"],
    "metrics": {
      "accuracyDrop": 0.12,
      "confidenceDrop": 0.18,
      "predictionShift": 0.22
    },
    "sampleSize": 1245
  }
}
```

**Drift Types:**
- `concept_drift`: Underlying patterns changed (model confused)
- `data_drift`: Input distribution shifted
- `label_drift`: Output distribution changed

**Severity:**
- `critical`: Accuracy drop >20% or confidence drop >30%
- `high`: Accuracy drop >15% or confidence drop >20%
- `medium`: Accuracy drop >10% or confidence drop >15%
- `low`: Accuracy drop >5% or confidence drop >10%

### Step 2: Analyze Root Causes

Get actionable insights:

```bash
POST /hil/drift/analyze
```

**Request:**
```json
{
  "driftId": "drift_456"
}
```

**Response:**
```json
{
  "success": true,
  "rca": {
    "driftId": "drift_456",
    "rootCauses": [
      {
        "category": "training_data_staleness",
        "description": "Training data is 120 days old. Model may not reflect recent patterns.",
        "confidence": 0.8,
        "evidenceCount": 1
      },
      {
        "category": "new_patterns",
        "description": "New feedback patterns detected that were not present in training data.",
        "confidence": 0.75,
        "evidenceCount": 3
      }
    ],
    "recommendations": [
      {
        "action": "Retrain model with recent data (last 90 days)",
        "priority": "high",
        "estimatedImpact": "Expected to recover 60-80% of accuracy drop"
      },
      {
        "action": "Augment training data with new pattern samples",
        "priority": "high",
        "estimatedImpact": "Should improve coverage of edge cases"
      },
      {
        "action": "Increase adjudication queue priority for affected outcomes",
        "priority": "medium",
        "estimatedImpact": "Provides human oversight while retraining"
      }
    ]
  }
}
```

**Root Cause Categories:**
- `training_data_staleness`: Model trained on old data
- `feature_distribution_change`: Input patterns shifted
- `label_inconsistency`: Labeling standards changed
- `new_patterns`: Novel scenarios not in training
- `seasonal_variation`: Cyclical patterns
- `external_event`: Major event caused shift

---

## 3. Canary Comparison

### Compare Model Versions

A/B test new model against baseline:

```bash
POST /hil/canary/compare
```

**Request:**
```json
{
  "baselineVersion": "v2.1.0",
  "canaryVersion": "v3.0.0",
  "timeWindowHours": 24,
  "minSampleSize": 100
}
```

**Response:**
```json
{
  "success": true,
  "comparison": {
    "id": "canary_789",
    "baselineVersion": "v2.1.0",
    "canaryVersion": "v3.0.0",
    "comparedAt": "2024-01-15T14:00:00Z",
    "trafficSplit": {
      "baseline": 90,
      "canary": 10
    },
    "sampleSize": {
      "baseline": 1850,
      "canary": 205
    },
    "metrics": {
      "baseline": {
        "accuracy": 0.78,
        "avgConfidence": 0.75,
        "p95Latency": 450,
        "errorRate": 0.02
      },
      "canary": {
        "accuracy": 0.85,
        "avgConfidence": 0.82,
        "p95Latency": 380,
        "errorRate": 0.01
      },
      "delta": {
        "accuracy": 0.07,
        "avgConfidence": 0.07,
        "p95Latency": -70,
        "errorRate": -0.01
      }
    },
    "recommendation": "promote_canary",
    "confidence": 0.85
  }
}
```

**Recommendations:**
- `promote_canary`: Canary outperforms baseline significantly
- `keep_baseline`: Baseline is better
- `continue_testing`: Need more data

**Decision Criteria:**
- Accuracy improvement >2%
- Confidence improvement >5%
- Latency reduction >100ms
- Error rate reduction >1%
- Sample size ≥100 per version

---

## Best Practices

### Adjudication

1. **Prioritize high-impact items**: Focus on `high` priority first
2. **Be consistent**: Use same labeling standards
3. **Add context**: Provide clear reasons for modifications
4. **Enable write-back**: Set `writeToRegistry: true` for retraining

### Drift Monitoring

1. **Run weekly**: Check for drift every 7 days
2. **Set alerts**: Monitor `critical` and `high` severity
3. **Act quickly**: Address drift within 48 hours
4. **Document causes**: Track patterns in root causes

### Canary Testing

1. **Start small**: Begin with 5-10% traffic split
2. **Ramp gradually**: Increase by 10-20% every 24 hours
3. **Monitor closely**: Check metrics hourly during ramp
4. **Have rollback plan**: Keep baseline ready

---

## UI Workflow

### Adjudication Console

```
┌─────────────────────────────────────────────────┐
│ Adjudication Queue                        [?] │
├─────────────────────────────────────────────────┤
│ Filters: [High Priority ▼] [Pending ▼]        │
│                                                 │
│ ┌───────────────────────────────────────────┐   │
│ │ 🔴 HIGH Priority - Low Confidence         │   │
│ │ Feedback: "The volunteering event was..."│   │
│ │                                           │   │
│ │ Predicted:                                │   │
│ │   Engagement: ████████░░ 0.85             │   │
│ │   Satisfaction: ███████░░░ 0.78           │   │
│ │                                           │   │
│ │ Confidence: ██████░░░░ 0.65               │   │
│ │                                           │   │
│ │ Your Corrections:                         │   │
│ │ [Engagement: 0.90] [+Environmental: 0.20] │   │
│ │                                           │   │
│ │ Reason: [Model missed environmental...]   │   │
│ │                                           │   │
│ │ [Approve] [Modify] [Reject]               │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

### Drift Dashboard

```
┌─────────────────────────────────────────────────┐
│ Drift Monitor - v2.1.0                    [↻] │
├─────────────────────────────────────────────────┤
│ ⚠️  HIGH Severity Drift Detected              │
│ Type: Concept Drift | Detected: 2hr ago       │
│                                                 │
│ Metrics:                                        │
│   Accuracy Drop:    ▼ 12%                      │
│   Confidence Drop:  ▼ 18%                      │
│   Prediction Shift: ▲ 22%                      │
│                                                 │
│ Affected Outcomes:                              │
│   • Engagement                                  │
│   • Satisfaction                                │
│                                                 │
│ [Analyze Root Causes]                           │
│                                                 │
│ Root Causes:                                    │
│   1. Training data staleness (120 days)        │
│   2. New feedback patterns detected            │
│                                                 │
│ Recommendations:                                │
│   ✓ Retrain with last 90 days                  │
│   ✓ Augment training data                      │
│   ✓ Increase adjudication priority             │
│                                                 │
│ [Create Retraining Task]                        │
└─────────────────────────────────────────────────┘
```

---

## Support

For HIL platform questions:
- Email: ml-ops@teei.com
- Slack: #hil-analytics
- Docs: https://docs.teei.com/insights/hil
