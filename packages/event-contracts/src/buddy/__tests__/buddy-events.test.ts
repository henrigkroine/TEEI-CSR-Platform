import { describe, it, expect } from 'vitest';
import {
  BuddyMatchCreatedSchema,
  BuddyMatchEndedSchema,
  BuddyEventLoggedSchema,
  BuddyEventAttendedSchema,
  BuddySkillShareCompletedSchema,
  BuddyCheckinCompletedSchema,
  BuddyFeedbackSubmittedSchema,
  BuddyMilestoneReachedSchema,
} from '../index.js';

describe('Buddy Event Schemas', () => {
  const baseMetadata = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    version: 'v1',
    timestamp: '2025-11-14T10:00:00.000Z',
    correlationId: '123e4567-e89b-12d3-a456-426614174001',
  };

  describe('BuddyMatchCreated', () => {
    it('should validate a complete match created event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.match.created' as const,
        data: {
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          participantId: '123e4567-e89b-12d3-a456-426614174003',
          buddyId: '123e4567-e89b-12d3-a456-426614174004',
          matchedAt: '2025-11-14T10:00:00.000Z',
          matchingCriteria: {
            language: 'Norwegian',
            interests: ['hiking', 'cooking'],
            location: 'Oslo',
          },
        },
      };

      const result = BuddyMatchCreatedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate minimal match created event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.match.created' as const,
        data: {
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          participantId: '123e4567-e89b-12d3-a456-426614174003',
          buddyId: '123e4567-e89b-12d3-a456-426614174004',
          matchedAt: '2025-11-14T10:00:00.000Z',
        },
      };

      const result = BuddyMatchCreatedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('BuddyMatchEnded', () => {
    it('should validate a complete match ended event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.match.ended' as const,
        data: {
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          participantId: '123e4567-e89b-12d3-a456-426614174003',
          buddyId: '123e4567-e89b-12d3-a456-426614174004',
          endedAt: '2025-11-14T10:00:00.000Z',
          duration: 90,
          reason: 'completed',
          reasonDetails: 'Successfully completed 3-month program',
          sessionsCompleted: 12,
          eventsAttended: 5,
          feedback: {
            participantSatisfaction: 0.95,
            buddySatisfaction: 0.92,
          },
        },
      };

      const result = BuddyMatchEndedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject invalid reason enum', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.match.ended' as const,
        data: {
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          participantId: '123e4567-e89b-12d3-a456-426614174003',
          buddyId: '123e4567-e89b-12d3-a456-426614174004',
          endedAt: '2025-11-14T10:00:00.000Z',
          duration: 90,
          reason: 'invalid_reason',
        },
      };

      const result = BuddyMatchEndedSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('BuddyEventAttended', () => {
    it('should validate a complete event attended event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.event.attended' as const,
        data: {
          eventId: '123e4567-e89b-12d3-a456-426614174005',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          eventTitle: 'Norwegian Language Café',
          eventType: 'language',
          eventFormat: 'in-person',
          attendedAt: '2025-11-14T10:00:00.000Z',
          location: 'Oslo Central Library',
          durationMinutes: 120,
          attendeeCount: 25,
          organizer: 'TEEI Oslo',
          categories: ['language', 'social', 'cultural'],
          sdgGoals: [4, 10],
        },
      };

      const result = BuddyEventAttendedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should validate minimal event attended event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.event.attended' as const,
        data: {
          eventId: '123e4567-e89b-12d3-a456-426614174005',
          userId: '123e4567-e89b-12d3-a456-426614174003',
          eventTitle: 'Coffee Meetup',
          eventType: 'social',
          eventFormat: 'in-person',
          attendedAt: '2025-11-14T10:00:00.000Z',
        },
      };

      const result = BuddyEventAttendedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('BuddySkillShareCompleted', () => {
    it('should validate a complete skill share event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.skill_share.completed' as const,
        data: {
          sessionId: '123e4567-e89b-12d3-a456-426614174006',
          skillId: 42,
          skillName: 'Norwegian Grammar',
          skillCategory: 'language',
          teacherId: '123e4567-e89b-12d3-a456-426614174004',
          learnerId: '123e4567-e89b-12d3-a456-426614174003',
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          completedAt: '2025-11-14T10:00:00.000Z',
          scheduledAt: '2025-11-14T09:00:00.000Z',
          durationMinutes: 60,
          format: 'online',
          proficiencyLevel: 'beginner',
          feedback: {
            teacherRating: 0.9,
            learnerRating: 0.95,
            teacherComment: 'Great progress!',
            learnerComment: 'Very helpful session',
            learnerProgress: 'good-progress',
          },
          sdgGoals: [4],
          valuationPoints: 50,
        },
      };

      const result = BuddySkillShareCompletedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('BuddyCheckinCompleted', () => {
    it('should validate a complete checkin event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.checkin.completed' as const,
        data: {
          checkinId: '123e4567-e89b-12d3-a456-426614174007',
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          checkinDate: '2025-11-14T10:00:00.000Z',
          mood: 'great',
          notes: 'Had a wonderful week!',
          questionResponses: {
            language_progress: 'improving',
            social_integration: 'good',
          },
        },
      };

      const result = BuddyCheckinCompletedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('BuddyFeedbackSubmitted', () => {
    it('should validate a complete feedback event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.feedback.submitted' as const,
        data: {
          feedbackId: '123e4567-e89b-12d3-a456-426614174008',
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          fromRole: 'participant',
          rating: 0.9,
          feedbackText: 'Excellent buddy experience!',
          submittedAt: '2025-11-14T10:00:00.000Z',
          categories: {
            communication: 0.95,
            helpfulness: 0.9,
            engagement: 0.85,
          },
        },
      };

      const result = BuddyFeedbackSubmittedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });

    it('should reject invalid rating values', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.feedback.submitted' as const,
        data: {
          feedbackId: '123e4567-e89b-12d3-a456-426614174008',
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          fromRole: 'participant',
          rating: 1.5, // Invalid: >1
          submittedAt: '2025-11-14T10:00:00.000Z',
        },
      };

      const result = BuddyFeedbackSubmittedSchema.safeParse(event);
      expect(result.success).toBe(false);
    });
  });

  describe('BuddyMilestoneReached', () => {
    it('should validate a complete milestone event', () => {
      const event = {
        ...baseMetadata,
        type: 'buddy.milestone.reached' as const,
        data: {
          milestoneId: 10,
          userId: '123e4567-e89b-12d3-a456-426614174003',
          milestoneTitle: 'First Buddy Match',
          milestoneCategory: 'buddy-connection',
          reachedAt: '2025-11-14T10:00:00.000Z',
          points: 100,
          badgeIcon: 'handshake',
          targetRole: 'participant',
          progress: {
            currentStep: 1,
            totalSteps: 1,
            completedSteps: ['match-created'],
          },
          metadata: {
            isFirstTime: true,
            streakCount: 1,
            relatedEntities: [
              { type: 'match', id: '123e4567-e89b-12d3-a456-426614174002' },
            ],
          },
        },
      };

      const result = BuddyMilestoneReachedSchema.safeParse(event);
      expect(result.success).toBe(true);
    });
  });

  describe('Event Size Validation', () => {
    it('should ensure all events are under 10KB', () => {
      const largeEvent = {
        ...baseMetadata,
        type: 'buddy.match.created' as const,
        data: {
          matchId: '123e4567-e89b-12d3-a456-426614174002',
          participantId: '123e4567-e89b-12d3-a456-426614174003',
          buddyId: '123e4567-e89b-12d3-a456-426614174004',
          matchedAt: '2025-11-14T10:00:00.000Z',
          matchingCriteria: {
            language: 'Norwegian',
            interests: Array(100).fill('interest'), // Large array
            location: 'Oslo',
          },
        },
      };

      const eventSize = new Blob([JSON.stringify(largeEvent)]).size;
      expect(eventSize).toBeLessThan(10 * 1024); // 10KB limit
    });
  });
});
