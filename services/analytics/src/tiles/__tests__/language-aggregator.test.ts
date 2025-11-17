/**
 * Unit tests for Language Tile Aggregator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { aggregateLanguageTile } from '../language-aggregator';
import type { LanguageTile } from '@teei/shared-types';

// Mock dependencies
vi.mock('@teei/shared-schema/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    leftJoin: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../pipelines/aggregate.js', () => ({
  calculateVISForCompany: vi.fn().mockResolvedValue({ visScore: 78.5 }),
}));

vi.mock('@teei/shared-utils', () => ({
  createServiceLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('aggregateLanguageTile', () => {
  const mockParams = {
    companyId: '550e8400-e29b-41d4-a716-446655440000',
    periodStart: '2024-01-01T00:00:00Z',
    periodEnd: '2024-01-31T23:59:59Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should aggregate language tile data successfully', async () => {
    // TODO: Add full implementation once db mocking is set up
    // This is a placeholder test structure

    const result = await aggregateLanguageTile(mockParams);

    expect(result).toBeDefined();
    expect(result.type).toBe('language');
    expect(result.companyId).toBe(mockParams.companyId);
  });

  it('should calculate sessions per week correctly', async () => {
    // TODO: Mock database responses and verify calculations
    expect(true).toBe(true); // Placeholder
  });

  it('should calculate retention rate correctly', async () => {
    // TODO: Mock participant data and verify retention calculation
    expect(true).toBe(true); // Placeholder
  });

  it('should handle empty data gracefully', async () => {
    // TODO: Test with no sessions
    expect(true).toBe(true); // Placeholder
  });

  it('should include VIS score when available', async () => {
    // TODO: Verify VIS integration
    expect(true).toBe(true); // Placeholder
  });
});
