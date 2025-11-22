/**
 * User Transformer - Buddy Program Users → CSR Users
 *
 * Transforms validated Buddy Program users (participants & buddies) into CSR platform users.
 * Handles identity unification, role mapping, and journey flag management.
 *
 * @module ingestion-buddy/transformers/user-transformer
 * @agent Agent 10 (buddy-transformer-users)
 */

import { createServiceLogger } from '@teei/shared-utils';
import {
  resolveIdentity,
  resolveBatchIdentities,
  updateJourneyFlagsForBuddyUser,
  type BuddyUserExport,
  type IdentityResolution,
} from '../utils/identity-matcher';
import type { BuddyUser } from '../validators/schemas';

const logger = createServiceLogger('ingestion-buddy:user-transformer');

/**
 * Transformation result for a single user
 */
export interface UserTransformResult {
  buddyUserId: string;
  csrUserId: string;
  isNewUser: boolean;
  matchMethod: 'email' | 'external_id' | 'created';
  csrRole: 'volunteer' | 'beneficiary';
  warnings: string[];
}

/**
 * Batch transformation result
 */
export interface BatchUserTransformResult {
  transformed: UserTransformResult[];
  errors: Array<{
    buddyUserId: string;
    buddyEmail: string;
    error: string;
  }>;
  stats: {
    total: number;
    newUsers: number;
    existingUsers: number;
    emailMatches: number;
    externalIdMatches: number;
    volunteers: number;
    beneficiaries: number;
  };
}

/**
 * Map Buddy user role to CSR role
 */
function mapBuddyRoleToCsrRole(buddyRole: string): 'volunteer' | 'beneficiary' {
  const roleMap: Record<string, 'volunteer' | 'beneficiary'> = {
    'participant': 'beneficiary',
    'buddy': 'volunteer',
  };

  return roleMap[buddyRole] || 'volunteer'; // Default to volunteer if unknown
}

/**
 * Convert validated Buddy user to BuddyUserExport format
 * (for identity-matcher interface)
 */
function toBuddyUserExport(validatedUser: BuddyUser): BuddyUserExport {
  return {
    id: validatedUser.id,
    email: validatedUser.email,
    first_name: validatedUser.first_name,
    last_name: validatedUser.last_name,
    role: validatedUser.role,
    joined_at: validatedUser.joined_at,
    language_preference: validatedUser.language_preference || undefined,
    interests: validatedUser.interests || undefined,
    location: validatedUser.location || undefined,
  };
}

/**
 * Transform a single Buddy user into CSR user
 *
 * @param validatedUser - Validated Buddy user
 * @returns Transformation result
 */
export async function transformUser(
  validatedUser: BuddyUser
): Promise<UserTransformResult> {
  const buddyUserExport = toBuddyUserExport(validatedUser);

  logger.debug(
    { buddyUserId: validatedUser.id, email: validatedUser.email, role: validatedUser.role },
    'Transforming Buddy user to CSR user'
  );

  try {
    // Resolve identity (create new or link to existing CSR user)
    const resolution: IdentityResolution = await resolveIdentity(buddyUserExport);

    // Map role
    const csrRole = mapBuddyRoleToCsrRole(validatedUser.role);

    // If linked to existing user, update journey flags
    if (!resolution.isNewUser) {
      await updateJourneyFlagsForBuddyUser(resolution.csrUserId, buddyUserExport);
    }

    logger.info(
      {
        buddyUserId: validatedUser.id,
        csrUserId: resolution.csrUserId,
        isNewUser: resolution.isNewUser,
        matchMethod: resolution.matchMethod,
        csrRole,
      },
      'User transformation complete'
    );

    return {
      buddyUserId: validatedUser.id,
      csrUserId: resolution.csrUserId,
      isNewUser: resolution.isNewUser,
      matchMethod: resolution.matchMethod,
      csrRole,
      warnings: resolution.warnings,
    };
  } catch (error: any) {
    logger.error(
      { buddyUserId: validatedUser.id, email: validatedUser.email, error: error.message },
      'User transformation failed'
    );
    throw error;
  }
}

/**
 * Transform batch of Buddy users into CSR users
 *
 * @param validatedUsers - Array of validated Buddy users
 * @returns Batch transformation result
 */
