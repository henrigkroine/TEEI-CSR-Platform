/**
 * SCIM Service Unit Tests
 * Coverage target: ≥85%
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScimService } from '../lib/scim-service.js';
import { ScimUser, ScimGroup, ScimPatchRequest, SCIM_SCHEMAS } from '../types/scim.js';

describe('ScimService - User Operations', () => {
  let service: ScimService;
  const tenantId = 'test-tenant';
  const actorId = 'admin-user';

  beforeEach(() => {
    service = new ScimService();
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const scimUser: ScimUser = {
        schemas: [SCIM_SCHEMAS.USER],
        externalId: 'ext-123',
        userName: 'john.doe@example.com',
        name: {
          givenName: 'John',
          familyName: 'Doe',
          formatted: 'John Doe',
        },
        emails: [
          { value: 'john.doe@example.com', primary: true },
        ],
        active: true,
        roles: [{ value: 'admin', display: 'Administrator' }],
      };

      const created = await service.createUser(scimUser, tenantId, actorId);

      expect(created.id).toBeDefined();
      expect(created.userName).toBe('john.doe@example.com');
      expect(created.name?.givenName).toBe('John');
      expect(created.active).toBe(true);
      expect(created.meta).toBeDefined();
      expect(created.meta?.resourceType).toBe('User');
    });

    it('should create user idempotently with externalId', async () => {
      const scimUser: ScimUser = {
        schemas: [SCIM_SCHEMAS.USER],
        externalId: 'ext-456',
        userName: 'jane.doe@example.com',
        active: true,
      };

      const created1 = await service.createUser(scimUser, tenantId, actorId);
      const created2 = await service.createUser(scimUser, tenantId, actorId);

      expect(created1.id).toBe(created2.id);
      expect(created2.userName).toBe('jane.doe@example.com');
    });

    it('should throw error for duplicate userName', async () => {
      const scimUser1: ScimUser = {
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'duplicate@example.com',
        active: true,
      };

      await service.createUser(scimUser1, tenantId, actorId);

      const scimUser2: ScimUser = {
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'duplicate@example.com',
        active: true,
      };

      await expect(service.createUser(scimUser2, tenantId, actorId)).rejects.toThrow('userName already exists');
    });

    it('should default active to true', async () => {
      const scimUser: ScimUser = {
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'default@example.com',
      };

      const created = await service.createUser(scimUser, tenantId, actorId);

      expect(created.active).toBe(true);
    });
  });

  describe('getUser', () => {
    it('should retrieve existing user', async () => {
      const scimUser: ScimUser = {
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'retrieve@example.com',
        active: true,
      };

      const created = await service.createUser(scimUser, tenantId, actorId);
      const retrieved = await service.getUser(created.id!, actorId);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.userName).toBe('retrieve@example.com');
    });

    it('should return null for non-existent user', async () => {
      const retrieved = await service.getUser('non-existent-id', actorId);
      expect(retrieved).toBeNull();
    });
  });

  describe('listUsers', () => {
    beforeEach(async () => {
      // Create test users
      await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'user1@example.com',
        active: true,
      }, tenantId, actorId);

      await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'user2@example.com',
        active: false,
      }, tenantId, actorId);
    });

    it('should list all users', async () => {
      const response = await service.listUsers(tenantId, {}, actorId);

      expect(response.schemas).toContain(SCIM_SCHEMAS.LIST_RESPONSE);
      expect(response.totalResults).toBeGreaterThanOrEqual(2);
      expect(response.Resources.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter users by active status', async () => {
      const response = await service.listUsers(
        tenantId,
        { filter: 'active eq true' },
        actorId
      );

      expect(response.Resources.every(u => u.active === true)).toBe(true);
    });

    it('should filter users by userName', async () => {
      const response = await service.listUsers(
        tenantId,
        { filter: 'userName eq "user1@example.com"' },
        actorId
      );

      expect(response.totalResults).toBe(1);
      expect(response.Resources[0].userName).toBe('user1@example.com');
    });

    it('should paginate results', async () => {
      const response = await service.listUsers(
        tenantId,
        { startIndex: 1, count: 1 },
        actorId
      );

      expect(response.itemsPerPage).toBe(1);
      expect(response.startIndex).toBe(1);
    });

    it('should throw error for invalid filter', async () => {
      await expect(
        service.listUsers(tenantId, { filter: 'invalid filter syntax' }, actorId)
      ).rejects.toThrow('Invalid filter');
    });
  });

  describe('replaceUser', () => {
    it('should replace user data', async () => {
      const created = await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'replace@example.com',
        name: { givenName: 'Old', familyName: 'Name' },
        active: true,
      }, tenantId, actorId);

      const updated = await service.replaceUser(created.id!, {
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'replace@example.com',
        name: { givenName: 'New', familyName: 'Name' },
        active: false,
      }, actorId);

      expect(updated).toBeDefined();
      expect(updated?.name?.givenName).toBe('New');
      expect(updated?.active).toBe(false);
    });

    it('should return null for non-existent user', async () => {
      const updated = await service.replaceUser('non-existent-id', {
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'test@example.com',
        active: true,
      }, actorId);

      expect(updated).toBeNull();
    });
  });

  describe('patchUser', () => {
    it('should replace active status', async () => {
      const created = await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'patch@example.com',
        active: true,
      }, tenantId, actorId);

      const patch: ScimPatchRequest = {
        schemas: [SCIM_SCHEMAS.PATCH_OP],
        Operations: [
          { op: 'replace', path: 'active', value: false },
        ],
      };

      const updated = await service.patchUser(created.id!, patch, actorId);

      expect(updated?.active).toBe(false);
    });

    it('should add roles', async () => {
      const created = await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'roles@example.com',
        active: true,
        roles: [{ value: 'viewer' }],
      }, tenantId, actorId);

      const patch: ScimPatchRequest = {
        schemas: [SCIM_SCHEMAS.PATCH_OP],
        Operations: [
          { op: 'add', path: 'roles', value: [{ value: 'editor' }] },
        ],
      };

      const updated = await service.patchUser(created.id!, patch, actorId);

      expect(updated?.roles?.map(r => r.value)).toContain('editor');
    });

    it('should remove roles', async () => {
      const created = await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'remove-role@example.com',
        active: true,
        roles: [{ value: 'admin' }, { value: 'editor' }],
      }, tenantId, actorId);

      const patch: ScimPatchRequest = {
        schemas: [SCIM_SCHEMAS.PATCH_OP],
        Operations: [
          { op: 'remove', path: 'roles', value: { value: 'admin' } },
        ],
      };

      const updated = await service.patchUser(created.id!, patch, actorId);

      expect(updated?.roles?.map(r => r.value)).not.toContain('admin');
      expect(updated?.roles?.map(r => r.value)).toContain('editor');
    });
  });

  describe('deleteUser', () => {
    it('should soft-delete user', async () => {
      const created = await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'delete@example.com',
        active: true,
      }, tenantId, actorId);

      const deleted = await service.deleteUser(created.id!, actorId);
      expect(deleted).toBe(true);

      const retrieved = await service.getUser(created.id!, actorId);
      expect(retrieved?.active).toBe(false);
    });

    it('should return false for non-existent user', async () => {
      const deleted = await service.deleteUser('non-existent-id', actorId);
      expect(deleted).toBe(false);
    });
  });
});

describe('ScimService - Group Operations', () => {
  let service: ScimService;
  const tenantId = 'test-tenant';
  const actorId = 'admin-user';

  beforeEach(() => {
    service = new ScimService();
  });

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const scimGroup: ScimGroup = {
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Engineering',
        members: [],
      };

      const created = await service.createGroup(scimGroup, tenantId, actorId);

      expect(created.id).toBeDefined();
      expect(created.displayName).toBe('Engineering');
      expect(created.meta).toBeDefined();
      expect(created.meta?.resourceType).toBe('Group');
    });

    it('should create group with members', async () => {
      const user = await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'member@example.com',
        active: true,
      }, tenantId, actorId);

      const scimGroup: ScimGroup = {
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Team A',
        members: [{ value: user.id!, $ref: `/scim/v2/Users/${user.id}` }],
      };

      const created = await service.createGroup(scimGroup, tenantId, actorId);

      expect(created.members).toBeDefined();
      expect(created.members?.length).toBe(1);
      expect(created.members?.[0].value).toBe(user.id);
    });

    it('should throw error for duplicate displayName', async () => {
      const group1: ScimGroup = {
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Duplicate Group',
      };

      await service.createGroup(group1, tenantId, actorId);

      const group2: ScimGroup = {
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Duplicate Group',
      };

      await expect(service.createGroup(group2, tenantId, actorId)).rejects.toThrow('displayName already exists');
    });
  });

  describe('listGroups', () => {
    beforeEach(async () => {
      await service.createGroup({
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Group 1',
      }, tenantId, actorId);

      await service.createGroup({
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Group 2',
      }, tenantId, actorId);
    });

    it('should list all groups', async () => {
      const response = await service.listGroups(tenantId, {}, actorId);

      expect(response.schemas).toContain(SCIM_SCHEMAS.LIST_RESPONSE);
      expect(response.totalResults).toBeGreaterThanOrEqual(2);
    });

    it('should filter groups by displayName', async () => {
      const response = await service.listGroups(
        tenantId,
        { filter: 'displayName eq "Group 1"' },
        actorId
      );

      expect(response.totalResults).toBe(1);
      expect(response.Resources[0].displayName).toBe('Group 1');
    });
  });

  describe('patchGroup', () => {
    it('should add members to group', async () => {
      const user1 = await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'user1@example.com',
        active: true,
      }, tenantId, actorId);

      const group = await service.createGroup({
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Test Group',
      }, tenantId, actorId);

      const patch: ScimPatchRequest = {
        schemas: [SCIM_SCHEMAS.PATCH_OP],
        Operations: [
          {
            op: 'add',
            path: 'members',
            value: [{ value: user1.id! }],
          },
        ],
      };

      const updated = await service.patchGroup(group.id!, patch, actorId);

      expect(updated?.members?.length).toBe(1);
      expect(updated?.members?.[0].value).toBe(user1.id);
    });

    it('should remove members from group', async () => {
      const user1 = await service.createUser({
        schemas: [SCIM_SCHEMAS.USER],
        userName: 'member1@example.com',
        active: true,
      }, tenantId, actorId);

      const group = await service.createGroup({
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Remove Test',
        members: [{ value: user1.id!, $ref: '' }],
      }, tenantId, actorId);

      const patch: ScimPatchRequest = {
        schemas: [SCIM_SCHEMAS.PATCH_OP],
        Operations: [
          {
            op: 'remove',
            path: 'members',
            value: [{ value: user1.id! }],
          },
        ],
      };

      const updated = await service.patchGroup(group.id!, patch, actorId);

      expect(updated?.members?.length).toBe(0);
    });
  });

  describe('deleteGroup', () => {
    it('should delete group', async () => {
      const group = await service.createGroup({
        schemas: [SCIM_SCHEMAS.GROUP],
        displayName: 'Delete Me',
      }, tenantId, actorId);

      const deleted = await service.deleteGroup(group.id!, actorId);
      expect(deleted).toBe(true);

      const retrieved = await service.getGroup(group.id!, actorId);
      expect(retrieved).toBeNull();
    });
  });
});

describe('ScimService - Audit Logging', () => {
  let service: ScimService;
  const tenantId = 'test-tenant';
  const actorId = 'admin-user';

  beforeEach(() => {
    service = new ScimService();
  });

  it('should log user creation', async () => {
    await service.createUser({
      schemas: [SCIM_SCHEMAS.USER],
      userName: 'audit@example.com',
      active: true,
    }, tenantId, actorId);

    const auditLog = await service.getAuditLog();
    const createEvent = auditLog.find(e => e.operation === 'create' && e.resourceType === 'User');

    expect(createEvent).toBeDefined();
    expect(createEvent?.tenantId).toBe(tenantId);
    expect(createEvent?.actor.id).toBe(actorId);
  });

  it('should log user deletion', async () => {
    const user = await service.createUser({
      schemas: [SCIM_SCHEMAS.USER],
      userName: 'delete-audit@example.com',
      active: true,
    }, tenantId, actorId);

    await service.deleteUser(user.id!, actorId);

    const auditLog = await service.getAuditLog();
    const deleteEvent = auditLog.find(e => e.operation === 'delete' && e.resourceId === user.id);

    expect(deleteEvent).toBeDefined();
  });
});
