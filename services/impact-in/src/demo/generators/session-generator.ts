/**
 * Learning Session Event Generator
 * Generates Kintell learning session events with realistic completion patterns
 */

import { BaseGenerator, type GeneratorConfig } from './base-generator';

/**
 * Learning session event data
 */
export interface SessionEvent {
  eventId: string;
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  companyId: string;
  companyName: string;
  region: string;
  courseId: string;
  courseName: string;
  courseCategory: string;
  durationMinutes: number;
  completionRate: number;
  score?: number;
  timestamp: Date;
  isCompleted: boolean;
  certificateIssued: boolean;
}

const COURSE_CATEGORIES = [
  'leadership',
  'technical',
  'compliance',
  'soft_skills',
  'dei',
  'sustainability',
  'product_knowledge',
  'sales',
];

const COURSE_TEMPLATES: Record<string, { duration: [number, number]; difficulty: string }> = {
  leadership: { duration: [30, 120], difficulty: 'intermediate' },
  technical: { duration: [60, 240], difficulty: 'advanced' },
  compliance: { duration: [15, 60], difficulty: 'beginner' },
  soft_skills: { duration: [20, 90], difficulty: 'beginner' },
  dei: { duration: [30, 90], difficulty: 'beginner' },
  sustainability: { duration: [30, 120], difficulty: 'intermediate' },
  product_knowledge: { duration: [20, 60], difficulty: 'beginner' },
  sales: { duration: [30, 120], difficulty: 'intermediate' },
};

export class SessionGenerator extends BaseGenerator<SessionEvent> {
  async generate(count: number): Promise<SessionEvent[]> {
    const events: SessionEvent[] = [];
    const timestamps = this.distributeOverTime(count, [0, 1, 8, 9]); // Q1 and Q3
    const uniqueUsers = Math.ceil(count * this.randomFloat(0.25, 0.35));

    for (let i = 0; i < count; i++) {
      const seed = this.config.randomSeed ? this.config.randomSeed + i : i;
      const userId = this.randomInt(1, uniqueUsers, seed);
      const userKey = this.userSubjectKey(userId);

      const userName = this.masker.maskName('Learner User', userKey);
      const userEmail = this.masker.maskEmail(`user${userId}@demo.com`, userKey);

      const totalCompanies = Math.max(1, Math.ceil(uniqueUsers * 0.15));
      const companyId = this.randomInt(1, totalCompanies, seed * 2);
      const companyKey = this.companySubjectKey(companyId);
      const companyName = this.masker.maskName('Demo Company', companyKey);

      const region = this.randomRegion(seed);
      const courseCategory = this.randomItem(COURSE_CATEGORIES, seed * 3);
      const courseId = `course-${courseCategory}-${this.randomInt(1, 20, seed * 4)}`;
      const courseName = this.masker.maskFreeText(
        `${courseCategory} course`,
        courseId,
        { maxLength: 50 }
      );

      const { duration } = COURSE_TEMPLATES[courseCategory];
      const durationMinutes = this.randomInt(duration[0], duration[1], seed * 5);

      const completionRate = this.randomFloat(0.3, 1.0, seed * 6);
      const isCompleted = completionRate >= 0.8;
      const score = isCompleted ? this.randomInt(60, 100, seed * 7) : undefined;
      const certificateIssued = isCompleted && (score ?? 0) >= 80;

      events.push({
        eventId: this.generateEventId('session', userId, timestamps[i], i),
        tenantId: this.config.tenantId,
        userId: `user-${userId}`,
        userName: userName.masked,
        userEmail: userEmail.masked,
        companyId: `company-${companyId}`,
        companyName: companyName.masked,
        region,
        courseId,
        courseName: courseName.masked,
        courseCategory,
        durationMinutes,
        completionRate,
        score,
        timestamp: timestamps[i],
        isCompleted,
        certificateIssued,
      });
    }

    return events;
  }
}
