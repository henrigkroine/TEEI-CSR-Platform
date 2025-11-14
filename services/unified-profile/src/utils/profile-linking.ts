/**
 * Profile Linking Utilities
 * TASK-A-05: Unified Profile Linking (Buddy ↔ CSR)
 *
 * Functions for managing cross-system identity mapping and journey flags
 */

import { db, userExternalIds, users, identityLinkingAudit } from '@teei/shared-schema';
import { eq, and, sql } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('unified-profile:linking');

/**
 * Identity provider types
 */
export type IdentityProvider = 'buddy' | 'discord' | 'kintell' | 'upskilling';

/**
 * Journey flag keys
 */
export type JourneyFlagKey =
  | 'is_buddy_participant'
  | 'buddy_match_count'
  | 'buddy_events_attended'
  | 'buddy_milestones_count'
  | 'buddy_checkins_count'
  | 'buddy_feedback_count'
  | 'buddy_skill_shares_count'
  | 'is_discord_member'
  | 'is_kintell_user'
  | 'is_upskilling_participant';

/**
 * Link an external ID to a CSR profile
 * Creates or updates the mapping
 */
export async function linkExternalId(
  profileId: string,
  provider: IdentityProvider,
  externalId: string,
  metadata?: Record<string, any>,
  performedBy: string = 'system'
): Promise<{ id: string; isNew: boolean }> {
  logger.info(
    {
      profileId,
      provider,
      externalId: externalId.substring(0, 8) + '...', // Log partial ID for privacy
    },
    'Linking external ID to profile'
  );

  try {
    // Check if mapping already exists
    const [existing] = await db
      .select()
      .from(userExternalIds)
      .where(and(eq(userExternalIds.provider, provider), eq(userExternalIds.externalId, externalId)))
      .limit(1);

    if (existing) {
      // Update existing mapping
      const [updated] = await db
        .update(userExternalIds)
        .set({
          profileId,
          metadata: metadata || {},
          updatedAt: new Date(),
        })
        .where(eq(userExternalIds.id, existing.id))
        .returning();

      // Log audit trail
      await db.insert(identityLinkingAudit).values({
        profileId,
        provider,
        externalId,
        operation: 'updated',
        performedBy,
        metadata: { previousProfileId: existing.profileId, ...metadata },
      });

      logger.info({ mappingId: updated.id, provider }, 'External ID mapping updated');
      return { id: updated.id, isNew: false };
    }

    // Create new mapping
    const [created] = await db
      .insert(userExternalIds)
      .values({
        profileId,
        provider,
        externalId,
        metadata: metadata || {},
      })
      .returning();

    // Log audit trail (trigger handles this, but we can also log programmatically)
    await db.insert(identityLinkingAudit).values({
      profileId,
      provider,
      externalId,
      operation: 'created',
      performedBy,
      metadata: metadata || {},
    });

    logger.info({ mappingId: created.id, provider }, 'External ID mapping created');
    return { id: created.id, isNew: true };
  } catch (error) {
    logger.error({ error, profileId, provider }, 'Failed to link external ID');
    throw error;
  }
}

/**
 * Find CSR profile by external ID
 * Returns null if not found
 */
export async function getProfileByExternalId(
  provider: IdentityProvider,
  externalId: string
): Promise<string | null> {
  const [mapping] = await db
    .select({ profileId: userExternalIds.profileId })
    .from(userExternalIds)
    .where(and(eq(userExternalIds.provider, provider), eq(userExternalIds.externalId, externalId)))
    .limit(1);

  return mapping?.profileId || null;
}

/**
 * Get all external IDs for a profile
 */
export async function getExternalIds(profileId: string) {
  const mappings = await db
    .select()
    .from(userExternalIds)
    .where(eq(userExternalIds.profileId, profileId));

  return mappings.reduce(
    (acc, m) => {
      acc[m.provider] = {
        externalId: m.externalId,
        metadata: m.metadata,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
      };
      return acc;
    },
    {} as Record<string, any>
  );
}

/**
 * Update a journey flag
 */
