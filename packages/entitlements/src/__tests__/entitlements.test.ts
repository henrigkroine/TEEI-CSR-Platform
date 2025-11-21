/**
 * Entitlements Tests
 */

import { describe, it, expect } from 'vitest';
import { Feature, DEFAULT_PLAN_FEATURES } from '../types/index.js';

describe('Entitlements', () => {
  describe('Feature Enum', () => {
    it('should include new Founding-8 features', () => {
      expect(Feature.COPILOT).toBe('copilot');
      expect(Feature.MULTI_REGION).toBe('multi_region');
      expect(Feature.CONNECTORS).toBe('connectors');
    });

    it('should maintain existing features', () => {
      expect(Feature.REPORT_BUILDER).toBe('report_builder');
      expect(Feature.BOARDROOM_LIVE).toBe('boardroom_live');
      expect(Feature.NLQ).toBe('nlq');
      expect(Feature.GEN_AI_REPORTS).toBe('gen_ai_reports');
    });
  });

  describe('DEFAULT_PLAN_FEATURES', () => {
    it('should define Essentials plan', () => {
      const essentials = DEFAULT_PLAN_FEATURES.essentials;

      expect(essentials).toBeDefined();
      expect(essentials.maxSeats).toBe(5);
      expect(essentials.maxReportsPerMonth).toBe(10);
      expect(essentials.maxAiTokensPerMonth).toBe(100000);
      expect(essentials.maxStorageGB).toBe(10);
    });

    it('should define Professional plan', () => {
      const professional = DEFAULT_PLAN_FEATURES.professional;

      expect(professional).toBeDefined();
      expect(professional.maxSeats).toBe(25);
      expect(professional.maxReportsPerMonth).toBe(100);
      expect(professional.maxAiTokensPerMonth).toBe(1000000);
      expect(professional.maxStorageGB).toBe(100);
    });

    it('should define Enterprise plan with unlimited resources', () => {
      const enterprise = DEFAULT_PLAN_FEATURES.enterprise;

      expect(enterprise).toBeDefined();
      expect(enterprise.maxSeats).toBe(null);
      expect(enterprise.maxReportsPerMonth).toBe(null);
      expect(enterprise.maxAiTokensPerMonth).toBe(null);
      expect(enterprise.maxStorageGB).toBe(null);
    });

    it('should include correct features for Essentials', () => {
      const essentials = DEFAULT_PLAN_FEATURES.essentials;

      expect(essentials.features.has(Feature.REPORT_BUILDER)).toBe(true);
      expect(essentials.features.has(Feature.EXPORT_PDF)).toBe(true);
      expect(essentials.features.has(Feature.EXPORT_CSV)).toBe(true);

      // Should NOT have advanced features
      expect(essentials.features.has(Feature.COPILOT)).toBe(false);
      expect(essentials.features.has(Feature.NLQ)).toBe(false);
      expect(essentials.features.has(Feature.GEN_AI_REPORTS)).toBe(false);
    });

    it('should include correct features for Professional', () => {
      const professional = DEFAULT_PLAN_FEATURES.professional;

      expect(professional.features.has(Feature.REPORT_BUILDER)).toBe(true);
      expect(professional.features.has(Feature.BOARDROOM_LIVE)).toBe(true);
      expect(professional.features.has(Feature.NLQ)).toBe(true);
      expect(professional.features.has(Feature.CONNECTORS)).toBe(true);
      expect(professional.features.has(Feature.API_ACCESS)).toBe(true);

      // Should NOT have enterprise-only features
      expect(professional.features.has(Feature.COPILOT)).toBe(false);
      expect(professional.features.has(Feature.MULTI_REGION)).toBe(false);
      expect(professional.features.has(Feature.GEN_AI_REPORTS)).toBe(false);
    });

    it('should include all features for Enterprise', () => {
      const enterprise = DEFAULT_PLAN_FEATURES.enterprise;

      expect(enterprise.features.has(Feature.REPORT_BUILDER)).toBe(true);
      expect(enterprise.features.has(Feature.BOARDROOM_LIVE)).toBe(true);
      expect(enterprise.features.has(Feature.NLQ)).toBe(true);
      expect(enterprise.features.has(Feature.GEN_AI_REPORTS)).toBe(true);
      expect(enterprise.features.has(Feature.COPILOT)).toBe(true);
      expect(enterprise.features.has(Feature.MULTI_REGION)).toBe(true);
      expect(enterprise.features.has(Feature.CONNECTORS)).toBe(true);
      expect(enterprise.features.has(Feature.SSO)).toBe(true);
      expect(enterprise.features.has(Feature.CUSTOM_BRANDING)).toBe(true);
      expect(enterprise.features.has(Feature.PRIORITY_SUPPORT)).toBe(true);
    });
  });

  describe('Plan Feature Hierarchy', () => {
    it('should ensure Professional is superset of Essentials', () => {
      const essentials = DEFAULT_PLAN_FEATURES.essentials.features;
      const professional = DEFAULT_PLAN_FEATURES.professional.features;

      for (const feature of essentials) {
        expect(professional.has(feature)).toBe(true);
      }
    });

    it('should ensure Enterprise is superset of Professional', () => {
      const professional = DEFAULT_PLAN_FEATURES.professional.features;
      const enterprise = DEFAULT_PLAN_FEATURES.enterprise.features;

      for (const feature of professional) {
        expect(enterprise.has(feature)).toBe(true);
      }
    });

    it('should have distinct features per tier', () => {
      const essentials = DEFAULT_PLAN_FEATURES.essentials.features;
      const professional = DEFAULT_PLAN_FEATURES.professional.features;
      const enterprise = DEFAULT_PLAN_FEATURES.enterprise.features;

      // Essentials < Professional
      expect(essentials.size).toBeLessThan(professional.size);

      // Professional < Enterprise
      expect(professional.size).toBeLessThan(enterprise.size);
    });
  });

  describe('Feature Counts', () => {
    it('should have expected feature counts per plan', () => {
      const essentials = DEFAULT_PLAN_FEATURES.essentials.features;
      const professional = DEFAULT_PLAN_FEATURES.professional.features;
      const enterprise = DEFAULT_PLAN_FEATURES.enterprise.features;

      expect(essentials.size).toBe(3); // report_builder, export_pdf, export_csv
      expect(professional.size).toBe(10); // +boardroom, forecast, benchmarking, nlq, export_pptx, api, connectors
      expect(enterprise.size).toBe(16); // +gen_ai, copilot, multi_region, sso, branding, support
    });
  });
});
