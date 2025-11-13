import { describe, it, expect } from 'vitest';
import { calculateSROI } from './sroi.js';
import { SROI_WEIGHTS } from '../config/sroiWeights.js';

describe('SROI Calculator', () => {
  it('should calculate SROI with zero investment', () => {
    const result = calculateSROI({
      totalVolunteerHours: 0,
      programCosts: 0,
      integrationImprovement: 0.5,
      languageImprovement: 0.3,
      jobReadinessImprovement: 0.4,
      averageConfidence: 0.9,
    });

    expect(result.sroi_ratio).toBe(0);
    expect(result.breakdown.total_investment).toBe(0);
  });

  it('should calculate SROI with only volunteer hours', () => {
    const result = calculateSROI({
      totalVolunteerHours: 100,
      programCosts: 0,
      integrationImprovement: 0.5,
      languageImprovement: 0.3,
      jobReadinessImprovement: 0.4,
      averageConfidence: 0.9,
    });

    const expectedInvestment = 100 * SROI_WEIGHTS.volunteerHourValue;
    const expectedValue =
      0.5 * SROI_WEIGHTS.dimensionValues.integration +
      0.3 * SROI_WEIGHTS.dimensionValues.language +
      0.4 * SROI_WEIGHTS.dimensionValues.job_readiness;

    expect(result.breakdown.total_investment).toBe(
      parseFloat(expectedInvestment.toFixed(2))
    );
    expect(result.breakdown.total_social_value).toBe(parseFloat(expectedValue.toFixed(2)));
    expect(result.sroi_ratio).toBeGreaterThan(0);
  });

  it('should apply confidence discount when below threshold', () => {
    const highConfidence = calculateSROI({
      totalVolunteerHours: 100,
      programCosts: 0,
      integrationImprovement: 0.5,
      languageImprovement: 0.3,
      jobReadinessImprovement: 0.4,
      averageConfidence: 0.9, // Above threshold
    });

    const lowConfidence = calculateSROI({
      totalVolunteerHours: 100,
      programCosts: 0,
      integrationImprovement: 0.5,
      languageImprovement: 0.3,
      jobReadinessImprovement: 0.4,
      averageConfidence: 0.5, // Below threshold
    });

    // Low confidence should have discounted social value
    expect(lowConfidence.breakdown.total_social_value).toBeLessThan(
      highConfidence.breakdown.total_social_value
    );
    expect(lowConfidence.sroi_ratio).toBeLessThan(highConfidence.sroi_ratio);

    // Check discount factor is applied correctly
    const expectedDiscount =
      highConfidence.breakdown.total_social_value * SROI_WEIGHTS.confidenceDiscount;
    expect(lowConfidence.breakdown.total_social_value).toBeCloseTo(expectedDiscount, 2);
  });

  it('should include program costs in total investment', () => {
    const withoutCosts = calculateSROI({
      totalVolunteerHours: 100,
      programCosts: 0,
      integrationImprovement: 0.5,
      languageImprovement: 0.3,
      jobReadinessImprovement: 0.4,
      averageConfidence: 0.9,
    });

    const withCosts = calculateSROI({
      totalVolunteerHours: 100,
      programCosts: 1000,
      integrationImprovement: 0.5,
      languageImprovement: 0.3,
      jobReadinessImprovement: 0.4,
      averageConfidence: 0.9,
    });

    expect(withCosts.breakdown.total_investment).toBe(
      withoutCosts.breakdown.total_investment + 1000
    );
    expect(withCosts.sroi_ratio).toBeLessThan(withoutCosts.sroi_ratio);
  });

  it('should calculate realistic SROI ratio', () => {
    const result = calculateSROI({
      totalVolunteerHours: 500, // 500 hours
      programCosts: 5000, // $5,000
      integrationImprovement: 0.6, // 60% improvement
      languageImprovement: 0.4, // 40% improvement
      jobReadinessImprovement: 0.5, // 50% improvement
      averageConfidence: 0.85,
    });

    // SROI should be positive and realistic (typically 2:1 to 8:1)
    expect(result.sroi_ratio).toBeGreaterThan(1);
    expect(result.sroi_ratio).toBeLessThan(10);

    // Verify components are calculated
    expect(result.breakdown.components.volunteer_hours_value).toBeGreaterThan(0);
    expect(result.breakdown.components.integration_value).toBeGreaterThan(0);
    expect(result.breakdown.components.language_value).toBeGreaterThan(0);
    expect(result.breakdown.components.job_readiness_value).toBeGreaterThan(0);
  });

  it('should handle zero improvements gracefully', () => {
    const result = calculateSROI({
      totalVolunteerHours: 100,
      programCosts: 1000,
      integrationImprovement: 0,
      languageImprovement: 0,
      jobReadinessImprovement: 0,
      averageConfidence: 0.9,
    });

    expect(result.sroi_ratio).toBe(0);
    expect(result.breakdown.total_social_value).toBe(0);
    expect(result.breakdown.components.integration_value).toBe(0);
    expect(result.breakdown.components.language_value).toBe(0);
    expect(result.breakdown.components.job_readiness_value).toBe(0);
  });

  it('should round results to 2 decimal places', () => {
    const result = calculateSROI({
      totalVolunteerHours: 123.456,
      programCosts: 567.89,
      integrationImprovement: 0.333,
      languageImprovement: 0.666,
      jobReadinessImprovement: 0.999,
      averageConfidence: 0.777,
    });

    // Check all values are rounded to 2 decimals
    expect(result.sroi_ratio.toString()).toMatch(/^\d+\.\d{1,2}$/);
    expect(result.breakdown.total_investment.toString()).toMatch(/^\d+\.\d{1,2}$/);
    expect(result.breakdown.total_social_value.toString()).toMatch(/^\d+\.\d{1,2}$/);
  });
});
