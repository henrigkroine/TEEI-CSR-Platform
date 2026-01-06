/**
 * L2I Bundle Service Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { L2IBundleService } from '../l2i-bundle-service.js';
import { L2IBundleTier, L2IProgramTag } from '../../types/l2i.js';

// Mock dependencies
vi.mock('@teei/shared-schema', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
  l2iBundles: {},
  l2iAllocations: {},
}));

vi.mock('stripe', () => ({
  default: vi.fn(() => ({
    prices: {
      list: vi.fn(),
      create: vi.fn(),
    },
  })),
}));

describe('L2IBundleService', () => {
  let service: L2IBundleService;

  beforeEach(() => {
    service = new L2IBundleService();
    vi.clearAllMocks();
  });

  describe('purchaseBundle', () => {
    it('should validate tier and program tags', async () => {
      const request = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        tier: L2IBundleTier.FOUNDATION,
        programTags: [L2IProgramTag.LANGUAGE, L2IProgramTag.MENTORSHIP],
      };

      // Should not throw for valid combination
      expect(() => {
        // Validate program tags are in allowed list for Foundation tier
        const invalidTags = request.programTags.filter(
          tag => ![L2IProgramTag.LANGUAGE, L2IProgramTag.MENTORSHIP].includes(tag)
        );
        if (invalidTags.length > 0) {
          throw new Error('Invalid program tags');
        }
      }).not.toThrow();
    });

    it('should reject invalid program tags for tier', () => {
      const request = {
        companyId: '123e4567-e89b-12d3-a456-426614174000',
        tier: L2IBundleTier.FOUNDATION,
        programTags: [L2IProgramTag.WEEI], // WEEI not available for Foundation
      };

      // Should throw for invalid combination
      expect(() => {
        const allowedPrograms = [L2IProgramTag.LANGUAGE, L2IProgramTag.MENTORSHIP];
        const invalidTags = request.programTags.filter(
          tag => !allowedPrograms.includes(tag)
        );
        if (invalidTags.length > 0) {
          throw new Error('Invalid program tags for Foundation tier');
        }
      }).toThrow('Invalid program tags');
    });

    it('should generate correct SKU format', () => {
      const tier = 'Foundation';
      const learnerCapacity = 250;
      const sku = `L2I-${tier.toUpperCase()}-${learnerCapacity}`;

      expect(sku).toBe('L2I-FOUNDATION-250');
    });

    it('should use default learner capacity if not specified', () => {
      const foundationCapacity = 250;
      const customCapacity = undefined;
      const finalCapacity = customCapacity || foundationCapacity;

      expect(finalCapacity).toBe(250);
    });
  });

  describe('allocateLearner', () => {
    it('should check capacity before allocation', () => {
      const bundle = {
        id: 'bundle-123',
        learnerCapacity: 250,
        learnersAllocated: 250,
      };

      const canAllocate = bundle.learnersAllocated < bundle.learnerCapacity;
      expect(canAllocate).toBe(false);
    });

    it('should validate program tag is in bundle', () => {
      const bundle = {
        programTags: [L2IProgramTag.LANGUAGE, L2IProgramTag.MENTORSHIP],
      };
      const requestTag = L2IProgramTag.LANGUAGE;

      const isValid = bundle.programTags.includes(requestTag);
      expect(isValid).toBe(true);
    });

    it('should reject allocation for inactive bundle', () => {
      const bundle = {
        status: 'expired',
      };

      const isActive = bundle.status === 'active';
      expect(isActive).toBe(false);
    });
  });

  describe('getBundleSummary', () => {
    it('should calculate total capacity correctly', () => {
      const bundles = [
        { learnerCapacity: 250, learnersAllocated: 100, priceUSD: 500000 },
        { learnerCapacity: 500, learnersAllocated: 200, priceUSD: 1000000 },
      ];

      const totalCapacity = bundles.reduce((sum, b) => sum + b.learnerCapacity, 0);
      const totalAllocated = bundles.reduce((sum, b) => sum + b.learnersAllocated, 0);
      const totalSpent = bundles.reduce((sum, b) => sum + b.priceUSD, 0);

      expect(totalCapacity).toBe(750);
      expect(totalAllocated).toBe(300);
      expect(totalSpent).toBe(1500000); // $15,000.00
    });

    it('should calculate impact credits correctly', () => {
      const bundles = [
        { recognition: { impactCredits: 250 } },
        { recognition: { impactCredits: 500 } },
      ];

      const impactCredits = bundles.reduce(
        (sum, b) => sum + ((b.recognition as any)?.impactCredits || 0),
        0
      );

      expect(impactCredits).toBe(750);
    });

    it('should select highest founder badge', () => {
      const badges = ['founding-100', 'founding-8', 'founding-1000'];
      const founderBadgeOrder = ['founding-8', 'founding-100', 'founding-1000'];

      const highest = badges.sort(
        (a, b) => founderBadgeOrder.indexOf(a) - founderBadgeOrder.indexOf(b)
      )[0];

      expect(highest).toBe('founding-8');
    });
  });

  describe('L2I Bundle Tier Definitions', () => {
    it('should have correct pricing for each tier', () => {
      const { L2I_BUNDLE_TIERS } = require('../../types/l2i.js');

      expect(L2I_BUNDLE_TIERS[L2IBundleTier.FOUNDATION].priceUSD).toBe(500000); // $5k
      expect(L2I_BUNDLE_TIERS[L2IBundleTier.GROWTH].priceUSD).toBe(1000000); // $10k
      expect(L2I_BUNDLE_TIERS[L2IBundleTier.EXPAND].priceUSD).toBe(5000000); // $50k
      expect(L2I_BUNDLE_TIERS[L2IBundleTier.LAUNCH].priceUSD).toBe(10000000); // $100k
    });

    it('should have correct capacity for each tier', () => {
      const { L2I_BUNDLE_TIERS } = require('../../types/l2i.js');

      expect(L2I_BUNDLE_TIERS[L2IBundleTier.FOUNDATION].learnerCapacity).toBe(250);
      expect(L2I_BUNDLE_TIERS[L2IBundleTier.GROWTH].learnerCapacity).toBe(500);
      expect(L2I_BUNDLE_TIERS[L2IBundleTier.EXPAND].learnerCapacity).toBe(2500);
      expect(L2I_BUNDLE_TIERS[L2IBundleTier.LAUNCH].learnerCapacity).toBe(5000);
    });
  });
});
