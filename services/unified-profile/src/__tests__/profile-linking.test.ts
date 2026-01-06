/**
 * Integration Tests for Profile Linking
 * TASK-A-05: Unified Profile Linking (Buddy ↔ CSR)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  linkExternalId,
  getProfileByExternalId,
  getExternalIds,
  updateJourneyFlag,
  incrementJourneyCounter,
  getJourneyFlags,
  updateJourneyFlags,
  findOrCreateUserWithExternalId,
} from '../utils/profile-linking.js';
import { db, users, userExternalIds, identityLinkingAudit } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

describe('Profile Linking Integration Tests', () => {
  let testUserId: string;

  beforeEach(async () => {
    // Create a test user
    const [user] = await db
      .insert(users)
      .values({
        email: `test-${Date.now()}@example.com`,
        role: 'participant',
        firstName: 'Test',
        lastName: 'User',
      })
      .returning();

    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    // Note: CASCADE will handle userExternalIds
    await db.delete(users).where(eq(users.email, 'test@example.com'));
  });

  describe('linkExternalId', () => {
    it('should create a new external ID mapping', async () => {
      const result = await linkExternalId(testUserId, 'buddy', 'buddy-123', { test: true });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.isNew).toBe(true);

      // Verify in database
      const [mapping] = await db
        .select()
        .from(userExternalIds)
        .where(eq(userExternalIds.id, result.id))
        .limit(1);

      expect(mapping.profileId).toBe(testUserId);
      expect(mapping.provider).toBe('buddy');
      expect(mapping.externalId).toBe('buddy-123');
      expect(mapping.metadata).toEqual({ test: true });
    });

    it('should update existing external ID mapping', async () => {
      // Create initial mapping
      const first = await linkExternalId(testUserId, 'buddy', 'buddy-456');
      expect(first.isNew).toBe(true);

      // Create another user
      const [user2] = await db
        .insert(users)
        .values({
          email: `test-${Date.now()}-2@example.com`,
          role: 'participant',
        })
        .returning();

      // Update to point to different profile
      const second = await linkExternalId(user2.id, 'buddy', 'buddy-456', { updated: true });
      expect(second.isNew).toBe(false);
      expect(second.id).toBe(first.id);

      // Verify update
      const [mapping] = await db
        .select()
        .from(userExternalIds)
        .where(eq(userExternalIds.id, second.id))
        .limit(1);

      expect(mapping.profileId).toBe(user2.id);
      expect(mapping.metadata).toEqual({ updated: true });
    });

    it('should create audit log entry', async () => {
      await linkExternalId(testUserId, 'buddy', 'buddy-789', {}, 'test-service');

      const audit = await db
        .select()
        .from(identityLinkingAudit)
        .where(eq(identityLinkingAudit.profileId, testUserId))
        .limit(1);

      expect(audit.length).toBeGreaterThan(0);
      expect(audit[0].operation).toBe('created');
      expect(audit[0].performedBy).toBe('test-service');
    });
  });

  describe('getProfileByExternalId', () => {
    it('should find profile by external ID', async () => {
      await linkExternalId(testUserId, 'buddy', 'buddy-find-123');

      const profileId = await getProfileByExternalId('buddy', 'buddy-find-123');

      expect(profileId).toBe(testUserId);
    });

    it('should return null for non-existent external ID', async () => {
      const profileId = await getProfileByExternalId('buddy', 'non-existent');

      expect(profileId).toBeNull();
    });
  });

  describe('getExternalIds', () => {
    it('should return all external IDs for a profile', async () => {
      await linkExternalId(testUserId, 'buddy', 'buddy-multi-1');
      await linkExternalId(testUserId, 'discord', 'discord-123');
      await linkExternalId(testUserId, 'kintell', 'kintell-456');

      const externalIds = await getExternalIds(testUserId);

      expect(Object.keys(externalIds)).toHaveLength(3);
      expect(externalIds.buddy).toBeDefined();
      expect(externalIds.buddy.externalId).toBe('buddy-multi-1');
      expect(externalIds.discord).toBeDefined();
      expect(externalIds.discord.externalId).toBe('discord-123');
      expect(externalIds.kintell).toBeDefined();
      expect(externalIds.kintell.externalId).toBe('kintell-456');
    });

    it('should return empty object for profile with no external IDs', async () => {
      const externalIds = await getExternalIds(testUserId);

      expect(externalIds).toEqual({});
    });
  });

  describe('Journey Flags', () => {
    describe('updateJourneyFlag', () => {
      it('should set a boolean flag', async () => {
        await updateJourneyFlag(testUserId, 'is_buddy_participant', true);

        const flags = await getJourneyFlags(testUserId);

        expect(flags.is_buddy_participant).toBe(true);
      });

      it('should set a numeric flag', async () => {
        await updateJourneyFlag(testUserId, 'buddy_match_count', 5);

        const flags = await getJourneyFlags(testUserId);

        expect(flags.buddy_match_count).toBe(5);
      });
    });

    describe('incrementJourneyCounter', () => {
      it('should increment counter from 0', async () => {
        const newValue = await incrementJourneyCounter(testUserId, 'buddy_events_attended');

        expect(newValue).toBe(1);

        const flags = await getJourneyFlags(testUserId);
        expect(flags.buddy_events_attended).toBe(1);
      });

      it('should increment existing counter', async () => {
        await updateJourneyFlag(testUserId, 'buddy_events_attended', 3);

        const newValue = await incrementJourneyCounter(testUserId, 'buddy_events_attended', 2);

        expect(newValue).toBe(5);

        const flags = await getJourneyFlags(testUserId);
        expect(flags.buddy_events_attended).toBe(5);
      });
    });

    describe('updateJourneyFlags', () => {
      it('should batch update multiple flags', async () => {
        await updateJourneyFlags(testUserId, {
          is_buddy_participant: true,
          buddy_match_count: 3,
          buddy_events_attended: 7,
        });

        const flags = await getJourneyFlags(testUserId);

        expect(flags.is_buddy_participant).toBe(true);
        expect(flags.buddy_match_count).toBe(3);
        expect(flags.buddy_events_attended).toBe(7);
      });

      it('should preserve existing flags when updating', async () => {
        await updateJourneyFlag(testUserId, 'is_buddy_participant', true);

        await updateJourneyFlags(testUserId, {
          buddy_match_count: 2,
        });

        const flags = await getJourneyFlags(testUserId);

        expect(flags.is_buddy_participant).toBe(true);
        expect(flags.buddy_match_count).toBe(2);
      });
    });

    describe('getJourneyFlags', () => {
      it('should return empty object for new user', async () => {
        const flags = await getJourneyFlags(testUserId);

        expect(flags).toEqual({});
      });

      it('should return all set flags', async () => {
        await updateJourneyFlags(testUserId, {
          is_buddy_participant: true,
          buddy_match_count: 2,
          buddy_events_attended: 5,
        });

        const flags = await getJourneyFlags(testUserId);

        expect(flags).toEqual({
          is_buddy_participant: true,
          buddy_match_count: 2,
          buddy_events_attended: 5,
        });
      });
    });
  });

  describe('findOrCreateUserWithExternalId', () => {
    it('should find existing user by external ID', async () => {
      await linkExternalId(testUserId, 'buddy', 'buddy-existing-123');

      const result = await findOrCreateUserWithExternalId(
        'buddy',
        'buddy-existing-123',
        {
          email: 'newemail@example.com',
          role: 'participant',
        }
      );

      expect(result.userId).toBe(testUserId);
      expect(result.isNew).toBe(false);
    });

    it('should find existing user by email and link external ID', async () => {
      const email = `existing-${Date.now()}@example.com`;
      const [existingUser] = await db
        .insert(users)
        .values({
          email,
          role: 'participant',
        })
        .returning();

      const result = await findOrCreateUserWithExternalId(
        'buddy',
        'buddy-link-existing',
        {
          email,
          role: 'participant',
        }
      );

      expect(result.userId).toBe(existingUser.id);
      expect(result.isNew).toBe(false);

      // Verify external ID was linked
      const profileId = await getProfileByExternalId('buddy', 'buddy-link-existing');
      expect(profileId).toBe(existingUser.id);
    });

    it('should create new user with external ID', async () => {
      const email = `new-${Date.now()}@example.com`;

      const result = await findOrCreateUserWithExternalId(
        'buddy',
        'buddy-new-user-123',
        {
          email,
          role: 'participant',
          firstName: 'New',
          lastName: 'User',
        }
      );

      expect(result.userId).toBeDefined();
      expect(result.isNew).toBe(true);

      // Verify user was created
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, result.userId))
        .limit(1);

      expect(user.email).toBe(email);
      expect(user.firstName).toBe('New');
      expect(user.lastName).toBe('User');

      // Verify external ID was linked
      const profileId = await getProfileByExternalId('buddy', 'buddy-new-user-123');
      expect(profileId).toBe(result.userId);
    });
  });
});
