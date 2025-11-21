/**
 * Base Event Generator
 * Common utilities for all seed generators
 */

import { DataMasker } from '@teei/data-masker';
import type {
  DemoSize,
  DemoRegion,
  IndustryVertical,
} from '@teei/shared-types/demo';

/**
 * Generator configuration
 */
export interface GeneratorConfig {
  /**
   * Tenant ID (with demo- prefix)
   */
  tenantId: string;

  /**
   * Master salt for deterministic masking
   */
  masterSalt: string;

  /**
   * Demo size
   */
  size: DemoSize;

  /**
   * Target regions
   */
  regions: DemoRegion[];

  /**
   * Industry vertical
   */
  vertical?: IndustryVertical;

  /**
   * Time range (months back from now)
   */
  timeRangeMonths: number;

  /**
   * Include seasonality patterns
   */
  includeSeasonality: boolean;

  /**
   * Locale for data generation
   */
  locale?: 'en' | 'es' | 'fr' | 'uk' | 'no';

  /**
   * Random seed for reproducibility
   */
  randomSeed?: number;
}

/**
 * Date range for event generation
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Base generator class
 */
export abstract class BaseGenerator<T> {
  protected masker: DataMasker;
  protected config: GeneratorConfig;
  protected dateRange: DateRange;

  constructor(config: GeneratorConfig) {
    this.config = config;

    // Initialize masker
    this.masker = new DataMasker({
      tenantId: config.tenantId,
      masterSalt: config.masterSalt,
      locale: config.locale,
    });

    // Calculate date range
    const now = new Date();
    const start = new Date(now);
    start.setMonth(start.getMonth() - config.timeRangeMonths);

    this.dateRange = {
      start,
      end: now,
    };
  }

  /**
   * Generate events
   * @param count - Number of events to generate
   * @returns Array of generated events
   */
  abstract generate(count: number): Promise<T[]>;

  /**
   * Get a random date within the configured range
   * @param seed - Optional seed for deterministic randomness
   */
  protected randomDate(seed?: number): Date {
    const start = this.dateRange.start.getTime();
    const end = this.dateRange.end.getTime();

    const randomValue = seed !== undefined ? this.seededRandom(seed) : Math.random();
    const timestamp = start + randomValue * (end - start);

    return new Date(timestamp);
  }

  /**
   * Get a random date with seasonality bias
   * Increases probability during peak months (e.g., Q4 for volunteering)
   */
  protected randomDateWithSeasonality(
    peakMonths: number[],
    seed?: number
  ): Date {
    if (!this.config.includeSeasonality) {
      return this.randomDate(seed);
    }

    // Simple seasonality: bias towards peak months
    const dates: Date[] = [];
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      const date = this.randomDate(seed !== undefined ? seed + i : undefined);
      const month = date.getMonth();

      // Add more weight to peak months
      if (peakMonths.includes(month)) {
        dates.push(date, date, date); // 3x weight
      } else {
        dates.push(date);
      }
    }

    const randomIndex = Math.floor(this.randomValue(seed) * dates.length);
    return dates[randomIndex];
  }

  /**
   * Seeded random number generator (simple LCG)
   * @param seed - Seed value
   * @returns Random number between 0 and 1
   */
  protected seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  /**
   * Get a random value (seeded or not)
   */
  protected randomValue(seed?: number): number {
    return seed !== undefined ? this.seededRandom(seed) : Math.random();
  }

  /**
   * Select random region from configured regions
   */
  protected randomRegion(seed?: number): DemoRegion {
    const regions = this.config.regions;
    const index = Math.floor(this.randomValue(seed) * regions.length);
    return regions[index];
  }

  /**
   * Generate a random number within range
   */
  protected randomInt(min: number, max: number, seed?: number): number {
    return Math.floor(this.randomValue(seed) * (max - min + 1)) + min;
  }

  /**
   * Generate a random float within range
   */
  protected randomFloat(min: number, max: number, seed?: number): number {
    return this.randomValue(seed) * (max - min) + min;
  }

  /**
   * Pick random item from array
   */
  protected randomItem<I>(items: I[], seed?: number): I {
    const index = Math.floor(this.randomValue(seed) * items.length);
    return items[index];
  }

  /**
   * Generate a user subject key
   */
  protected userSubjectKey(userId: number): string {
    return `demo-user-${this.config.tenantId}-${userId}`;
  }

  /**
   * Generate a company subject key
   */
  protected companySubjectKey(companyId: number): string {
    return `demo-company-${this.config.tenantId}-${companyId}`;
  }

  /**
   * Generate idempotent event ID
   */
  protected generateEventId(
    eventType: string,
    userId: number,
    timestamp: Date,
    index: number
  ): string {
    const hash = this.masker.generateUuid(
      `${eventType}-${userId}-${timestamp.toISOString()}-${index}`
    );
    return `demo-${eventType}-${hash}`;
  }

  /**
   * Distribute events over time with realistic patterns
   * Returns array of timestamps
   */
  protected distributeOverTime(count: number, peakMonths: number[] = []): Date[] {
    const dates: Date[] = [];

    for (let i = 0; i < count; i++) {
      const seed = this.config.randomSeed
        ? this.config.randomSeed + i
        : undefined;

      const date =
        peakMonths.length > 0
          ? this.randomDateWithSeasonality(peakMonths, seed)
          : this.randomDate(seed);

      dates.push(date);
    }

    // Sort by date
    dates.sort((a, b) => a.getTime() - b.getTime());

    return dates;
  }

  /**
   * Get regional multiplier for event distribution
   * Some regions may have higher activity
   */
  protected regionalMultiplier(region: DemoRegion): number {
    const multipliers: Record<DemoRegion, number> = {
      US: 1.5,
      EU: 1.2,
      UK: 1.0,
      APAC: 0.8,
      LATAM: 0.7,
      MULTI: 1.0,
    };

    return multipliers[region] || 1.0;
  }

  /**
   * Get vertical-specific activity multiplier
   */
  protected verticalMultiplier(eventType: string): number {
    if (!this.config.vertical) return 1.0;

    const multipliers: Record<
      IndustryVertical,
      Record<string, number>
    > = {
      technology: {
        learning: 1.5,
        volunteering: 1.2,
        donation: 1.0,
      },
      finance: {
        donation: 1.5,
        volunteering: 1.2,
        learning: 1.0,
      },
      healthcare: {
        volunteering: 1.5,
        learning: 1.3,
        donation: 1.0,
      },
      retail: {
        volunteering: 1.3,
        donation: 1.1,
        learning: 0.9,
      },
      manufacturing: {
        volunteering: 1.2,
        learning: 1.0,
        donation: 1.0,
      },
      nonprofit: {
        volunteering: 2.0,
        donation: 1.5,
        learning: 1.0,
      },
      education: {
        learning: 2.0,
        volunteering: 1.3,
        donation: 0.8,
      },
      consulting: {
        learning: 1.5,
        volunteering: 1.2,
        donation: 1.1,
      },
    };

    return multipliers[this.config.vertical]?.[eventType] || 1.0;
  }
}
