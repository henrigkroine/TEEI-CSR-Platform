/**
 * Demo Data Service
 *
 * Reads CSV data and normalizes metrics for dashboard widgets.
 * Supports programme segmentation (language_connect, mentorship).
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

export interface DemoMetrics {
  programme: 'language_connect' | 'mentorship';
  participants: number;
  sessions: number;
  active_mentors: number;
  matches: number;
  completion: number; // percentage
  satisfaction: number; // percentage (0-100)
  // Additional metrics
  total_hours?: number;
  volunteers?: number;
  integration_avg?: number;
  language_avg?: number;
  job_readiness_avg?: number;
  sroi_ratio?: number;
  vis_score?: number;
}

export interface NormalizedMetrics {
  language_connect: DemoMetrics;
  mentorship: DemoMetrics;
  aggregate: {
    participants: number;
    sessions: number;
    active_mentors: number;
    matches: number;
    completion: number;
    satisfaction: number;
    total_hours: number;
    volunteers: number;
  };
  lastUpdated: Date;
  csvPath: string;
}

export interface DemoDataServiceConfig {
  csvPath?: string;
  defaultCsvPath?: string;
}

/**
 * Parse CSV row into DemoMetrics
 */
function parseCSVRow(row: string, headers: string[]): Partial<DemoMetrics> | null {
  const values = row.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

  if (values.length !== headers.length) {
    return null;
  }

  const rowData: Record<string, string> = {};
  headers.forEach((header, index) => {
    rowData[header] = values[index];
  });

  const programme = rowData['programme']?.toLowerCase();
  if (programme !== 'language_connect' && programme !== 'mentorship') {
    return null;
  }

  return {
    programme: programme as 'language_connect' | 'mentorship',
    participants: parseInt(rowData['participants'] || '0', 10),
    sessions: parseInt(rowData['sessions'] || '0', 10),
    active_mentors: parseInt(rowData['active_mentors'] || '0', 10),
    matches: parseInt(rowData['matches'] || '0', 10),
    completion: parseFloat(rowData['completion'] || '0'),
    satisfaction: parseFloat(rowData['satisfaction'] || '0'),
    total_hours: rowData['total_hours'] ? parseInt(rowData['total_hours'], 10) : undefined,
    volunteers: rowData['volunteers'] ? parseInt(rowData['volunteers'], 10) : undefined,
    integration_avg: rowData['integration_avg'] ? parseFloat(rowData['integration_avg']) : undefined,
    language_avg: rowData['language_avg'] ? parseFloat(rowData['language_avg']) : undefined,
    job_readiness_avg: rowData['job_readiness_avg'] ? parseFloat(rowData['job_readiness_avg']) : undefined,
    sroi_ratio: rowData['sroi_ratio'] ? parseFloat(rowData['sroi_ratio']) : undefined,
    vis_score: rowData['vis_score'] ? parseFloat(rowData['vis_score']) : undefined,
  };
}

/**
 * Read and parse CSV file
 */
function readCSV(filePath: string): DemoMetrics[] {
  if (!existsSync(filePath)) {
    throw new Error(`CSV file not found: ${filePath}`);
  }

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(`CSV file must have at least a header row and one data row`);
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

  // Validate required headers
  const requiredHeaders = ['programme', 'participants', 'sessions', 'active_mentors', 'matches', 'completion', 'satisfaction'];
  const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`CSV missing required headers: ${missingHeaders.join(', ')}`);
  }

  const metrics: DemoMetrics[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parsed = parseCSVRow(lines[i], headers);
    if (parsed && parsed.programme) {
      metrics.push(parsed as DemoMetrics);
    }
  }

  return metrics;
}

/**
 * Normalize metrics by programme and aggregate
 */
function normalizeMetrics(metrics: DemoMetrics[]): NormalizedMetrics {
  const languageConnect = metrics.find(m => m.programme === 'language_connect') || {
    programme: 'language_connect' as const,
    participants: 0,
    sessions: 0,
    active_mentors: 0,
    matches: 0,
    completion: 0,
    satisfaction: 0,
  };

  const mentorship = metrics.find(m => m.programme === 'mentorship') || {
    programme: 'mentorship' as const,
    participants: 0,
    sessions: 0,
    active_mentors: 0,
    matches: 0,
    completion: 0,
    satisfaction: 0,
  };

  const aggregate = {
    participants: languageConnect.participants + mentorship.participants,
    sessions: languageConnect.sessions + mentorship.sessions,
    active_mentors: languageConnect.active_mentors + mentorship.active_mentors,
    matches: languageConnect.matches + mentorship.matches,
    completion: metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.completion, 0) / metrics.length
      : 0,
    satisfaction: metrics.length > 0
      ? metrics.reduce((sum, m) => sum + m.satisfaction, 0) / metrics.length
      : 0,
    total_hours: (languageConnect.total_hours || 0) + (mentorship.total_hours || 0),
    volunteers: (languageConnect.volunteers || 0) + (mentorship.volunteers || 0),
  };

  return {
    language_connect: languageConnect,
    mentorship: mentorship,
    aggregate,
    lastUpdated: new Date(),
    csvPath: '', // Will be set by caller
  };
}

/**
 * Demo Data Service
 */
export class DemoDataService {
  private csvPath: string;
  private cache: NormalizedMetrics | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number = 60000; // 1 minute

  constructor(config: DemoDataServiceConfig = {}) {
    // Default to data/demo-metrics.csv relative to project root
    const defaultPath = config.defaultCsvPath || join(process.cwd(), 'data', 'demo-metrics.csv');
    this.csvPath = config.csvPath || defaultPath;
  }

  /**
   * Get normalized metrics (with caching)
   */
  getMetrics(): NormalizedMetrics {
    const now = Date.now();

    // Return cached data if still valid
    if (this.cache && (now - this.cacheTimestamp) < this.cacheTTL) {
      return this.cache;
    }

    // Read and parse CSV
    const metrics = readCSV(this.csvPath);
    const normalized = normalizeMetrics(metrics);
    normalized.csvPath = this.csvPath;

    // Update cache
    this.cache = normalized;
    this.cacheTimestamp = now;

    return normalized;
  }

  /**
   * Get metrics for a specific programme
   */
  getProgrammeMetrics(programme: 'language_connect' | 'mentorship'): DemoMetrics {
    const metrics = this.getMetrics();
    return metrics[programme];
  }

  /**
   * Get aggregate metrics across all programmes
   */
  getAggregateMetrics() {
    const metrics = this.getMetrics();
    return metrics.aggregate;
  }

  /**
   * Check if CSV file exists
   */
  csvExists(): boolean {
    return existsSync(this.csvPath);
  }

  /**
   * Get CSV file info
   */
  getCSVInfo(): { path: string; exists: boolean; lastModified?: Date; size?: number } {
    const exists = this.csvExists();
    let lastModified: Date | undefined;
    let size: number | undefined;

    if (exists) {
      const stats = statSync(this.csvPath);
      lastModified = stats.mtime;
      size = stats.size;
    }

    return {
      path: this.csvPath,
      exists,
      lastModified,
      size,
    };
  }

  /**
   * Clear cache (force refresh on next getMetrics call)
   */
  clearCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
}

// Singleton instance
let demoDataServiceInstance: DemoDataService | null = null;

/**
 * Get or create demo data service instance
 */
export function getDemoDataService(config?: DemoDataServiceConfig): DemoDataService {
  if (!demoDataServiceInstance) {
    demoDataServiceInstance = new DemoDataService(config);
  }
  return demoDataServiceInstance;
}
