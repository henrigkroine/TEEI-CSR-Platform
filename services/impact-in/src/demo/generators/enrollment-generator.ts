/**
 * Program Enrollment Event Generator
 * Generates program enrollment events for CSR initiatives
 */

import { BaseGenerator, type GeneratorConfig } from './base-generator';

export interface EnrollmentEvent {
  eventId: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyId: string;
  companyName: string;
  region: string;
  programId: string;
  programName: string;
  programType: string;
  enrollmentDate: Date;
  status: 'active' | 'completed' | 'dropped';
  completionDate?: Date;
  timestamp: Date;
}

const PROGRAM_TYPES = [
  'volunteering',
  'mentorship',
  'skills_training',
  'wellness',
  'sustainability',
  'dei',
  'community_engagement',
];

export class EnrollmentGenerator extends BaseGenerator<EnrollmentEvent> {
  async generate(count: number): Promise<EnrollmentEvent[]> {
    const events: EnrollmentEvent[] = [];
    const timestamps = this.distributeOverTime(count, [0, 8, 9]); // Q1 and Q4
    const uniqueUsers = Math.ceil(count * this.randomFloat(0.4, 0.6));

    for (let i = 0; i < count; i++) {
      const seed = this.config.randomSeed ? this.config.randomSeed + i : i;
      const userId = this.randomInt(1, uniqueUsers, seed);
      const userKey = this.userSubjectKey(userId);

      const userName = this.masker.maskName('Enrolled User', userKey);
      const userEmail = this.masker.maskEmail(`user${userId}@demo.com`, userKey);

      const totalCompanies = Math.max(1, Math.ceil(uniqueUsers * 0.15));
      const companyId = this.randomInt(1, totalCompanies, seed * 2);
      const companyKey = this.companySubjectKey(companyId);
      const companyName = this.masker.maskName('Demo Company', companyKey);

      const region = this.randomRegion(seed);
      const programType = this.randomItem(PROGRAM_TYPES, seed * 3);
      const programId = `program-${programType}-${this.randomInt(1, 10, seed * 4)}`;
      const programName = this.masker.maskFreeText(
        `${programType} program`,
        programId,
        { maxLength: 50 }
      );

      const enrollmentDate = timestamps[i];

      // Status distribution: 60% active, 30% completed, 10% dropped
      const statusRand = this.randomValue(seed * 5);
      let status: 'active' | 'completed' | 'dropped';
      let completionDate: Date | undefined;

      if (statusRand < 0.6) {
        status = 'active';
      } else if (statusRand < 0.9) {
        status = 'completed';
        const daysToComplete = this.randomInt(30, 180, seed * 6);
        completionDate = new Date(enrollmentDate);
        completionDate.setDate(completionDate.getDate() + daysToComplete);
      } else {
        status = 'dropped';
      }

      events.push({
        eventId: this.generateEventId('enrollment', userId, timestamps[i], i),
        tenantId: this.config.tenantId,
        userId: `user-${userId}`,
        userName: userName.masked,
        userEmail: userEmail.masked,
        companyId: `company-${companyId}`,
        companyName: companyName.masked,
        region,
        programId,
        programName: programName.masked,
        programType,
        enrollmentDate,
        status,
        completionDate,
        timestamp: timestamps[i],
      });
    }

    return events;
  }
}
