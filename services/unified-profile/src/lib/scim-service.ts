/**
 * SCIM 2.0 Service
 * Business logic for user and group provisioning with audit logging
 */

import { createServiceLogger } from '@teei/shared-utils';
import { randomUUID } from 'crypto';
import {
  ScimUser,
  ScimGroup,
  ScimListResponse,
  ScimPatchRequest,
  ScimFilterOptions,
  UserRecord,
  GroupRecord,
  GroupMembershipRecord,
  ScimAuditEvent,
  SCIM_SCHEMAS,
} from '../types/scim.js';
import { ScimFilterParser, evaluateUserFilter, evaluateGroupFilter } from './scim-filter.js';

const logger = createServiceLogger('scim-service');

/**
 * In-memory storage for demo
 * Production: Replace with PostgreSQL/Drizzle ORM
 */
class ScimStore {
  private users: Map<string, UserRecord> = new Map();
  private groups: Map<string, GroupRecord> = new Map();
  private memberships: Map<string, GroupMembershipRecord[]> = new Map();
  private auditLog: ScimAuditEvent[] = [];

  // User operations
  createUser(user: UserRecord): UserRecord {
    this.users.set(user.id, user);
    return user;
  }

  getUserById(id: string): UserRecord | null {
    return this.users.get(id) || null;
  }

  getUserByUserName(userName: string, tenantId: string): UserRecord | null {
    for (const user of this.users.values()) {
      if (user.userName === userName && user.tenantId === tenantId) {
        return user;
      }
    }
    return null;
  }

  getUserByExternalId(externalId: string, tenantId: string): UserRecord | null {
    for (const user of this.users.values()) {
      if (user.externalId === externalId && user.tenantId === tenantId) {
        return user;
      }
    }
    return null;
  }

  updateUser(id: string, updates: Partial<UserRecord>): UserRecord | null {
    const user = this.users.get(id);
    if (!user) return null;

    const updated = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  deleteUser(id: string): boolean {
    return this.users.delete(id);
  }

  listUsers(tenantId: string): UserRecord[] {
    return Array.from(this.users.values()).filter(u => u.tenantId === tenantId);
  }

  // Group operations
  createGroup(group: GroupRecord): GroupRecord {
    this.groups.set(group.id, group);
    return group;
  }

  getGroupById(id: string): GroupRecord | null {
    return this.groups.get(id) || null;
  }

  getGroupByDisplayName(displayName: string, tenantId: string): GroupRecord | null {
    for (const group of this.groups.values()) {
      if (group.displayName === displayName && group.tenantId === tenantId) {
        return group;
      }
    }
    return null;
  }

  updateGroup(id: string, updates: Partial<GroupRecord>): GroupRecord | null {
    const group = this.groups.get(id);
    if (!group) return null;

    const updated = { ...group, ...updates, updatedAt: new Date() };
    this.groups.set(id, updated);
    return updated;
  }

  deleteGroup(id: string): boolean {
    this.memberships.delete(id);
    return this.groups.delete(id);
  }

  listGroups(tenantId: string): GroupRecord[] {
    return Array.from(this.groups.values()).filter(g => g.tenantId === tenantId);
  }

  // Membership operations
  addMembership(membership: GroupMembershipRecord): void {
    const existing = this.memberships.get(membership.groupId) || [];
    existing.push(membership);
    this.memberships.set(membership.groupId, existing);
  }

  removeMembership(groupId: string, userId: string): void {
    const existing = this.memberships.get(groupId) || [];
    const filtered = existing.filter(m => m.userId !== userId);
    this.memberships.set(groupId, filtered);
  }

  getGroupMembers(groupId: string): string[] {
    const members = this.memberships.get(groupId) || [];
    return members.map(m => m.userId);
  }

  getUserGroups(userId: string): string[] {
    const groupIds: string[] = [];
    for (const [groupId, members] of this.memberships.entries()) {
      if (members.some(m => m.userId === userId)) {
        groupIds.push(groupId);
      }
    }
    return groupIds;
  }

  // Audit
  logAudit(event: ScimAuditEvent): void {
    this.auditLog.push(event);
  }

  getAuditLog(): ScimAuditEvent[] {
    return this.auditLog;
  }
}

const store = new ScimStore();

export class ScimService {
  private filterParser = new ScimFilterParser();

