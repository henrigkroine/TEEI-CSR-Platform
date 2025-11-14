import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateJWT, AuthenticatedRequest } from '../middleware/auth.js';
import { tenantScope, TenantRequest } from '../middleware/tenantScope.js';
import {
  requireCompanyAdmin,
  requireCompanyUser,
  requirePermission,
  Permission,
  getUserPermissions
} from '../middleware/rbac.js';
import {
  getTenantContext,
  TenantQueryBuilder,
  logTenantAction,
  TenantSettings,
  generateTenantAPIKey,
  encryptTenantData
} from '../utils/tenantContext.js';

/**
 * Company response DTO
 */
interface CompanyDTO {
  id: string;
  name: string;
  industry?: string;
  size?: string;
  employeeCount?: number;
  countryCode?: string;
  logoUrl?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  settings?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userRole?: string;
}

/**
 * Mock database - Replace with actual database queries
 */
const mockCompanies: Map<string, any> = new Map([
  ['550e8400-e29b-41d4-a716-446655440000', {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Acme Corporation',
    industry: 'Technology',
    size: 'large',
    employeeCount: 5000,
    countryCode: 'USA',
    logoUrl: 'https://example.com/logo.png',
    websiteUrl: 'https://acme.com',
    contactEmail: 'info@acme.com',
    contactPhone: '+1-555-0123',
    addressLine1: '123 Main St',
    addressLine2: 'Suite 100',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94105',
    country: 'United States',
    settings: {
      feature_flags: {
        sroi_calculator: true,
        vis_scoring: true,
        advanced_analytics: true
      },
      sroi_overrides: {
        mentorship: 2.5,
        skills_training: 3.0
      },
      branding: {
        primaryColor: '#0066CC',
        secondaryColor: '#FF6600'
      }
    },
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  }]
]);

/**
 * Register tenant-related API routes
 */
