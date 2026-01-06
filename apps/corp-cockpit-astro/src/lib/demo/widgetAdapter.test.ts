/**
 * Unit tests for Widget Adapter
 */

import { describe, it, expect } from 'vitest';
import {
  adaptForAtAGlance,
  adaptForSROI,
  adaptForVIS,
  getProgrammeSummary,
} from './widgetAdapter';
import type { NormalizedMetrics } from './demoDataService';

const mockMetrics: NormalizedMetrics = {
  language_connect: {
    programme: 'language_connect',
    participants: 150,
    sessions: 320,
    active_mentors: 45,
    matches: 120,
    completion: 85.5,
    satisfaction: 92.3,
    total_hours: 1250,
    volunteers: 30,
    integration_avg: 0.75,
    language_avg: 0.82,
    job_readiness_avg: 0.68,
  },
  mentorship: {
    programme: 'mentorship',
    participants: 200,
    sessions: 450,
    active_mentors: 60,
    matches: 180,
    completion: 78.2,
    satisfaction: 88.7,
    total_hours: 1800,
    volunteers: 40,
    integration_avg: 0.70,
    language_avg: 0.65,
    job_readiness_avg: 0.72,
  },
  aggregate: {
    participants: 350,
    sessions: 770,
    active_mentors: 105,
    matches: 300,
    completion: 81.85,
    satisfaction: 90.5,
    total_hours: 3050,
    volunteers: 70,
  },
  lastUpdated: new Date(),
  csvPath: '/test/path.csv',
};

describe('Widget Adapter', () => {
  describe('adaptForAtAGlance', () => {
    it('should adapt aggregate metrics', () => {
      const result = adaptForAtAGlance(mockMetrics);

      expect(result.inputs.total_volunteers).toBe(70);
      expect(result.inputs.total_hours).toBe(3050);
      expect(result.inputs.total_sessions).toBe(770);
      expect(result.inputs.active_participants).toBe(350);
      expect(result.outcomes.integration_avg).toBe(0);
      expect(result.outcomes.language_avg).toBe(0);
      expect(result.outcomes.job_readiness_avg).toBe(0);
    });

    it('should adapt programme-specific metrics', () => {
      const result = adaptForAtAGlance(mockMetrics, 'language_connect');

      expect(result.inputs.active_participants).toBe(150);
      expect(result.inputs.total_sessions).toBe(320);
      expect(result.outcomes.integration_avg).toBe(0.75);
      expect(result.outcomes.language_avg).toBe(0.82);
    });
  });

  describe('adaptForSROI', () => {
    it('should adapt metrics with default SROI ratio', () => {
      const result = adaptForSROI(mockMetrics);

      expect(result.sroi_ratio).toBe(4.2);
      expect(result.breakdown.total_investment).toBe(3050 * 25);
      expect(result.breakdown.total_social_value).toBe(3050 * 25 * 4.2);
    });

    it('should use SROI ratio from metrics if available', () => {
      const metricsWithSROI = {
        ...mockMetrics,
        aggregate: {
          ...mockMetrics.aggregate,
        },
        language_connect: {
          ...mockMetrics.language_connect,
          sroi_ratio: 5.0,
        },
      };

      const result = adaptForSROI(metricsWithSROI, 'language_connect');

      expect(result.sroi_ratio).toBe(5.0);
    });
  });

  describe('adaptForVIS', () => {
    it('should adapt metrics with default VIS score', () => {
      const result = adaptForVIS(mockMetrics);

      expect(result.aggregate_vis).toBe(75);
      expect(result.top_volunteers.length).toBeGreaterThan(0);
    });

    it('should use VIS score from metrics if available', () => {
      const metricsWithVIS = {
        ...mockMetrics,
        language_connect: {
          ...mockMetrics.language_connect,
          vis_score: 85,
        },
      };

      const result = adaptForVIS(metricsWithVIS, 'language_connect');

      expect(result.aggregate_vis).toBe(85);
    });
  });

  describe('getProgrammeSummary', () => {
    it('should return programme summary', () => {
      const result = getProgrammeSummary(mockMetrics, 'language_connect');

      expect(result.programme).toBe('language_connect');
      expect(result.participants).toBe(150);
      expect(result.sessions).toBe(320);
      expect(result.active_mentors).toBe(45);
      expect(result.matches).toBe(120);
      expect(result.completion).toBe(85.5);
      expect(result.satisfaction).toBe(92.3);
    });
  });
});
