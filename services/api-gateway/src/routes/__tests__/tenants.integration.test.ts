import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import { registerTenantRoutes } from '../tenants.js';
import { SystemRole } from '../../middleware/rbac.js';

describe('Tenant API Integration Tests', () => {
  let fastify: FastifyInstance;
  let authToken: string;
  let adminToken: string;
  const testCompanyId = '550e8400-e29b-41d4-a716-446655440000';
  const testUserId = 'user-123';
  const testAdminId = 'admin-123';

  beforeAll(async () => {
    // Initialize Fastify instance
    fastify = Fastify({ logger: false });

    // Register JWT plugin
    await fastify.register(fastifyJwt, {
      secret: 'test-secret-key'
    });

    // Register tenant routes
    await registerTenantRoutes(fastify);

    await fastify.ready();

    // Generate test tokens
    authToken = fastify.jwt.sign({
      userId: testUserId,
      email: 'user@test.com',
      role: SystemRole.COMPANY_USER,
      companyId: testCompanyId
    });

    adminToken = fastify.jwt.sign({
      userId: testAdminId,
      email: 'admin@test.com',
      role: SystemRole.COMPANY_ADMIN,
      companyId: testCompanyId
    });
  });

  afterAll(async () => {
    await fastify.close();
  });

  describe('GET /api/companies', () => {
    it('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/companies'
      });

      expect(response.statusCode).toBe(401);
      const json = response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('should list accessible companies for authenticated user', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/companies',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta.userId).toBe(testUserId);
    });
  });

  describe('GET /api/companies/:companyId', () => {
    it('should return 401 without authentication', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}`
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return company details for authorized user', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.id).toBe(testCompanyId);
      expect(json.data.name).toBeDefined();
      expect(json.data.userRole).toBeDefined();
    });

    it('should return 400 for invalid company ID format', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: '/api/companies/invalid-uuid',
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.message).toContain('Invalid tenant ID format');
    });

    it('should return 404 for non-existent company', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const token = fastify.jwt.sign({
        userId: testUserId,
        email: 'user@test.com',
        role: SystemRole.COMPANY_USER,
        companyId: nonExistentId
      });

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${nonExistentId}`,
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(404);
      const json = response.json();
      expect(json.message).toContain('Company not found');
    });
  });

  describe('PUT /api/companies/:companyId/settings', () => {
    it('should return 403 for non-admin user', async () => {
      const response = await fastify.inject({
        method: 'PUT',
        url: `/api/companies/${testCompanyId}/settings`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          feature_flags: {
            sroi_calculator: true
          }
        }
      });

      expect(response.statusCode).toBe(403);
      const json = response.json();
      expect(json.error).toBe('Forbidden');
    });

    it('should update settings for admin user', async () => {
      const settings = {
        feature_flags: {
          sroi_calculator: true,
          vis_scoring: true
        },
        sroi_overrides: {
          mentorship: 2.5
        }
      };

      const response = await fastify.inject({
        method: 'PUT',
        url: `/api/companies/${testCompanyId}/settings`,
        headers: {
          authorization: `Bearer ${adminToken}`
        },
        payload: settings
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.companyId).toBe(testCompanyId);
      expect(json.data.settings).toBeDefined();
      expect(json.message).toContain('updated successfully');
    });

    it('should return 400 for invalid settings keys', async () => {
      const response = await fastify.inject({
        method: 'PUT',
        url: `/api/companies/${testCompanyId}/settings`,
        headers: {
          authorization: `Bearer ${adminToken}`
        },
        payload: {
          invalid_key: 'value',
          another_invalid: 123
        }
      });

      expect(response.statusCode).toBe(400);
      const json = response.json();
      expect(json.message).toContain('Invalid settings keys');
      expect(json.allowedKeys).toBeDefined();
    });
  });

  describe('GET /api/companies/:companyId/api-keys', () => {
    it('should return 403 for non-admin user', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}/api-keys`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(403);
    });

    it('should list API keys for admin user', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}/api-keys`,
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta.companyId).toBe(testCompanyId);

      // Verify keys don't contain actual key values
      if (json.data.length > 0) {
        const key = json.data[0];
        expect(key.id).toBeDefined();
        expect(key.name).toBeDefined();
        expect(key.key).toBeUndefined(); // Actual key should never be returned
      }
    });
  });

  describe('POST /api/companies/:companyId/api-keys/regenerate', () => {
    it('should return 403 for non-admin user', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/api/companies/${testCompanyId}/api-keys/regenerate`,
        headers: {
          authorization: `Bearer ${authToken}`
        },
        payload: {
          name: 'Test API Key'
        }
      });

      expect(response.statusCode).toBe(403);
    });

    it('should generate new API key for admin user', async () => {
      const response = await fastify.inject({
        method: 'POST',
        url: `/api/companies/${testCompanyId}/api-keys/regenerate`,
        headers: {
          authorization: `Bearer ${adminToken}`
        },
        payload: {
          name: 'New Production Key',
          scopes: ['data:read', 'data:write']
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.apiKey).toBeDefined();
      expect(json.data.apiKey).toMatch(/^teei_[a-f0-9]{8}_[a-f0-9]{64}$/);
      expect(json.data.metadata.name).toBe('New Production Key');
      expect(json.data.metadata.scopes).toEqual(['data:read', 'data:write']);
      expect(json.message).toContain('Save this key securely');
    });
  });

  describe('DELETE /api/companies/:companyId/api-keys/:keyId', () => {
    it('should return 403 for non-admin user', async () => {
      const keyId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await fastify.inject({
        method: 'DELETE',
        url: `/api/companies/${testCompanyId}/api-keys/${keyId}`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(403);
    });

    it('should revoke API key for admin user', async () => {
      const keyId = '123e4567-e89b-12d3-a456-426614174000';
      const response = await fastify.inject({
        method: 'DELETE',
        url: `/api/companies/${testCompanyId}/api-keys/${keyId}`,
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.message).toContain('revoked successfully');
      expect(json.data.keyId).toBe(keyId);
      expect(json.data.revokedAt).toBeDefined();
    });
  });

  describe('GET /api/companies/:companyId/users', () => {
    it('should return 403 for non-admin user', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}/users`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(403);
    });

    it('should list company users for admin', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}/users`,
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.meta.companyId).toBe(testCompanyId);
    });
  });

  describe('GET /api/companies/:companyId/permissions', () => {
    it('should return user permissions', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}/permissions`,
        headers: {
          authorization: `Bearer ${authToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
      expect(json.data.companyId).toBe(testCompanyId);
      expect(json.data.userId).toBe(testUserId);
      expect(json.data.role).toBeDefined();
      expect(Array.isArray(json.data.permissions)).toBe(true);
    });

    it('should return admin permissions for admin user', async () => {
      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}/permissions`,
        headers: {
          authorization: `Bearer ${adminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.data.role).toBe(SystemRole.COMPANY_ADMIN);
      expect(json.data.permissions.length).toBeGreaterThan(0);

      // Admin should have write permissions
      expect(json.data.permissions).toContain('company:write');
      expect(json.data.permissions).toContain('user:write');
    });
  });

  describe('Tenant Isolation Tests', () => {
    it('should prevent access to unauthorized company', async () => {
      const otherCompanyId = '123e4567-e89b-12d3-a456-426614174999';
      const token = fastify.jwt.sign({
        userId: testUserId,
        email: 'user@test.com',
        role: SystemRole.COMPANY_USER,
        companyId: testCompanyId  // User belongs to different company
      });

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${otherCompanyId}`,
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      // Should fail due to tenant mismatch
      // In production with DB, this would be 403
      // With mock data, it returns 404
      expect([403, 404]).toContain(response.statusCode);
    });

    it('should allow system admin to access any company', async () => {
      const systemAdminToken = fastify.jwt.sign({
        userId: 'system-admin-123',
        email: 'sysadmin@test.com',
        role: SystemRole.SYSTEM_ADMIN
      });

      const response = await fastify.inject({
        method: 'GET',
        url: `/api/companies/${testCompanyId}`,
        headers: {
          authorization: `Bearer ${systemAdminToken}`
        }
      });

      expect(response.statusCode).toBe(200);
      const json = response.json();
      expect(json.success).toBe(true);
    });
  });
});