export async function transformUsersBatch(
  validatedUsers: BuddyUser[]
): Promise<BatchUserTransformResult> {
  logger.info(
    { userCount: validatedUsers.length },
    'Starting batch user transformation'
  );

  // Convert to BuddyUserExport format
  const buddyUserExports = validatedUsers.map(toBuddyUserExport);

  // Batch identity resolution
  const { resolutions, conflicts, stats: identityStats } = await resolveBatchIdentities(
    buddyUserExports
  );

  const transformed: UserTransformResult[] = [];
  const errors: Array<{ buddyUserId: string; buddyEmail: string; error: string }> = [];

  let volunteers = 0;
  let beneficiaries = 0;

  // Process resolutions
  for (let i = 0; i < validatedUsers.length; i++) {
    const validatedUser = validatedUsers[i];
    const resolution = resolutions[i];

    if (!resolution) {
      // Resolution failed (conflict or error)
      const conflict = conflicts.find((c) => c.buddyUserId === validatedUser.id);
      errors.push({
        buddyUserId: validatedUser.id,
        buddyEmail: validatedUser.email,
        error: conflict?.conflictType || 'Unknown error during identity resolution',
      });
      continue;
    }

    const csrRole = mapBuddyRoleToCsrRole(validatedUser.role);

    // Update journey flags for existing users
    if (!resolution.isNewUser) {
      try {
        await updateJourneyFlagsForBuddyUser(
          resolution.csrUserId,
          buddyUserExports[i]
        );
      } catch (err: any) {
        logger.warn(
          { buddyUserId: validatedUser.id, csrUserId: resolution.csrUserId, error: err.message },
          'Failed to update journey flags (continuing)'
        );
        resolution.warnings.push(`Journey flag update failed: ${err.message}`);
      }
    }

    transformed.push({
      buddyUserId: validatedUser.id,
      csrUserId: resolution.csrUserId,
      isNewUser: resolution.isNewUser,
      matchMethod: resolution.matchMethod,
      csrRole,
      warnings: resolution.warnings,
    });

    // Count roles
    if (csrRole === 'volunteer') {
      volunteers++;
    } else {
      beneficiaries++;
    }
  }

  const batchStats = {
    total: validatedUsers.length,
    newUsers: identityStats.created,
    existingUsers: identityStats.existing,
    emailMatches: identityStats.emailMatches,
    externalIdMatches: identityStats.externalIdMatches,
    volunteers,
    beneficiaries,
  };

  logger.info(
    batchStats,
    'Batch user transformation complete'
  );

  return {
    transformed,
    errors,
    stats: batchStats,
  };
}

/**
 * Build user ID mapping for downstream transformers
 *
 * Maps Buddy user IDs → CSR user IDs for use in activity/feedback/milestone transformations.
 *
 * @param transformResults - User transformation results
 * @returns Map of Buddy ID → CSR ID
 */
export function buildUserIdMapping(
  transformResults: UserTransformResult[]
): Map<string, string> {
  const mapping = new Map<string, string>();

  for (const result of transformResults) {
    mapping.set(result.buddyUserId, result.csrUserId);
  }

  logger.debug(
    { mappingSize: mapping.size },
    'Built user ID mapping for downstream transformers'
  );

  return mapping;
}

/**
 * Get transformation statistics summary
 */
export function summarizeUserTransformations(
  result: BatchUserTransformResult
): string {
  const lines: string[] = [
    '--- User Transformation Summary ---',
    '',
    `Total Users: ${result.stats.total}`,
    `  - New CSR Users: ${result.stats.newUsers}`,
    `  - Existing CSR Users: ${result.stats.existingUsers}`,
    '',
    'Identity Resolution:',
    `  - Email Matches: ${result.stats.emailMatches}`,
    `  - External ID Matches: ${result.stats.externalIdMatches}`,
    '',
    'Role Distribution:',
    `  - Volunteers (buddies): ${result.stats.volunteers}`,
    `  - Beneficiaries (participants): ${result.stats.beneficiaries}`,
    '',
  ];

  if (result.errors.length > 0) {
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  - ${error.buddyEmail} (${error.buddyUserId}): ${error.error}`);
    }
    lines.push('');
  }

  const warningCount = result.transformed.filter((t) => t.warnings.length > 0).length;
  if (warningCount > 0) {
    lines.push(`Warnings: ${warningCount} users have warnings`);
    lines.push('');
  }

  return lines.join('\n');
}
