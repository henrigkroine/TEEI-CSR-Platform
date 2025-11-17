/**
 * Buddy Match Event Generator
 * Generates buddy/mentorship pairing events
 */

import { BaseGenerator, type GeneratorConfig } from './base-generator';

export interface BuddyMatchEvent {
  eventId: string;
  tenantId: string;
  mentorId: string;
  mentorName: string;
  mentorEmail: string;
  menteeId: string;
  menteeName: string;
  menteeEmail: string;
  companyId: string;
  companyName: string;
  region: string;
  matchType: string;
  focusArea: string;
  startDate: Date;
  status: 'active' | 'completed' | 'paused';
  totalSessions?: number;
  lastSessionDate?: Date;
  timestamp: Date;
}

const MATCH_TYPES = [
  'onboarding',
  'career_development',
  'skills_transfer',
  'leadership',
  'cross_functional',
  'diversity',
];

const FOCUS_AREAS = [
  'technical_skills',
  'soft_skills',
  'leadership',
  'career_planning',
  'work_life_balance',
  'networking',
  'project_management',
];

export class BuddyGenerator extends BaseGenerator<BuddyMatchEvent> {
  async generate(count: number): Promise<BuddyMatchEvent[]> {
    const events: BuddyMatchEvent[] = [];
    const timestamps = this.distributeOverTime(count, [0, 1, 8]); // Q1 and Q3
    const uniqueUsers = Math.ceil(count * this.randomFloat(0.8, 1.2)); // More users than matches

    for (let i = 0; i < count; i++) {
      const seed = this.config.randomSeed ? this.config.randomSeed + i : i;

      // Select distinct mentor and mentee
      const mentorId = this.randomInt(1, uniqueUsers, seed);
      let menteeId = this.randomInt(1, uniqueUsers, seed * 2);
      while (menteeId === mentorId) {
        menteeId = this.randomInt(1, uniqueUsers, seed * 3);
      }

      const mentorKey = this.userSubjectKey(mentorId);
      const menteeKey = this.userSubjectKey(menteeId);

      const mentorName = this.masker.maskName('Mentor User', mentorKey);
      const mentorEmail = this.masker.maskEmail(`mentor${mentorId}@demo.com`, mentorKey);

      const menteeName = this.masker.maskName('Mentee User', menteeKey);
      const menteeEmail = this.masker.maskEmail(`mentee${menteeId}@demo.com`, menteeKey);

      const totalCompanies = Math.max(1, Math.ceil(uniqueUsers * 0.15));
      const companyId = this.randomInt(1, totalCompanies, seed * 4);
      const companyKey = this.companySubjectKey(companyId);
      const companyName = this.masker.maskName('Demo Company', companyKey);

      const region = this.randomRegion(seed);
      const matchType = this.randomItem(MATCH_TYPES, seed * 5);
      const focusArea = this.randomItem(FOCUS_AREAS, seed * 6);

      const startDate = timestamps[i];

      // Status: 50% active, 40% completed, 10% paused
      const statusRand = this.randomValue(seed * 7);
      let status: 'active' | 'completed' | 'paused';
      let totalSessions: number | undefined;
      let lastSessionDate: Date | undefined;

      if (statusRand < 0.5) {
        status = 'active';
        totalSessions = this.randomInt(1, 10, seed * 8);
        const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const lastSessionDaysAgo = this.randomInt(1, Math.min(daysSinceStart, 30), seed * 9);
        lastSessionDate = new Date(Date.now() - lastSessionDaysAgo * 24 * 60 * 60 * 1000);
      } else if (statusRand < 0.9) {
        status = 'completed';
        totalSessions = this.randomInt(6, 20, seed * 10);
        lastSessionDate = new Date(startDate);
        lastSessionDate.setDate(lastSessionDate.getDate() + this.randomInt(90, 180, seed * 11));
      } else {
        status = 'paused';
        totalSessions = this.randomInt(1, 5, seed * 12);
      }

      events.push({
        eventId: this.generateEventId('buddy', mentorId, timestamps[i], i),
        tenantId: this.config.tenantId,
        mentorId: `user-${mentorId}`,
        mentorName: mentorName.masked,
        mentorEmail: mentorEmail.masked,
        menteeId: `user-${menteeId}`,
        menteeName: menteeName.masked,
        menteeEmail: menteeEmail.masked,
        companyId: `company-${companyId}`,
        companyName: companyName.masked,
        region,
        matchType,
        focusArea,
        startDate,
        status,
        totalSessions,
        lastSessionDate,
        timestamp: timestamps[i],
      });
    }

    return events;
  }
}
