import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculateSROI, getSROIForCampaign } from '../src/calculators/sroi.js';
import { SROI_WEIGHTS } from '../src/config/sroiWeights.js';
import { pool } from '../src/db/connection.js';

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

describe('Campaign SROI Calculator (Integration Tests)', () => {
  beforeAll(async () => {
    // Ensure database connection is ready
    const client = await pool.connect();
    client.release();
  });

  afterAll(async () => {
    // Clean up database connection
    await pool.end();
  });

  it('should calculate SROI for an active campaign with multiple instances', async () => {
    // Campaign 1: Acme - Syrian Refugees Mentorship (3 cohorts)
    const campaignId = 'camp-acme-syrian-mentors-q1-001';

    const result = await getSROIForCampaign(campaignId);

    // Verify basic structure
    expect(result).toHaveProperty('company_id');
    expect(result).toHaveProperty('period');
    expect(result).toHaveProperty('sroi_ratio');
    expect(result).toHaveProperty('breakdown');

    // Verify SROI is calculated (should be > 0 for active campaign with data)
    expect(result.sroi_ratio).toBeGreaterThan(0);

    // Verify company ID matches Acme
    expect(result.company_id).toBe('acme0001-0001-0001-0001-000000000001');

    // Verify breakdown components exist
    expect(result.breakdown.total_investment).toBeGreaterThan(0);
    expect(result.breakdown.total_social_value).toBeGreaterThan(0);
    expect(result.breakdown.components.volunteer_hours_value).toBeGreaterThan(0);

    // Total hours from 3 cohorts: 216 + 180 + 120 = 516 hours
    // This should match the volunteer hours value calculation
    const expectedHoursValue = 516 * SROI_WEIGHTS.volunteerHourValue;
    expect(result.breakdown.components.volunteer_hours_value).toBeCloseTo(
      expectedHoursValue,
      0
    );

    // SROI should be realistic (typically 2:1 to 8:1 for mentorship programs)
    expect(result.sroi_ratio).toBeGreaterThan(2);
    expect(result.sroi_ratio).toBeLessThan(10);
  });

  it('should calculate SROI for a language program campaign', async () => {
    // Campaign 2: GlobalCare - Afghan Women Language (2 groups)
    const campaignId = 'camp-globalcare-afghan-lang-q1-002';

    const result = await getSROIForCampaign(campaignId);

    // Language programs typically have higher SROI due to measurable outcomes
    expect(result.sroi_ratio).toBeGreaterThan(3);

    // Verify company ID matches GlobalCare
    expect(result.company_id).toBe('globa001-0001-0001-0001-000000000001');

    // Total hours from 2 groups: 210 + 206 = 416 hours
    const expectedHoursValue = 416 * SROI_WEIGHTS.volunteerHourValue;
    expect(result.breakdown.components.volunteer_hours_value).toBeCloseTo(
      expectedHoursValue,
      0
    );

    // Language programs should have language improvement component
    expect(result.breakdown.components.language_value).toBeGreaterThan(0);
  });

  it('should handle recruiting campaign with minimal data', async () => {
    // Campaign 4: Acme - Youth Buddy (recruiting, early stage)
    const campaignId = 'camp-acme-youth-buddy-q2-004';

    const result = await getSROIForCampaign(campaignId);

    // Should calculate SROI even with minimal data
    expect(result.sroi_ratio).toBeGreaterThanOrEqual(0);

    // Small amount of hours (16 hours from early matches)
    expect(result.breakdown.components.volunteer_hours_value).toBeGreaterThan(0);
  });

  it('should handle campaign with no active instances', async () => {
    // Campaign 8: GlobalCare - Family Buddy (planned, not started)
    const campaignId = 'camp-globalcare-family-buddy-q2-008';

    const result = await getSROIForCampaign(campaignId);

    // Should return zero SROI for campaigns without active instances
    expect(result.sroi_ratio).toBe(0);
    expect(result.breakdown.total_investment).toBe(0);
    expect(result.breakdown.total_social_value).toBe(0);

    // But should still have valid company_id and period
    expect(result.company_id).toBe('globa001-0001-0001-0001-000000000001');
    expect(result.period).toBeDefined();
  });

  it('should calculate SROI for over-capacity campaign', async () => {
    // Campaign 5: GlobalCare - Women in Tech (110% capacity, 2 cohorts)
    const campaignId = 'camp-globalcare-women-tech-q1-005';

    const result = await getSROIForCampaign(campaignId);

    // High-value campaign should have strong SROI
    expect(result.sroi_ratio).toBeGreaterThan(4);

    // Total hours from 2 cohorts: 272 + 256 = 528 hours
    const expectedHoursValue = 528 * SROI_WEIGHTS.volunteerHourValue;
    expect(result.breakdown.components.volunteer_hours_value).toBeCloseTo(
      expectedHoursValue,
      0
    );

    // Should have career/networking outcome components
    expect(result.breakdown.total_social_value).toBeGreaterThan(0);
  });

  it('should calculate SROI for completed campaign', async () => {
    // Campaign 15: TechCo - Hospitality Language+Prof (completed, 2 cohorts)
    const campaignId = 'camp-techco-hosp-langprof-q4-015';

    const result = await getSROIForCampaign(campaignId);

    // Completed successful campaigns should have high SROI
    expect(result.sroi_ratio).toBeGreaterThan(5);

    // Total hours from 2 cohorts: 480 + 432 = 912 hours
    const expectedHoursValue = 912 * SROI_WEIGHTS.volunteerHourValue;
    expect(result.breakdown.components.volunteer_hours_value).toBeCloseTo(
      expectedHoursValue,
      0
    );

    // Should have multiple outcome components (language, job_readiness, employment)
    expect(result.breakdown.total_social_value).toBeGreaterThan(
      result.breakdown.total_investment
    );
  });

  it('should calculate SROI for upskilling campaign', async () => {
    // Campaign 3: TechCo - Tech Upskilling for Migrants (2 tracks)
    const campaignId = 'camp-techco-migrants-upskill-q1-003';

    const result = await getSROIForCampaign(campaignId);

    // Upskilling programs should have moderate SROI
    expect(result.sroi_ratio).toBeGreaterThan(2);

    // Total hours from 2 tracks: 144 + 108 = 252 hours
    const expectedHoursValue = 252 * SROI_WEIGHTS.volunteerHourValue;
    expect(result.breakdown.components.volunteer_hours_value).toBeCloseTo(
      expectedHoursValue,
      0
    );

    // Should have job readiness component
    expect(result.breakdown.components.job_readiness_value).toBeGreaterThan(0);
  });

  it('should aggregate SROI correctly across multiple program instances', async () => {
    // Campaign 10: Acme - Ukrainian Professionals (2 industry groups)
    const campaignId = 'camp-acme-ukrainian-prof-q1-010';

    const result = await getSROIForCampaign(campaignId);

    // Should aggregate hours from both instances: 288 + 288 = 576 hours
    const expectedHoursValue = 576 * SROI_WEIGHTS.volunteerHourValue;
    expect(result.breakdown.components.volunteer_hours_value).toBeCloseTo(
      expectedHoursValue,
      0
    );

    // Professional networking campaigns should have good SROI
    expect(result.sroi_ratio).toBeGreaterThan(3);

    // Verify period is set correctly
    expect(result.period).toBe('2025-Q1');
  });

  it('should throw error for non-existent campaign', async () => {
    const fakeCampaignId = 'camp-fake-not-exists-999';

    await expect(getSROIForCampaign(fakeCampaignId)).rejects.toThrow(
      'Campaign not found'
    );
  });

  it('should support period filtering (quarter)', async () => {
    // Campaign 1: Acme - Syrian Refugees (Q1 2025)
    const campaignId = 'camp-acme-syrian-mentors-q1-001';

    // Filter by Q1 2025
    const resultQ1 = await getSROIForCampaign(campaignId, '2025-Q1');

    // Should return SROI for Q1
    expect(resultQ1.period).toBe('2025-Q1');
    expect(resultQ1.sroi_ratio).toBeGreaterThan(0);

    // Filter by Q2 2025 (campaign doesn't have instances in Q2)
    const resultQ2 = await getSROIForCampaign(campaignId, '2025-Q2');

    // Should still calculate, but might be different if instances don't overlap
    expect(resultQ2.period).toBe('2025-Q2');
  });

  it('should handle paused campaign correctly', async () => {
    // Campaign 14: GlobalCare - German Youth (paused)
    const campaignId = 'camp-globalcare-german-youth-q1-014';

    const result = await getSROIForCampaign(campaignId);

    // Paused campaigns are excluded from calculation (status filter)
    expect(result.sroi_ratio).toBe(0);
    expect(result.breakdown.total_investment).toBe(0);
  });

  it('should map different outcome dimension names correctly', async () => {
    // Campaign 12: TechCo - Student Career Preparation
    // Uses "career_readiness" instead of "job_readiness"
    const campaignId = 'camp-techco-students-career-q1-012';

    const result = await getSROIForCampaign(campaignId);

    // Should successfully map career_readiness to job_readiness dimension
    expect(result.sroi_ratio).toBeGreaterThan(0);
    expect(result.breakdown.components.job_readiness_value).toBeGreaterThan(0);

    // Total hours from 2 cohorts: 160 + 144 = 304 hours
    const expectedHoursValue = 304 * SROI_WEIGHTS.volunteerHourValue;
    expect(result.breakdown.components.volunteer_hours_value).toBeCloseTo(
      expectedHoursValue,
      0
    );
  });

  it('should handle campaigns with only language outcomes', async () => {
    // Campaign 7: Acme - English for Asylum Seekers (2 levels)
    const campaignId = 'camp-acme-asylum-english-q1-007';

    const result = await getSROIForCampaign(campaignId);

    // Should calculate SROI primarily from language improvement
    expect(result.breakdown.components.language_value).toBeGreaterThan(0);

    // Total hours from 2 levels: 165 + 139 = 304 hours
    const expectedHoursValue = 304 * SROI_WEIGHTS.volunteerHourValue;
    expect(result.breakdown.components.volunteer_hours_value).toBeCloseTo(
      expectedHoursValue,
      0
    );

    expect(result.sroi_ratio).toBeGreaterThan(3);
  });
});