  // ==================== User Operations ====================

  async listUsers(
    tenantId: string,
    options: ScimFilterOptions,
    actorId: string
  ): Promise<ScimListResponse<ScimUser>> {
    const { filter, startIndex = 1, count = 100, sortBy = 'meta.created', sortOrder = 'ascending' } = options;

    let users = store.listUsers(tenantId);

    // Apply filter
    if (filter) {
      try {
        const parsedFilter = this.filterParser.parse(filter);
        users = users.filter(u => evaluateUserFilter(u, parsedFilter));
      } catch (error: any) {
        logger.error('Filter parse error', { error, filter });
        throw new Error(`Invalid filter: ${error.message}`);
      }
    }

    // Sort
    users = this.sortUsers(users, sortBy, sortOrder);

    // Paginate
    const totalResults = users.length;
    const start = startIndex - 1;
    const end = start + count;
    const paginatedUsers = users.slice(start, end);

    return {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults,
      startIndex,
      itemsPerPage: paginatedUsers.length,
      Resources: paginatedUsers.map(u => this.toScimUser(u)),
    };
  }

  async getUser(id: string, actorId: string): Promise<ScimUser | null> {
    const user = store.getUserById(id);
    if (!user) return null;

    store.logAudit({
      timestamp: new Date(),
      tenantId: user.tenantId,
      operation: 'read',
      resourceType: 'User',
      resourceId: id,
      actor: { id: actorId },
    });

    return this.toScimUser(user);
  }

  async createUser(scimUser: ScimUser, tenantId: string, actorId: string): Promise<ScimUser> {
    // Idempotency check
    if (scimUser.externalId) {
      const existing = store.getUserByExternalId(scimUser.externalId, tenantId);
      if (existing) {
        logger.info('User already exists (idempotent create)', { externalId: scimUser.externalId });
        return this.toScimUser(existing);
      }
    }

    // Check userName uniqueness
    const existingByUserName = store.getUserByUserName(scimUser.userName, tenantId);
    if (existingByUserName) {
      throw new Error('userName already exists');
    }

    const now = new Date();
    const id = randomUUID();
    const version = randomUUID();

    const user: UserRecord = {
      id,
      externalId: scimUser.externalId,
      userName: scimUser.userName,
      givenName: scimUser.name?.givenName,
      familyName: scimUser.name?.familyName,
      displayName: scimUser.displayName || scimUser.name?.formatted,
      emails: scimUser.emails?.map(e => e.value) || [],
      primaryEmail: scimUser.emails?.find(e => e.primary)?.value || scimUser.emails?.[0]?.value || scimUser.userName,
      active: scimUser.active ?? true,
      roles: scimUser.roles?.map(r => r.value) || [],
      tenantId,
      createdAt: now,
      updatedAt: now,
      version,
    };

    store.createUser(user);

    store.logAudit({
      timestamp: now,
      tenantId,
      operation: 'create',
      resourceType: 'User',
      resourceId: id,
      actor: { id: actorId },
    });

    logger.info('User created', { id, userName: user.userName, tenantId });
    return this.toScimUser(user);
  }

  async replaceUser(id: string, scimUser: ScimUser, actorId: string): Promise<ScimUser | null> {
    const existing = store.getUserById(id);
    if (!existing) return null;

    const now = new Date();
    const updated: UserRecord = {
      ...existing,
      externalId: scimUser.externalId,
      userName: scimUser.userName,
      givenName: scimUser.name?.givenName,
      familyName: scimUser.name?.familyName,
      displayName: scimUser.displayName || scimUser.name?.formatted,
      emails: scimUser.emails?.map(e => e.value) || [],
      primaryEmail: scimUser.emails?.find(e => e.primary)?.value || scimUser.emails?.[0]?.value || scimUser.userName,
      active: scimUser.active ?? true,
      roles: scimUser.roles?.map(r => r.value) || [],
      updatedAt: now,
      version: randomUUID(),
    };

    store.updateUser(id, updated);

    store.logAudit({
      timestamp: now,
      tenantId: existing.tenantId,
      operation: 'update',
      resourceType: 'User',
      resourceId: id,
      actor: { id: actorId },
      changes: { operation: 'replace' },
    });

    logger.info('User replaced', { id, tenantId: existing.tenantId });
    return this.toScimUser(updated);
  }

