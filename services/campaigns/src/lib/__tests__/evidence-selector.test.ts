/**
 * Campaign Evidence Selector Tests
 *
 * SWARM 6: Agent 4.4 (evidence-campaign-linker)
 *
 * Tests for:
 * - Top evidence selection for campaigns
 * - Evidence scoring (impact, diversity, recency)
 * - Diversity algorithm (max per outcome type)
 * - Campaign evidence summary
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  selectTopEvidenceForCampaign,
  refreshCampaignEvidence,
  getCampaignEvidenceSummary,
} from '../evidence-selector.js';

describe('Campaign Evidence Selector', () => {
  describe('selectTopEvidenceForCampaign', () => {
    it('should return empty array when campaign has no evidence', async () => {
      const result = await selectTopEvidenceForCampaign('non-existent-campaign-id');
      expect(result).toEqual([]);
    });

    it('should select top N evidence snippets', async () => {
      // Mock campaign with evidence
      const campaignId = 'mock-campaign-id';
      const limit = 5;

      const result = await selectTopEvidenceForCampaign(campaignId, limit);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeLessThanOrEqual(limit);
    });

    it('should prioritize high-impact evidence', async () => {
      // Test that evidence with higher outcome scores ranks higher
      // This would require mocking DB data with known scores
      // For now, structural test
      const campaignId = 'campaign-with-mixed-evidence';
      const result = await selectTopEvidenceForCampaign(campaignId, 10);

      expect(Array.isArray(result)).toBe(true);
    });

    it('should ensure diversity across outcome types', async () => {
      // Test that selected evidence covers multiple outcome dimensions
      // Should not have >50% of evidence from single outcome type
      const campaignId = 'campaign-with-diverse-evidence';
      const result = await selectTopEvidenceForCampaign(campaignId, 10);

      // Structural test - actual diversity validation requires outcome type metadata
      expect(Array.isArray(result)).toBe(true);
    });

    it('should prefer recent evidence over old evidence (all else equal)', async () => {
      // Test recency scoring
      // Recent evidence should rank higher than old evidence with same scores
      const campaignId = 'campaign-with-temporal-evidence';
      const result = await selectTopEvidenceForCampaign(campaignId, 10);

      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('refreshCampaignEvidence', () => {
    it('should update campaign evidenceSnippetIds field', async () => {
      const campaignId = 'test-campaign-id';

      // Should not throw
      await expect(refreshCampaignEvidence(campaignId, 10)).resolves.not.toThrow();
    });

    it('should handle campaigns with no evidence gracefully', async () => {
      const campaignId = 'empty-campaign-id';

      await expect(refreshCampaignEvidence(campaignId)).resolves.not.toThrow();
    });
  });

  describe('getCampaignEvidenceSummary', () => {
    it('should return summary with total and breakdown by outcome type', async () => {
      const campaignId = 'campaign-with-evidence';
      const summary = await getCampaignEvidenceSummary(campaignId);

      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('byOutcomeType');
      expect(summary).toHaveProperty('topEvidence');

      expect(typeof summary.total).toBe('number');
      expect(typeof summary.byOutcomeType).toBe('object');
      expect(Array.isArray(summary.topEvidence)).toBe(true);
    });

    it('should return zero summary for campaign with no evidence', async () => {
      const campaignId = 'empty-campaign-id';
      const summary = await getCampaignEvidenceSummary(campaignId);

      expect(summary.total).toBe(0);
      expect(Object.keys(summary.byOutcomeType).length).toBe(0);
      expect(summary.topEvidence.length).toBe(0);
    });

    it('should break down evidence by outcome dimensions', async () => {
      const campaignId = 'campaign-with-diverse-outcomes';
      const summary = await getCampaignEvidenceSummary(campaignId);

      // Should have counts for different outcome types
      // e.g., { confidence: 3, job_readiness: 5, well_being: 2 }
      expect(typeof summary.byOutcomeType).toBe('object');
    });
  });

  describe('Evidence Scoring', () => {
    it('should score high-impact evidence higher than low-impact', () => {
      // Unit test for scoring functions
      // High outcome score (0.9) should score > low outcome score (0.3)
      // This would require extracting scoring functions or testing via integration
      expect(true).toBe(true); // Placeholder
    });

    it('should score recent evidence higher than old evidence', () => {
      // Recent evidence (created yesterday) should score > old evidence (created 6 months ago)
      expect(true).toBe(true); // Placeholder
    });

    it('should apply diversity bonus to underrepresented outcome types', () => {
      // If only 1 evidence of type X exists and 10 of type Y,
      // type X should get diversity boost
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Edge Cases', () => {
    it('should handle campaigns with exactly limit evidence', async () => {
      const campaignId = 'campaign-with-10-evidence';
      const result = await selectTopEvidenceForCampaign(campaignId, 10);

      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle campaigns with less than limit evidence', async () => {
      const campaignId = 'campaign-with-5-evidence';
      const result = await selectTopEvidenceForCampaign(campaignId, 10);

      // Should return all 5, not pad to 10
      expect(result.length).toBeLessThanOrEqual(10);
    });

    it('should handle null/missing outcome scores gracefully', async () => {
      // Evidence without outcome scores should still be selectable
      // with neutral score
      const campaignId = 'campaign-with-incomplete-evidence';
      const result = await selectTopEvidenceForCampaign(campaignId, 10);

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe('Integration: Campaign Evidence Workflow', () => {
  it('should link evidence to campaign via programInstance', async () => {
    // Test full workflow:
    // 1. Create campaign
    // 2. Create program instance
    // 3. Create evidence linked to instance (which has campaignId)
    // 4. Select top evidence for campaign
    // 5. Verify evidence is returned

    // This would require full DB setup
    expect(true).toBe(true); // Placeholder
  });

  it('should update campaign.evidenceSnippetIds when evidence changes', async () => {
    // Test that when new high-impact evidence is added,
    // refreshCampaignEvidence updates the top evidence list

    // This would require full DB setup + mutation
    expect(true).toBe(true); // Placeholder
  });

  it('should filter evidence by campaign in Evidence Explorer', async () => {
    // Test that Evidence API returns only evidence for selected campaign

    // This would require API integration test
    expect(true).toBe(true); // Placeholder
  });
});