export async function updateJourneyFlag(
  userId: string,
  flagKey: JourneyFlagKey,
  value: boolean | number | string | object
): Promise<void> {
  logger.info({ userId, flagKey, value }, 'Updating journey flag');

  try {
    await db
      .update(users)
      .set({
        journeyFlags: sql`jsonb_set(
          COALESCE(journey_flags, '{}'::jsonb),
          ARRAY[${flagKey}],
          ${JSON.stringify(value)}::jsonb,
          true
        )`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info({ userId, flagKey }, 'Journey flag updated successfully');
  } catch (error) {
    logger.error({ error, userId, flagKey }, 'Failed to update journey flag');
    throw error;
  }
}

/**
 * Increment a journey counter
 */
export async function incrementJourneyCounter(
  userId: string,
  counterKey: JourneyFlagKey,
  increment: number = 1
): Promise<number> {
  logger.info({ userId, counterKey, increment }, 'Incrementing journey counter');

  try {
    // Get current value
    const [user] = await db
      .select({ journeyFlags: users.journeyFlags })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const currentValue = (user?.journeyFlags as any)?.[counterKey] || 0;
    const newValue = currentValue + increment;

    // Update counter
    await updateJourneyFlag(userId, counterKey, newValue);

    logger.info({ userId, counterKey, newValue }, 'Journey counter incremented');
    return newValue;
  } catch (error) {
    logger.error({ error, userId, counterKey }, 'Failed to increment journey counter');
    throw error;
  }
}

/**
 * Get journey flags for a user
 */
export async function getJourneyFlags(userId: string): Promise<Record<string, any>> {
  const [user] = await db
    .select({ journeyFlags: users.journeyFlags })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return (user?.journeyFlags as Record<string, any>) || {};
}

/**
 * Batch update multiple journey flags
 */
export async function updateJourneyFlags(
  userId: string,
  flags: Partial<Record<JourneyFlagKey, any>>
): Promise<void> {
  logger.info({ userId, flags: Object.keys(flags) }, 'Batch updating journey flags');

  try {
    // Get current flags
    const currentFlags = await getJourneyFlags(userId);

    // Merge with new flags
    const updatedFlags = { ...currentFlags, ...flags };

    // Update all at once
    await db
      .update(users)
      .set({
        journeyFlags: updatedFlags,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    logger.info({ userId, flagCount: Object.keys(flags).length }, 'Journey flags batch updated');
  } catch (error) {
    logger.error({ error, userId }, 'Failed to batch update journey flags');
    throw error;
  }
}

/**
 * Find or create user with external ID linking
 * Used for initial user onboarding from external systems
 */
export async function findOrCreateUserWithExternalId(
  provider: IdentityProvider,
  externalId: string,
  userData: {
    email: string;
    role: string;
    firstName?: string;
    lastName?: string;
  },
  performedBy: string = 'system'
): Promise<{ userId: string; isNew: boolean }> {
  logger.info({ provider, email: userData.email }, 'Finding or creating user with external ID');

  try {
    // Check if external ID mapping exists
    const existingProfileId = await getProfileByExternalId(provider, externalId);

    if (existingProfileId) {
      logger.info({ userId: existingProfileId, provider }, 'User found by external ID');
      return { userId: existingProfileId, isNew: false };
    }

    // Check if user exists by email
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, userData.email))
      .limit(1);

    if (existingUser) {
      // Link external ID to existing user
      await linkExternalId(existingUser.id, provider, externalId, {}, performedBy);
      logger.info({ userId: existingUser.id, provider }, 'External ID linked to existing user');
      return { userId: existingUser.id, isNew: false };
    }

    // Create new user
    const [newUser] = await db
      .insert(users)
      .values({
        email: userData.email,
        role: userData.role,
        firstName: userData.firstName,
        lastName: userData.lastName,
      })
      .returning();

    // Link external ID
    await linkExternalId(newUser.id, provider, externalId, {}, performedBy);

    logger.info({ userId: newUser.id, provider }, 'New user created with external ID');
    return { userId: newUser.id, isNew: true };
  } catch (error) {
    logger.error({ error, provider, email: userData.email }, 'Failed to find or create user');
    throw error;
  }
}
