/**
 * Confidence Explainer
 *
 * Generates human-readable explanations of confidence scores to help users
 * understand why an answer has a particular confidence level and what they
 * can do to improve it.
 */

import type { ConfidenceScore, ConfidenceInputs } from './confidence-scorer.js';

export interface ConfidenceExplanation {
  /** Short summary (1 sentence) */
  summary: string;

  /** Detailed explanation (2-3 sentences) */
  details: string;

  /** Component explanations */
  components: {
    intent: string;
    dataCompleteness: string;
    sampleSize: string;
    recency: string;
    ambiguity: string;
  };

  /** Visual indicator for UI */
  indicator: {
    color: 'green' | 'yellow' | 'red';
    icon: '✓' | '⚠' | '✗';
    label: string;
  };

  /** User-facing recommendations */
  recommendations: string[];
}

/**
 * Confidence Explainer
 */
export class ConfidenceExplainer {
  /**
   * Generate human-readable explanation for a confidence score
   */
  static explain(score: ConfidenceScore, inputs: ConfidenceInputs): ConfidenceExplanation {
    const summary = this.generateSummary(score, inputs);
    const details = this.generateDetails(score, inputs);
    const components = this.generateComponentExplanations(score, inputs);
    const indicator = this.generateIndicator(score);

    return {
      summary,
      details,
      components,
      indicator,
      recommendations: score.recommendations,
    };
  }

  /**
   * Generate short summary (1 sentence)
   */
  private static generateSummary(score: ConfidenceScore, inputs: ConfidenceInputs): string {
    const { overall, level } = score;
    const { sampleSize } = inputs.sampleMetrics;
    const daysSinceRecent = this.daysBetween(inputs.recencyMetrics.mostRecentDate, inputs.recencyMetrics.queryTimestamp);

    const percentConfidence = Math.round(overall * 100);

    if (level === 'high') {
      return `High confidence (${percentConfidence}%): Based on ${sampleSize.toLocaleString()} data points from the last ${Math.round(daysSinceRecent)} days with complete coverage.`;
    } else if (level === 'medium') {
      return `Medium confidence (${percentConfidence}%): Based on ${sampleSize.toLocaleString()} data points with some limitations.`;
    } else {
      return `Low confidence (${percentConfidence}%): Limited data or unclear query - results may not be reliable.`;
    }
  }

  /**
   * Generate detailed explanation (2-3 sentences)
   */
  private static generateDetails(score: ConfidenceScore, inputs: ConfidenceInputs): string {
    const parts: string[] = [];

    // Intent explanation
    if (score.components.intentConfidence >= 0.85) {
      parts.push('Your query was clearly understood and matched a known metric template.');
    } else if (score.components.intentConfidence >= 0.65) {
      parts.push('Your query was understood with some minor ambiguity.');
    } else {
      parts.push('Your query was unclear or ambiguous - consider rephrasing for better results.');
    }

    // Data quality explanation
    const dataQuality = this.getDataQualityDescription(score, inputs);
    if (dataQuality) {
      parts.push(dataQuality);
    }

    // Sample size explanation
    const sampleQuality = this.getSampleQualityDescription(score, inputs);
    if (sampleQuality) {
      parts.push(sampleQuality);
    }

    return parts.join(' ');
  }

  /**
   * Generate component-specific explanations
   */
  private static generateComponentExplanations(score: ConfidenceScore, inputs: ConfidenceInputs): ConfidenceExplanation['components'] {
    return {
      intent: this.explainIntent(score.components.intentConfidence, inputs),
      dataCompleteness: this.explainDataCompleteness(score.components.dataCompleteness, inputs),
      sampleSize: this.explainSampleSize(score.components.sampleSizeScore, inputs),
      recency: this.explainRecency(score.components.recencyScore, inputs),
      ambiguity: this.explainAmbiguity(score.components.ambiguityPenalty, inputs),
    };
  }

  /**
   * Explain intent confidence
   */
  private static explainIntent(intentScore: number, inputs: ConfidenceInputs): string {
    const percentage = Math.round(intentScore * 100);

    if (intentScore >= 0.85) {
      return `${percentage}% - Excellent match to known metric template`;
    } else if (intentScore >= 0.70) {
      return `${percentage}% - Good match with minor ambiguity`;
    } else if (intentScore >= 0.50) {
      return `${percentage}% - Moderate match, may need clarification`;
    } else {
      return `${percentage}% - Poor match, query likely needs rephrasing`;
    }
  }

  /**
   * Explain data completeness
   */
  private static explainDataCompleteness(completenessScore: number, inputs: ConfidenceInputs): string {
    const { actualDataPoints, expectedDataPoints, hasMissingValues } = inputs.dataMetrics;
    const percentage = Math.round(completenessScore * 100);
    const coverage = Math.round((actualDataPoints / Math.max(expectedDataPoints, 1)) * 100);

    let explanation = `${percentage}% - Found ${actualDataPoints} of ${expectedDataPoints} expected data points (${coverage}% coverage)`;

    if (hasMissingValues) {
      explanation += ', some fields incomplete';
    }

    return explanation;
  }

