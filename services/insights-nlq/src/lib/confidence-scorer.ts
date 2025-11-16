/**
 * Confidence Scoring for NLQ Answers
 *
 * Calculates multi-factor confidence scores (0.0-1.0) to indicate data quality
 * and reliability of natural language query responses.
 *
 * Scoring Components:
 * - Intent Confidence (30%): How well we understood the question
 * - Data Completeness (25%): Percentage of expected data present
 * - Sample Size (20%): Larger samples = higher confidence
 * - Recency (15%): More recent data = higher confidence
 * - Ambiguity Penalty (10%): Penalize ambiguous/unclear queries
 */

export interface ConfidenceInputs {
  /**
   * Intent confidence from NLU/LLM (0.0-1.0)
   * - 1.0: Perfect match to known metric template
   * - 0.8-0.99: Good match with minor ambiguity
   * - 0.6-0.79: Moderate match, may need clarification
   * - <0.6: Poor match, likely needs rephrasing
   */
  intentConfidence: number;

  /**
   * Data completeness metrics
   */
  dataMetrics: {
    /** Number of data points returned */
    actualDataPoints: number;
    /** Expected number of data points (based on time range/grouping) */
    expectedDataPoints: number;
    /** Whether any data was missing/null */
    hasMissingValues: boolean;
    /** Percentage of records with complete fields (0.0-1.0) */
    fieldCompleteness: number;
  };

  /**
   * Sample size information
   */
  sampleMetrics: {
    /** Total sample size (e.g., number of participants, sessions, feedback items) */
    sampleSize: number;
    /** Minimum viable sample size for statistical significance */
    minViableSampleSize: number;
  };

  /**
   * Data recency information
   */
  recencyMetrics: {
    /** Timestamp of most recent data point */
    mostRecentDate: Date;
    /** Timestamp of oldest data point in result */
    oldestDate: Date;
    /** Query execution timestamp (now) */
    queryTimestamp: Date;
  };

  /**
   * Ambiguity indicators
   */
  ambiguityMetrics: {
    /** Did the query require multiple template matches? */
    multipleTemplateMatches: boolean;
    /** Number of assumptions made (e.g., default time range, inferred filters) */
    assumptionCount: number;
    /** Did we have to fall back to defaults? */
    usedDefaultValues: boolean;
    /** Confidence in parameter extraction (0.0-1.0) */
    parameterExtractionConfidence: number;
  };
}

export interface ConfidenceScore {
  /** Overall confidence score (0.0-1.0) */
  overall: number;

  /** Confidence level category */
  level: 'high' | 'medium' | 'low';

  /** Component scores (for transparency) */
  components: {
    intentConfidence: number;
    dataCompleteness: number;
    sampleSizeScore: number;
    recencyScore: number;
    ambiguityPenalty: number;
  };

  /** Weighted contributions (for explainability) */
  weights: {
    intentConfidence: number;
    dataCompleteness: number;
    sampleSizeScore: number;
    recencyScore: number;
    ambiguityPenalty: number;
  };

  /** Recommendations for improving confidence */
  recommendations: string[];
}

/**
 * Configuration for confidence scoring thresholds
 */
export interface ConfidenceConfig {
  /** Minimum score for "high" confidence */
  highThreshold: number;
  /** Minimum score for "medium" confidence */
  mediumThreshold: number;
  /** Weights for each component (must sum to 1.0) */
  weights: {
    intent: number;
    dataCompleteness: number;
    sampleSize: number;
    recency: number;
    ambiguity: number;
  };
  /** Sample size scoring parameters */
  sampleSizeParams: {
    /** Sample size for 100% confidence */
    optimalSampleSize: number;
    /** Minimum sample size for any confidence */
    minSampleSize: number;
  };
  /** Recency scoring parameters */
  recencyParams: {
    /** Data fresher than this gets 100% recency score (days) */
    freshDataThresholdDays: number;
    /** Data older than this gets 0% recency score (days) */
    staleDataThresholdDays: number;
  };
  /** Ambiguity penalty parameters */
  ambiguityParams: {
    /** Penalty per assumption made (0.0-1.0) */
    penaltyPerAssumption: number;
    /** Max penalty for ambiguity (0.0-1.0) */
    maxPenalty: number;
  };
}

/**
 * Default confidence scoring configuration
 */
export const DEFAULT_CONFIDENCE_CONFIG: ConfidenceConfig = {
  highThreshold: 0.85,
  mediumThreshold: 0.65,
  weights: {
    intent: 0.30,
    dataCompleteness: 0.25,
    sampleSize: 0.20,
    recency: 0.15,
    ambiguity: 0.10,
  },
  sampleSizeParams: {
    optimalSampleSize: 1000,
    minSampleSize: 30, // Standard statistical minimum
  },
  recencyParams: {
    freshDataThresholdDays: 30,
    staleDataThresholdDays: 365,
  },
  ambiguityParams: {
    penaltyPerAssumption: 0.15,
    maxPenalty: 0.50,
  },
};

/**
 * Confidence Scorer
 */