export async function registerTenantRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/companies
   * List all companies accessible to the authenticated user
   */
  fastify.get('/api/companies', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest;

    try {
      // TODO: Query company_users table to get accessible companies
      // For now, return mock data
      const companies: CompanyDTO[] = Array.from(mockCompanies.values()).map(company => ({
        id: company.id,
        name: company.name,
        industry: company.industry,
        size: company.size,
        employeeCount: company.employeeCount,
        countryCode: company.countryCode,
        logoUrl: company.logoUrl,
        websiteUrl: company.websiteUrl,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        address: {
          line1: company.addressLine1,
          line2: company.addressLine2,
          city: company.city,
          state: company.state,
          postalCode: company.postalCode,
          country: company.country
        },
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        userRole: 'company_admin' // TODO: Get from company_users table
      }));

      return reply.send({
        success: true,
        data: companies,
        meta: {
          total: companies.length,
          userId: authRequest.user.userId
        }
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to list companies');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve companies'
      });
    }
  });

  /**
   * GET /api/companies/:companyId
   * Get detailed information about a specific company
   */
  fastify.get('/api/companies/:companyId', {
    onRequest: [authenticateJWT, tenantScope, requireCompanyUser]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as { companyId: string };
    const tenantRequest = request as TenantRequest;

    try {
      // TODO: Query database
      const company = mockCompanies.get(companyId);

      if (!company) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Company not found'
        });
      }

      const companyDTO: CompanyDTO = {
        id: company.id,
        name: company.name,
        industry: company.industry,
        size: company.size,
        employeeCount: company.employeeCount,
        countryCode: company.countryCode,
        logoUrl: company.logoUrl,
        websiteUrl: company.websiteUrl,
        contactEmail: company.contactEmail,
        contactPhone: company.contactPhone,
        address: {
          line1: company.addressLine1,
          line2: company.addressLine2,
          city: company.city,
          state: company.state,
          postalCode: company.postalCode,
          country: company.country
        },
        settings: company.settings,
        isActive: company.isActive,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
        userRole: tenantRequest.tenant.role
      };

      return reply.send({
        success: true,
        data: companyDTO
      });
    } catch (error) {
      request.log.error({ error, companyId }, 'Failed to get company');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve company information'
      });
    }
  });

  /**
   * PUT /api/companies/:companyId/settings
   * Update company settings (admin only)
   */
  fastify.put('/api/companies/:companyId/settings', {
    onRequest: [
      authenticateJWT,
      tenantScope,
      requireCompanyAdmin,
      requirePermission(Permission.COMPANY_SETTINGS)
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as { companyId: string };
    const settings = request.body as Record<string, any>;

    try {
      // Validate settings structure
      const allowedKeys = ['feature_flags', 'sroi_overrides', 'branding', 'notification_settings', 'integration_settings'];
      const invalidKeys = Object.keys(settings).filter(key => !allowedKeys.includes(key));

      if (invalidKeys.length > 0) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: `Invalid settings keys: ${invalidKeys.join(', ')}`,
          allowedKeys
        });
      }

      // TODO: Update database
      const company = mockCompanies.get(companyId);
      if (!company) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Company not found'
        });
      }

      // Merge settings
      company.settings = {
        ...company.settings,
        ...settings
      };
      company.updatedAt = new Date().toISOString();

      // Log the action
      await logTenantAction(request, {
        action: 'update_settings',
        resourceType: 'company',
        resourceId: companyId,
        changes: settings
      });

      return reply.send({
        success: true,
        data: {
          companyId,
          settings: company.settings,
          updatedAt: company.updatedAt
        },
        message: 'Company settings updated successfully'
      });
    } catch (error) {
      request.log.error({ error, companyId }, 'Failed to update company settings');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update company settings'
      });
    }
  });

  /**
   * GET /api/companies/:companyId/api-keys
   * List API keys for company (admin only)
   */
  fastify.get('/api/companies/:companyId/api-keys', {
    onRequest: [
      authenticateJWT,
      tenantScope,
      requireCompanyAdmin,
      requirePermission(Permission.API_KEY_READ)
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as { companyId: string };

    try {
      // TODO: Query company_api_keys table
      // For security, never return actual keys, only metadata
      const apiKeys = [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Production API Key',
          scopes: ['data:read', 'data:write', 'report:view'],
          rateLimitPerHour: 1000,
          lastUsedAt: '2024-01-15T08:30:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: null,
          isActive: true
        }
      ];

      return reply.send({
        success: true,
        data: apiKeys,
        meta: {
          total: apiKeys.length,
          companyId
        }
      });
    } catch (error) {
      request.log.error({ error, companyId }, 'Failed to list API keys');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve API keys'
      });
    }
  });

  /**
   * POST /api/companies/:companyId/api-keys/regenerate
   * Regenerate API key (admin only)
   */
  fastify.post('/api/companies/:companyId/api-keys/regenerate', {
    onRequest: [
      authenticateJWT,
      tenantScope,
      requireCompanyAdmin,
      requirePermission(Permission.API_KEY_REGENERATE)
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as { companyId: string };
    const { keyId, name, scopes } = request.body as {
      keyId?: string;
      name?: string;
      scopes?: string[];
    };

    try {
      // Generate new API key
      const { apiKey, keyHash } = generateTenantAPIKey(companyId);

      // TODO: Update or insert into company_api_keys table
      const newKey = {
        id: keyId || crypto.randomUUID(),
        companyId,
        keyHash,
        name: name || 'API Key',
        scopes: scopes || ['data:read', 'report:view'],
        rateLimitPerHour: 1000,
        lastUsedAt: null,
        createdAt: new Date().toISOString(),
        expiresAt: null,
        isActive: true
      };

      // Log the action
      await logTenantAction(request, {
        action: 'regenerate_api_key',
        resourceType: 'api_key',
        resourceId: newKey.id,
        changes: { name: newKey.name, scopes: newKey.scopes }
      });

      return reply.send({
        success: true,
        data: {
          apiKey, // Only return once, never show again
          metadata: {
            id: newKey.id,
            name: newKey.name,
            scopes: newKey.scopes,
            rateLimitPerHour: newKey.rateLimitPerHour,
            createdAt: newKey.createdAt
          }
        },
        message: 'API key generated successfully. Save this key securely - it will not be shown again.'
      });
    } catch (error) {
      request.log.error({ error, companyId }, 'Failed to regenerate API key');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to regenerate API key'
      });
    }
  });

  /**
   * DELETE /api/companies/:companyId/api-keys/:keyId
   * Revoke API key (admin only)
   */
  fastify.delete('/api/companies/:companyId/api-keys/:keyId', {
    onRequest: [
      authenticateJWT,
      tenantScope,
      requireCompanyAdmin,
      requirePermission(Permission.API_KEY_REVOKE)
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId, keyId } = request.params as { companyId: string; keyId: string };

    try {
      // TODO: Soft delete or deactivate API key in database
      // UPDATE company_api_keys SET is_active = false WHERE id = ? AND company_id = ?

      // Log the action
      await logTenantAction(request, {
        action: 'revoke_api_key',
        resourceType: 'api_key',
        resourceId: keyId
      });

      return reply.send({
        success: true,
        message: 'API key revoked successfully',
        data: {
          keyId,
          revokedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      request.log.error({ error, companyId, keyId }, 'Failed to revoke API key');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to revoke API key'
      });
    }
  });

  /**
   * GET /api/companies/:companyId/users
   * List users with access to company (admin only)
   */
  fastify.get('/api/companies/:companyId/users', {
    onRequest: [
      authenticateJWT,
      tenantScope,
      requireCompanyAdmin,
      requirePermission(Permission.USER_READ)
    ]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as { companyId: string };

    try {
      // TODO: Query company_users table with user details
      const users = [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          userId: '456e7890-e89b-12d3-a456-426614174002',
          email: 'admin@acme.com',
          role: 'company_admin',
          permissions: {},
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];

      return reply.send({
        success: true,
        data: users,
        meta: {
          total: users.length,
          companyId
        }
      });
    } catch (error) {
      request.log.error({ error, companyId }, 'Failed to list company users');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve company users'
      });
    }
  });

  /**
   * GET /api/companies/:companyId/permissions
   * Get current user's permissions for the company
   */
  fastify.get('/api/companies/:companyId/permissions', {
    onRequest: [authenticateJWT, tenantScope]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { companyId } = request.params as { companyId: string };

    try {
      const permissions = getUserPermissions(request);
      const context = getTenantContext(request);

      return reply.send({
        success: true,
        data: {
          companyId,
          userId: context.userId,
          role: context.role,
          permissions
        }
      });
    } catch (error) {
      request.log.error({ error, companyId }, 'Failed to get permissions');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve permissions'
      });
    }
  });

  fastify.log.info('Tenant routes registered');
}
