/**
 * Region Selector Tests
 * Tests for region-aware model selection and policy enforcement
 */

import { describe, it, expect } from 'vitest';
import {
  selectRegionalEndpoint,
  validateRegion,
  getAvailableRegions,
  RegionPolicyError,
} from './region-selector.js';
import { DataRegion, RegionPolicy } from './types.js';

describe('Region Selector', () => {
  describe('selectRegionalEndpoint', () => {
    it('should select preferred region when available', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['us', 'eu'],
        preferredRegion: 'eu',
        enforceStrict: true,
      };

      const endpoint = selectRegionalEndpoint('gpt-4o-mini', undefined, policy);

      expect(endpoint.region).toBe('eu');
      expect(endpoint.modelId).toBe('gpt-4o-mini');
    });

    it('should use request region if allowed', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['us', 'eu', 'uk'],
        enforceStrict: true,
      };

      const endpoint = selectRegionalEndpoint('gpt-4o-mini', 'uk', policy);

      expect(endpoint.region).toBe('uk');
    });

    it('should block disallowed regions in strict mode', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['eu'],
        enforceStrict: true,
      };

      expect(() => {
        selectRegionalEndpoint('gpt-4o-mini', 'us', policy);
      }).toThrow(RegionPolicyError);
    });

    it('should allow any region with global policy', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['global'],
        enforceStrict: false,
      };

      const endpointUs = selectRegionalEndpoint('gpt-4o-mini', 'us', policy);
      const endpointEu = selectRegionalEndpoint('gpt-4o-mini', 'eu', policy);

      expect(endpointUs.region).toBe('us');
      expect(endpointEu.region).toBe('eu');
    });

    it('should fallback to allowed region when preferred unavailable', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['us', 'eu'],
        preferredRegion: 'uk', // Not available for this model
        enforceStrict: true,
      };

      const endpoint = selectRegionalEndpoint('gemini-1.5-flash', undefined, policy);

      // gemini-1.5-flash is available in US, EU, AP
      expect(['us', 'eu']).toContain(endpoint.region);
    });

    it('should use fallback region when specified', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['us', 'eu'],
        preferredRegion: 'ap',
        fallbackRegion: 'us',
        enforceStrict: true,
      };

      const endpoint = selectRegionalEndpoint('claude-3-5-sonnet-20241022', undefined, policy);

      // Claude is not available in AP for our config
      expect(endpoint.region).toBe('us');
    });
  });

  describe('validateRegion', () => {
    it('should allow region in allowed list', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['us', 'eu'],
        enforceStrict: true,
      };

      const result = validateRegion('us', policy);

      expect(result.allowed).toBe(true);
    });

    it('should block region not in allowed list (strict mode)', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['eu'],
        enforceStrict: true,
      };

      const result = validateRegion('us', policy);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowed list');
    });

    it('should allow any region with global allowlist', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['global'],
        enforceStrict: true,
      };

      const resultUs = validateRegion('us', policy);
      const resultEu = validateRegion('eu', policy);
      const resultAp = validateRegion('ap', policy);

      expect(resultUs.allowed).toBe(true);
      expect(resultEu.allowed).toBe(true);
      expect(resultAp.allowed).toBe(true);
    });

    it('should allow cross-region in non-strict mode', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['eu'],
        enforceStrict: false,
      };

      const result = validateRegion('us', policy);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('not strict');
    });
  });

  describe('getAvailableRegions', () => {
    it('should return available regions for gpt-4o-mini', () => {
      const regions = getAvailableRegions('gpt-4o-mini');

      expect(regions).toContain('us');
      expect(regions).toContain('eu');
      expect(regions).toContain('uk');
      expect(regions).toContain('ap');
    });

    it('should return available regions for claude', () => {
      const regions = getAvailableRegions('claude-3-5-sonnet-20241022');

      expect(regions).toContain('us');
      expect(regions).toContain('eu');
      expect(regions).toContain('uk');
    });

    it('should return empty array for unknown model', () => {
      const regions = getAvailableRegions('unknown-model');

      expect(regions).toEqual([]);
    });
  });

  describe('RegionPolicyError', () => {
    it('should contain region information', () => {
      const error = new RegionPolicyError(
        'Region us not allowed',
        'us',
        ['eu', 'uk']
      );

      expect(error.message).toBe('Region us not allowed');
      expect(error.attemptedRegion).toBe('us');
      expect(error.allowedRegions).toEqual(['eu', 'uk']);
      expect(error.name).toBe('RegionPolicyError');
    });
  });

  describe('Cross-region blocking scenarios', () => {
    it('should block US→EU data transfer when enforcing EU-only', () => {
      const euOnlyPolicy: RegionPolicy = {
        allowedRegions: ['eu'],
        enforceStrict: true,
      };

      expect(() => {
        selectRegionalEndpoint('gpt-4o', 'us', euOnlyPolicy);
      }).toThrow('Region us is not allowed by policy');
    });

    it('should allow EU→UK transfer when both are allowed', () => {
      const policy: RegionPolicy = {
        allowedRegions: ['eu', 'uk'],
        enforceStrict: true,
      };

      const endpoint = selectRegionalEndpoint('claude-3-5-sonnet-20241022', 'uk', policy);

      expect(endpoint.region).toBe('uk');
    });

    it('should enforce GDPR-compliant regions', () => {
      const gdprPolicy: RegionPolicy = {
        allowedRegions: ['eu', 'uk'], // GDPR regions only
        enforceStrict: true,
      };

      const validation = validateRegion('us', gdprPolicy);

      expect(validation.allowed).toBe(false);
    });
  });
});
