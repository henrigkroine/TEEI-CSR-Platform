/**
 * Integration test for dashboard route with demo data enabled
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import { existsSync, writeFileSync, unlinkSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('Dashboard with Demo Mode', () => {
  const testCsvPath = join(process.cwd(), 'data', 'demo-metrics.csv');
  const testCsvContent = `programme,participants,sessions,active_mentors,matches,completion,satisfaction,total_hours,volunteers,integration_avg,language_avg,job_readiness_avg,sroi_ratio,vis_score
language_connect,150,320,45,120,85.5,92.3,1250,30,0.75,0.82,0.68,4.2,78
mentorship,200,450,60,180,78.2,88.7,1800,40,0.70,0.65,0.72,4.5,82`;

  beforeAll(() => {
    // Ensure data directory exists
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    // Create test CSV file
    writeFileSync(testCsvPath, testCsvContent, 'utf-8');
  });

  afterAll(() => {
    // Clean up test CSV file
    if (existsSync(testCsvPath)) {
      unlinkSync(testCsvPath);
    }
  });

  it('should have demo CSV file in place', () => {
    expect(existsSync(testCsvPath)).toBe(true);
  });

  it('should parse demo CSV correctly', async () => {
    // This test verifies the CSV can be read and parsed
    // In a real integration test, you would:
    // 1. Start the dev server
    // 2. Make HTTP request to /api/demo/metrics
    // 3. Verify response structure

    const { getDemoDataService } = await import('../../src/lib/demo/demoDataService');
    const service = getDemoDataService({ csvPath: testCsvPath });

    const metrics = service.getMetrics();

    expect(metrics.language_connect.participants).toBe(150);
    expect(metrics.mentorship.participants).toBe(200);
    expect(metrics.aggregate.participants).toBe(350);
    expect(metrics.aggregate.sessions).toBe(770);
  });

  it('should return normalized metrics structure', async () => {
    const { getDemoDataService } = await import('../../src/lib/demo/demoDataService');
    const service = getDemoDataService({ csvPath: testCsvPath });

    const metrics = service.getMetrics();

    // Verify structure
    expect(metrics).toHaveProperty('language_connect');
    expect(metrics).toHaveProperty('mentorship');
    expect(metrics).toHaveProperty('aggregate');
    expect(metrics).toHaveProperty('lastUpdated');
    expect(metrics).toHaveProperty('csvPath');

    // Verify programme data
    expect(metrics.language_connect.programme).toBe('language_connect');
    expect(metrics.mentorship.programme).toBe('mentorship');

    // Verify aggregate calculations
    expect(metrics.aggregate.participants).toBe(
      metrics.language_connect.participants + metrics.mentorship.participants
    );
  });

  it('should handle missing CSV gracefully', async () => {
    const { getDemoDataService } = await import('../../src/lib/demo/demoDataService');
    const nonExistentPath = join(process.cwd(), 'data', 'non-existent.csv');
    const service = getDemoDataService({ csvPath: nonExistentPath });

    expect(() => service.getMetrics()).toThrow();
    expect(service.csvExists()).toBe(false);
  });
});
