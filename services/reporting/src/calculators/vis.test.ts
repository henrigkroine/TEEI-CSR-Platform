import { describe, it, expect } from 'vitest';
import { calculateVIS, getVISBand, getCampaignVISBand, CAMPAIGN_VIS_BANDS } from './vis.js';
import { VIS_WEIGHTS } from '../config/visWeights.js';

describe('VIS Calculator', () => {
  it('should calculate VIS with zero activity', () => {
    const result = calculateVIS({
      totalHours: 0,
      sessionsPerMonth: 0,
      averageParticipantImprovement: 0,
    });

    expect(result.vis_score).toBe(0);
    expect(result.hours_score).toBe(0);
    expect(result.consistency_score).toBe(0);
    expect(result.outcome_impact_score).toBe(0);
  });

  it('should normalize hours correctly', () => {
    const result50 = calculateVIS({
      totalHours: 50,
      sessionsPerMonth: 0,
      averageParticipantImprovement: 0,
    });

    const result100 = calculateVIS({
      totalHours: 100,
      sessionsPerMonth: 0,
      averageParticipantImprovement: 0,
    });

    const result150 = calculateVIS({
      totalHours: 150,
      sessionsPerMonth: 0,
      averageParticipantImprovement: 0,
    });

    expect(result50.hours_score).toBe(50);
    expect(result100.hours_score).toBe(100);
    expect(result150.hours_score).toBe(100); // Capped at 100
  });

  it('should score consistency based on sessions per month', () => {
    const emerging = calculateVIS({
      totalHours: 10,
      sessionsPerMonth: 1,
      averageParticipantImprovement: 0,
    });

    const fair = calculateVIS({
      totalHours: 10,
      sessionsPerMonth: 2,
      averageParticipantImprovement: 0,
    });

    const good = calculateVIS({
      totalHours: 10,
      sessionsPerMonth: 4,
      averageParticipantImprovement: 0,
    });

    const excellent = calculateVIS({
      totalHours: 10,
      sessionsPerMonth: 8,
      averageParticipantImprovement: 0,
    });

    expect(emerging.consistency_score).toBe(25);
    expect(fair.consistency_score).toBe(50);
    expect(good.consistency_score).toBe(75);
    expect(excellent.consistency_score).toBe(100);
  });

  it('should ignore outcome improvements below threshold', () => {
    const belowThreshold = calculateVIS({
      totalHours: 10,
      sessionsPerMonth: 4,
      averageParticipantImprovement: 0.05, // Below 0.1 threshold
    });

    expect(belowThreshold.outcome_impact_score).toBe(0);
  });

  it('should score outcome impact above threshold', () => {
    const justAbove = calculateVIS({
      totalHours: 10,
      sessionsPerMonth: 4,
      averageParticipantImprovement: 0.1, // At threshold
    });

    const midRange = calculateVIS({
      totalHours: 10,
      sessionsPerMonth: 4,
      averageParticipantImprovement: 0.5,
    });

    const excellent = calculateVIS({
      totalHours: 10,
      sessionsPerMonth: 4,
      averageParticipantImprovement: 1.0,
    });

    expect(justAbove.outcome_impact_score).toBe(0);
    expect(midRange.outcome_impact_score).toBeGreaterThan(0);
    expect(excellent.outcome_impact_score).toBe(100);
  });

  it('should apply correct component weights', () => {
    const result = calculateVIS({
      totalHours: 100, // 100 score
      sessionsPerMonth: 8, // 100 score
      averageParticipantImprovement: 1.0, // 100 score
    });

    // All components at 100, so weighted sum should equal 100
    const expectedVIS =
      100 * VIS_WEIGHTS.hours +
      100 * VIS_WEIGHTS.consistency +
      100 * VIS_WEIGHTS.outcomeImpact;

    expect(result.vis_score).toBe(parseFloat(expectedVIS.toFixed(2)));
  });

  it('should calculate realistic VIS for typical volunteer', () => {
    const result = calculateVIS({
      totalHours: 30, // 30 hours
      sessionsPerMonth: 4, // Weekly sessions
      averageParticipantImprovement: 0.6, // 60% improvement
    });

    expect(result.vis_score).toBeGreaterThan(0);
    expect(result.vis_score).toBeLessThan(100);
    expect(result.hours_score).toBe(30); // 30/100
    expect(result.consistency_score).toBe(75); // Good consistency
    expect(result.outcome_impact_score).toBeGreaterThan(0);
  });

  it('should calculate VIS for exceptional volunteer', () => {
    const result = calculateVIS({
      totalHours: 120, // 120 hours
      sessionsPerMonth: 10, // 2-3 per week
      averageParticipantImprovement: 0.9, // 90% improvement
    });

    expect(result.vis_score).toBeGreaterThan(80);
    expect(result.hours_score).toBe(100); // Capped
    expect(result.consistency_score).toBe(100);
    expect(result.outcome_impact_score).toBeGreaterThan(85);
  });

  it('should round results to 2 decimal places', () => {
    const result = calculateVIS({
      totalHours: 33.333,
      sessionsPerMonth: 3.777,
      averageParticipantImprovement: 0.666,
    });

    expect(result.vis_score.toString()).toMatch(/^\d+\.\d{1,2}$/);
    expect(result.hours_score.toString()).toMatch(/^\d+\.\d{1,2}$/);
    expect(result.consistency_score.toString()).toMatch(/^\d+\.\d{1,2}$/);
    expect(result.outcome_impact_score.toString()).toMatch(/^\d+\.\d{1,2}$/);
  });

  describe('VIS Bands', () => {
    it('should categorize scores into correct bands', () => {
      expect(getVISBand(0)).toBe('Emerging');
      expect(getVISBand(25)).toBe('Emerging');
      expect(getVISBand(26)).toBe('Contributing');
      expect(getVISBand(50)).toBe('Contributing');
      expect(getVISBand(51)).toBe('High Impact');
      expect(getVISBand(75)).toBe('High Impact');
      expect(getVISBand(76)).toBe('Exceptional');
      expect(getVISBand(100)).toBe('Exceptional');
    });
  });

  it('should handle edge case with high hours but no consistency', () => {
    const result = calculateVIS({
      totalHours: 100,
      sessionsPerMonth: 0.5, // Very inconsistent
      averageParticipantImprovement: 0.3,
    });

    expect(result.hours_score).toBe(100);
    expect(result.consistency_score).toBe(25); // Emerging
    expect(result.vis_score).toBeLessThan(70); // Dragged down by consistency
  });

  it('should handle edge case with high consistency but low hours', () => {
    const result = calculateVIS({
      totalHours: 5,
      sessionsPerMonth: 8,
      averageParticipantImprovement: 0.8,
    });

    expect(result.hours_score).toBe(5);
    expect(result.consistency_score).toBe(100);
    expect(result.vis_score).toBeLessThan(80); // Dragged down by hours
  });
});

