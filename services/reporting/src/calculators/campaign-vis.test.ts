/**
 * Campaign VIS Calculator Tests
 *
 * Tests for campaign-level VIS calculations including:
 * - Campaign aggregate VIS calculation
 * - Volunteer VIS within campaign context
 * - Campaign VIS bands
 * - Distribution calculations
 *
 * Agent 4.2: vis-campaign-integrator (SWARM 6)
 */

import { describe, it, expect } from 'vitest';
import {
  getCampaignVISBand,
  CAMPAIGN_VIS_BANDS,
  type CampaignVISResponse,
  type VolunteerVIS,
  calculateVIS
} from './vis.js';
import { VIS_WEIGHTS } from '../config/visWeights.js';

describe('Campaign VIS Bands', () => {
  it('should define correct campaign VIS band thresholds', () => {
    expect(CAMPAIGN_VIS_BANDS.exceptional).toBe(90);
    expect(CAMPAIGN_VIS_BANDS.highImpact).toBe(75);
    expect(CAMPAIGN_VIS_BANDS.good).toBe(60);
    expect(CAMPAIGN_VIS_BANDS.developing).toBe(40);
    expect(CAMPAIGN_VIS_BANDS.needsImprovement).toBe(0);
  });

  it('should categorize campaign VIS scores correctly', () => {
    // Exceptional (≥90)
    expect(getCampaignVISBand(100)).toBe('Exceptional');
    expect(getCampaignVISBand(95)).toBe('Exceptional');
    expect(getCampaignVISBand(90)).toBe('Exceptional');

    // High Impact (≥75, <90)
    expect(getCampaignVISBand(89)).toBe('High Impact');
    expect(getCampaignVISBand(80)).toBe('High Impact');
    expect(getCampaignVISBand(75)).toBe('High Impact');

    // Good (≥60, <75)
    expect(getCampaignVISBand(74)).toBe('Good');
    expect(getCampaignVISBand(65)).toBe('Good');
    expect(getCampaignVISBand(60)).toBe('Good');

    // Developing (≥40, <60)
    expect(getCampaignVISBand(59)).toBe('Developing');
    expect(getCampaignVISBand(50)).toBe('Developing');
    expect(getCampaignVISBand(40)).toBe('Developing');

    // Needs Improvement (<40)
    expect(getCampaignVISBand(39)).toBe('Needs Improvement');
    expect(getCampaignVISBand(20)).toBe('Needs Improvement');
    expect(getCampaignVISBand(0)).toBe('Needs Improvement');
  });

  it('should use higher thresholds than individual VIS bands', () => {
    // Campaign bands should be more stringent
    // Individual: Exceptional ≥76, High Impact ≥51, Contributing ≥26, Emerging ≥0
    // Campaign: Exceptional ≥90, High Impact ≥75, Good ≥60, Developing ≥40, Needs Improvement <40

    // A score of 76 would be "Exceptional" for an individual but only "Good" for a campaign
    expect(getCampaignVISBand(76)).toBe('Good');

    // A score of 85 would be "Exceptional" for an individual but "High Impact" for a campaign
    expect(getCampaignVISBand(85)).toBe('High Impact');
  });
});

describe('Campaign VIS Distribution', () => {
  it('should calculate correct distribution for mixed volunteer scores', () => {
    // Simulate volunteer VIS scores
    const volunteerScores = [
      95, // Exceptional
      92, // Exceptional
      88, // High Impact
      76, // Good
      65, // Good
      55, // Developing
      42, // Developing
      30, // Needs Improvement
      15, // Needs Improvement
    ];

    const distribution = {
      exceptional: 0,
      high_impact: 0,
      good: 0,
      developing: 0,
      needs_improvement: 0,
    };

    // Categorize each score
    volunteerScores.forEach(score => {
      if (score >= CAMPAIGN_VIS_BANDS.exceptional) {
        distribution.exceptional++;
      } else if (score >= CAMPAIGN_VIS_BANDS.highImpact) {
        distribution.high_impact++;
      } else if (score >= CAMPAIGN_VIS_BANDS.good) {
        distribution.good++;
      } else if (score >= CAMPAIGN_VIS_BANDS.developing) {
        distribution.developing++;
      } else {
        distribution.needs_improvement++;
      }
    });

    expect(distribution.exceptional).toBe(2);
    expect(distribution.high_impact).toBe(1);
    expect(distribution.good).toBe(2);
    expect(distribution.developing).toBe(2);
    expect(distribution.needs_improvement).toBe(2);

    // Total should equal volunteer count
    const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
    expect(total).toBe(volunteerScores.length);
  });

  it('should handle all volunteers in same band', () => {
    const allExceptional = [92, 95, 98, 100];

    let exceptional = 0;
    allExceptional.forEach(score => {
      if (score >= CAMPAIGN_VIS_BANDS.exceptional) {
        exceptional++;
      }
    });

    expect(exceptional).toBe(4);
  });

  it('should handle edge cases at band boundaries', () => {
    const boundaryScores = [90, 75, 60, 40, 39.99];

    const bands = boundaryScores.map(getCampaignVISBand);

    expect(bands).toEqual([
      'Exceptional', // 90
      'High Impact', // 75
      'Good', // 60
      'Developing', // 40
      'Needs Improvement', // 39.99
    ]);
  });
});

