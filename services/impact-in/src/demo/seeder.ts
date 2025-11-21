/**
 * Demo Seeder
 * Orchestrates all event generators and persists to staging
 */

import type {
  CreateDemoTenantRequest,
  SeedResult,
  SeedEventResult,
  SIZE_CONFIGS,
} from '@teei/shared-types/demo';
import {
  VolunteerGenerator,
  DonationGenerator,
  SessionGenerator,
  EnrollmentGenerator,
  BuddyGenerator,
  type GeneratorConfig,
} from './generators';

/**
 * Seed configuration
 */
export interface SeedConfig {
  /**
   * Demo tenant request
   */
  request: CreateDemoTenantRequest;

  /**
   * Master salt for masking
   */
  masterSalt: string;

  /**
   * Whether to persist events to database
   * @default true
   */
  persist?: boolean;

  /**
   * Progress callback
   */
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Demo Seeder
 * Coordinates all event generation and persistence
 */
export class DemoSeeder {
  private config: SeedConfig;

  constructor(config: SeedConfig) {
    this.config = {
      persist: true,
      ...config,
    };
  }

  /**
   * Seed all events for a demo tenant
   */
  async seed(): Promise<SeedResult> {
    const startTime = Date.now();
    const results: SeedEventResult[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    const tenantId = `demo-${this.config.request.tenantName}`;

    try {
      // Get size configuration
      const sizeConfig = this.getSizeConfig();

      // Create base generator config
      const generatorConfig: GeneratorConfig = {
        tenantId,
        masterSalt: this.config.masterSalt,
        size: this.config.request.size,
        regions: this.config.request.regions,
        vertical: this.config.request.vertical,
        timeRangeMonths: this.config.request.timeRangeMonths,
        includeSeasonality: this.config.request.includeSeasonality,
        locale: this.config.request.locale,
        randomSeed: this.hashString(tenantId), // Deterministic seed
      };

      // Progress tracking
      let totalProgress = 0;
      const progressIncrement = 100 / 5; // 5 event types

      // Seed volunteer events
      this.reportProgress(totalProgress, 'Generating volunteer events...');
      const volunteerResult = await this.seedVolunteerEvents(
        generatorConfig,
        sizeConfig.volunteerEvents
      );
      results.push(volunteerResult);
      totalProgress += progressIncrement;

      // Seed donation events
      this.reportProgress(totalProgress, 'Generating donation events...');
      const donationResult = await this.seedDonationEvents(
        generatorConfig,
        sizeConfig.donationEvents
      );
      results.push(donationResult);
      totalProgress += progressIncrement;

      // Seed learning sessions
      this.reportProgress(totalProgress, 'Generating learning sessions...');
      const sessionResult = await this.seedSessionEvents(
        generatorConfig,
        sizeConfig.learningSessions
      );
      results.push(sessionResult);
      totalProgress += progressIncrement;

      // Seed enrollments
      this.reportProgress(totalProgress, 'Generating program enrollments...');
      const enrollmentResult = await this.seedEnrollmentEvents(
        generatorConfig,
        sizeConfig.programEnrollments
      );
      results.push(enrollmentResult);
      totalProgress += progressIncrement;

      // Seed buddy matches
      this.reportProgress(totalProgress, 'Generating buddy matches...');
      const buddyResult = await this.seedBuddyEvents(
        generatorConfig,
        sizeConfig.buddyMatches
      );
      results.push(buddyResult);
      totalProgress += progressIncrement;

      this.reportProgress(100, 'Seed complete!');

      const totalEvents = results.reduce((sum, r) => sum + r.count, 0);
      const totalDurationMs = Date.now() - startTime;

      return {
        tenantId,
        status: errors.length > 0 ? 'failed' : warnings.length > 0 ? 'partial' : 'success',
        results,
        totalEvents,
        totalDurationMs,
        warnings: warnings.length > 0 ? warnings : undefined,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));

      return {
        tenantId,
        status: 'failed',
        results,
        totalEvents: results.reduce((sum, r) => sum + r.count, 0),
        totalDurationMs: Date.now() - startTime,
        errors,
      };
    }
  }