describe('Campaign VIS Extensions (SWARM 6 - Agent 4.2)', () => {
  describe('Campaign VIS Bands', () => {
    it('should have higher thresholds than individual VIS bands', () => {
      // Campaign bands require higher performance for same label
      expect(CAMPAIGN_VIS_BANDS.exceptional).toBeGreaterThan(VIS_WEIGHTS.bands.exceptional);
      expect(CAMPAIGN_VIS_BANDS.highImpact).toBeGreaterThan(VIS_WEIGHTS.bands.highImpact);
    });

    it('should categorize campaign VIS scores correctly', () => {
      expect(getCampaignVISBand(95)).toBe('Exceptional');
      expect(getCampaignVISBand(85)).toBe('High Impact');
      expect(getCampaignVISBand(65)).toBe('Good');
      expect(getCampaignVISBand(50)).toBe('Developing');
      expect(getCampaignVISBand(30)).toBe('Needs Improvement');
    });

    it('should use different labels than individual bands', () => {
      // Individual: Exceptional, High Impact, Contributing, Emerging
      // Campaign: Exceptional, High Impact, Good, Developing, Needs Improvement

      // Score of 55 would be "High Impact" for individual but "Developing" for campaign
      expect(getVISBand(55)).toBe('High Impact');
      expect(getCampaignVISBand(55)).toBe('Developing');
    });
  });

  describe('Backward Compatibility', () => {
    it('should not affect existing getVISBand function', () => {
      // Original individual bands should still work
      expect(getVISBand(80)).toBe('Exceptional');
      expect(getVISBand(60)).toBe('High Impact');
      expect(getVISBand(40)).toBe('Contributing');
      expect(getVISBand(20)).toBe('Emerging');
    });

    it('should maintain existing VIS calculation behavior', () => {
      const result = calculateVIS({
        totalHours: 50,
        sessionsPerMonth: 4,
        averageParticipantImprovement: 0.6,
      });

      // Should return same structure as before
      expect(result).toHaveProperty('vis_score');
      expect(result).toHaveProperty('hours_score');
      expect(result).toHaveProperty('consistency_score');
      expect(result).toHaveProperty('outcome_impact_score');
    });
  });
});
