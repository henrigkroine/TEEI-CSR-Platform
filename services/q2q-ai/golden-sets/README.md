# Golden Sets for Q2Q AI Evaluation

This directory contains golden sets (ground truth datasets) for evaluating Q2Q AI classifier performance across multiple languages.

## Overview

Golden sets are carefully curated and human-labeled feedback samples that serve as benchmarks for model evaluation. Each sample includes:

- Original feedback text
- Detected locale
- Ground truth labels (human-verified)
- Confidence scores for each dimension

## Datasets

### English (`en_feedback.jsonl`)
- **Sample count**: 20+ examples
- **Coverage**: All label dimensions (confidence, belonging, employability, risk)
- **Language complexity**: Low to high
- **Use case**: Baseline evaluation for English-language models

### Ukrainian (`uk_feedback.jsonl`)
- **Sample count**: 25+ examples
- **Coverage**: Full label taxonomy with Cyrillic text
- **Language complexity**: Low to high
- **Use case**: Evaluate model performance on Ukrainian (Українська) feedback
- **Special considerations**: Cyrillic character handling, cultural context

### Norwegian (`no_feedback.jsonl`)
- **Sample count**: 25+ examples
- **Coverage**: Full label taxonomy with Norwegian characters (æ, ø, å)
- **Language complexity**: Low to high
- **Use case**: Evaluate model performance on Norwegian (Norsk) feedback
- **Special considerations**: Norwegian-specific characters, grammar patterns

## File Format

Each line in the `.jsonl` files is a JSON object with the following structure:

```json
{
  "id": "uk-001",
  "text": "Original feedback text in target language",
  "locale": "uk",
  "labels": [
    {"dimension": "confidence", "score": 0.9},
    {"dimension": "belonging", "score": 0.7}
  ],
  "ground_truth": {
    "confidence_increase": true,
    "confidence_decrease": false,
    "belonging_increase": true,
    "belonging_decrease": false,
    "language_comfort": "medium",
    "employability_signals": ["job_search"],
    "risk_cues": []
  }
}
```

## Usage

### Loading Golden Sets

```typescript
import fs from 'fs/promises';

// Load a golden set
async function loadGoldenSet(locale: string) {
  const content = await fs.readFile(`./golden-sets/${locale}_feedback.jsonl`, 'utf-8');
  const samples = content
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line));

  return samples;
}

// Usage
const ukSamples = await loadGoldenSet('uk');
console.log(`Loaded ${ukSamples.length} Ukrainian samples`);
```

### Running Evaluation

```typescript
import { evaluateAllLanguages, checkFairnessParity } from './eval/multilingual.js';
import { runClassifier } from './classifier.js';

// Load golden set
const goldenSamples = await loadGoldenSet('uk');

// Generate predictions
const evalDataset = await Promise.all(
  goldenSamples.map(async (sample) => ({
    text: sample.text,
    groundTruth: sample.ground_truth,
    prediction: await runClassifier(sample.text, sample.locale),
    language: sample.locale
  }))
);

// Evaluate
const evaluations = evaluateAllLanguages(evalDataset);
const fairnessReport = checkFairnessParity(evaluations);

console.log(fairnessReport.summary);
```

### Comparing Across Locales

```typescript
// Load all golden sets
const allSamples = await Promise.all([
  loadGoldenSet('en'),
  loadGoldenSet('uk'),
  loadGoldenSet('no')
]);

const evalDataset = allSamples.flat().map(async (sample) => ({
  text: sample.text,
  groundTruth: sample.ground_truth,
  prediction: await runClassifier(sample.text, sample.locale),
  language: sample.locale
}));

// Generate comprehensive report
const report = generateComprehensiveReport(await Promise.all(evalDataset));
console.log(report);
```

## Label Distribution

### Confidence Dimensions
- **Increase**: Expressions of growing self-confidence
- **Decrease**: Expressions of self-doubt or declining confidence

