/**
 * Donation Event Generator
 * Generates realistic donation/giving events with proper distributions
 */

import { BaseGenerator, type GeneratorConfig } from './base-generator';

/**
 * Donation event data
 */
export interface DonationEvent {
  /**
   * Unique event ID (idempotent)
   */
  eventId: string;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * User ID (donor)
   */
  userId: string;

  /**
   * User name (masked)
   */
  userName: string;

  /**
   * User email (masked)
   */
  userEmail: string;

  /**
   * Company ID
   */
  companyId: string;

  /**
   * Company name (masked)
   */
  companyName: string;

  /**
   * Region
   */
  region: string;

  /**
   * Donation type
   */
  donationType: string;

  /**
   * Amount (USD)
   */
  amount: number;

  /**
   * Currency code
   */
  currency: string;

  /**
   * Recipient organization (masked)
   */
  recipient: string;

  /**
   * Event timestamp
   */
  timestamp: Date;

  /**
   * Optional cause area
   */
  causeArea?: string;

  /**
   * Optional matching program ID
   */
  matchingProgramId?: string;

  /**
   * Whether company-matched
   */
  isMatched: boolean;

  /**
   * Match multiplier if matched
   */
  matchMultiplier?: number;
}

/**
 * Donation types
 */
const DONATION_TYPES = [
  'one_time',
  'recurring',
  'payroll_giving',
  'matching_gift',
  'fundraising',
  'disaster_relief',
  'employee_campaign',
];

/**
 * Cause areas for donations
 */
const CAUSE_AREAS = [
  'education',
  'environment',
  'health',
  'poverty_relief',
  'animal_welfare',
  'community_development',
  'disaster_relief',
  'arts_culture',
  'human_rights',
  'global_development',
];

/**
 * Donation Event Generator
 */
export class DonationGenerator extends BaseGenerator<DonationEvent> {
  constructor(config: GeneratorConfig) {
    super(config);
  }

  /**
   * Generate donation events
   */
  async generate(count: number): Promise<DonationEvent[]> {
    const events: DonationEvent[] = [];

    // Distribute events over time with seasonality
    // Peak months: Nov-Dec (end of year giving), June (mid-year campaigns)
    const timestamps = this.distributeOverTime(count, [5, 10, 11]);

    // Determine number of unique users (30-50% of events - higher than volunteering)
    const uniqueUsers = Math.ceil(count * this.randomFloat(0.3, 0.5));

    for (let i = 0; i < count; i++) {
      const seed = this.config.randomSeed ? this.config.randomSeed + i : i;

      // Select user (some users donate multiple times)
      const userId = this.randomInt(1, uniqueUsers, seed);
      const userKey = this.userSubjectKey(userId);

      // Mask user PII
      const userName = this.masker.maskName('Donor User', userKey);
      const userEmail = this.masker.maskEmail(`user${userId}@demo.com`, userKey);

      // Select company
      const totalCompanies = Math.max(1, Math.ceil(uniqueUsers * 0.15));
      const companyId = this.randomInt(1, totalCompanies, seed * 2);
      const companyKey = this.companySubjectKey(companyId);
      const companyName = this.masker.maskName('Demo Company', companyKey);

      // Select region
      const region = this.randomRegion(seed);

      // Get currency based on region
      const currency = this.getCurrency(region);

      // Select donation type with realistic distribution
      const donationType = this.selectDonationType(seed);

      // Generate amount based on type
      const amount = this.generateAmount(donationType, seed);

      // Generate recipient organization
      const recipientKey = `recipient-${this.randomInt(1, 100, seed * 3)}`;
      const recipient = this.masker.maskName('Charity Org', recipientKey);

      // Select cause area (80% of donations have one)
      const causeArea = this.randomValue(seed * 4) < 0.8
        ? this.randomItem(CAUSE_AREAS, seed * 5)
        : undefined;

      // Determine if matched (40% of donations)
      const isMatched = this.randomValue(seed * 6) < 0.4;
      const matchingProgramId = isMatched
        ? `match-program-${this.randomInt(1, 5, seed * 7)}`
        : undefined;
      const matchMultiplier = isMatched
        ? this.selectMatchMultiplier(seed * 8)
        : undefined;

      events.push({
        eventId: this.generateEventId('donation', userId, timestamps[i], i),
        tenantId: this.config.tenantId,
        userId: `user-${userId}`,
        userName: userName.masked,
        userEmail: userEmail.masked,
        companyId: `company-${companyId}`,
        companyName: companyName.masked,
        region,
        donationType,
        amount,
        currency,
        recipient: recipient.masked,
        timestamp: timestamps[i],
        causeArea,
        matchingProgramId,
        isMatched,
        matchMultiplier,
      });
    }

    return events;
  }

  /**
   * Get currency code based on region
   */
  private getCurrency(region: string): string {
    const currencyMap: Record<string, string> = {
      US: 'USD',
      UK: 'GBP',
      EU: 'EUR',
      APAC: 'USD',
      LATAM: 'USD',
      MULTI: 'USD',
    };

    return currencyMap[region] || 'USD';
  }

  /**
   * Select donation type with realistic distribution
   */
  private selectDonationType(seed: number): string {
    const rand = this.randomValue(seed);

    // Weighted distribution
    if (rand < 0.50) return 'one_time'; // 50%
    if (rand < 0.70) return 'matching_gift'; // 20%
    if (rand < 0.85) return 'payroll_giving'; // 15%
    if (rand < 0.93) return 'recurring'; // 8%
    if (rand < 0.97) return 'employee_campaign'; // 4%

    return this.randomItem(DONATION_TYPES, seed);
  }

  /**
   * Generate donation amount based on type
   */
  private generateAmount(donationType: string, seed: number): number {
    const ranges: Record<string, [number, number]> = {
      one_time: [25, 500],
      recurring: [10, 100],
      payroll_giving: [20, 200],
      matching_gift: [50, 1000],
      fundraising: [100, 5000],
      disaster_relief: [25, 500],
      employee_campaign: [50, 500],
    };

    const [min, max] = ranges[donationType] || [25, 500];

    // Use log-normal distribution for realistic donation amounts
    // (most donations small, few large)
    const logMin = Math.log(min);
    const logMax = Math.log(max);
    const logAmount = logMin + this.randomValue(seed) * (logMax - logMin);
    const amount = Math.exp(logAmount);

    // Round to nearest dollar
    return Math.round(amount);
  }

  /**
   * Select match multiplier
   */
  private selectMatchMultiplier(seed: number): number {
    const rand = this.randomValue(seed);

    // Common match ratios
    if (rand < 0.60) return 1.0; // 1:1 matching (60%)
    if (rand < 0.85) return 2.0; // 2:1 matching (25%)
    if (rand < 0.95) return 0.5; // 50% match (10%)

    return 3.0; // 3:1 matching (5%)
  }
}
