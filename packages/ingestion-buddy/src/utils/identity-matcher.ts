/**
 * Identity Matcher - Unified User Identity Resolution
 *
 * Deduplicates Buddy Program users with existing CSR users (Mentors, Language, Upskilling)
 * via email-based matching with fallback strategies.
 *
 * @module ingestion-buddy/utils/identity-matcher
 * @agent Agent 4 (identity-unifier)
 */

import { db, users, userExternalIds, identityLinkingAudit } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('ingestion-buddy:identity-matcher');

/**
 * Buddy user data from export file
 */
export interface BuddyUserExport {
  id: string;                      // Buddy system UUID
  email: string;
  first_name: string;
  last_name: string;
  role: 'participant' | 'buddy';
  joined_at: string;               // ISO 8601 timestamp
  language_preference?: string;
  interests?: string[];
  location?: string;
}

/**
 * Identity resolution result
 */
export interface IdentityResolution {
  csrUserId: string;               // CSR users.id (existing or newly created)
  isNewUser: boolean;              // True if user was created
  matchMethod: 'email' | 'external_id' | 'created';
  conflictResolved?: boolean;      // True if email conflict was resolved
  warnings: string[];              // Non-fatal issues encountered
}

/**
 * Identity conflict (e.g., email changed in external system)
 */
export interface IdentityConflict {
  buddyUserId: string;
  csrUserId: string;
  conflictType: 'email_mismatch' | 'duplicate_email' | 'missing_email';
  buddyEmail: string;
  csrEmail?: string;
  resolution: 'use_existing' | 'create_new' | 'manual_review';
}

/**
 * Normalize email for consistent matching
 */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Check if Buddy user already linked to CSR user
 */
async function findExistingMapping(buddyUserId: string): Promise<string | null> {
  const result = await db
    .select({ profileId: userExternalIds.profileId })
    .from(userExternalIds)
    .where(
      and(
        eq(userExternalIds.provider, 'buddy'),
        eq(userExternalIds.externalId, buddyUserId)
      )
    )
    .limit(1);

  return result[0]?.profileId || null;
}

/**
 * Find CSR user by email
 */
async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const normalizedEmail = normalizeEmail(email);

  const result = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  return result[0] || null;
}

/**
 * Create new CSR user
 */
async function createCsrUser(buddyUser: BuddyUserExport): Promise<string> {
  const normalizedEmail = normalizeEmail(buddyUser.email);

  // Map Buddy role to CSR role
  const csrRole = buddyUser.role === 'participant' ? 'beneficiary' : 'volunteer';

  const [newUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      role: csrRole,
      firstName: buddyUser.first_name?.trim() || null,
      lastName: buddyUser.last_name?.trim() || null,
      journeyFlags: {
        is_buddy_participant: buddyUser.role === 'participant',
        is_buddy_volunteer: buddyUser.role === 'buddy',
        buddy_joined_at: buddyUser.joined_at,
      },
    })
    .returning({ id: users.id });

  logger.info(
    { buddyUserId: buddyUser.id, csrUserId: newUser.id, email: normalizedEmail },
    'Created new CSR user from Buddy import'
  );

  return newUser.id;
}

/**
 * Link Buddy user to CSR user via external_id mapping
 */
async function linkBuddyUserToCsr(
  buddyUser: BuddyUserExport,
  csrUserId: string,
  matchMethod: 'email' | 'external_id' | 'created'
): Promise<void> {
  // Insert external ID mapping
  await db.insert(userExternalIds).values({
    profileId: csrUserId,
    provider: 'buddy',
    externalId: buddyUser.id,
    metadata: {
      buddy_joined_at: buddyUser.joined_at,
      buddy_role: buddyUser.role,
      buddy_language_preference: buddyUser.language_preference,
      buddy_interests: buddyUser.interests,
      buddy_location: buddyUser.location,
      imported_at: new Date().toISOString(),
    },
  });

  // Audit log
  await db.insert(identityLinkingAudit).values({
    profileId: csrUserId,
    provider: 'buddy',
    externalId: buddyUser.id,
    operation: 'created',
    performedBy: 'ingestion-buddy',
    metadata: {
      match_method: matchMethod,
      buddy_email: buddyUser.email,
    },
  });

  logger.info(
    { buddyUserId: buddyUser.id, csrUserId, matchMethod },
    'Linked Buddy user to CSR profile'
  );
}

/**
 * Main identity resolution function
 *
 * Resolution strategy:
 * 1. Check if Buddy user already mapped (external_id lookup)
 * 2. If not mapped, try email-based lookup
 * 3. If email found, link to existing user
 * 4. If email not found, create new user
 *
 * @param buddyUser - Buddy user data from export
 * @returns Identity resolution result
 */
