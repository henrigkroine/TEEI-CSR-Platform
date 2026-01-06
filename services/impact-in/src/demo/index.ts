/**
 * Demo Factory Seed Orchestrator
 *
 * Coordinates seeding of all event types for demo tenants
 */

import { assertDemoTenant, generateSalt, DEFAULT_DEMO_SALT } from '@teei/data-masker';
import type { DemoVolumeConfig, DemoRegion, DemoVertical, DEMO_VOLUME_CONFIGS } from '@teei/shared-types';
import type { SeedContext, BatchSeedResult } from './types.js';
import {
  generateVolunteerEvents,
  generateDonationEvents,
  generateSessionEvents,
  generateEnrollmentEvents,
  generatePlacementEvents,
} from './generators.js';

export * from './types.js';
export * from './generators.js';
export * from './time-utils.js';

/**
 * Seed all events for a demo tenant
 */
export async function seedDemoTenant(options: {
  tenantId: string;
  volumeConfig: DemoVolumeConfig;
  regions: DemoRegion[];
  vertical: DemoVertical;
  customSalt?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<BatchSeedResult[]> {
  // Safety: ensure demo tenant ID
  assertDemoTenant(options.tenantId);

  const salt = options.customSalt || DEFAULT_DEMO_SALT;
  const startDate = options.startDate || new Date(Date.now() - options.volumeConfig.monthsOfData * 30 * 24 * 60 * 60 * 1000);
  const endDate = options.endDate || new Date();

  // Create regional distribution (equal weight by default)
  const totalWeight = options.regions.length;
  const regionalDistribution = options.regions.map(region => ({
    region,
    weight: 1 / totalWeight,
  }));

  const context: SeedContext = {
    tenantId: options.tenantId,
    vertical: options.vertical,
    regions: regionalDistribution,
    timeDistribution: {
      startDate,
      endDate,
    },
    salt,
    idempotencyKey: `seed-${options.tenantId}-${Date.now()}`,
  };

  const results: BatchSeedResult[] = [];

  // Seed volunteer events
  console.log(`[Demo Factory] Seeding ${options.volumeConfig.volunteerEvents} volunteer events for ${options.tenantId}...`);
  const volunteerStart = Date.now();
  try {
    const volunteerEvents = generateVolunteerEvents(context, options.volumeConfig.volunteerEvents);
    // TODO: Write to database/event bus
    results.push({
      type: 'volunteer',
      generated: volunteerEvents.length,
      failed: 0,
      firstId: volunteerEvents[0]?.id || null,
      lastId: volunteerEvents[volunteerEvents.length - 1]?.id || null,
      durationMs: Date.now() - volunteerStart,
    });
  } catch (error) {
    console.error('[Demo Factory] Failed to seed volunteer events:', error);
    results.push({
      type: 'volunteer',
      generated: 0,
      failed: options.volumeConfig.volunteerEvents,
      firstId: null,
      lastId: null,
      durationMs: Date.now() - volunteerStart,
    });
  }

  // Seed donation events
  console.log(`[Demo Factory] Seeding ${options.volumeConfig.donationEvents} donation events for ${options.tenantId}...`);
  const donationStart = Date.now();
  try {
    const donationEvents = generateDonationEvents(context, options.volumeConfig.donationEvents);
    results.push({
      type: 'donation',
      generated: donationEvents.length,
      failed: 0,
      firstId: donationEvents[0]?.id || null,
      lastId: donationEvents[donationEvents.length - 1]?.id || null,
      durationMs: Date.now() - donationStart,
    });
  } catch (error) {
    console.error('[Demo Factory] Failed to seed donation events:', error);
    results.push({
      type: 'donation',
      generated: 0,
      failed: options.volumeConfig.donationEvents,
      firstId: null,
      lastId: null,
      durationMs: Date.now() - donationStart,
    });
  }

  // Seed session events
  console.log(`[Demo Factory] Seeding ${options.volumeConfig.sessionEvents} session events for ${options.tenantId}...`);
  const sessionStart = Date.now();
  try {
    const sessionEvents = generateSessionEvents(context, options.volumeConfig.sessionEvents);
    results.push({
      type: 'session',
      generated: sessionEvents.length,
      failed: 0,
      firstId: sessionEvents[0]?.id || null,
      lastId: sessionEvents[sessionEvents.length - 1]?.id || null,
      durationMs: Date.now() - sessionStart,
    });
  } catch (error) {
    console.error('[Demo Factory] Failed to seed session events:', error);
    results.push({
      type: 'session',
      generated: 0,
      failed: options.volumeConfig.sessionEvents,
      firstId: null,
      lastId: null,
      durationMs: Date.now() - sessionStart,
    });
  }

  // Seed enrollment events
  console.log(`[Demo Factory] Seeding ${options.volumeConfig.enrollmentEvents} enrollment events for ${options.tenantId}...`);
  const enrollmentStart = Date.now();
  try {
    const enrollmentEvents = generateEnrollmentEvents(context, options.volumeConfig.enrollmentEvents);
    results.push({
      type: 'enrollment',
      generated: enrollmentEvents.length,
      failed: 0,
      firstId: enrollmentEvents[0]?.id || null,
      lastId: enrollmentEvents[enrollmentEvents.length - 1]?.id || null,
      durationMs: Date.now() - enrollmentStart,
    });
  } catch (error) {
    console.error('[Demo Factory] Failed to seed enrollment events:', error);
    results.push({
      type: 'enrollment',
      generated: 0,
      failed: options.volumeConfig.enrollmentEvents,
      firstId: null,
      lastId: null,
      durationMs: Date.now() - enrollmentStart,
    });
  }

  // Seed placement events
  console.log(`[Demo Factory] Seeding ${options.volumeConfig.placementEvents} placement events for ${options.tenantId}...`);
  const placementStart = Date.now();
  try {
    const placementEvents = generatePlacementEvents(context, options.volumeConfig.placementEvents);
    results.push({
      type: 'placement',
      generated: placementEvents.length,
      failed: 0,
      firstId: placementEvents[0]?.id || null,
      lastId: placementEvents[placementEvents.length - 1]?.id || null,
      durationMs: Date.now() - placementStart,
    });
  } catch (error) {
    console.error('[Demo Factory] Failed to seed placement events:', error);
    results.push({
      type: 'placement',
      generated: 0,
      failed: options.volumeConfig.placementEvents,
      firstId: null,
      lastId: null,
      durationMs: Date.now() - placementStart,
    });
  }

  const totalGenerated = results.reduce((sum, r) => sum + r.generated, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);

  console.log(`[Demo Factory] Seeding complete for ${options.tenantId}: ${totalGenerated} events generated, ${totalFailed} failed in ${totalDuration}ms`);

  return results;
}

/**
 * Quick demo tenant seeding helper
 */
export async function quickSeedDemo(
  tenantId: string,
  size: 'small' | 'medium' | 'large' = 'small'
): Promise<BatchSeedResult[]> {
  const { DEMO_VOLUME_CONFIGS } = await import('@teei/shared-types');

  return seedDemoTenant({
    tenantId,
    volumeConfig: DEMO_VOLUME_CONFIGS[size],
    regions: ['NA'],
    vertical: 'technology',
  });
}