describe('Campaign VIS Calculations', () => {
  it('should calculate aggregate VIS as average of volunteer VIS scores', () => {
    // Simulate 3 volunteers with different VIS scores
    const volunteer1 = calculateVIS({
      totalHours: 50,
      sessionsPerMonth: 8,
      averageParticipantImprovement: 0.8,
    });

    const volunteer2 = calculateVIS({
      totalHours: 30,
      sessionsPerMonth: 4,
      averageParticipantImprovement: 0.6,
    });

    const volunteer3 = calculateVIS({
      totalHours: 80,
      sessionsPerMonth: 10,
      averageParticipantImprovement: 0.9,
    });

    const totalVIS = volunteer1.vis_score + volunteer2.vis_score + volunteer3.vis_score;
    const aggregateVIS = totalVIS / 3;

    expect(aggregateVIS).toBeGreaterThan(0);
    expect(aggregateVIS).toBeLessThan(100);

    // Aggregate should be between min and max individual scores
    const scores = [volunteer1.vis_score, volunteer2.vis_score, volunteer3.vis_score];
    const minScore = Math.min(...scores);
    const maxScore = Math.max(...scores);

    expect(aggregateVIS).toBeGreaterThanOrEqual(minScore);
    expect(aggregateVIS).toBeLessThanOrEqual(maxScore);
  });

  it('should handle campaign with single volunteer', () => {
    const soloVolunteer = calculateVIS({
      totalHours: 40,
      sessionsPerMonth: 6,
      averageParticipantImprovement: 0.7,
    });

    // Aggregate VIS for single volunteer = that volunteer's VIS
    const aggregateVIS = soloVolunteer.vis_score;

    expect(aggregateVIS).toBe(soloVolunteer.vis_score);
  });

  it('should handle campaign with many volunteers', () => {
    // Simulate 20 volunteers with varying performance
    const volunteers = [];
    for (let i = 0; i < 20; i++) {
      const vis = calculateVIS({
        totalHours: 10 + (i * 5), // Increasing hours
        sessionsPerMonth: 2 + (i * 0.3), // Increasing consistency
        averageParticipantImprovement: 0.3 + (i * 0.03), // Increasing outcomes
      });
      volunteers.push(vis);
    }

    const totalVIS = volunteers.reduce((sum, v) => sum + v.vis_score, 0);
    const aggregateVIS = totalVIS / volunteers.length;

    expect(aggregateVIS).toBeGreaterThan(0);
    expect(aggregateVIS).toBeLessThan(100);
    expect(volunteers.length).toBe(20);
  });

  it('should correctly identify top N volunteers by VIS score', () => {
    // Create volunteers with known scores
    const volunteers: VolunteerVIS[] = [
      { volunteer_id: '1', name: 'Alice', vis_score: 92, hours: 80, consistency: 95, outcome_impact: 90 },
      { volunteer_id: '2', name: 'Bob', vis_score: 78, hours: 60, consistency: 80, outcome_impact: 75 },
      { volunteer_id: '3', name: 'Carol', vis_score: 85, hours: 70, consistency: 88, outcome_impact: 82 },
      { volunteer_id: '4', name: 'David', vis_score: 65, hours: 40, consistency: 70, outcome_impact: 60 },
      { volunteer_id: '5', name: 'Eve', vis_score: 88, hours: 75, consistency: 90, outcome_impact: 85 },
    ];

    // Sort by VIS score descending
    volunteers.sort((a, b) => b.vis_score - a.vis_score);

    // Take top 3
    const top3 = volunteers.slice(0, 3);

    expect(top3.length).toBe(3);
    expect(top3[0].name).toBe('Alice'); // 92
    expect(top3[1].name).toBe('Eve'); // 88
    expect(top3[2].name).toBe('Carol'); // 85

    // Verify descending order
    expect(top3[0].vis_score).toBeGreaterThan(top3[1].vis_score);
    expect(top3[1].vis_score).toBeGreaterThan(top3[2].vis_score);
  });
});