  /**
   * Seed volunteer events
   */
  private async seedVolunteerEvents(
    config: GeneratorConfig,
    count: number
  ): Promise<SeedEventResult> {
    const start = Date.now();
    const generator = new VolunteerGenerator(config);
    const events = await generator.generate(count);

    // Persist if configured
    if (this.config.persist) {
      // TODO: Persist to database/staging topic
      await this.persistEvents('volunteer', events);
    }

    const dates = events.map((e) => e.timestamp);
    const dateRange = {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString(),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString(),
    };

    const uniqueSubjects = new Set(events.map((e) => e.userId)).size;

    return {
      eventType: 'volunteer',
      count: events.length,
      uniqueSubjects,
      dateRange,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Seed donation events
   */
  private async seedDonationEvents(
    config: GeneratorConfig,
    count: number
  ): Promise<SeedEventResult> {
    const start = Date.now();
    const generator = new DonationGenerator(config);
    const events = await generator.generate(count);

    if (this.config.persist) {
      await this.persistEvents('donation', events);
    }

    const dates = events.map((e) => e.timestamp);
    const dateRange = {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString(),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString(),
    };

    const uniqueSubjects = new Set(events.map((e) => e.userId)).size;

    return {
      eventType: 'donation',
      count: events.length,
      uniqueSubjects,
      dateRange,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Seed session events
   */
  private async seedSessionEvents(
    config: GeneratorConfig,
    count: number
  ): Promise<SeedEventResult> {
    const start = Date.now();
    const generator = new SessionGenerator(config);
    const events = await generator.generate(count);

    if (this.config.persist) {
      await this.persistEvents('session', events);
    }

    const dates = events.map((e) => e.timestamp);
    const dateRange = {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString(),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString(),
    };

    const uniqueSubjects = new Set(events.map((e) => e.userId)).size;

    return {
      eventType: 'session',
      count: events.length,
      uniqueSubjects,
      dateRange,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Seed enrollment events
   */
  private async seedEnrollmentEvents(
    config: GeneratorConfig,
    count: number
  ): Promise<SeedEventResult> {
    const start = Date.now();
    const generator = new EnrollmentGenerator(config);
    const events = await generator.generate(count);

    if (this.config.persist) {
      await this.persistEvents('enrollment', events);
    }

    const dates = events.map((e) => e.timestamp);
    const dateRange = {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString(),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString(),
    };

    const uniqueSubjects = new Set(events.map((e) => e.userId)).size;

    return {
      eventType: 'enrollment',
      count: events.length,
      uniqueSubjects,
      dateRange,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Seed buddy match events
   */
  private async seedBuddyEvents(
    config: GeneratorConfig,
    count: number
  ): Promise<SeedEventResult> {
    const start = Date.now();
    const generator = new BuddyGenerator(config);
    const events = await generator.generate(count);

    if (this.config.persist) {
      await this.persistEvents('buddy', events);
    }

    const dates = events.map((e) => e.timestamp);
    const dateRange = {
      start: new Date(Math.min(...dates.map((d) => d.getTime()))).toISOString(),
      end: new Date(Math.max(...dates.map((d) => d.getTime()))).toISOString(),
    };

    const uniqueSubjects = new Set([
      ...events.map((e) => e.mentorId),
      ...events.map((e) => e.menteeId),
    ]).size;

    return {
      eventType: 'buddy',
      count: events.length,
      uniqueSubjects,
      dateRange,
      durationMs: Date.now() - start,
    };
  }

  /**
   * Persist events to staging/database
   * TODO: Implement actual persistence logic
   */
  private async persistEvents(eventType: string, events: any[]): Promise<void> {
    // Placeholder for actual persistence
    // In production, this would:
    // 1. Insert into staging database tables
    // 2. Publish to NATS topics for processing
    // 3. Update tenant metadata

    console.log(`[DemoSeeder] Would persist ${events.length} ${eventType} events`);

    // Simulate async operation
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  /**
   * Get size configuration from SIZE_CONFIGS
   */
  private getSizeConfig() {
    // Import SIZE_CONFIGS dynamically
    const SIZE_CONFIGS = {
      small: {
        users: 50,
        volunteerEvents: 500,
        donationEvents: 200,
        learningSessions: 300,
        programEnrollments: 100,
        buddyMatches: 25,
        estimatedSeedTimeMinutes: 1,
      },
      medium: {
        users: 500,
        volunteerEvents: 10000,
        donationEvents: 5000,
        learningSessions: 8000,
        programEnrollments: 2000,
        buddyMatches: 250,
        estimatedSeedTimeMinutes: 4,
      },
      large: {
        users: 2000,
        volunteerEvents: 50000,
        donationEvents: 25000,
        learningSessions: 40000,
        programEnrollments: 10000,
        buddyMatches: 1000,
        estimatedSeedTimeMinutes: 15,
      },
    };

    return SIZE_CONFIGS[this.config.request.size];
  }

  /**
   * Report progress
   */
  private reportProgress(progress: number, message: string): void {
    if (this.config.onProgress) {
      this.config.onProgress(progress, message);
    }
  }

  /**
   * Simple string hash for deterministic seed
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
