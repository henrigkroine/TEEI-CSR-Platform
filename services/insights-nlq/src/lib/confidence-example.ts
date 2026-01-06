/**
 * Example usage of ConfidenceScorer and ConfidenceExplainer
 *
 * This demonstrates how to use the confidence scoring system for NLQ answers.
 */

import { ConfidenceScorer, type ConfidenceInputs } from './confidence-scorer.js';
import { ConfidenceExplainer } from './confidence-explainer.js';

// Example 1: High Confidence Query
const highConfidenceInputs: ConfidenceInputs = {
  intentConfidence: 0.95,
  dataMetrics: {
    actualDataPoints: 100,
    expectedDataPoints: 100,
    hasMissingValues: false,
    fieldCompleteness: 1.0,
  },
  sampleMetrics: {
    sampleSize: 1234,
    minViableSampleSize: 30,
  },
  recencyMetrics: {
    mostRecentDate: new Date('2025-11-15'),
    oldestDate: new Date('2025-10-15'),
    queryTimestamp: new Date('2025-11-16'),
  },
  ambiguityMetrics: {
    multipleTemplateMatches: false,
    assumptionCount: 0,
    usedDefaultValues: false,
    parameterExtractionConfidence: 0.95,
  },
};

const scorer = new ConfidenceScorer();
const highScore = scorer.calculate(highConfidenceInputs);
const highExplanation = ConfidenceExplainer.explain(highScore, highConfidenceInputs);

console.log('=== HIGH CONFIDENCE EXAMPLE ===');
console.log('Overall Score:', highScore.overall.toFixed(2));
console.log('Level:', highScore.level);
console.log('Summary:', highExplanation.summary);
console.log('Indicator:', highExplanation.indicator);
console.log('');

// Example 2: Medium Confidence Query
const mediumConfidenceInputs: ConfidenceInputs = {
  intentConfidence: 0.75,
  dataMetrics: {
    actualDataPoints: 80,
    expectedDataPoints: 100,
    hasMissingValues: true,
    fieldCompleteness: 0.85,
  },
  sampleMetrics: {
    sampleSize: 150,
    minViableSampleSize: 30,
  },
  recencyMetrics: {
    mostRecentDate: new Date('2025-10-16'),
    oldestDate: new Date('2025-09-16'),
    queryTimestamp: new Date('2025-11-16'),
  },
  ambiguityMetrics: {
    multipleTemplateMatches: false,
    assumptionCount: 2,
    usedDefaultValues: true,
    parameterExtractionConfidence: 0.8,
  },
};

const mediumScore = scorer.calculate(mediumConfidenceInputs);
const mediumExplanation = ConfidenceExplainer.explain(mediumScore, mediumConfidenceInputs);

console.log('=== MEDIUM CONFIDENCE EXAMPLE ===');
console.log('Overall Score:', mediumScore.overall.toFixed(2));
console.log('Level:', mediumScore.level);
console.log('Summary:', mediumExplanation.summary);
console.log('Recommendations:', mediumExplanation.recommendations);
console.log('');

// Example 3: Low Confidence Query
const lowConfidenceInputs: ConfidenceInputs = {
  intentConfidence: 0.45,
  dataMetrics: {
    actualDataPoints: 20,
    expectedDataPoints: 100,
    hasMissingValues: true,
    fieldCompleteness: 0.5,
  },
  sampleMetrics: {
    sampleSize: 15,
    minViableSampleSize: 30,
  },
  recencyMetrics: {
    mostRecentDate: new Date('2024-11-16'),
    oldestDate: new Date('2024-10-16'),
    queryTimestamp: new Date('2025-11-16'),
  },
  ambiguityMetrics: {
    multipleTemplateMatches: true,
    assumptionCount: 5,
    usedDefaultValues: true,
    parameterExtractionConfidence: 0.3,
  },
};

const lowScore = scorer.calculate(lowConfidenceInputs);
const lowExplanation = ConfidenceExplainer.explain(lowScore, lowConfidenceInputs);

console.log('=== LOW CONFIDENCE EXAMPLE ===');
console.log('Overall Score:', lowScore.overall.toFixed(2));
console.log('Level:', lowScore.level);
console.log('Summary:', lowExplanation.summary);
console.log('Details:', lowExplanation.details);
console.log('Recommendations:');
lowExplanation.recommendations.forEach((rec, i) => {
  console.log(`  ${i + 1}. ${rec}`);
});