  /**
   * Explain sample size
   */
  private static explainSampleSize(sampleScore: number, inputs: ConfidenceInputs): string {
    const { sampleSize, minViableSampleSize } = inputs.sampleMetrics;
    const percentage = Math.round(sampleScore * 100);

    if (sampleSize === 0) {
      return '0% - No data found';
    }

    if (sampleSize < minViableSampleSize) {
      return `${percentage}% - Sample size (${sampleSize.toLocaleString()}) below minimum viable (${minViableSampleSize.toLocaleString()})`;
    }

    if (sampleScore >= 0.85) {
      return `${percentage}% - Excellent sample size (${sampleSize.toLocaleString()} items) for statistical reliability`;
    } else if (sampleScore >= 0.65) {
      return `${percentage}% - Good sample size (${sampleSize.toLocaleString()} items)`;
    } else {
      return `${percentage}% - Small sample size (${sampleSize.toLocaleString()} items) - expand scope for better reliability`;
    }
  }

  /**
   * Explain recency
   */
  private static explainRecency(recencyScore: number, inputs: ConfidenceInputs): string {
    const daysSince = Math.round(this.daysBetween(inputs.recencyMetrics.mostRecentDate, inputs.recencyMetrics.queryTimestamp));
    const percentage = Math.round(recencyScore * 100);

    if (daysSince <= 7) {
      return `${percentage}% - Very fresh data (last updated ${daysSince} days ago)`;
    } else if (daysSince <= 30) {
      return `${percentage}% - Recent data (last updated ${daysSince} days ago)`;
    } else if (daysSince <= 90) {
      return `${percentage}% - Moderately recent data (last updated ${daysSince} days ago)`;
    } else if (daysSince <= 180) {
      return `${percentage}% - Somewhat dated data (last updated ${daysSince} days ago)`;
    } else {
      return `${percentage}% - Stale data (last updated ${daysSince} days ago) - consider more recent period`;
    }
  }

  /**
   * Explain ambiguity penalty
   */
  private static explainAmbiguity(ambiguityPenalty: number, inputs: ConfidenceInputs): string {
    const { multipleTemplateMatches, assumptionCount, usedDefaultValues, parameterExtractionConfidence } = inputs.ambiguityMetrics;
    const clarity = Math.round((1 - ambiguityPenalty) * 100);

    const issues: string[] = [];

    if (multipleTemplateMatches) {
      issues.push('multiple template matches');
    }

    if (assumptionCount > 0) {
      issues.push(`${assumptionCount} assumption${assumptionCount > 1 ? 's' : ''} made`);
    }

    if (usedDefaultValues) {
      issues.push('used default values');
    }

    if (parameterExtractionConfidence < 0.7) {
      issues.push('low parameter extraction confidence');
    }

    if (issues.length === 0) {
      return `${clarity}% - Crystal clear query, no ambiguity`;
    } else {
      return `${clarity}% - Some ambiguity detected (${issues.join(', ')})`;
    }
  }

  /**
   * Generate visual indicator
   */
  private static generateIndicator(score: ConfidenceScore): ConfidenceExplanation['indicator'] {
    if (score.level === 'high') {
      return {
        color: 'green',
        icon: '✓',
        label: 'High Confidence',
      };
    } else if (score.level === 'medium') {
      return {
        color: 'yellow',
        icon: '⚠',
        label: 'Medium Confidence',
      };
    } else {
      return {
        color: 'red',
        icon: '✗',
        label: 'Low Confidence',
      };
    }
  }

  /**
   * Get data quality description
   */
  private static getDataQualityDescription(score: ConfidenceScore, inputs: ConfidenceInputs): string | null {
    const { actualDataPoints, expectedDataPoints, hasMissingValues } = inputs.dataMetrics;

    if (score.components.dataCompleteness >= 0.85) {
      return 'Data coverage is excellent with minimal gaps.';
    } else if (score.components.dataCompleteness >= 0.65) {
      if (hasMissingValues) {
        return 'Data coverage is good, though some fields are incomplete.';
      } else {
        return 'Data coverage is acceptable.';
      }
    } else {
      const coverage = Math.round((actualDataPoints / Math.max(expectedDataPoints, 1)) * 100);
      return `Data coverage is limited (${coverage}% of expected points found).`;
    }
  }

  /**
   * Get sample quality description
   */
  private static getSampleQualityDescription(score: ConfidenceScore, inputs: ConfidenceInputs): string | null {
    const { sampleSize, minViableSampleSize } = inputs.sampleMetrics;

    if (sampleSize === 0) {
      return 'No data samples found for this query.';
    }

    if (sampleSize < minViableSampleSize) {
      return `Sample size (${sampleSize.toLocaleString()}) is too small for reliable statistics.`;
    }

    if (score.components.sampleSizeScore >= 0.85) {
      return `Sample size (${sampleSize.toLocaleString()}) is excellent for statistical analysis.`;
    } else if (score.components.sampleSizeScore < 0.65) {
      return `Sample size (${sampleSize.toLocaleString()}) is modest - consider expanding scope.`;
    }

    return null;
  }

  /**
   * Calculate days between two dates
   */
  private static daysBetween(date1: Date, date2: Date): number {
    const msPerDay = 1000 * 60 * 60 * 24;
    return Math.abs((date2.getTime() - date1.getTime()) / msPerDay);
  }
}