  async patchUser(id: string, patch: ScimPatchRequest, actorId: string): Promise<ScimUser | null> {
    const existing = store.getUserById(id);
    if (!existing) return null;

    let user = { ...existing };

    for (const op of patch.Operations) {
      switch (op.op) {
        case 'replace':
          if (op.path === 'active') {
            user.active = Boolean(op.value);
          } else if (op.path?.startsWith('name.')) {
            const field = op.path.split('.')[1] as 'givenName' | 'familyName';
            user[field] = op.value;
          }
          break;
        case 'add':
          if (op.path === 'roles') {
            user.roles = [...user.roles, ...(Array.isArray(op.value) ? op.value.map((v: any) => v.value) : [op.value])];
          }
          break;
        case 'remove':
          if (op.path === 'roles') {
            const roleToRemove = op.value?.value || op.value;
            user.roles = user.roles.filter(r => r !== roleToRemove);
          }
          break;
      }
    }

    user.updatedAt = new Date();
    user.version = randomUUID();

    store.updateUser(id, user);

    store.logAudit({
      timestamp: new Date(),
      tenantId: user.tenantId,
      operation: 'update',
      resourceType: 'User',
      resourceId: id,
      actor: { id: actorId },
      changes: { operations: patch.Operations },
    });

    logger.info('User patched', { id, operations: patch.Operations.length });
    return this.toScimUser(user);
  }

  async deleteUser(id: string, actorId: string): Promise<boolean> {
    const user = store.getUserById(id);
    if (!user) return false;

    // Soft delete: mark as inactive
    store.updateUser(id, { active: false, updatedAt: new Date() });

    store.logAudit({
      timestamp: new Date(),
      tenantId: user.tenantId,
      operation: 'delete',
      resourceType: 'User',
      resourceId: id,
      actor: { id: actorId },
    });

    logger.info('User soft-deleted', { id, tenantId: user.tenantId });
    return true;
  }

  // ==================== Group Operations ====================

  async listGroups(
    tenantId: string,
    options: ScimFilterOptions,
    actorId: string
  ): Promise<ScimListResponse<ScimGroup>> {
    const { filter, startIndex = 1, count = 100 } = options;

    let groups = store.listGroups(tenantId);

    // Apply filter
    if (filter) {
      try {
        const parsedFilter = this.filterParser.parse(filter);
        groups = groups.filter(g => evaluateGroupFilter(g, parsedFilter));
      } catch (error: any) {
        logger.error('Filter parse error', { error, filter });
        throw new Error(`Invalid filter: ${error.message}`);
      }
    }

    const totalResults = groups.length;
    const start = startIndex - 1;
    const end = start + count;
    const paginatedGroups = groups.slice(start, end);

    return {
      schemas: [SCIM_SCHEMAS.LIST_RESPONSE],
      totalResults,
      startIndex,
      itemsPerPage: paginatedGroups.length,
      Resources: paginatedGroups.map(g => this.toScimGroup(g)),
    };
  }

  async getGroup(id: string, actorId: string): Promise<ScimGroup | null> {
    const group = store.getGroupById(id);
    if (!group) return null;

    store.logAudit({
      timestamp: new Date(),
      tenantId: group.tenantId,
      operation: 'read',
      resourceType: 'Group',
      resourceId: id,
      actor: { id: actorId },
    });

    return this.toScimGroup(group);
  }

  async createGroup(scimGroup: ScimGroup, tenantId: string, actorId: string): Promise<ScimGroup> {
    const existing = store.getGroupByDisplayName(scimGroup.displayName, tenantId);
    if (existing) {
      throw new Error('displayName already exists');
    }

    const now = new Date();
    const id = randomUUID();

    const group: GroupRecord = {
      id,
      externalId: scimGroup.externalId,
      displayName: scimGroup.displayName,
      tenantId,
      createdAt: now,
      updatedAt: now,
      version: randomUUID(),
    };

    store.createGroup(group);

    // Add members
    if (scimGroup.members) {
      for (const member of scimGroup.members) {
        store.addMembership({
          groupId: id,
          userId: member.value,
          tenantId,
          createdAt: now,
        });
      }
    }

    store.logAudit({
      timestamp: now,
      tenantId,
      operation: 'create',
      resourceType: 'Group',
      resourceId: id,
      actor: { id: actorId },
    });

    logger.info('Group created', { id, displayName: group.displayName, tenantId });
    return this.toScimGroup(group);
  }

