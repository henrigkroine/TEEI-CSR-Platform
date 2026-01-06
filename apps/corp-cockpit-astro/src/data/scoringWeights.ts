/**
 * Experience Blueprint scoring tokens
 *
 * Centralizes weights + thresholds so UI cards, charts, and badges stay in sync.
 */

export type ScoreBracket = 'excellent' | 'strong' | 'moderate' | 'weak';

export interface ScoringWeights {
  compositeWeights: {
    strategicFit: number;
    interpretiveFit: number;
  };
  componentWeights: Record<string, number>;
  thresholds: Record<ScoreBracket, number>;
  priorityThresholds: {
    high: number;
    medium: number;
    low: number;
  };
  programClusterWeights: Record<string, number>;
}

export const scoringWeights: ScoringWeights = {
  compositeWeights: {
    strategicFit: 0.67,
    interpretiveFit: 0.33,
  },
  componentWeights: {
    semantic_similarity: 0.4,
    rule_based: 0.25,
    narrative_support: 0.2,
    compliance_controls: 0.1,
    anomaly_watch: 0.05,
  },
  thresholds: {
    excellent: 80,
    strong: 65,
    moderate: 50,
    weak: 35,
  },
  priorityThresholds: {
    high: 70,
    medium: 40,
    low: 0,
  },
  programClusterWeights: {
    'Upskilling Ukraine': 0.24,
    'WEEI Mobility': 0.2,
    'STEM Equity': 0.18,
    'Immigrant Integration': 0.16,
    'Youth Workforce': 0.12,
    'Climate Resilience': 0.1,
  },
};

export function classifyScore(score: number): ScoreBracket {
  if (score >= scoringWeights.thresholds.excellent) return 'excellent';
  if (score >= scoringWeights.thresholds.strong) return 'strong';
  if (score >= scoringWeights.thresholds.moderate) return 'moderate';
  return 'weak';
}

export function getPriority(score: number): 'high' | 'medium' | 'low' {
  if (score >= scoringWeights.priorityThresholds.high) return 'high';
  if (score >= scoringWeights.priorityThresholds.medium) return 'medium';
  return 'low';
}