export class ConfidenceScorer {
  constructor(private config: ConfidenceConfig = DEFAULT_CONFIDENCE_CONFIG) {
    this.validateConfig();
  }

  /**
   * Calculate overall confidence score
   */
  calculate(inputs: ConfidenceInputs): ConfidenceScore {
    this.validateInputs(inputs);

    // Calculate component scores
    const intentScore = this.clamp(inputs.intentConfidence, 0, 1);
    const dataCompletenessScore = this.calculateDataCompleteness(inputs.dataMetrics);
    const sampleSizeScore = this.calculateSampleSizeScore(inputs.sampleMetrics);
    const recencyScore = this.calculateRecencyScore(inputs.recencyMetrics);
    const ambiguityPenalty = this.calculateAmbiguityPenalty(inputs.ambiguityMetrics);

    // Apply weighted formula
    const overall =
      intentScore * this.config.weights.intent +
      dataCompletenessScore * this.config.weights.dataCompleteness +
      sampleSizeScore * this.config.weights.sampleSize +
      recencyScore * this.config.weights.recency +
      (1 - ambiguityPenalty) * this.config.weights.ambiguity;

    // Clamp to [0, 1]
    const clampedOverall = this.clamp(overall, 0, 1);

    // Determine confidence level
    const level = this.determineConfidenceLevel(clampedOverall);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      intentScore,
      dataCompletenessScore,
      sampleSizeScore,
      recencyScore,
      ambiguityPenalty,
      inputs,
    });

    return {
      overall: clampedOverall,
      level,
      components: {
        intentConfidence: intentScore,
        dataCompleteness: dataCompletenessScore,
        sampleSizeScore,
        recencyScore,
        ambiguityPenalty,
      },
      weights: this.config.weights,
      recommendations,
    };
  }

  /**
   * Calculate data completeness score (0.0-1.0)
   */
  private calculateDataCompleteness(metrics: ConfidenceInputs['dataMetrics']): number {
    const { actualDataPoints, expectedDataPoints, hasMissingValues, fieldCompleteness } = metrics;

    // Data point coverage: actual / expected
    const dataPointCoverage = expectedDataPoints > 0
      ? Math.min(actualDataPoints / expectedDataPoints, 1.0)
      : 0.0;

    // Penalty for missing values
    const missingValuePenalty = hasMissingValues ? 0.1 : 0.0;

    // Combine: 60% data point coverage, 40% field completeness
    const score = (dataPointCoverage * 0.6) + (fieldCompleteness * 0.4) - missingValuePenalty;

    return this.clamp(score, 0, 1);
  }

  /**
   * Calculate sample size score (0.0-1.0)
   * Uses logarithmic scaling: diminishing returns after optimal sample size
   */
  private calculateSampleSizeScore(metrics: ConfidenceInputs['sampleMetrics']): number {
    const { sampleSize, minViableSampleSize } = metrics;
    const { optimalSampleSize, minSampleSize } = this.config.sampleSizeParams;

    // No data = 0 confidence
    if (sampleSize === 0) return 0.0;

    // Below minimum viable = low confidence
    if (sampleSize < minSampleSize) {
      return sampleSize / minSampleSize * 0.3; // Max 30% confidence
    }

    // Linear scaling from min to optimal
    if (sampleSize < optimalSampleSize) {
      const range = optimalSampleSize - minSampleSize;
      const position = sampleSize - minSampleSize;
      return 0.3 + (position / range) * 0.7; // Scale from 30% to 100%
    }

    // At or above optimal = 100% confidence
    return 1.0;
  }

  /**
   * Calculate recency score (0.0-1.0)
   * More recent data = higher confidence
   */
  private calculateRecencyScore(metrics: ConfidenceInputs['recencyMetrics']): number {
    const { mostRecentDate, queryTimestamp } = metrics;
    const { freshDataThresholdDays, staleDataThresholdDays } = this.config.recencyParams;

    // Calculate days since most recent data point
    const daysSinceRecent = this.daysBetween(mostRecentDate, queryTimestamp);

    // Fresh data = 100% confidence
    if (daysSinceRecent <= freshDataThresholdDays) {
      return 1.0;
    }

    // Stale data = 0% confidence
    if (daysSinceRecent >= staleDataThresholdDays) {
      return 0.0;
    }

    // Linear decay between fresh and stale thresholds
    const range = staleDataThresholdDays - freshDataThresholdDays;
    const position = daysSinceRecent - freshDataThresholdDays;
    return 1.0 - (position / range);
  }

  /**
   * Calculate ambiguity penalty (0.0-1.0)
   * Higher penalty = lower confidence in query understanding
   */
  private calculateAmbiguityPenalty(metrics: ConfidenceInputs['ambiguityMetrics']): number {
    const { multipleTemplateMatches, assumptionCount, usedDefaultValues, parameterExtractionConfidence } = metrics;
    const { penaltyPerAssumption, maxPenalty } = this.config.ambiguityParams;

    let penalty = 0.0;

    // Penalty for multiple template matches (ambiguous intent)
    if (multipleTemplateMatches) {
      penalty += 0.15;
    }

    // Penalty for each assumption made
    penalty += assumptionCount * penaltyPerAssumption;

    // Penalty for using default values (indicates missing parameters)
    if (usedDefaultValues) {
      penalty += 0.10;
    }

    // Penalty for low parameter extraction confidence
    penalty += (1 - parameterExtractionConfidence) * 0.20;

    // Cap at max penalty
    return this.clamp(penalty, 0, maxPenalty);
  }

  /**
   * Determine confidence level from overall score
   */
  private determineConfidenceLevel(score: number): 'high' | 'medium' | 'low' {
    if (score >= this.config.highThreshold) return 'high';
    if (score >= this.config.mediumThreshold) return 'medium';
    return 'low';
  }

  /**
   * Generate actionable recommendations to improve confidence
   */
  private generateRecommendations(context: {
    intentScore: number;
    dataCompletenessScore: number;
    sampleSizeScore: number;
    recencyScore: number;
    ambiguityPenalty: number;
    inputs: ConfidenceInputs;
  }): string[] {
    const recommendations: string[] = [];
    const { intentScore, dataCompletenessScore, sampleSizeScore, recencyScore, ambiguityPenalty, inputs } = context;

    // Intent recommendations
    if (intentScore < 0.7) {
      recommendations.push('Rephrase your question to be more specific (e.g., "What is our SROI for Q1 2025?")');
    }

    // Data completeness recommendations
    if (dataCompletenessScore < 0.7) {
      if (inputs.dataMetrics.hasMissingValues) {
        recommendations.push('Some data fields are incomplete - results may not reflect full picture');
      }
      if (inputs.dataMetrics.actualDataPoints < inputs.dataMetrics.expectedDataPoints * 0.5) {
        recommendations.push('Less than 50% of expected data points found - consider a different time range');
      }
    }

    // Sample size recommendations
    if (sampleSizeScore < 0.7) {
      const { sampleSize, minViableSampleSize } = inputs.sampleMetrics;
      if (sampleSize < minViableSampleSize) {
        recommendations.push(`Sample size (${sampleSize}) is below minimum viable (${minViableSampleSize}) - expand time range or scope`);
      } else {
        recommendations.push('Small sample size - consider expanding date range for more reliable results');
      }
    }

    // Recency recommendations
    if (recencyScore < 0.5) {
      const daysSince = this.daysBetween(inputs.recencyMetrics.mostRecentDate, inputs.recencyMetrics.queryTimestamp);
      recommendations.push(`Data is ${Math.round(daysSince)} days old - consider querying more recent period`);
    }

    // Ambiguity recommendations
    if (ambiguityPenalty > 0.3) {
      if (inputs.ambiguityMetrics.multipleTemplateMatches) {
        recommendations.push('Your question matched multiple metric types - be more specific about which metric you want');
      }
      if (inputs.ambiguityMetrics.assumptionCount > 2) {
        recommendations.push(`Made ${inputs.ambiguityMetrics.assumptionCount} assumptions - provide explicit time range and filters`);
      }
      if (inputs.ambiguityMetrics.parameterExtractionConfidence < 0.7) {
        recommendations.push('Had difficulty extracting query parameters - try using explicit dates and metric names');
      }
    }

    return recommendations;
  }

  /**
   * Validate configuration
   */
  private validateConfig(): void {
    const weightSum = Object.values(this.config.weights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(weightSum - 1.0) > 0.001) {
      throw new Error(`Confidence weights must sum to 1.0 (got ${weightSum})`);
    }

    if (this.config.highThreshold <= this.config.mediumThreshold) {
      throw new Error('High threshold must be greater than medium threshold');
    }

    if (this.config.mediumThreshold <= 0 || this.config.highThreshold > 1.0) {
      throw new Error('Thresholds must be between 0 and 1');
    }
  }

  /**
   * Validate inputs
   */
  private validateInputs(inputs: ConfidenceInputs): void {
    if (inputs.intentConfidence < 0 || inputs.intentConfidence > 1) {
      throw new Error('Intent confidence must be between 0 and 1');
    }

    if (inputs.dataMetrics.actualDataPoints < 0 || inputs.dataMetrics.expectedDataPoints < 0) {
      throw new Error('Data point counts cannot be negative');
    }

    if (inputs.dataMetrics.fieldCompleteness < 0 || inputs.dataMetrics.fieldCompleteness > 1) {
      throw new Error('Field completeness must be between 0 and 1');
    }

    if (inputs.sampleMetrics.sampleSize < 0 || inputs.sampleMetrics.minViableSampleSize < 0) {
      throw new Error('Sample sizes cannot be negative');
    }

    if (inputs.ambiguityMetrics.parameterExtractionConfidence < 0 || inputs.ambiguityMetrics.parameterExtractionConfidence > 1) {
      throw new Error('Parameter extraction confidence must be between 0 and 1');
    }
  }

  /**
   * Clamp value to [min, max]
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Calculate days between two dates
   */
  private daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.abs((date2.getTime() - date1.getTime()) / msPerDay);
  }
}
