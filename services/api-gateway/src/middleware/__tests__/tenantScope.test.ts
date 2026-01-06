import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyRequest, FastifyReply } from 'fastify';
import {
  tenantScope,
  optionalTenantScope,
  getTenantId,
  isTenantAdmin,
  getTenantContext,
  TenantRequest
} from '../tenantScope.js';
import { AuthenticatedRequest, UserRole } from '../auth.js';

describe('Tenant Scope Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let sendSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset mocks
    statusSpy = vi.fn().mockReturnThis();
    sendSpy = vi.fn();

    mockReply = {
      status: statusSpy,
      send: sendSpy
    };

    mockRequest = {
      params: {},
      headers: {},
      query: {},
      ip: '127.0.0.1',
      url: '/api/test',
      log: {
        warn: vi.fn(),
        debug: vi.fn(),
        info: vi.fn(),
        error: vi.fn()
      } as any
    };
  });

  describe('tenantScope', () => {
    it('should return 401 if user is not authenticated', async () => {
      await tenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(401);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized',
          message: expect.stringContaining('Authentication required')
        })
      );
    });

    it('should return 400 if tenant ID is missing', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.COMPANY_USER
      };

      await tenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Bad Request',
          message: expect.stringContaining('Tenant ID')
        })
      );
    });

    it('should return 400 if tenant ID is invalid UUID', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.COMPANY_USER
      };
      mockRequest.params = { companyId: 'invalid-uuid' };

      await tenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).toHaveBeenCalledWith(400);
      expect(sendSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Bad Request',
          message: expect.stringContaining('Invalid tenant ID format')
        })
      );
    });

    it('should extract tenant ID from route params', async () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440000';
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.COMPANY_ADMIN,
        companyId
      };
      mockRequest.params = { companyId };

      await tenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
      expect((mockRequest as TenantRequest).tenant).toEqual({
        companyId,
        role: UserRole.COMPANY_ADMIN,
        userId: 'user-123',
        permissions: []
      });
    });

    it('should extract tenant ID from X-Tenant-ID header', async () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440000';
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.COMPANY_USER,
        companyId
      };
      mockRequest.headers = { 'x-tenant-id': companyId };

      await tenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
      expect((mockRequest as TenantRequest).tenant).toBeDefined();
      expect((mockRequest as TenantRequest).tenant.companyId).toBe(companyId);
    });

    it('should extract tenant ID from JWT claims', async () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440000';
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.COMPANY_USER,
        companyId
      };

      await tenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
      expect((mockRequest as TenantRequest).tenant).toBeDefined();
      expect((mockRequest as TenantRequest).tenant.companyId).toBe(companyId);
    });

    it('should allow system admin to access any tenant', async () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440000';
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'admin-123',
        email: 'admin@example.com',
        role: UserRole.ADMIN
      };
      mockRequest.params = { companyId };

      await tenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
      expect((mockRequest as TenantRequest).tenant).toBeDefined();
      expect((mockRequest as TenantRequest).tenant.companyId).toBe(companyId);
    });
  });

  describe('optionalTenantScope', () => {
    it('should not fail if user is not authenticated', async () => {
      await optionalTenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
      expect((mockRequest as TenantRequest).tenant).toBeUndefined();
    });

    it('should not fail if tenant ID is missing', async () => {
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.COMPANY_USER
      };

      await optionalTenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
      expect((mockRequest as TenantRequest).tenant).toBeUndefined();
    });

    it('should attach tenant context if available', async () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440000';
      (mockRequest as AuthenticatedRequest).user = {
        userId: 'user-123',
        email: 'test@example.com',
        role: UserRole.COMPANY_USER,
        companyId
      };

      await optionalTenantScope(mockRequest as FastifyRequest, mockReply as FastifyReply);

      expect(statusSpy).not.toHaveBeenCalled();
      expect((mockRequest as TenantRequest).tenant).toBeDefined();
      expect((mockRequest as TenantRequest).tenant.companyId).toBe(companyId);
    });
  });

  describe('getTenantId', () => {
    it('should return tenant ID from request', () => {
      const companyId = '550e8400-e29b-41d4-a716-446655440000';
      (mockRequest as TenantRequest).tenant = {
        companyId,
        role: 'company_user',
        userId: 'user-123'
      };

      const result = getTenantId(mockRequest as FastifyRequest);
      expect(result).toBe(companyId);
    });

    it('should throw error if tenant context not available', () => {
      expect(() => getTenantId(mockRequest as FastifyRequest)).toThrow(
        'Tenant context not available'
      );
    });
  });

  describe('isTenantAdmin', () => {
    it('should return true for company_admin', () => {
      (mockRequest as TenantRequest).tenant = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'company_admin',
        userId: 'user-123'
      };

      const result = isTenantAdmin(mockRequest as FastifyRequest);
      expect(result).toBe(true);
    });

    it('should return true for system_admin', () => {
      (mockRequest as TenantRequest).tenant = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'system_admin',
        userId: 'user-123'
      };

      const result = isTenantAdmin(mockRequest as FastifyRequest);
      expect(result).toBe(true);
    });

    it('should return false for company_user', () => {
      (mockRequest as TenantRequest).tenant = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'company_user',
        userId: 'user-123'
      };

      const result = isTenantAdmin(mockRequest as FastifyRequest);
      expect(result).toBe(false);
    });
  });

  describe('getTenantContext', () => {
    it('should return full tenant context', () => {
      const context = {
        companyId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'company_user',
        userId: 'user-123',
        permissions: ['data:read']
      };
      (mockRequest as TenantRequest).tenant = context;

      const result = getTenantContext(mockRequest as FastifyRequest);
      expect(result).toEqual(context);
    });

    it('should throw error if tenant context not available', () => {
      expect(() => getTenantContext(mockRequest as FastifyRequest)).toThrow(
        'Tenant context not available'
      );
    });
  });
});
