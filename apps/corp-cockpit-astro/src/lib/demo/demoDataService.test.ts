/**
 * Unit tests for Demo Data Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DemoDataService, normalizeMetrics, parseCSVRow } from './demoDataService';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { writeFileSync, unlinkSync, mkdirSync } from 'fs';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  statSync: vi.fn(),
  writeFileSync: vi.fn(),
  unlinkSync: vi.fn(),
  mkdirSync: vi.fn(),
}));

describe('DemoDataService', () => {
  const testCsvPath = '/tmp/test-demo-metrics.csv';
  const validCSV = `programme,participants,sessions,active_mentors,matches,completion,satisfaction,total_hours,volunteers
language_connect,150,320,45,120,85.5,92.3,1250,30
mentorship,200,450,60,180,78.2,88.7,1800,40`;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('parseCSVRow', () => {
    it('should parse a valid CSV row', () => {
      const headers = ['programme', 'participants', 'sessions', 'active_mentors', 'matches', 'completion', 'satisfaction'];
      const row = 'language_connect,150,320,45,120,85.5,92.3';

      const result = parseCSVRow(row, headers);

      expect(result).toEqual({
        programme: 'language_connect',
        participants: 150,
        sessions: 320,
        active_mentors: 45,
        matches: 120,
        completion: 85.5,
        satisfaction: 92.3,
      });
    });

    it('should handle quoted values', () => {
      const headers = ['programme', 'participants'];
      const row = '"language_connect","150"';

      const result = parseCSVRow(row, headers);

      expect(result?.programme).toBe('language_connect');
      expect(result?.participants).toBe(150);
    });

    it('should return null for invalid programme', () => {
      const headers = ['programme', 'participants'];
      const row = 'invalid_programme,150';

      const result = parseCSVRow(row, headers);

      expect(result).toBeNull();
    });

    it('should return null for mismatched column count', () => {
      const headers = ['programme', 'participants', 'sessions'];
      const row = 'language_connect,150';

      const result = parseCSVRow(row, headers);

      expect(result).toBeNull();
    });
  });

  describe('normalizeMetrics', () => {
    it('should normalize metrics by programme', () => {
      const metrics = [
        {
          programme: 'language_connect' as const,
          participants: 150,
          sessions: 320,
          active_mentors: 45,
          matches: 120,
          completion: 85.5,
          satisfaction: 92.3,
        },
        {
          programme: 'mentorship' as const,
          participants: 200,
          sessions: 450,
          active_mentors: 60,
          matches: 180,
          completion: 78.2,
          satisfaction: 88.7,
        },
      ];

      const result = normalizeMetrics(metrics);

      expect(result.language_connect.participants).toBe(150);
      expect(result.mentorship.participants).toBe(200);
      expect(result.aggregate.participants).toBe(350);
      expect(result.aggregate.sessions).toBe(770);
    });

    it('should handle missing programmes with defaults', () => {
      const metrics = [
        {
          programme: 'language_connect' as const,
          participants: 150,
          sessions: 320,
          active_mentors: 45,
          matches: 120,
          completion: 85.5,
          satisfaction: 92.3,
        },
      ];

      const result = normalizeMetrics(metrics);

      expect(result.language_connect.participants).toBe(150);
      expect(result.mentorship.participants).toBe(0);
      expect(result.aggregate.participants).toBe(150);
    });
  });

  describe('DemoDataService', () => {
    it('should read and parse CSV file', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(validCSV);

      const service = new DemoDataService({ csvPath: testCsvPath });
      const metrics = service.getMetrics();

      expect(metrics.language_connect.participants).toBe(150);
      expect(metrics.mentorship.participants).toBe(200);
      expect(metrics.aggregate.participants).toBe(350);
    });

    it('should throw error if CSV file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false);

      const service = new DemoDataService({ csvPath: testCsvPath });

      expect(() => service.getMetrics()).toThrow('CSV file not found');
    });

    it('should cache metrics', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(validCSV);

      const service = new DemoDataService({ csvPath: testCsvPath });

      // First call
      const metrics1 = service.getMetrics();

      // Second call should use cache (readFileSync should only be called once)
      const metrics2 = service.getMetrics();

      expect(metrics1).toEqual(metrics2);
      // Verify readFileSync was called only once (cached)
      expect(vi.mocked(readFileSync)).toHaveBeenCalledTimes(1);
    });

    it('should get programme-specific metrics', () => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFileSync).mockReturnValue(validCSV);

      const service = new DemoDataService({ csvPath: testCsvPath });
      const metrics = service.getProgrammeMetrics('language_connect');

      expect(metrics.programme).toBe('language_connect');
      expect(metrics.participants).toBe(150);
    });

    it('should check if CSV exists', () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const service = new DemoDataService({ csvPath: testCsvPath });
      expect(service.csvExists()).toBe(true);
    });
  });
});