### Belonging Dimensions
- **Increase**: Feeling connected, supported, part of community
- **Decrease**: Isolation, disconnection, lack of support

### Language Comfort Levels
- **Low**: Simple vocabulary, basic grammar, frequent errors
- **Medium**: Moderate complexity, occasional errors
- **High**: Rich vocabulary, complex sentences, few errors

### Employability Signals
- Job search activity
- Skills development
- Networking
- Resume/CV work
- Interview preparation
- Certifications
- Portfolio building
- Career planning

### Risk Indicators
- Isolation
- Frustration
- Disengagement
- Anxiety
- Dropout indication
- Confusion
- Negative self-talk
- Lack of support

## Quality Standards

All golden set samples must meet these criteria:

1. **Authenticity**: Realistic learner feedback (not artificially generated)
2. **Clarity**: Labels are unambiguous and agreed upon by multiple annotators
3. **Coverage**: Balanced distribution across all dimensions
4. **Diversity**: Range of language complexity levels
5. **Cultural Relevance**: Appropriate context for target locale

## Expansion Guidelines

When adding new samples to golden sets:

### 1. Source Selection
- Prioritize real learner feedback (anonymized)
- Ensure diverse sources (check-ins, surveys, support tickets)
- Cover edge cases and ambiguous examples

### 2. Annotation Process
- Minimum 2 annotators per sample
- Inter-annotator agreement (Cohen's Kappa) ≥ 0.7
- Resolve disagreements via discussion or third annotator
- Document rationale for complex cases

### 3. Evidence Requirement
- Highlight specific text supporting each label
- Explain reasoning in annotation metadata
- Flag ambiguous samples for potential exclusion

### 4. Validation
```typescript
// Validate new samples before adding
function validateGoldenSample(sample: any): boolean {
  // Check required fields
  if (!sample.id || !sample.text || !sample.locale || !sample.ground_truth) {
    return false;
  }

  // Check label consistency
  const gt = sample.ground_truth;
  if (gt.confidence_increase && gt.confidence_decrease) {
    console.warn(`Inconsistent confidence labels: ${sample.id}`);
    return false;
  }

  if (gt.belonging_increase && gt.belonging_decrease) {
    console.warn(`Inconsistent belonging labels: ${sample.id}`);
    return false;
  }

  return true;
}
```

### 5. Balance Check
```typescript
// Ensure balanced label distribution
function checkBalance(samples: any[]): void {
  const positiveCount = samples.filter(s => s.ground_truth.confidence_increase).length;
  const negativeCount = samples.filter(s => s.ground_truth.confidence_decrease).length;

  const ratio = positiveCount / samples.length;

  if (ratio < 0.2 || ratio > 0.8) {
    console.warn(`Imbalanced dataset: ${ratio * 100}% positive samples`);
  }
}
```

## Evaluation Metrics

Golden sets enable calculation of:

- **Accuracy**: Overall prediction correctness
- **Precision**: True positives / (True positives + False positives)
- **Recall**: True positives / (True positives + False negatives)
- **F1 Score**: Harmonic mean of precision and recall
- **Fairness Parity**: Accuracy gap across languages (target: < 5%)

## Maintenance Schedule

- **Quarterly Review**: Add new samples, remove outdated ones
- **Annual Audit**: Re-annotate subset to check label stability
- **Continuous**: Add samples from active learning queue after verification

## References

- [Labeling Contracts](../src/labeling/contracts.yaml) - Annotation guidelines
- [Multilingual Eval](../src/eval/multilingual.ts) - Evaluation functions
- [Active Learning Queue](../src/labeling/active-queue.ts) - Sample selection

## Version History

- **v1.0** (2025-11-15): Initial golden sets for EN, UK, NO
  - 20 EN samples
  - 25 UK samples
  - 25 NO samples
  - Full label taxonomy coverage
  - Inter-annotator agreement: 0.85+ (Cohen's Kappa)
