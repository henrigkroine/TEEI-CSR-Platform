import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  SystemRole,
  Permission,
  ROLE_PERMISSIONS,
  roleHasPermission,
  hasPermission,
  requireRole,
  requirePermission,
  requireSystemAdmin,
  requireCompanyAdmin,
  requireTenantAdmin
} from '../rbac.js';
import { AuthenticatedRequest } from '../auth.js';
import { TenantRequest } from '../tenantScope.js';

describe('RBAC Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let sendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    statusSpy = vi.fn().mockReturnThis();
    sendSpy = vi.fn();

    mockReply = {
      status: statusSpy,
      send: sendSpy
    };

    mockRequest = {
      log: {
        warn: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn()
      } as any,
      url: '/api/test'
    };
  });

  describe('Role Permissions Mapping', () => {
    it('should have permissions defined for all roles', () => {
      Object.values(SystemRole).forEach(role => {
        expect(ROLE_PERMISSIONS[role]).toBeDefined();
        expect(Array.isArray(ROLE_PERMISSIONS[role])).toBe(true);
      });
    });

    it('should grant system admin all permissions', () => {
      const allPermissions = Object.values(Permission);
      const systemAdminPerms = ROLE_PERMISSIONS[SystemRole.SYSTEM_ADMIN];

      expect(systemAdminPerms.length).toBe(allPermissions.length);
      allPermissions.forEach(perm => {
        expect(systemAdminPerms).toContain(perm);
      });
    });

    it('should grant company admin more permissions than company user', () => {
      const adminPerms = ROLE_PERMISSIONS[SystemRole.COMPANY_ADMIN];
      const userPerms = ROLE_PERMISSIONS[SystemRole.COMPANY_USER];

      expect(adminPerms.length).toBeGreaterThan(userPerms.length);

      // Admin should have write permissions
      expect(adminPerms).toContain(Permission.COMPANY_WRITE);
      expect(userPerms).not.toContain(Permission.COMPANY_WRITE);
    });

    it('should grant participant minimal permissions', () => {
      const participantPerms = ROLE_PERMISSIONS[SystemRole.PARTICIPANT];

      expect(participantPerms).toContain(Permission.COMPANY_READ);
      expect(participantPerms).toContain(Permission.DATA_READ);
      expect(participantPerms).toContain(Permission.REPORT_VIEW);

      // Should not have write permissions
      expect(participantPerms).not.toContain(Permission.DATA_WRITE);
      expect(participantPerms).not.toContain(Permission.COMPANY_WRITE);
    });
  });

  describe('roleHasPermission', () => {
    it('should return true if role has permission', () => {
      const result = roleHasPermission(SystemRole.COMPANY_ADMIN, Permission.COMPANY_WRITE);
      expect(result).toBe(true);
    });

    it('should return false if role lacks permission', () => {
      const result = roleHasPermission(SystemRole.COMPANY_USER, Permission.COMPANY_WRITE);
      expect(result).toBe(false);
    });

    it('should return true for system admin with any permission', () => {
      const result = roleHasPermission(SystemRole.SYSTEM_ADMIN, Permission.SYSTEM_ADMIN_ACCESS);
      expect(result).toBe(true);
    });
  });

  describe('hasPermission', () => {
    it('should return true if user has permission', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_ADMIN
      };

      const result = hasPermission(mockRequest as FastifyRequest, Permission.COMPANY_WRITE);
      expect(result).toBe(true);
    });

    it('should return false if user lacks permission', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_USER
      };

      const result = hasPermission(mockRequest as FastifyRequest, Permission.COMPANY_WRITE);
      expect(result).toBe(false);
    });

    it('should return false if user is not authenticated', () => {
      const result = hasPermission(mockRequest as FastifyRequest, Permission.DATA_READ);
      expect(result).toBe(false);
    });

    it('should use tenant role if more permissive', () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_USER
      };

      (mockRequest as TenantRequest).tenant = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
        role: SystemRole.COMPANY_ADMIN
      };

      const result = hasPermission(mockRequest as FastifyRequest, Permission.COMPANY_WRITE);
      expect(result).toBe(true);
    });
  });

  describe('requireRole', () => {
    it('should return 401 if user is not authenticated', async () => {
      const middleware = requireRole(SystemRole.COMPANY_ADMIN);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized'
        })
      );
    });

    it('should return 403 if user lacks required role', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_USER
      };

      const middleware = requireRole(SystemRole.COMPANY_ADMIN);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Forbidden',
          requiredRoles: [SystemRole.COMPANY_ADMIN]
        })
      );
    });

    it('should allow access if user has required role', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_ADMIN
      };

      const middleware = requireRole(SystemRole.COMPANY_ADMIN);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should allow access if user has any of multiple required roles', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_USER
      };

      const middleware = requireRole(SystemRole.COMPANY_ADMIN, SystemRole.COMPANY_USER);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should use tenant role if available', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_USER
      };

      (mockRequest as TenantRequest).tenant = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
        role: SystemRole.COMPANY_ADMIN
      };

      const middleware = requireRole(SystemRole.COMPANY_ADMIN);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission', () => {
    it('should return 401 if user is not authenticated', async () => {
      const middleware = requirePermission(Permission.DATA_WRITE);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });

    it('should return 403 if user lacks required permission', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.PARTICIPANT
      };

      const middleware = requirePermission(Permission.DATA_WRITE);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Forbidden',
          missingPermissions: [Permission.DATA_WRITE]
        })
      );
    });

    it('should allow access if user has required permission', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_ADMIN
      };

      const middleware = requirePermission(Permission.DATA_WRITE);
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
    });

    it('should require all specified permissions', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_USER
      };

      const middleware = requirePermission(
        Permission.DATA_READ,
        Permission.DATA_WRITE,
        Permission.USER_DELETE  // User doesn't have this
      );
      await middleware(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          missingPermissions: expect.arrayContaining([Permission.USER_DELETE])
        })
      );
    });
  });

  describe('Pre-defined role middleware', () => {
    it('requireSystemAdmin should only allow system admin', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: SystemRole.SYSTEM_ADMIN
      };

      await requireSystemAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(statusSpy).not.toHaveBeenCalled();

      // Test with non-admin
      (mockRequest as AuthenticatedRequest).user.role = SystemRole.COMPANY_ADMIN;
      await requireSystemAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(statusSpy).toHaveBeenCalledWith(403);
    });

    it('requireCompanyAdmin should allow system admin and company admin', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_ADMIN
      };

      await requireCompanyAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);
      expect(statusSpy).not.toHaveBeenCalled();
    });
  });

  describe('requireTenantAdmin', () => {
    it('should return 401 if user is not authenticated', async () => {
      await requireTenantAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(401);
    });

    it('should return 403 if no tenant context', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_ADMIN
      };

      await requireTenantAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Tenant context required')
        })
      );
    });

    it('should return 403 if user is not tenant admin', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_USER
      };

      (mockRequest as TenantRequest).tenant = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
        role: SystemRole.COMPANY_USER
      };

      await requireTenantAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(403);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Company admin access required')
        })
      );
    });

    it('should allow access if user is tenant admin', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: SystemRole.COMPANY_ADMIN
      };

      (mockRequest as TenantRequest).tenant = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-123',
        role: SystemRole.COMPANY_ADMIN
      };

      await requireTenantAdmin(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
    });
  });
});
