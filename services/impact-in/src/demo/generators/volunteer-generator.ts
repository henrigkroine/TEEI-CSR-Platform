/**
 * Volunteer Event Generator
 * Generates realistic volunteer activity events with proper distributions
 */

import { BaseGenerator, type GeneratorConfig } from './base-generator';

/**
 * Volunteer event data
 */
export interface VolunteerEvent {
  /**
   * Unique event ID (idempotent)
   */
  eventId: string;

  /**
   * Tenant ID
   */
  tenantId: string;

  /**
   * User ID
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
   * Activity type
   */
  activityType: string;

  /**
   * Hours volunteered
   */
  hours: number;

  /**
   * Number of beneficiaries impacted
   */
  beneficiaries: number;

  /**
   * Event timestamp
   */
  timestamp: Date;

  /**
   * Optional cause area
   */
  causeArea?: string;

  /**
   * Optional program/campaign ID
   */
  programId?: string;
}

/**
 * Volunteer activity types
 */
const ACTIVITY_TYPES = [
  'skills_based',
  'hands_on',
  'virtual',
  'mentoring',
  'board_service',
  'pro_bono',
  'team_building',
  'disaster_relief',
];

/**
 * Cause areas
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
];

/**
 * Volunteer Event Generator
 */
export class VolunteerGenerator extends BaseGenerator<VolunteerEvent> {
  constructor(config: GeneratorConfig) {
    super(config);
  }

  /**
   * Generate volunteer events
   */
  async generate(count: number): Promise<VolunteerEvent[]> {
    const events: VolunteerEvent[] = [];

    // Distribute events over time with seasonality
    // Peak months: Oct-Dec (Q4 volunteering surge), April-May (spring)
    const timestamps = this.distributeOverTime(count, [3, 4, 9, 10, 11]);

    // Determine number of unique users (20-40% of events)
    const uniqueUsers = Math.ceil(count * this.randomFloat(0.2, 0.4));

    for (let i = 0; i < count; i++) {
      const seed = this.config.randomSeed ? this.config.randomSeed + i : i;

      // Select user (some users volunteer multiple times)
      const userId = this.randomInt(1, uniqueUsers, seed);
      const userKey = this.userSubjectKey(userId);

      // Mask user PII
      const userName = this.masker.maskName('Volunteer User', userKey);
      const userEmail = this.masker.maskEmail(`user${userId}@demo.com`, userKey);

      // Select company (fewer companies than users, typically 10-20% of user count)
      const totalCompanies = Math.max(1, Math.ceil(uniqueUsers * 0.15));
      const companyId = this.randomInt(1, totalCompanies, seed * 2);
      const companyKey = this.companySubjectKey(companyId);
      const companyName = this.masker.maskName('Demo Company', companyKey);

      // Select region
      const region = this.randomRegion(seed);

      // Select activity type with realistic distribution
      const activityType = this.selectActivityType(seed);

      // Generate hours based on activity type
      const hours = this.generateHours(activityType, seed);

      // Generate beneficiaries count
      const beneficiaries = this.generateBeneficiaries(activityType, seed);

      // Select cause area (70% of events have one)
      const causeArea = this.randomValue(seed * 3) < 0.7
        ? this.randomItem(CAUSE_AREAS, seed * 4)
        : undefined;

      // Assign to program (30% of events)
      const programId = this.randomValue(seed * 5) < 0.3
        ? `program-${this.randomInt(1, 10, seed * 6)}`
        : undefined;

      events.push({
        eventId: this.generateEventId('volunteer', userId, timestamps[i], i),
        tenantId: this.config.tenantId,
        userId: `user-${userId}`,
        userName: userName.masked,
        userEmail: userEmail.masked,
        companyId: `company-${companyId}`,
        companyName: companyName.masked,
        region,
        activityType,
        hours,
        beneficiaries,
        timestamp: timestamps[i],
        causeArea,
        programId,
      });
    }

    return events;
  }

  /**
   * Select activity type with realistic distribution
   */
  private selectActivityType(seed: number): string {
    const rand = this.randomValue(seed);

    // Weighted distribution
    if (rand < 0.35) return 'hands_on'; // 35%
    if (rand < 0.60) return 'skills_based'; // 25%
    if (rand < 0.80) return 'virtual'; // 20%
    if (rand < 0.90) return 'mentoring'; // 10%
    if (rand < 0.95) return 'team_building'; // 5%

    return this.randomItem(ACTIVITY_TYPES, seed);
  }

  /**
   * Generate hours based on activity type
   */
  private generateHours(activityType: string, seed: number): number {
    const ranges: Record<string, [number, number]> = {
      skills_based: [4, 20],
      hands_on: [2, 8],
      virtual: [1, 6],
      mentoring: [2, 10],
      board_service: [3, 12],
      pro_bono: [8, 40],
      team_building: [3, 8],
      disaster_relief: [4, 12],
    };

    const [min, max] = ranges[activityType] || [1, 8];
    return this.randomFloat(min, max, seed);
  }

  /**
   * Generate beneficiaries count based on activity type
   */
  private generateBeneficiaries(activityType: string, seed: number): number {
    const ranges: Record<string, [number, number]> = {
      skills_based: [5, 50],
      hands_on: [10, 100],
      virtual: [1, 20],
      mentoring: [1, 5],
      board_service: [50, 500],
      pro_bono: [10, 100],
      team_building: [20, 200],
      disaster_relief: [100, 1000],
    };

    const [min, max] = ranges[activityType] || [1, 50];
    return this.randomInt(min, max, seed);
  }
}
