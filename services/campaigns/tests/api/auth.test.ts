/**
 * Authentication & Authorization Tests
 *
 * Tests for JWT validation and company admin authorization.
 * Target: ≥80% code coverage
 *
 * SWARM 6: Agent 3.6 - Campaign Service API
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyRequest, FastifyReply } from 'fastify';
import {
  authenticateJWT,
  requireRole,
  requireAdmin,
  requireCompanyAdmin,
  enforceTenantIsolation,
  UserRole,
  type AuthenticatedRequest,
} from '../../src/middleware/auth.js';

describe('Authentication Middleware', () => {
  let mockRequest: Partial<FastifyRequest>;
  let mockReply: Partial<FastifyReply>;

  beforeEach(() => {
    mockRequest = {
      jwtVerify: vi.fn().mockResolvedValue(undefined),
    };

    mockReply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  describe('authenticateJWT', () => {
    it('should verify JWT token successfully', async () => {
      await authenticateJWT(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockRequest.jwtVerify).toHaveBeenCalled();
      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should reject invalid JWT token', async () => {
      mockRequest.jwtVerify = vi.fn().mockRejectedValue(new Error('Invalid token'));

      await authenticateJWT(
        mockRequest as FastifyRequest,
        mockReply as FastifyReply
      );

      expect(mockReply.status).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Unauthorized',
        })
      );
    });
  });

  describe('requireRole', () => {
    it('should allow access for authorized role', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      } as AuthenticatedRequest;

      const middleware = requireRole(UserRole.ADMIN);
      await middleware(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'user@example.com',
          role: UserRole.COMPANY_USER,
        },
      } as AuthenticatedRequest;

      const middleware = requireRole(UserRole.ADMIN);
      await middleware(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Forbidden',
        })
      );
    });

    it('should deny access when user is not authenticated', async () => {
      const unauthRequest = {} as AuthenticatedRequest;

      const middleware = requireRole(UserRole.ADMIN);
      await middleware(unauthRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(401);
    });
  });

  describe('requireAdmin', () => {
    it('should allow admin access', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      } as AuthenticatedRequest;

      await requireAdmin(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should deny non-admin access', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'user@example.com',
          role: UserRole.COMPANY_USER,
        },
      } as AuthenticatedRequest;

      await requireAdmin(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });
  });

  describe('requireCompanyAdmin', () => {
    it('should allow company admin access', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'admin@company.com',
          role: UserRole.COMPANY_ADMIN,
        },
      } as AuthenticatedRequest;

      await requireCompanyAdmin(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should allow platform admin access', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
      } as AuthenticatedRequest;

      await requireCompanyAdmin(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should deny regular user access', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'user@company.com',
          role: UserRole.COMPANY_USER,
        },
      } as AuthenticatedRequest;

      await requireCompanyAdmin(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });
  });

  describe('enforceTenantIsolation', () => {
    it('should allow platform admin to access any company', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'admin@example.com',
          role: UserRole.ADMIN,
        },
        params: { companyId: 'company-123' },
      } as any;

      await enforceTenantIsolation(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should allow user to access their own company', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'user@company.com',
          role: UserRole.COMPANY_ADMIN,
          companyId: 'company-123',
        },
        params: { companyId: 'company-123' },
      } as any;

      await enforceTenantIsolation(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should deny user access to other companies', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'user@company.com',
          role: UserRole.COMPANY_ADMIN,
          companyId: 'company-123',
        },
        params: { companyId: 'company-456' },
      } as any;

      await enforceTenantIsolation(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'Forbidden',
          message: 'Cannot access campaigns for other companies',
        })
      );
    });

    it('should deny access when user has no companyId and no companyId in request', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'user@example.com',
          role: UserRole.COMPANY_ADMIN,
        },
        params: {},
        body: {},
        query: {},
      } as any;

      await enforceTenantIsolation(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).toHaveBeenCalledWith(403);
    });

    it('should check companyId in body', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'user@company.com',
          role: UserRole.COMPANY_ADMIN,
          companyId: 'company-123',
        },
        params: {},
        body: { companyId: 'company-123' },
        query: {},
      } as any;

      await enforceTenantIsolation(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });

    it('should check companyId in query', async () => {
      const authRequest = {
        user: {
          userId: '123',
          email: 'user@company.com',
          role: UserRole.COMPANY_ADMIN,
          companyId: 'company-123',
        },
        params: {},
        body: {},
        query: { companyId: 'company-123' },
      } as any;

      await enforceTenantIsolation(authRequest, mockReply as FastifyReply);

      expect(mockReply.status).not.toHaveBeenCalled();
    });
  });
});
