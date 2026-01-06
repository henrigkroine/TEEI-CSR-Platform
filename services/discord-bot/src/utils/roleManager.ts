import { Guild, GuildMember, Role } from 'discord.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('discord:roleManager');

/**
 * Badge levels and their corresponding role names
 */
export const BADGE_ROLES: Record<string, string> = {
  emerging: 'Emerging Volunteer',
  contributing: 'Contributing Volunteer',
  high_impact: 'High Impact Volunteer',
  exceptional: 'Exceptional Volunteer',
};

/**
 * Role hierarchy (higher number = higher role)
 */
const ROLE_HIERARCHY: Record<string, number> = {
  emerging: 1,
  contributing: 2,
  high_impact: 3,
  exceptional: 4,
};

/**
 * Role colors (hex values)
 */
const ROLE_COLORS: Record<string, number> = {
  emerging: 0xfbbf24, // Yellow
  contributing: 0x3b82f6, // Blue
  high_impact: 0x8b5cf6, // Purple
  exceptional: 0xef4444, // Red
};

/**
 * Assign a recognition role to a member
 * Removes any existing recognition roles first to prevent conflicts
 */
export async function assignRecognitionRole(
  member: GuildMember,
  badgeLevel: string
): Promise<{
  success: boolean;
  role?: Role;
  error?: string;
  previousRole?: string;
}> {
  try {
    const guild = member.guild;
    const roleName = BADGE_ROLES[badgeLevel];

    if (!roleName) {
      return {
        success: false,
        error: `Invalid badge level: ${badgeLevel}`,
      };
    }

    // Find or create the role
    let role = guild.roles.cache.find((r) => r.name === roleName);

    if (!role) {
      // Create the role if it doesn't exist
      role = await guild.roles.create({
        name: roleName,
        color: ROLE_COLORS[badgeLevel],
        reason: 'Auto-created for volunteer recognition system',
        hoist: true, // Display role members separately
        mentionable: false,
      });

      logger.info('Created new recognition role', {
        roleName,
        roleId: role.id,
        guild: guild.name,
      });
    }

    // Check if member already has this role
    if (member.roles.cache.has(role.id)) {
      return {
        success: true,
        role,
        error: 'Member already has this role',
      };
    }

    // Remove any existing recognition roles
    const previousRole = await removeExistingRecognitionRoles(member);

    // Add the new role
    await member.roles.add(role, `Recognition: ${badgeLevel}`);

    logger.info('Assigned recognition role', {
      userId: member.user.id,
      username: member.user.username,
      roleName,
      roleId: role.id,
      previousRole,
    });

    return {
      success: true,
      role,
      previousRole,
    };
  } catch (error: any) {
    logger.error('Failed to assign recognition role', {
      userId: member.user.id,
      badgeLevel,
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Remove existing recognition roles from a member
 * Returns the name of the removed role (if any)
 */
async function removeExistingRecognitionRoles(member: GuildMember): Promise<string | undefined> {
  const recognitionRoleNames = Object.values(BADGE_ROLES);

  for (const role of member.roles.cache.values()) {
    if (recognitionRoleNames.includes(role.name)) {
      await member.roles.remove(role, 'Replacing with new recognition level');
      logger.info('Removed previous recognition role', {
        userId: member.user.id,
        roleName: role.name,
      });
      return role.name;
    }
  }

  return undefined;
}

/**
 * Get a member's current recognition level
 */
export function getMemberRecognitionLevel(member: GuildMember): {
  level?: string;
  roleName?: string;
  rank?: number;
} {
  const recognitionRoleNames = Object.values(BADGE_ROLES);

  for (const role of member.roles.cache.values()) {
    if (recognitionRoleNames.includes(role.name)) {
      // Find the badge level key for this role name
      const level = Object.keys(BADGE_ROLES).find((key) => BADGE_ROLES[key] === role.name);

      return {
        level,
        roleName: role.name,
        rank: level ? ROLE_HIERARCHY[level] : undefined,
      };
    }
  }

  return {};
}

/**
 * Check if a member can be promoted to a higher recognition level
 */
export function canPromoteToLevel(member: GuildMember, newLevel: string): {
  canPromote: boolean;
  reason?: string;
  currentLevel?: string;
} {
  const current = getMemberRecognitionLevel(member);
  const newRank = ROLE_HIERARCHY[newLevel];

  if (!current.level) {
    return {
      canPromote: true,
      reason: 'Member has no recognition role yet',
    };
  }

  if (!newRank) {
    return {
      canPromote: false,
      reason: `Invalid badge level: ${newLevel}`,
      currentLevel: current.level,
    };
  }

  if (current.rank && newRank < current.rank) {
    return {
      canPromote: false,
      reason: `Cannot demote from ${current.roleName} to ${BADGE_ROLES[newLevel]}`,
      currentLevel: current.level,
    };
  }

  return {
    canPromote: true,
    currentLevel: current.level,
  };
}

/**
 * Get leaderboard of members by recognition level
 */
export function getRecognitionLeaderboard(guild: Guild): Array<{
  userId: string;
  username: string;
  level: string;
  roleName: string;
  rank: number;
}> {
  const leaderboard: Array<{
    userId: string;
    username: string;
    level: string;
    roleName: string;
    rank: number;
  }> = [];

  // Iterate through all members with recognition roles
  for (const [, member] of guild.members.cache) {
    const recognition = getMemberRecognitionLevel(member);

    if (recognition.level && recognition.roleName && recognition.rank) {
      leaderboard.push({
        userId: member.user.id,
        username: member.user.username,
        level: recognition.level,
        roleName: recognition.roleName,
        rank: recognition.rank,
      });
    }
  }

  // Sort by rank (highest first)
  leaderboard.sort((a, b) => b.rank - a.rank);

  return leaderboard;
}

/**
 * Create all recognition roles in a guild (setup utility)
 */
export async function createAllRecognitionRoles(guild: Guild): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const [badgeLevel, roleName] of Object.entries(BADGE_ROLES)) {
    try {
      // Check if role already exists
      const existing = guild.roles.cache.find((r) => r.name === roleName);

      if (existing) {
        result.skipped++;
        continue;
      }

      // Create the role
      await guild.roles.create({
        name: roleName,
        color: ROLE_COLORS[badgeLevel],
        reason: 'Setup: Creating recognition roles',
        hoist: true,
        mentionable: false,
      });

      result.created++;
      logger.info('Created recognition role', { roleName, guild: guild.name });
    } catch (error: any) {
      result.errors.push(`${roleName}: ${error.message}`);
      logger.error('Failed to create recognition role', {
        roleName,
        error: error.message,
      });
    }
  }

  return result;
}
