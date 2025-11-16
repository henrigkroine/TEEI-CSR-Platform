/**
 * Sharing RBAC Utilities
 *
 * Phase H - Cockpit GA
 * Role-based access control for org and group sharing
 */

import { pool } from '../db/connection.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('reporting:sharing-rbac');

export type AccessType = 'public_link' | 'org_share' | 'group_share';
export type UserRole = 'admin' | 'manager' | 'member' | 'viewer' | 'guest';

export interface ShareAccessConfig {
  accessType: AccessType;
  groupIds?: string[];
  roleRestrictions?: UserRole[];
  companyId: string;
}

export interface UserContext {
  userId: string;
  email?: string;
  roles: UserRole[];
  companyId: string;
  groupIds?: string[];
}

/**
 * Check if a user has access to a shared resource based on RBAC rules
 *
 * @param user - User context with roles and groups
 * @param shareConfig - Share link access configuration
 * @returns validation result
 */
export async function validateUserAccess(
  user: UserContext | null,
  shareConfig: ShareAccessConfig
): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  // Public links: no auth required
  if (shareConfig.accessType === 'public_link') {
    return { allowed: true };
  }

  // Org/Group shares require authentication
  if (!user) {
    return {
      allowed: false,
      reason: 'Authentication required for organization/group shares',
    };
  }

  // Org share: user must belong to the same company
  if (shareConfig.accessType === 'org_share') {
    if (user.companyId !== shareConfig.companyId) {
      return {
        allowed: false,
        reason: 'User does not belong to the organization',
      };
    }

    // Check role restrictions if specified
    if (shareConfig.roleRestrictions && shareConfig.roleRestrictions.length > 0) {
      const hasRequiredRole = shareConfig.roleRestrictions.some((requiredRole) =>
        user.roles.includes(requiredRole)
      );

      if (!hasRequiredRole) {
        return {
          allowed: false,
          reason: `User role does not meet requirements. Required: ${shareConfig.roleRestrictions.join(', ')}`,
        };
      }
    }

    return { allowed: true };
  }

  // Group share: user must be a member of one of the specified groups
  if (shareConfig.accessType === 'group_share') {
    if (!shareConfig.groupIds || shareConfig.groupIds.length === 0) {
      return {
        allowed: false,
        reason: 'No groups specified for group share',
      };
    }

    // Check if user is a member of any of the specified groups
    const isMember = await isUserMemberOfAnyGroup(user.userId, shareConfig.groupIds);

    if (!isMember) {
      return {
        allowed: false,
        reason: 'User is not a member of any authorized groups',
      };
    }

    // Check role restrictions within groups
    if (shareConfig.roleRestrictions && shareConfig.roleRestrictions.length > 0) {
      const hasRequiredRole = shareConfig.roleRestrictions.some((requiredRole) =>
        user.roles.includes(requiredRole)
      );

      if (!hasRequiredRole) {
        return {
          allowed: false,
          reason: `User role does not meet requirements. Required: ${shareConfig.roleRestrictions.join(', ')}`,
        };
      }
    }

    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Unknown access type',
  };
}

/**
 * Check if user is a member of any of the specified groups
 */