  async patchGroup(id: string, patch: ScimPatchRequest, actorId: string): Promise<ScimGroup | null> {
    const group = store.getGroupById(id);
    if (!group) return null;

    for (const op of patch.Operations) {
      if (op.path === 'members') {
        if (op.op === 'add') {
          const members = Array.isArray(op.value) ? op.value : [op.value];
          for (const member of members) {
            store.addMembership({
              groupId: id,
              userId: member.value,
              tenantId: group.tenantId,
              createdAt: new Date(),
            });
          }
        } else if (op.op === 'remove') {
          const members = Array.isArray(op.value) ? op.value : [op.value];
          for (const member of members) {
            store.removeMembership(id, member.value);
          }
        }
      }
    }

    store.updateUser(id, { updatedAt: new Date(), version: randomUUID() });

    store.logAudit({
      timestamp: new Date(),
      tenantId: group.tenantId,
      operation: 'update',
      resourceType: 'Group',
      resourceId: id,
      actor: { id: actorId },
      changes: { operations: patch.Operations },
    });

    logger.info('Group patched', { id, operations: patch.Operations.length });
    return this.toScimGroup(group);
  }

  async deleteGroup(id: string, actorId: string): Promise<boolean> {
    const group = store.getGroupById(id);
    if (!group) return false;

    store.deleteGroup(id);

    store.logAudit({
      timestamp: new Date(),
      tenantId: group.tenantId,
      operation: 'delete',
      resourceType: 'Group',
      resourceId: id,
      actor: { id: actorId },
    });

    logger.info('Group deleted', { id, tenantId: group.tenantId });
    return true;
  }

  // ==================== Helpers ====================

  private toScimUser(user: UserRecord): ScimUser {
    const location = `/scim/v2/Users/${user.id}`;
    return {
      schemas: [SCIM_SCHEMAS.USER],
      id: user.id,
      externalId: user.externalId,
      userName: user.userName,
      name: {
        givenName: user.givenName,
        familyName: user.familyName,
        formatted: user.displayName,
      },
      displayName: user.displayName,
      emails: user.emails.map(email => ({
        value: email,
        primary: email === user.primaryEmail,
      })),
      active: user.active,
      roles: user.roles.map(role => ({ value: role, display: role })),
      groups: store.getUserGroups(user.id).map(groupId => {
        const group = store.getGroupById(groupId);
        return {
          value: groupId,
          $ref: `/scim/v2/Groups/${groupId}`,
          display: group?.displayName,
        };
      }),
      meta: {
        resourceType: 'User',
        created: user.createdAt.toISOString(),
        lastModified: user.updatedAt.toISOString(),
        version: user.version,
        location,
      },
    };
  }

  private toScimGroup(group: GroupRecord): ScimGroup {
    const location = `/scim/v2/Groups/${group.id}`;
    const memberIds = store.getGroupMembers(group.id);

    return {
      schemas: [SCIM_SCHEMAS.GROUP],
      id: group.id,
      externalId: group.externalId,
      displayName: group.displayName,
      members: memberIds.map(userId => {
        const user = store.getUserById(userId);
        return {
          value: userId,
          $ref: `/scim/v2/Users/${userId}`,
          display: user?.displayName || user?.userName,
          type: 'User' as const,
        };
      }),
      meta: {
        resourceType: 'Group',
        created: group.createdAt.toISOString(),
        lastModified: group.updatedAt.toISOString(),
        version: group.version,
        location,
      },
    };
  }

  private sortUsers(users: UserRecord[], sortBy: string, sortOrder: string): UserRecord[] {
    const sorted = [...users].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortBy === 'meta.created') {
        aVal = a.createdAt.getTime();
        bVal = b.createdAt.getTime();
      } else if (sortBy === 'userName') {
        aVal = a.userName;
        bVal = b.userName;
      } else {
        return 0;
      }

      if (aVal < bVal) return sortOrder === 'ascending' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'ascending' ? 1 : -1;
      return 0;
    });

    return sorted;
  }

  async getAuditLog(): Promise<ScimAuditEvent[]> {
    return store.getAuditLog();
  }
}
