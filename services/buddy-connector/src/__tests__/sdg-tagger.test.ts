import { describe, it, expect } from 'vitest';
import { tagEventWithSDGs, enrichPayloadWithSDGs, getAllCoveredSDGs, getSDGReference } from '../utils/sdg-tagger.js';

describe('SDG Tagger', () => {
  describe('tagEventWithSDGs', () => {
    it('should tag buddy.match.created with SDG 10 and 16', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.match.created',
        timestamp: new Date().toISOString(),
        data: {
          matchId: 'match-123',
          participantId: 'participant-123',
          buddyId: 'buddy-123',
          matchedAt: new Date().toISOString(),
        },
      };

      const result = tagEventWithSDGs('buddy.match.created', event);

      expect(result.sdgs).toContain(10);
      expect(result.sdgs).toContain(16);
      expect(result.sdgs).toHaveLength(2);
      expect(result.sdgConfidence['10']).toBe(1.0);
      expect(result.sdgConfidence['16']).toBe(1.0);
    });

    it('should tag buddy.event.attended with SDG 11 and 4', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.event.attended',
        timestamp: new Date().toISOString(),
        data: {
          userId: 'user-123',
          eventType: 'workshop',
          eventTitle: 'Cultural Exchange Event',
          attendedAt: new Date().toISOString(),
        },
      };

      const result = tagEventWithSDGs('buddy.event.attended', event);

      expect(result.sdgs).toContain(11);
      expect(result.sdgs).toContain(4);
      expect(result.sdgs).toHaveLength(2);
    });

    it('should tag buddy.skill_share.completed with SDG 4 and 8', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.skill_share.completed',
        timestamp: new Date().toISOString(),
        data: {
          sessionId: 'session-123',
          skillName: 'Norwegian Language Basics',
          teacherId: 'teacher-123',
          learnerId: 'learner-123',
        },
      };

      const result = tagEventWithSDGs('buddy.skill_share.completed', event);

      expect(result.sdgs).toContain(4);
      expect(result.sdgs).toContain(8);
      expect(result.sdgs).toHaveLength(2);
    });

    it('should tag buddy.feedback.submitted with SDG 17', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.feedback.submitted',
        timestamp: new Date().toISOString(),
        data: {
          feedbackId: 'feedback-123',
          matchId: 'match-123',
          fromRole: 'participant',
          rating: 0.85,
          feedbackText: 'Great experience!',
        },
      };

      const result = tagEventWithSDGs('buddy.feedback.submitted', event);

      expect(result.sdgs).toContain(17);
      expect(result.sdgs).toHaveLength(1);
    });

    it('should tag buddy.milestone.reached with SDG 10', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.milestone.reached',
        timestamp: new Date().toISOString(),
        data: {
          userId: 'user-123',
          milestoneTitle: 'First Month Complete',
          milestoneCategory: 'onboarding',
          points: 100,
        },
      };

      const result = tagEventWithSDGs('buddy.milestone.reached', event);

      expect(result.sdgs).toContain(10);
      expect(result.sdgs).toHaveLength(1);
    });

    it('should tag buddy.checkin.completed with SDG 3', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.checkin.completed',
        timestamp: new Date().toISOString(),
        data: {
          checkinId: 'checkin-123',
          matchId: 'match-123',
          checkinDate: new Date().toISOString(),
          mood: 'good',
          notes: 'Feeling well integrated',
        },
      };

      const result = tagEventWithSDGs('buddy.checkin.completed', event);

      expect(result.sdgs).toContain(3);
      expect(result.sdgs).toHaveLength(1);
    });

    it('should add keyword-based SDG tags for language activities', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.skill_share.completed',
        timestamp: new Date().toISOString(),
        data: {
          sessionId: 'session-123',
          skillName: 'Language Exchange',
          session_title: 'Norwegian language practice',
          teacherId: 'teacher-123',
          learnerId: 'learner-123',
        },
      };

      const result = tagEventWithSDGs('buddy.skill_share.completed', event);

      // Should have base SDGs (4, 8) from event type
      expect(result.sdgs).toContain(4);
      expect(result.sdgs).toContain(8);

      // Keyword "language" also maps to SDG 4, so confidence should be maintained/enhanced
      expect(result.sdgConfidence['4']).toBeGreaterThanOrEqual(0.8);
    });

    it('should add keyword-based SDG tags for job/career activities', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.event.attended',
        timestamp: new Date().toISOString(),
        data: {
          userId: 'user-123',
          eventType: 'workshop',
          eventTitle: 'Job Search Workshop',
          attendedAt: new Date().toISOString(),
        },
      };

      const result = tagEventWithSDGs('buddy.event.attended', event);

      // Should have base SDGs (11, 4) from event type
      expect(result.sdgs).toContain(11);
      expect(result.sdgs).toContain(4);

      // Keyword "job" maps to SDG 8
      expect(result.sdgs).toContain(8);
    });

    it('should add keyword-based SDG tags for health/wellness activities', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.event.attended',
        timestamp: new Date().toISOString(),
        data: {
          userId: 'user-123',
          eventType: 'workshop',
          eventTitle: 'Mental Health Support Session',
          attendedAt: new Date().toISOString(),
        },
      };

      const result = tagEventWithSDGs('buddy.event.attended', event);

      // Should have base SDGs (11, 4) from event type
      expect(result.sdgs).toContain(11);
      expect(result.sdgs).toContain(4);

      // Keyword "mental health" maps to SDG 3
      expect(result.sdgs).toContain(3);
      expect(result.sdgConfidence['3']).toBe(0.9);
    });

    it('should handle events with no matching SDG mapping', () => {
      const event = {
        id: 'test-event-id',
        type: 'unknown.event.type',
        timestamp: new Date().toISOString(),
        data: {},
      };

      const result = tagEventWithSDGs('unknown.event.type', event);

      expect(result.sdgs).toHaveLength(0);
      expect(Object.keys(result.sdgConfidence)).toHaveLength(0);
    });

    it('should not duplicate SDGs from multiple sources', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.skill_share.completed',
        timestamp: new Date().toISOString(),
        data: {
          sessionId: 'session-123',
          skillName: 'Language and Career Skills',
          session_title: 'Norwegian language for job seekers',
          teacherId: 'teacher-123',
          learnerId: 'learner-123',
        },
      };

      const result = tagEventWithSDGs('buddy.skill_share.completed', event);

      // SDG 4 and 8 come from event type
      // Keywords "language" and "job" also map to 4 and 8 respectively
      // Should not have duplicates
      const sdgCounts = result.sdgs.reduce((acc, sdg) => {
        acc[sdg] = (acc[sdg] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      Object.values(sdgCounts).forEach(count => {
        expect(count).toBe(1); // Each SDG should appear exactly once
      });
    });
  });

  describe('enrichPayloadWithSDGs', () => {
    it('should enrich payload with SDG information', () => {
      const originalPayload = {
        id: 'test-event-id',
        type: 'buddy.match.created',
        data: { matchId: 'match-123' },
      };

      const sdgResult = {
        sdgs: [10, 16],
        sdgConfidence: { '10': 1.0, '16': 1.0 },
        tags: [
          { sdg: 10, confidence: 1.0, source: 'event_type' as const },
          { sdg: 16, confidence: 1.0, source: 'event_type' as const },
        ],
      };

      const enriched = enrichPayloadWithSDGs(originalPayload, sdgResult);

      expect(enriched).toHaveProperty('sdgs');
      expect(enriched).toHaveProperty('sdg_confidence');
      expect(enriched).toHaveProperty('sdg_tags');
      expect(enriched.sdgs).toEqual([10, 16]);
      expect(enriched.sdg_confidence).toEqual({ '10': 1.0, '16': 1.0 });
      expect(enriched.sdg_tags).toHaveLength(2);
    });
  });

  describe('getAllCoveredSDGs', () => {
    it('should return all SDGs covered by the mapping configuration', () => {
      const coveredSDGs = getAllCoveredSDGs();

      expect(coveredSDGs).toContain(3); // Good Health
      expect(coveredSDGs).toContain(4); // Quality Education
      expect(coveredSDGs).toContain(8); // Decent Work
      expect(coveredSDGs).toContain(10); // Reduced Inequalities
      expect(coveredSDGs).toContain(11); // Sustainable Cities
      expect(coveredSDGs).toContain(16); // Peace & Justice
      expect(coveredSDGs).toContain(17); // Partnerships

      // Should be sorted
      for (let i = 1; i < coveredSDGs.length; i++) {
        expect(coveredSDGs[i]).toBeGreaterThan(coveredSDGs[i - 1]);
      }
    });
  });

  describe('getSDGReference', () => {
    it('should return correct reference information for SDG 10', () => {
      const reference = getSDGReference(10);

      expect(reference).toHaveProperty('name');
      expect(reference).toHaveProperty('description');
      expect(reference?.name).toBe('Reduced Inequalities');
      expect(reference?.description).toContain('Reduce inequality');
    });

    it('should return correct reference information for SDG 4', () => {
      const reference = getSDGReference(4);

      expect(reference?.name).toBe('Quality Education');
      expect(reference?.description).toContain('education');
    });

    it('should return correct reference information for SDG 3', () => {
      const reference = getSDGReference(3);

      expect(reference?.name).toBe('Good Health and Well-being');
      expect(reference?.description).toContain('health');
    });
  });

  describe('Integration: Complete Event Tagging Flow', () => {
    it('should correctly tag a complex skill-sharing event', () => {
      const event = {
        id: 'test-event-id',
        type: 'buddy.skill_share.completed',
        timestamp: new Date().toISOString(),
        data: {
          sessionId: 'session-456',
          skillName: 'Career Development',
          skill_category: 'language',
          session_title: 'Job interview preparation in Norwegian',
          teacherId: 'teacher-456',
          learnerId: 'learner-456',
          duration: 60,
          completedAt: new Date().toISOString(),
        },
      };

      const sdgResult = tagEventWithSDGs('buddy.skill_share.completed', event);
      const enriched = enrichPayloadWithSDGs(event, sdgResult);

      // Verify base SDGs from event type
      expect(sdgResult.sdgs).toContain(4); // Quality Education
      expect(sdgResult.sdgs).toContain(8); // Decent Work

      // Verify keyword enhancements
      // "language" -> SDG 4 (already present)
      // "job" -> SDG 8 (already present)
      // "career" -> SDG 8 (already present)

      // Verify enriched payload structure
      expect(enriched.sdgs).toBeDefined();
      expect(enriched.sdg_confidence).toBeDefined();
      expect(enriched.sdg_tags).toBeDefined();

      // Verify all data is preserved
      expect(enriched.data).toEqual(event.data);
      expect(enriched.id).toBe(event.id);
      expect(enriched.type).toBe(event.type);
    });
  });
});
