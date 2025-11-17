import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  aggregateLanguageTile,
  aggregateMentorshipTile,
  aggregateUpskillingTile,
  aggregateWEEITile,
} from '../tiles/index.js';
import { db, kintellSessions, learningProgress } from '@teei/shared-schema';
import { sql } from 'drizzle-orm';

const TEST_COMPANY_ID = 'test-company-123e4567-e89b-12d3-a456-426614174000';
const TEST_PERIOD = {
  start: '2024-01-01',
  end: '2024-03-31',
};

describe('Impact Tiles Aggregators', () => {
  beforeAll(async () => {
    // Clean up test data before running tests
    await db.delete(kintellSessions);
    await db.delete(learningProgress);
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await db.delete(kintellSessions);
    await db.delete(learningProgress);
  });

  beforeEach(async () => {
    // Clean between each test
    await db.delete(kintellSessions);
    await db.delete(learningProgress);
  });

  describe('Language Tile', () => {
    it('should calculate language tile with zero sessions', async () => {
      const tile = await aggregateLanguageTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.metadata.companyId).toBe(TEST_COMPANY_ID);
      expect(tile.metadata.programType).toBe('language');
      expect(tile.data.sessionsPerWeek).toBe(0);
      expect(tile.data.volunteerHours.total).toBe(0);
      expect(tile.data.retention.enrollments).toBe(0);
      expect(tile.data.retention.retentionRate).toBe(0);
    });

    it('should calculate language tile with sample sessions', async () => {
      // Insert sample language sessions
      const sessions = [
        {
          sessionType: 'language',
          participantId: crypto.randomUUID(),
          volunteerId: crypto.randomUUID(),
          scheduledAt: new Date('2024-01-15T10:00:00Z'),
          completedAt: new Date('2024-01-15T11:30:00Z'),
          durationMinutes: 90,
          rating: '4.5',
          languageLevel: 'A2',
        },
        {
          sessionType: 'language',
          participantId: crypto.randomUUID(),
          volunteerId: crypto.randomUUID(),
          scheduledAt: new Date('2024-01-22T10:00:00Z'),
          completedAt: new Date('2024-01-22T11:00:00Z'),
          durationMinutes: 60,
          rating: '5.0',
          languageLevel: 'A2',
        },
      ];

      for (const session of sessions) {
        await db.insert(kintellSessions).values(session);
      }

      const tile = await aggregateLanguageTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.metadata.programType).toBe('language');
      expect(tile.data.sessionsPerWeek).toBeGreaterThan(0);
      expect(tile.data.volunteerHours.total).toBeGreaterThan(0);
      expect(tile.data.retention.enrollments).toBeGreaterThan(0);
    });

    it('should calculate retention correctly', async () => {
      const participantId1 = crypto.randomUUID();
      const participantId2 = crypto.randomUUID();
      const volunteerId = crypto.randomUUID();

      // Participant 1: Active (2+ sessions)
      for (let i = 0; i < 3; i++) {
        await db.insert(kintellSessions).values({
          sessionType: 'language',
          participantId: participantId1,
          volunteerId,
          scheduledAt: new Date(`2024-01-${10 + i * 5}T10:00:00Z`),
          completedAt: new Date(`2024-01-${10 + i * 5}T11:00:00Z`),
          durationMinutes: 60,
        });
      }

      // Participant 2: Inactive (only 1 session)
      await db.insert(kintellSessions).values({
        sessionType: 'language',
        participantId: participantId2,
        volunteerId,
        scheduledAt: new Date('2024-01-15T10:00:00Z'),
        completedAt: new Date('2024-01-15T11:00:00Z'),
        durationMinutes: 60,
      });

      const tile = await aggregateLanguageTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.data.retention.enrollments).toBe(2);
      expect(tile.data.retention.activeParticipants).toBe(1);
      expect(tile.data.retention.retentionRate).toBeGreaterThan(0);
      expect(tile.data.retention.dropoutRate).toBeGreaterThan(0);
    });
  });

  describe('Mentorship Tile', () => {
    it('should calculate mentorship tile with zero sessions', async () => {
      const tile = await aggregateMentorshipTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.metadata.companyId).toBe(TEST_COMPANY_ID);
      expect(tile.metadata.programType).toBe('mentorship');
      expect(tile.data.bookings.total).toBe(0);
      expect(tile.data.attendance.attendanceRate).toBe(0);
      expect(tile.data.noShowRate).toBe(0);
    });

    it('should calculate mentorship tile with sample sessions', async () => {
      const mentorId = crypto.randomUUID();
      const menteeId = crypto.randomUUID();

      // Insert sample mentorship sessions
      const sessions = [
        {
          sessionType: 'mentorship',
          participantId: menteeId,
          volunteerId: mentorId,
          scheduledAt: new Date('2024-01-15T14:00:00Z'),
          completedAt: new Date('2024-01-15T15:00:00Z'),
          durationMinutes: 60,
          rating: '4.8',
        },
        {
          sessionType: 'mentorship',
          participantId: menteeId,
          volunteerId: mentorId,
          scheduledAt: new Date('2024-01-22T14:00:00Z'),
          completedAt: new Date('2024-01-22T15:00:00Z'),
          durationMinutes: 60,
          rating: '5.0',
        },
      ];

      for (const session of sessions) {
        await db.insert(kintellSessions).values(session);
      }

      const tile = await aggregateMentorshipTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.metadata.programType).toBe('mentorship');
      expect(tile.data.bookings.total).toBe(2);
      expect(tile.data.bookings.completed).toBe(2);
      expect(tile.data.attendance.attendanceRate).toBe(1);
      expect(tile.data.repeatMentoring.uniqueMentors).toBe(1);
      expect(tile.data.repeatMentoring.uniqueMentees).toBe(1);
    });

    it('should calculate no-show rate correctly', async () => {
      const mentorId = crypto.randomUUID();
      const menteeId = crypto.randomUUID();

      // Completed session
      await db.insert(kintellSessions).values({
        sessionType: 'mentorship',
        participantId: menteeId,
        volunteerId: mentorId,
        scheduledAt: new Date('2024-01-15T14:00:00Z'),
        completedAt: new Date('2024-01-15T15:00:00Z'),
        durationMinutes: 60,
      });

      // No-show session (scheduled >24h ago, not completed)
      await db.insert(kintellSessions).values({
        sessionType: 'mentorship',
        participantId: menteeId,
        volunteerId: mentorId,
        scheduledAt: new Date('2024-01-10T14:00:00Z'),
        completedAt: null,
        durationMinutes: null,
      });

      const tile = await aggregateMentorshipTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.data.bookings.scheduled).toBe(2);
      expect(tile.data.bookings.completed).toBe(1);
      expect(tile.data.noShowRate).toBeGreaterThan(0);
      expect(tile.data.attendance.attendanceRate).toBeLessThan(1);
    });
  });

  describe('Upskilling Tile', () => {
    it('should calculate upskilling tile with zero enrollments', async () => {
      const tile = await aggregateUpskillingTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.metadata.companyId).toBe(TEST_COMPANY_ID);
      expect(tile.metadata.programType).toBe('upskilling');
      expect(tile.data.funnel.enrollments).toBe(0);
      expect(tile.data.funnel.completionRate).toBe(0);
      expect(tile.data.courses.totalCourses).toBe(0);
    });

    it('should calculate upskilling tile with sample enrollments', async () => {
      const userId1 = crypto.randomUUID();
      const userId2 = crypto.randomUUID();

      // Insert sample learning progress
      const enrollments = [
        {
          userId: userId1,
          provider: 'ecornell',
          courseId: 'course-001',
          courseName: 'Data Analytics Fundamentals',
          status: 'completed',
          progressPercent: 100,
          startedAt: new Date('2024-01-10'),
          completedAt: new Date('2024-02-28'),
          metadata: { locale: 'EN', skills: ['data-analysis', 'sql'] },
        },
        {
          userId: userId2,
          provider: 'ecornell',
          courseId: 'course-002',
          courseName: 'Web Development',
          status: 'in_progress',
          progressPercent: 60,
          startedAt: new Date('2024-02-01'),
          metadata: { locale: 'UA', skills: ['html', 'css', 'javascript'] },
        },
      ];

      for (const enrollment of enrollments) {
        await db.insert(learningProgress).values(enrollment);
      }

      const tile = await aggregateUpskillingTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.metadata.programType).toBe('upskilling');
      expect(tile.data.funnel.enrollments).toBe(2);
      expect(tile.data.funnel.inProgress).toBe(1);
      expect(tile.data.funnel.completions).toBe(1);
      expect(tile.data.funnel.completionRate).toBe(0.5);
      expect(tile.data.courses.totalCourses).toBe(2);
    });

    it('should aggregate locales correctly', async () => {
      const userId = crypto.randomUUID();

      const enrollments = [
        {
          userId,
          provider: 'ecornell',
          courseId: 'course-ua',
          courseName: 'Ukrainian Course',
          status: 'completed',
          progressPercent: 100,
          startedAt: new Date('2024-01-10'),
          metadata: { locale: 'UA' },
        },
        {
          userId,
          provider: 'ecornell',
          courseId: 'course-en',
          courseName: 'English Course',
          status: 'in_progress',
          progressPercent: 50,
          startedAt: new Date('2024-02-01'),
          metadata: { locale: 'EN' },
        },
      ];

      for (const enrollment of enrollments) {
        await db.insert(learningProgress).values(enrollment);
      }

      const tile = await aggregateUpskillingTile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.data.locales.UA).toBe(1);
      expect(tile.data.locales.EN).toBe(1);
    });
  });

  describe('WEEI Tile', () => {
    it('should calculate WEEI tile with zero enrollments', async () => {
      const tile = await aggregateWEEITile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.metadata.companyId).toBe(TEST_COMPANY_ID);
      expect(tile.metadata.programType).toBe('weei');
      expect(tile.data.throughput.totalEnrollments).toBe(0);
      expect(tile.data.stages.ULEARN.enrollments).toBe(0);
    });

    it('should calculate WEEI tile with sample enrollments', async () => {
      const userId1 = crypto.randomUUID();
      const userId2 = crypto.randomUUID();

      // Insert WEEI program enrollments
      const enrollments = [
        {
          userId: userId1,
          provider: 'weei',
          courseId: 'ulearn-001',
          courseName: 'U:LEARN Business Basics',
          status: 'completed',
          progressPercent: 100,
          startedAt: new Date('2024-01-10'),
          completedAt: new Date('2024-02-15'),
          metadata: { weei_stage: 'U:LEARN' },
        },
        {
          userId: userId1,
          provider: 'weei',
          courseId: 'ustart-001',
          courseName: 'U:START Launch Your Business',
          status: 'in_progress',
          progressPercent: 40,
          startedAt: new Date('2024-02-20'),
          metadata: { weei_stage: 'U:START' },
        },
        {
          userId: userId2,
          provider: 'weei',
          courseId: 'ulearn-002',
          courseName: 'U:LEARN Financial Literacy',
          status: 'completed',
          progressPercent: 100,
          startedAt: new Date('2024-01-15'),
          completedAt: new Date('2024-02-20'),
          metadata: { weei_stage: 'U:LEARN', demo_day: true, presentations: 1 },
        },
      ];

      for (const enrollment of enrollments) {
        await db.insert(learningProgress).values(enrollment);
      }

      const tile = await aggregateWEEITile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.metadata.programType).toBe('weei');
      expect(tile.data.throughput.totalEnrollments).toBe(3);
      expect(tile.data.stages.ULEARN.enrollments).toBe(2);
      expect(tile.data.stages.ULEARN.completions).toBe(2);
      expect(tile.data.stages.USTART.enrollments).toBe(1);
      expect(tile.data.demoDay.demoDayCount).toBe(1);
    });

    it('should calculate stage progression correctly', async () => {
      const userId = crypto.randomUUID();

      // User completes U:LEARN and progresses to U:START
      const enrollments = [
        {
          userId,
          provider: 'weei',
          courseId: 'ulearn-001',
          courseName: 'U:LEARN',
          status: 'completed',
          progressPercent: 100,
          startedAt: new Date('2024-01-10'),
          completedAt: new Date('2024-02-15'),
          metadata: { weei_stage: 'U:LEARN' },
        },
        {
          userId,
          provider: 'weei',
          courseId: 'ustart-001',
          courseName: 'U:START',
          status: 'completed',
          progressPercent: 100,
          startedAt: new Date('2024-02-20'),
          completedAt: new Date('2024-03-20'),
          metadata: { weei_stage: 'U:START' },
        },
      ];

      for (const enrollment of enrollments) {
        await db.insert(learningProgress).values(enrollment);
      }

      const tile = await aggregateWEEITile(TEST_COMPANY_ID, TEST_PERIOD);

      expect(tile.data.progression.learnToStart).toBeGreaterThan(0);
    });
  });

  describe('Tile Metadata', () => {
    it('should include proper metadata in all tiles', async () => {
      const tiles = await Promise.all([
        aggregateLanguageTile(TEST_COMPANY_ID, TEST_PERIOD),
        aggregateMentorshipTile(TEST_COMPANY_ID, TEST_PERIOD),
        aggregateUpskillingTile(TEST_COMPANY_ID, TEST_PERIOD),
        aggregateWEEITile(TEST_COMPANY_ID, TEST_PERIOD),
      ]);

      for (const tile of tiles) {
        expect(tile.metadata.tileId).toBeTruthy();
        expect(tile.metadata.companyId).toBe(TEST_COMPANY_ID);
        expect(tile.metadata.period.start).toBe(TEST_PERIOD.start);
        expect(tile.metadata.period.end).toBe(TEST_PERIOD.end);
        expect(tile.metadata.calculatedAt).toBeTruthy();
        expect(tile.metadata.dataFreshness).toBeTruthy();
      }
    });
  });
});