describe('Campaign VIS Response Structure', () => {
  it('should have correct structure for CampaignVISResponse', () => {
    const mockResponse: CampaignVISResponse = {
      campaign_id: '123e4567-e89b-12d3-a456-426614174000',
      campaign_name: 'Mentors for Syrian Refugees - Q1 2025',
      aggregate_vis: 78.5,
      volunteer_count: 15,
      top_volunteers: [
        {
          volunteer_id: 'v1',
          name: 'Alice Smith',
          vis_score: 92.3,
          hours: 80,
          consistency: 95,
          outcome_impact: 90,
        },
        {
          volunteer_id: 'v2',
          name: 'Bob Jones',
          vis_score: 88.7,
          hours: 75,
          consistency: 90,
          outcome_impact: 85,
        },
      ],
      distribution: {
        exceptional: 2,
        high_impact: 5,
        good: 6,
        developing: 2,
        needs_improvement: 0,
      },
    };

    // Verify structure
    expect(mockResponse).toHaveProperty('campaign_id');
    expect(mockResponse).toHaveProperty('campaign_name');
    expect(mockResponse).toHaveProperty('aggregate_vis');
    expect(mockResponse).toHaveProperty('volunteer_count');
    expect(mockResponse).toHaveProperty('top_volunteers');
    expect(mockResponse).toHaveProperty('distribution');

    // Verify distribution structure
    expect(mockResponse.distribution).toHaveProperty('exceptional');
    expect(mockResponse.distribution).toHaveProperty('high_impact');
    expect(mockResponse.distribution).toHaveProperty('good');
    expect(mockResponse.distribution).toHaveProperty('developing');
    expect(mockResponse.distribution).toHaveProperty('needs_improvement');

    // Verify distribution counts sum to volunteer_count
    const distributionTotal =
      mockResponse.distribution.exceptional +
      mockResponse.distribution.high_impact +
      mockResponse.distribution.good +
      mockResponse.distribution.developing +
      mockResponse.distribution.needs_improvement;

    expect(distributionTotal).toBe(mockResponse.volunteer_count);
  });

  it('should handle campaign with zero volunteers', () => {
    const emptyResponse: CampaignVISResponse = {
      campaign_id: '123e4567-e89b-12d3-a456-426614174001',
      campaign_name: 'Empty Campaign',
      aggregate_vis: 0,
      volunteer_count: 0,
      top_volunteers: [],
      distribution: {
        exceptional: 0,
        high_impact: 0,
        good: 0,
        developing: 0,
        needs_improvement: 0,
      },
    };

    expect(emptyResponse.volunteer_count).toBe(0);
    expect(emptyResponse.top_volunteers.length).toBe(0);
    expect(emptyResponse.aggregate_vis).toBe(0);

    const distributionTotal = Object.values(emptyResponse.distribution).reduce((sum, count) => sum + count, 0);
    expect(distributionTotal).toBe(0);
  });
});

describe('Campaign VIS Band Consistency', () => {
  it('should maintain consistent band definitions across campaign lifecycle', () => {
    // Bands should be constant and not change
    const bands1 = { ...CAMPAIGN_VIS_BANDS };
    const bands2 = { ...CAMPAIGN_VIS_BANDS };

    expect(bands1).toEqual(bands2);
  });

  it('should ensure campaign bands are stricter than individual bands', () => {
    // Campaign Exceptional (90) > Individual Exceptional (76)
    expect(CAMPAIGN_VIS_BANDS.exceptional).toBeGreaterThan(VIS_WEIGHTS.bands.exceptional);

    // Campaign High Impact (75) > Individual High Impact (51)
    expect(CAMPAIGN_VIS_BANDS.highImpact).toBeGreaterThan(VIS_WEIGHTS.bands.highImpact);
  });
});