export async function isUserMemberOfAnyGroup(
  userId: string,
  groupIds: string[]
): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM group_members
        WHERE user_id = $1 AND group_id = ANY($2::uuid[])
      ) AS is_member`,
      [userId, groupIds]
    );

    return result.rows[0]?.is_member || false;
  } catch (error) {
    logger.error('Error checking group membership', { error, userId, groupIds });
    return false;
  }
}

/**
 * Get user's group memberships
 */
export async function getUserGroups(userId: string): Promise<{
  groupId: string;
  groupName: string;
  role: string;
}[]> {
  try {
    const result = await pool.query(
      `SELECT
        gm.group_id as "groupId",
        og.name as "groupName",
        gm.role
      FROM group_members gm
      JOIN organization_groups og ON og.id = gm.group_id
      WHERE gm.user_id = $1
      ORDER BY og.name`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error fetching user groups', { error, userId });
    return [];
  }
}

/**
 * Create a new organization group
 */
export async function createOrganizationGroup(params: {
  companyId: string;
  name: string;
  description?: string;
  parentGroupId?: string;
  createdBy: string;
}): Promise<{ groupId: string }> {
  try {
    const result = await pool.query(
      `INSERT INTO organization_groups (company_id, name, description, parent_group_id, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id as "groupId"`,
      [params.companyId, params.name, params.description || null, params.parentGroupId || null, params.createdBy]
    );

    const groupId = result.rows[0].groupId;

    logger.info('Organization group created', {
      groupId,
      companyId: params.companyId,
      name: params.name,
    });

    return { groupId };
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation
      throw new Error(`Group with name "${params.name}" already exists for this company`);
    }
    throw error;
  }
}

/**
 * Add user to group
 */
export async function addUserToGroup(params: {
  groupId: string;
  userId: string;
  role?: 'admin' | 'member' | 'viewer';
  addedBy: string;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, role, added_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id, user_id) DO UPDATE SET role = $3`,
      [params.groupId, params.userId, params.role || 'member', params.addedBy]
    );

    logger.info('User added to group', {
      groupId: params.groupId,
      userId: params.userId,
      role: params.role || 'member',
    });
  } catch (error) {
    logger.error('Error adding user to group', { error, params });
    throw error;
  }
}

/**
 * Remove user from group
 */
export async function removeUserFromGroup(params: {
  groupId: string;
  userId: string;
}): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [params.groupId, params.userId]
    );

    logger.info('User removed from group', {
      groupId: params.groupId,
      userId: params.userId,
    });
  } catch (error) {
    logger.error('Error removing user from group', { error, params });
    throw error;
  }
}

/**
 * Get group members
 */
export async function getGroupMembers(groupId: string): Promise<{
  userId: string;
  role: string;
  addedAt: Date;
}[]> {
  try {
    const result = await pool.query(
      `SELECT user_id as "userId", role, added_at as "addedAt"
       FROM group_members
       WHERE group_id = $1
       ORDER BY added_at DESC`,
      [groupId]
    );

    return result.rows;
  } catch (error) {
    logger.error('Error fetching group members', { error, groupId });
    return [];
  }
}

/**
 * Check if user has admin permission for a group
 */
export async function isGroupAdmin(userId: string, groupId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1 FROM group_members
        WHERE user_id = $1 AND group_id = $2 AND role = 'admin'
      ) AS is_admin`,
      [userId, groupId]
    );

    return result.rows[0]?.is_admin || false;
  } catch (error) {
    logger.error('Error checking group admin status', { error, userId, groupId });
    return false;
  }
}

/**
 * Validate role hierarchy
 * Returns true if actor has sufficient permissions to modify target role
 */
export function canModifyRole(actorRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    admin: 4,
    manager: 3,
    member: 2,
    viewer: 1,
    guest: 0,
  };

  return roleHierarchy[actorRole] >= roleHierarchy[targetRole];
}

/**
 * Parse role restrictions from JSON
 */
export function parseRoleRestrictions(roleRestrictionsJSON: any): UserRole[] {
  if (!roleRestrictionsJSON) {
    return [];
  }

  try {
    if (Array.isArray(roleRestrictionsJSON)) {
      return roleRestrictionsJSON as UserRole[];
    }
    return [];
  } catch (error) {
    logger.error('Error parsing role restrictions', { error, roleRestrictionsJSON });
    return [];
  }
}

/**
 * Get user context from user ID (stub - integrate with auth service)
 */
export async function getUserContext(userId: string, companyId: string): Promise<UserContext | null> {
  // TODO: Integrate with actual auth service
  // For now, return a basic context
  try {
    const groups = await getUserGroups(userId);

    return {
      userId,
      roles: ['member'],  // TODO: Fetch actual roles
      companyId,
      groupIds: groups.map((g) => g.groupId),
    };
  } catch (error) {
    logger.error('Error getting user context', { error, userId });
    return null;
  }
}
