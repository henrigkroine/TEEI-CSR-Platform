# Active Learning System for Q2Q AI

This directory contains the active learning infrastructure for human-in-the-loop labeling of Q2Q AI predictions.

## Overview

The active learning system implements uncertainty-based sampling to identify predictions that would benefit most from human review. By prioritizing low-confidence, high-uncertainty samples, we can efficiently improve model performance with minimal labeling effort.

## Components

### 1. Active Queue (`active-queue.ts`)

The core module implementing active learning strategies:

#### Uncertainty Sampling Strategies

- **Confidence-based**: Selects predictions with overall confidence below a threshold (default: 0.7)
- **Margin-based**: Selects predictions where the difference between top-2 probabilities is small (default: < 0.15)
- **Entropy-based**: Selects predictions with high entropy (uncertainty) in probability distributions
- **Diversity-based**: Uses embedding distance to avoid selecting redundant samples

#### Key Functions

```typescript
// Calculate uncertainty metrics
const uncertainty = calculateUncertainty(classification);
// Returns: { confidence, entropy, marginScore }

// Calculate diversity score
const diversity = calculateDiversity(embedding, existingEmbeddings);
// Returns: 0-1 score (higher = more diverse)

// Calculate priority score
const priority = calculatePriorityScore(uncertainty, diversity, config);
// Returns: 0-1 score (higher = higher priority for review)
```

#### Usage Example

```typescript
import { ActiveLearningQueue } from './labeling/active-queue.js';

// Create queue with configuration
const queue = new ActiveLearningQueue({
  maxQueueSize: 1000,
  confidenceThreshold: 0.7,
  marginThreshold: 0.15,
  diversityWeight: 0.3,
  batchSize: 50,
  tenantSpecific: true
});

// Add samples automatically
const added = queue.createAndAddSample(
  'sample-123',
  'Learner feedback text...',
  classificationOutput,
  'en',
  {
    tenantId: 'tenant-A',
    embedding: [0.5, 0.3, 0.2],
    metadata: { source: 'check-in' }
  }
);

// Get highest priority samples for review
const batch = queue.getBatch(20, 'tenant-A');

// Mark as labeled after human review
queue.markAsLabeled('sample-123', groundTruthLabels, 'annotator-42');

// Get queue statistics
const stats = queue.getStats();
console.log(`Queue size: ${stats.totalSize}`);
console.log(`Avg confidence: ${stats.avgConfidence}`);
```

#### Priority Calculation

Priority score combines multiple factors:

```
priority = (1 - diversityWeight) * uncertaintyScore + diversityWeight * diversityScore

where uncertaintyScore =
  0.4 * (1 - confidence) +
  0.3 * normalizedEntropy +
  0.3 * (1 - marginScore)
```

### 2. Labeling Contracts (`contracts.yaml`)

YAML schema defining the human annotation interface and quality requirements:

- **Input fields**: What annotators see (feedback text, language, model prediction)
- **Outcome labels**: Dimensions to annotate (confidence, belonging, language comfort, etc.)
- **Evidence attachment**: Required text excerpts supporting each label
- **Quality flags**: Issues to report (ambiguous, offensive, spam, etc.)
- **Quality checks**: Inter-annotator agreement, label consistency, completeness
- **Batch assignment**: Rules for distributing work to annotators

#### Key Sections

```yaml
outcome_labels:
  - dimension: confidence_increase
    type: boolean
    label: "Confidence Increase"
    description: "Does the feedback express increased self-confidence?"
    examples:
      - "I feel more confident about my abilities now"
    required: true

quality_checks:
  inter_annotator_agreement:
    enabled: true
    method: "cohens_kappa"
    minimum_overlap: 0.1
    target_kappa: 0.7

batch_assignment:
  batch_size: 20
  assignment_strategy: "round_robin"
  difficulty_levels:
    - level: easy
      criteria: "confidence >= 0.5 AND no quality_flags"
      assign_to: "junior_reviewers"
```

## Tenant-Specific Queues

The system supports isolated queues per tenant:

```typescript
const queue = new ActiveLearningQueue({
  tenantSpecific: true
});

// Samples are automatically segregated by tenantId
queue.createAndAddSample('s1', 'text', classification, 'en', {
  tenantId: 'acme-corp'
});

// Retrieve samples for specific tenant
const acmeBatch = queue.getBatch(20, 'acme-corp');
```

## Queue Persistence

Export and import queue state for persistence:

```typescript
// Export to JSON
const json = queue.exportQueue();
await fs.writeFile('queue-backup.json', json);

// Import from JSON
const json = await fs.readFile('queue-backup.json', 'utf-8');
queue.importQueue(json);
```

## Integration with Eval Pipeline

Active learning queue integrates with the multilingual evaluation system:

```typescript
import { evaluateAllLanguages } from '../eval/multilingual.js';
import { ActiveLearningQueue } from './active-queue.js';

// Run evaluation
const evaluations = evaluateAllLanguages(testDataset);

// Add low-performing samples to queue for re-labeling
for (const sample of testDataset) {
  if (sample.prediction.confidence < 0.7) {
    queue.createAndAddSample(
      sample.id,
      sample.text,
      sample.prediction,
      sample.language
    );
  }
}
```

## Best Practices

1. **Regular Queue Monitoring**: Check queue stats regularly to ensure balanced sampling
2. **Diversity Weighting**: Adjust `diversityWeight` based on queue size (higher for larger queues)
3. **Tenant Isolation**: Always use `tenantSpecific: true` in multi-tenant deployments
4. **Batch Size**: Keep batch size manageable (20-50 samples) to maintain annotator quality
5. **Quality Checks**: Monitor inter-annotator agreement and retrain when < 0.7
6. **Golden Set Updates**: Periodically add high-quality labeled samples to golden sets

## Monitoring Metrics

Track these metrics for queue health:

- **Queue size**: Should stay below max capacity
- **Average confidence**: Should be low (< 0.5) indicating good uncertainty sampling
- **Average priority**: Should be balanced across languages and tenants
- **Label distribution**: Ensure no single label dominates the queue
- **Time in queue**: Samples shouldn't stay pending > 72 hours

## Future Enhancements

- Active learning with model feedback loops
- Adaptive threshold tuning based on label budgets
- Multi-armed bandit sampling strategies
- Query-by-committee ensemble methods
- Cost-sensitive learning (weight different labels by impact)