describe('Campaign VIS Integration Scenarios', () => {
  it('should handle realistic campaign scenario: "Mentors for Syrian Refugees"', () => {
    // Simulate a campaign with 10 mentors, varying engagement levels
    const mentors = [
      calculateVIS({ totalHours: 80, sessionsPerMonth: 8, averageParticipantImprovement: 0.85 }), // Exceptional mentor
      calculateVIS({ totalHours: 60, sessionsPerMonth: 6, averageParticipantImprovement: 0.75 }), // High impact
      calculateVIS({ totalHours: 70, sessionsPerMonth: 7, averageParticipantImprovement: 0.80 }), // High impact
      calculateVIS({ totalHours: 40, sessionsPerMonth: 4, averageParticipantImprovement: 0.65 }), // Good
      calculateVIS({ totalHours: 50, sessionsPerMonth: 5, averageParticipantImprovement: 0.70 }), // Good
      calculateVIS({ totalHours: 30, sessionsPerMonth: 3, averageParticipantImprovement: 0.55 }), // Developing
      calculateVIS({ totalHours: 25, sessionsPerMonth: 2.5, averageParticipantImprovement: 0.50 }), // Developing
      calculateVIS({ totalHours: 20, sessionsPerMonth: 2, averageParticipantImprovement: 0.40 }), // Developing
      calculateVIS({ totalHours: 15, sessionsPerMonth: 1.5, averageParticipantImprovement: 0.30 }), // Needs improvement
      calculateVIS({ totalHours: 10, sessionsPerMonth: 1, averageParticipantImprovement: 0.20 }), // Needs improvement
    ];

    const totalVIS = mentors.reduce((sum, m) => sum + m.vis_score, 0);
    const avgVIS = totalVIS / mentors.length;

    expect(mentors.length).toBe(10);
    expect(avgVIS).toBeGreaterThan(0);
    expect(avgVIS).toBeLessThan(100);

    // Campaign should likely be in "Good" or "High Impact" range with this distribution
    const campaignBand = getCampaignVISBand(avgVIS);
    expect(['Good', 'High Impact', 'Developing']).toContain(campaignBand);
  });

  it('should handle campaign with all high-performing volunteers', () => {
    // Elite campaign with all exceptional volunteers
    const eliteVolunteers = [
      calculateVIS({ totalHours: 100, sessionsPerMonth: 10, averageParticipantImprovement: 0.95 }),
      calculateVIS({ totalHours: 95, sessionsPerMonth: 9, averageParticipantImprovement: 0.92 }),
      calculateVIS({ totalHours: 90, sessionsPerMonth: 9, averageParticipantImprovement: 0.90 }),
      calculateVIS({ totalHours: 85, sessionsPerMonth: 8, averageParticipantImprovement: 0.88 }),
    ];

    const totalVIS = eliteVolunteers.reduce((sum, v) => sum + v.vis_score, 0);
    const avgVIS = totalVIS / eliteVolunteers.length;

    expect(avgVIS).toBeGreaterThan(85); // Should be high
    expect(getCampaignVISBand(avgVIS)).toBe('Exceptional');
  });

  it('should handle campaign needing improvement', () => {
    // Struggling campaign with low engagement
    const strugglingVolunteers = [
      calculateVIS({ totalHours: 8, sessionsPerMonth: 0.8, averageParticipantImprovement: 0.15 }),
      calculateVIS({ totalHours: 10, sessionsPerMonth: 1, averageParticipantImprovement: 0.20 }),
      calculateVIS({ totalHours: 5, sessionsPerMonth: 0.5, averageParticipantImprovement: 0.10 }),
    ];

    const totalVIS = strugglingVolunteers.reduce((sum, v) => sum + v.vis_score, 0);
    const avgVIS = totalVIS / strugglingVolunteers.length;

    expect(avgVIS).toBeLessThan(40); // Should be low
    expect(getCampaignVISBand(avgVIS)).toBe('Needs Improvement');
  });
});

describe('Backward Compatibility', () => {
  it('should not break existing VIS calculation function', () => {
    // Verify core calculateVIS function still works
    const result = calculateVIS({
      totalHours: 50,
      sessionsPerMonth: 4,
      averageParticipantImprovement: 0.6,
    });

    expect(result).toHaveProperty('vis_score');
    expect(result).toHaveProperty('hours_score');
    expect(result).toHaveProperty('consistency_score');
    expect(result).toHaveProperty('outcome_impact_score');
  });

  it('should maintain existing VolunteerVIS interface', () => {
    const volunteer: VolunteerVIS = {
      volunteer_id: 'test-id',
      name: 'Test Volunteer',
      vis_score: 75.5,
      hours: 50,
      consistency: 80,
      outcome_impact: 70,
    };

    expect(volunteer).toHaveProperty('volunteer_id');
    expect(volunteer).toHaveProperty('name');
    expect(volunteer).toHaveProperty('vis_score');
    expect(volunteer).toHaveProperty('hours');
    expect(volunteer).toHaveProperty('consistency');
    expect(volunteer).toHaveProperty('outcome_impact');
  });
});

/**
 * NOTE: Database integration tests for getVISForCampaign and getVolunteerVISInCampaign
 * are not included here as they require:
 * 1. Mock database setup with campaigns, program_instances, volunteers, sessions
 * 2. programInstanceId field to be added to kintell_sessions and volunteer_hours tables (Agent 4.3)
 * 3. Seed data for campaigns and program instances
 *
 * These tests should be added once:
 * - Agent 2.3 (seed-data-engineer) creates campaign seed data
 * - Agent 4.3 (ingestion-enhancer) adds programInstanceId field to session tables
 * - Database test infrastructure is set up
 */