export async function resolveIdentity(
  buddyUser: BuddyUserExport
): Promise<IdentityResolution> {
  const warnings: string[] = [];

  // Validate email
  if (!buddyUser.email || !isValidEmail(buddyUser.email)) {
    throw new Error(
      `Invalid email for Buddy user ${buddyUser.id}: "${buddyUser.email}"`
    );
  }

  // Step 1: Check if already mapped (idempotency)
  const existingMapping = await findExistingMapping(buddyUser.id);
  if (existingMapping) {
    logger.debug(
      { buddyUserId: buddyUser.id, csrUserId: existingMapping },
      'Buddy user already mapped to CSR user (idempotent)'
    );

    return {
      csrUserId: existingMapping,
      isNewUser: false,
      matchMethod: 'external_id',
      warnings,
    };
  }

  // Step 2: Try email-based lookup
  const normalizedEmail = normalizeEmail(buddyUser.email);
  const existingUser = await findUserByEmail(normalizedEmail);

  if (existingUser) {
    // Email match found - link to existing user
    logger.info(
      { buddyUserId: buddyUser.id, csrUserId: existingUser.id, email: normalizedEmail },
      'Matched Buddy user to existing CSR user by email'
    );

    // Check for email case mismatch (warning only)
    if (existingUser.email !== normalizedEmail) {
      warnings.push(
        `Email case mismatch: Buddy="${buddyUser.email}", CSR="${existingUser.email}"`
      );
    }

    await linkBuddyUserToCsr(buddyUser, existingUser.id, 'email');

    return {
      csrUserId: existingUser.id,
      isNewUser: false,
      matchMethod: 'email',
      warnings,
    };
  }

  // Step 3: No match found - create new user
  const newUserId = await createCsrUser(buddyUser);
  await linkBuddyUserToCsr(buddyUser, newUserId, 'created');

  return {
    csrUserId: newUserId,
    isNewUser: true,
    matchMethod: 'created',
    warnings,
  };
}

/**
 * Batch identity resolution with conflict detection
 *
 * @param buddyUsers - Array of Buddy users from export
 * @returns Array of resolution results
 */
export async function resolveBatchIdentities(
  buddyUsers: BuddyUserExport[]
): Promise<{
  resolutions: IdentityResolution[];
  conflicts: IdentityConflict[];
  stats: {
    total: number;
    existing: number;
    created: number;
    emailMatches: number;
    externalIdMatches: number;
  };
}> {
  const resolutions: IdentityResolution[] = [];
  const conflicts: IdentityConflict[] = [];

  const stats = {
    total: buddyUsers.length,
    existing: 0,
    created: 0,
    emailMatches: 0,
    externalIdMatches: 0,
  };

  // Detect duplicate emails within batch
  const emailCounts = new Map<string, number>();
  for (const user of buddyUsers) {
    const normalizedEmail = normalizeEmail(user.email);
    emailCounts.set(normalizedEmail, (emailCounts.get(normalizedEmail) || 0) + 1);
  }

  const duplicateEmails = Array.from(emailCounts.entries())
    .filter(([_, count]) => count > 1)
    .map(([email]) => email);

  if (duplicateEmails.length > 0) {
    logger.warn(
      { duplicateEmails, count: duplicateEmails.length },
      'Duplicate emails detected in Buddy export batch'
    );
  }

  // Process each user
  for (const buddyUser of buddyUsers) {
    try {
      const resolution = await resolveIdentity(buddyUser);
      resolutions.push(resolution);

      // Update stats
      if (resolution.isNewUser) {
        stats.created++;
      } else {
        stats.existing++;
        if (resolution.matchMethod === 'email') {
          stats.emailMatches++;
        } else if (resolution.matchMethod === 'external_id') {
          stats.externalIdMatches++;
        }
      }

      // Log warnings
      if (resolution.warnings.length > 0) {
        logger.warn(
          { buddyUserId: buddyUser.id, warnings: resolution.warnings },
          'Identity resolution warnings'
        );
      }
    } catch (error: any) {
      logger.error(
        { buddyUserId: buddyUser.id, email: buddyUser.email, error: error.message },
        'Failed to resolve identity for Buddy user'
      );

      // Record as conflict for manual review
      conflicts.push({
        buddyUserId: buddyUser.id,
        csrUserId: '', // Unknown
        conflictType: 'missing_email',
        buddyEmail: buddyUser.email,
        resolution: 'manual_review',
      });
    }
  }

  logger.info(
    stats,
    'Batch identity resolution complete'
  );

  return { resolutions, conflicts, stats };
}

/**
 * Update existing user's journey flags after linking Buddy account
 */
export async function updateJourneyFlagsForBuddyUser(
  csrUserId: string,
  buddyUser: BuddyUserExport
): Promise<void> {
  // Get current journey flags
  const [currentUser] = await db
    .select({ journeyFlags: users.journeyFlags })
    .from(users)
    .where(eq(users.id, csrUserId))
    .limit(1);

  if (!currentUser) {
    throw new Error(`CSR user not found: ${csrUserId}`);
  }

  const currentFlags = (currentUser.journeyFlags as Record<string, any>) || {};

  // Merge Buddy flags
  const updatedFlags = {
    ...currentFlags,
    is_buddy_participant: buddyUser.role === 'participant' || currentFlags.is_buddy_participant,
    is_buddy_volunteer: buddyUser.role === 'buddy' || currentFlags.is_buddy_volunteer,
    buddy_joined_at: buddyUser.joined_at,
    buddy_last_synced: new Date().toISOString(),
  };

  // Update user
  await db
    .update(users)
    .set({ journeyFlags: updatedFlags, updatedAt: new Date() })
    .where(eq(users.id, csrUserId));

  logger.debug(
    { csrUserId, buddyUserId: buddyUser.id },
    'Updated journey flags for Buddy user'
  );
}
