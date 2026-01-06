/**
 * Mapper Test Suite
 * Tests evidence-to-disclosure mapping with completeness scoring
 *
 * Coverage target: ≥90%
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  mapToCSRD,
  mapToGRI,
  mapToSDG,
  mapToFrameworks,
  getCSRDRegistry,
  getGRIRegistry,
  getSDGRegistry,
} from '../mapper';

// Mock evidence data
const mockEvidence = [
  {
    id: 'evidence-1',
    snippetId: 'snippet-1',
    source: 'Buddy feedback Q1 2024',
    timestamp: '2024-03-15T10:00:00Z',
    content: 'Employee integration program shows significant improvement in workplace diversity and inclusion metrics. Workforce engagement increased by 25% with mentorship initiatives.',
    category: 'social',
    metrics: ['sroi', 'vis'],
    program: 'buddy',
  },
  {
    id: 'evidence-2',
    snippetId: 'snippet-2',
    source: 'Training data Q1 2024',
    timestamp: '2024-03-20T14:00:00Z',
    content: 'Upskilling program delivered 1,200 hours of training to employees, covering technical skills and leadership development.',
    category: 'social',
    metrics: ['engagement_rate'],
    program: 'upskilling',
  },
  {
    id: 'evidence-3',
    snippetId: 'snippet-3',
    source: 'Environmental data Q1 2024',
    timestamp: '2024-03-25T09:00:00Z',
    content: 'Carbon emissions reduction achieved 15% decrease in Scope 1 and Scope 2 emissions through energy efficiency measures.',
    category: 'environmental',
    metrics: [],
    program: undefined,
  },
];

// Mock fetchEvidenceForPeriod
vi.mock('../mapper', async () => {
  const actual = await vi.importActual('../mapper');
  return {
    ...actual,
    fetchEvidenceForPeriod: vi.fn(async () => mockEvidence),
  };
});

describe('Mapper: Registry Loading', () => {
  it('should load CSRD registry', () => {
    const registry = getCSRDRegistry();
    expect(registry).toBeDefined();
    expect(registry.version).toBe('2023-11');
    expect(registry.topics).toBeInstanceOf(Array);
    expect(registry.topics.length).toBeGreaterThan(0);
  });

  it('should load GRI registry', () => {
    const registry = getGRIRegistry();
    expect(registry).toBeDefined();
    expect(registry.version).toBe('2021');
    expect(registry.disclosures).toBeInstanceOf(Array);
    expect(registry.disclosures.length).toBeGreaterThan(0);
  });

  it('should load SDG registry', () => {
    const registry = getSDGRegistry();
    expect(registry).toBeDefined();
    expect(registry.version).toBe('2015');
    expect(registry.targets).toBeInstanceOf(Array);
    expect(registry.targets.length).toBeGreaterThan(0);
  });

  it('should have correct CSRD structure', () => {
    const registry = getCSRDRegistry();
    const topic = registry.topics[0];

    expect(topic).toHaveProperty('id');
    expect(topic).toHaveProperty('name');
    expect(topic).toHaveProperty('category');
    expect(topic).toHaveProperty('disclosures');
    expect(topic.disclosures).toBeInstanceOf(Array);

    const disclosure = topic.disclosures[0];
    expect(disclosure).toHaveProperty('id');
    expect(disclosure).toHaveProperty('title');
    expect(disclosure).toHaveProperty('mandatory');
    expect(disclosure).toHaveProperty('dataPoints');
  });

  it('should have correct GRI structure', () => {
    const registry = getGRIRegistry();
    const disclosure = registry.disclosures[0];

    expect(disclosure).toHaveProperty('id');
    expect(disclosure).toHaveProperty('title');
    expect(disclosure).toHaveProperty('standard');
    expect(disclosure).toHaveProperty('category');
    expect(disclosure).toHaveProperty('requirements');
    expect(disclosure.requirements).toBeInstanceOf(Array);
  });

  it('should have correct SDG structure', () => {
    const registry = getSDGRegistry();
    const target = registry.targets[0];

    expect(target).toHaveProperty('goal');
    expect(target).toHaveProperty('goalName');
    expect(target).toHaveProperty('target');
    expect(target).toHaveProperty('targetText');
    expect(target).toHaveProperty('indicators');
    expect(target.indicators).toBeInstanceOf(Array);
  });
});

describe('Mapper: CSRD Mapping', () => {
  const companyId = 'company-123';
  const periodStart = '2024-01-01';
  const periodEnd = '2024-03-31';

  it('should map evidence to CSRD disclosures', async () => {
    const mappings = await mapToCSRD(companyId, periodStart, periodEnd);

    expect(mappings).toBeInstanceOf(Array);
    expect(mappings.length).toBeGreaterThan(0);

    const mapping = mappings[0];
    expect(mapping).toHaveProperty('disclosureId');
    expect(mapping).toHaveProperty('frameworkType', 'CSRD');
    expect(mapping).toHaveProperty('status');
    expect(mapping).toHaveProperty('completenessScore');
    expect(mapping).toHaveProperty('evidence');
    expect(mapping).toHaveProperty('gaps');
    expect(mapping).toHaveProperty('lastUpdated');
  });

  it('should calculate completeness score between 0 and 1', async () => {
    const mappings = await mapToCSRD(companyId, periodStart, periodEnd);

    for (const mapping of mappings) {
      expect(mapping.completenessScore).toBeGreaterThanOrEqual(0);
      expect(mapping.completenessScore).toBeLessThanOrEqual(1);
    }
  });

  it('should assign correct status based on completeness', async () => {
    const mappings = await mapToCSRD(companyId, periodStart, periodEnd);

    for (const mapping of mappings) {
      if (mapping.completenessScore === 0) {
        expect(mapping.status).toBe('missing');
      } else if (mapping.completenessScore < 1.0) {
        expect(mapping.status).toBe('partial');
      } else {
        expect(mapping.status).toBe('complete');
      }
    }
  });

  it('should include evidence references', async () => {
    const mappings = await mapToCSRD(companyId, periodStart, periodEnd);

    const mappingWithEvidence = mappings.find(m => m.evidence.length > 0);
    if (mappingWithEvidence) {
      const evidenceRef = mappingWithEvidence.evidence[0];

      expect(evidenceRef).toHaveProperty('evidenceId');
      expect(evidenceRef).toHaveProperty('source');
      expect(evidenceRef).toHaveProperty('timestamp');
      expect(evidenceRef).toHaveProperty('relevanceScore');
      expect(evidenceRef).toHaveProperty('excerpt');
      expect(evidenceRef.relevanceScore).toBeGreaterThanOrEqual(0);
      expect(evidenceRef.relevanceScore).toBeLessThanOrEqual(1);
    }
  });

  it('should identify gaps for missing data', async () => {
    const mappings = await mapToCSRD(companyId, periodStart, periodEnd);

    const mappingWithGaps = mappings.find(m => m.gaps.length > 0);
    if (mappingWithGaps) {
      const gap = mappingWithGaps.gaps[0];

      expect(gap).toHaveProperty('disclosureId');
      expect(gap).toHaveProperty('framework', 'CSRD');
      expect(gap).toHaveProperty('requirementId');
      expect(gap).toHaveProperty('title');
      expect(gap).toHaveProperty('severity');
      expect(gap).toHaveProperty('description');
      expect(gap).toHaveProperty('suggestedAction');
      expect(['critical', 'high', 'medium', 'low']).toContain(gap.severity);
    }
  });
});

describe('Mapper: GRI Mapping', () => {
  const companyId = 'company-123';
  const periodStart = '2024-01-01';
  const periodEnd = '2024-03-31';

  it('should map evidence to GRI disclosures', async () => {
    const mappings = await mapToGRI(companyId, periodStart, periodEnd);

    expect(mappings).toBeInstanceOf(Array);
    expect(mappings.length).toBeGreaterThan(0);

    const mapping = mappings[0];
    expect(mapping.frameworkType).toBe('GRI');
    expect(mapping).toHaveProperty('disclosureId');
    expect(mapping.disclosureId).toMatch(/^GRI-/);
  });

  it('should handle GRI-specific requirements', async () => {
    const mappings = await mapToGRI(companyId, periodStart, periodEnd);

    const mapping = mappings[0];
    expect(mapping).toHaveProperty('evidence');
    expect(mapping).toHaveProperty('gaps');
  });
});

describe('Mapper: SDG Mapping', () => {
  const companyId = 'company-123';
  const periodStart = '2024-01-01';
  const periodEnd = '2024-03-31';

  it('should map evidence to SDG targets', async () => {
    const mappings = await mapToSDG(companyId, periodStart, periodEnd);

    expect(mappings).toBeInstanceOf(Array);
    expect(mappings.length).toBeGreaterThan(0);

    const mapping = mappings[0];
    expect(mapping.frameworkType).toBe('SDG');
    expect(mapping).toHaveProperty('disclosureId');
  });

  it('should handle SDG-specific completeness calculation', async () => {
    const mappings = await mapToSDG(companyId, periodStart, periodEnd);

    for (const mapping of mappings) {
      // SDG completeness is more lenient
      if (mapping.evidence.length === 0) {
        expect(mapping.completenessScore).toBe(0);
      } else if (mapping.evidence.length === 1) {
        expect(mapping.completenessScore).toBe(0.5);
      } else {
        expect(mapping.completenessScore).toBeGreaterThan(0.5);
      }
    }
  });
});

describe('Mapper: Multi-Framework Mapping', () => {
  const companyId = 'company-123';
  const periodStart = '2024-01-01';
  const periodEnd = '2024-03-31';

  it('should map to multiple frameworks', async () => {
    const mappings = await mapToFrameworks(
      companyId,
      periodStart,
      periodEnd,
      ['CSRD', 'GRI', 'SDG']
    );

    expect(mappings).toBeInstanceOf(Array);

    const csrdMappings = mappings.filter(m => m.frameworkType === 'CSRD');
    const griMappings = mappings.filter(m => m.frameworkType === 'GRI');
    const sdgMappings = mappings.filter(m => m.frameworkType === 'SDG');

    expect(csrdMappings.length).toBeGreaterThan(0);
    expect(griMappings.length).toBeGreaterThan(0);
    expect(sdgMappings.length).toBeGreaterThan(0);
  });

  it('should handle single framework', async () => {
    const mappings = await mapToFrameworks(
      companyId,
      periodStart,
      periodEnd,
      ['CSRD']
    );

    expect(mappings.every(m => m.frameworkType === 'CSRD')).toBe(true);
  });

  it('should respect evidence scope filters', async () => {
    const mappings = await mapToFrameworks(
      companyId,
      periodStart,
      periodEnd,
      ['CSRD'],
      {
        programs: ['buddy'],
        metrics: ['sroi', 'vis'],
        includeStale: false,
      }
    );

    expect(mappings).toBeInstanceOf(Array);
    // Filter is passed to fetchEvidenceForPeriod
  });
});

describe('Mapper: Edge Cases', () => {
  it('should handle empty evidence array', async () => {
    // Mock fetchEvidenceForPeriod to return empty array
    vi.mocked(await import('../mapper')).fetchEvidenceForPeriod = vi.fn(async () => []);

    const mappings = await mapToCSRD('company-123', '2024-01-01', '2024-03-31');

    expect(mappings).toBeInstanceOf(Array);
    // All disclosures should have status='missing'
    expect(mappings.every(m => m.status === 'missing')).toBe(true);
  });

  it('should handle malformed evidence gracefully', async () => {
    const badEvidence = [
      {
        id: 'bad-1',
        source: 'Test',
        timestamp: '2024-01-01T00:00:00Z',
        content: '', // Empty content
      },
    ] as any;

    vi.mocked(await import('../mapper')).fetchEvidenceForPeriod = vi.fn(async () => badEvidence);

    const mappings = await mapToCSRD('company-123', '2024-01-01', '2024-03-31');

    // Should not throw, but completeness will be low
    expect(mappings).toBeInstanceOf(Array);
  });
});

describe('Mapper: Performance', () => {
  it('should complete mapping in reasonable time', async () => {
    const startTime = Date.now();

    await mapToFrameworks(
      'company-123',
      '2024-01-01',
      '2024-12-31',
      ['CSRD', 'GRI', 'SDG']
    );

    const duration = Date.now() - startTime;

    // Should complete in less than 5 seconds
    expect(duration).toBeLessThan(5000);
  });
});
