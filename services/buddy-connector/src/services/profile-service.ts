/**
 * Profile Service Client
 * TASK-A-05: Unified Profile Linking (Buddy ↔ CSR)
 *
 * HTTP client for interacting with the Unified Profile Service
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('buddy-connector:profile-service');

const PROFILE_SERVICE_URL = process.env.PROFILE_SERVICE_URL || 'http://localhost:3001/v1/profile';

interface LinkExternalIdRequest {
  profileId: string;
  provider: 'buddy' | 'discord' | 'kintell' | 'upskilling';
  externalId: string;
  metadata?: Record<string, any>;
}

interface UpdateFlagsRequest {
  flags: Record<string, any>;
}

interface IncrementCounterRequest {
  counterKey: string;
  increment?: number;
}

/**
 * Link a Buddy System user ID to a CSR profile
 */
export async function linkBuddyUser(
  profileId: string,
  buddyUserId: string,
  metadata?: Record<string, any>
): Promise<void> {
  logger.info({ profileId, buddyUserId: buddyUserId.substring(0, 8) + '...' }, 'Linking Buddy user to profile');

  try {
    const response = await fetch(`${PROFILE_SERVICE_URL}/link-external`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        profileId,
        provider: 'buddy',
        externalId: buddyUserId,
        metadata,
      } as LinkExternalIdRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to link Buddy user: ${response.status} ${error}`);
    }

    const result = await response.json();
    logger.info({ profileId, isNew: result.isNew }, 'Buddy user linked successfully');
  } catch (error) {
    logger.error({ error, profileId, buddyUserId }, 'Failed to link Buddy user');
    // Don't throw - we don't want to fail event processing if profile linking fails
    // This will be retried on next event
  }
}

/**
 * Update journey flags for a user
 */
export async function updateJourneyFlags(
  profileId: string,
  flags: Record<string, any>
): Promise<void> {
  logger.info({ profileId, flags: Object.keys(flags) }, 'Updating journey flags');

  try {
    const response = await fetch(`${PROFILE_SERVICE_URL}/${profileId}/flags`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ flags } as UpdateFlagsRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update journey flags: ${response.status} ${error}`);
    }

    logger.info({ profileId }, 'Journey flags updated successfully');
  } catch (error) {
    logger.error({ error, profileId }, 'Failed to update journey flags');
    // Don't throw - non-critical operation
  }
}

/**
 * Increment a journey counter
 */
export async function incrementJourneyCounter(
  profileId: string,
  counterKey: string,
  increment: number = 1
): Promise<void> {
  logger.info({ profileId, counterKey, increment }, 'Incrementing journey counter');

  try {
    const response = await fetch(`${PROFILE_SERVICE_URL}/${profileId}/increment-counter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ counterKey, increment } as IncrementCounterRequest),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to increment journey counter: ${response.status} ${error}`);
    }

    const result = await response.json();
    logger.info({ profileId, counterKey, newValue: result.newValue }, 'Journey counter incremented');
  } catch (error) {
    logger.error({ error, profileId, counterKey }, 'Failed to increment journey counter');
    // Don't throw - non-critical operation
  }
}

/**
 * Get all external IDs for a profile
 */
export async function getExternalIds(profileId: string): Promise<Record<string, any>> {
  try {
    const response = await fetch(`${PROFILE_SERVICE_URL}/${profileId}/external-ids`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get external IDs: ${response.status} ${error}`);
    }

    const result = await response.json();
    return result.externalIds || {};
  } catch (error) {
    logger.error({ error, profileId }, 'Failed to get external IDs');
    return {};
  }
}

/**
 * Find CSR profile by Buddy System user ID
 * Returns null if not found
 */
export async function findProfileByBuddyUserId(buddyUserId: string): Promise<string | null> {
  try {
    // We need to query the database directly since the profile service
    // doesn't have a reverse lookup endpoint
    // For now, we'll use the existing externalIdMappings table
    const { db, externalIdMappings } = await import('@teei/shared-schema');
    const { eq, and } = await import('drizzle-orm');

    const [mapping] = await db
      .select({ userId: externalIdMappings.userId })
      .from(externalIdMappings)
      .where(
        and(
          eq(externalIdMappings.externalSystem, 'buddy'),
          eq(externalIdMappings.externalId, buddyUserId)
        )
      )
      .limit(1);

    return mapping?.userId || null;
  } catch (error) {
    logger.error({ error, buddyUserId }, 'Failed to find profile by Buddy user ID');
    return null;
  }
}
