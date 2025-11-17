/**
 * Demo seed generator types
 */

import type { DemoRegion, DemoVertical, DemoEventType } from '@teei/shared-types';

/**
 * Time distribution for generating realistic event patterns
 */
export interface TimeDistribution {
  startDate: Date;
  endDate: Date;
  peakMonths?: number[]; // Months with higher activity (1-12)
  lowMonths?: number[]; // Months with lower activity
  weekdayBias?: number; // 0-1, higher = more weekday events
  workHoursBias?: number; // 0-1, higher = more 9-5 events
}

/**
 * Regional distribution for multi-region tenants
 */
export interface RegionalDistribution {
  region: DemoRegion;
  weight: number; // 0-1, portion of events in this region
}

/**
 * Seeding context with all configuration
 */
export interface SeedContext {
  tenantId: string;
  vertical: DemoVertical;
  regions: RegionalDistribution[];
  timeDistribution: TimeDistribution;
  salt: string;
  idempotencyKey: string;
}

/**
 * Generated event with metadata
 */
export interface GeneratedEvent<T = unknown> {
  id: string;
  tenantId: string;
  type: DemoEventType;
  timestamp: string; // ISO
  region: DemoRegion;
  payload: T;
  metadata: {
    generated: true;
    generator: string;
    version: string;
  };
}

/**
 * Batch seeding result
 */
export interface BatchSeedResult {
  type: DemoEventType;
  generated: number;
  failed: number;
  firstId: string | null;
  lastId: string | null;
  durationMs: number;
}
