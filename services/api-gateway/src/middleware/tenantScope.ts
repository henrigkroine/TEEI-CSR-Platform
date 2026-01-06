import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest, JWTPayload } from './auth.js';
import { Pool } from 'pg';
import { Redis } from 'ioredis';
import { auditLog, AuditAction } from './auditLog.js';

// Database and Redis connections (initialized at startup)
let dbPool: Pool | null = null;
let redisClient: Redis | null = null;

export function initTenantScope(pool: Pool, redis: Redis): void {
  dbPool = pool;
  redisClient = redis;
}

// Cache TTL for tenant membership lookups (5 minutes)
const TENANT_CACHE_TTL = 300;

/**
 * Tenant context attached to each request
 */
export interface TenantContext {
  companyId: string;
  companyName?: string;
  role: string;
  userId: string;
  permissions?: string[];
}

/**
 * Extended request with tenant context
 */
export interface TenantRequest extends AuthenticatedRequest {
  tenant: TenantContext;
}

/**
 * Sources for extracting tenant ID
 */
enum TenantSource {
  ROUTE_PARAM = 'route_param',
  HEADER = 'header',
  JWT_CLAIM = 'jwt_claim',
  QUERY_PARAM = 'query_param'
}

/**
 * Extract tenant ID from various sources
 * Priority: Route params > Headers > JWT claims > Query params
 */
function extractTenantId(request: FastifyRequest): { tenantId: string | null; source: TenantSource | null } {
  // 1. Try route parameters (e.g., /api/companies/:companyId/*)
  const routeParams = request.params as Record<string, string>;
  if (routeParams.companyId) {
    return { tenantId: routeParams.companyId, source: TenantSource.ROUTE_PARAM };
  }

  // 2. Try custom header (X-Tenant-ID)
  const headerTenantId = request.headers['x-tenant-id'] as string;
  if (headerTenantId) {
    return { tenantId: headerTenantId, source: TenantSource.HEADER };
  }

  // 3. Try JWT claims (tenantId or companyId)
  const authRequest = request as AuthenticatedRequest;
  if (authRequest.user?.companyId) {
    return { tenantId: authRequest.user.companyId, source: TenantSource.JWT_CLAIM };
  }

  // 4. Try query parameters (fallback)
  const queryParams = request.query as Record<string, string>;
  if (queryParams.companyId) {
    return { tenantId: queryParams.companyId, source: TenantSource.QUERY_PARAM };
  }

  return { tenantId: null, source: null };
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Check if user has access to the requested tenant
 * Uses Redis cache with DB fallback for optimal performance
 */
async function validateTenantAccess(
  userId: string,
  companyId: string,
  role: string,
  request: FastifyRequest
): Promise<{ hasAccess: boolean; userRole?: string; permissions?: string[] }> {
  // System admins bypass DB checks (have access to all tenants)
  if (role === 'system_admin') {
    return { hasAccess: true, userRole: role, permissions: [] };
  }

  if (!dbPool) {
    request.log.error('Database pool not initialized for tenant validation');
    return { hasAccess: false };
  }

  try {
    // Check Redis cache first
    const cacheKey = `tenant:${userId}:${companyId}`;

    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          request.log.debug({ userId, companyId, source: 'cache' }, 'Tenant access validated from cache');
          return JSON.parse(cached);
        }
      } catch (cacheError) {
        request.log.warn({ error: cacheError }, 'Redis cache read failed, falling back to DB');
      }
    }

    // Cache miss - query database
    const result = await dbPool.query(
      `SELECT role, permissions, is_active
       FROM company_users
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_active) {
      // User is not a member or is deactivated
      await auditLog({
        companyId,
        userId,
        action: AuditAction.TENANT_ACCESS_DENIED,
        resourceType: 'company',
        resourceId: companyId,
        success: false,
        errorMessage: result.rows.length === 0
          ? 'User not member of company'
          : 'User account is deactivated',
        request
      });

      return { hasAccess: false };
    }

    const membership = result.rows[0];
    const accessResult = {
      hasAccess: true,
      userRole: membership.role,
      permissions: membership.permissions || []
    };

    // Cache successful validation for 5 minutes
    if (redisClient) {
      try {
        await redisClient.setex(cacheKey, TENANT_CACHE_TTL, JSON.stringify(accessResult));
      } catch (cacheError) {
        request.log.warn({ error: cacheError }, 'Redis cache write failed');
      }
    }

    // Update last_access_at asynchronously (fire and forget)
    dbPool.query(
      `UPDATE company_users
       SET last_access_at = NOW()
       WHERE user_id = $1 AND company_id = $2`,
      [userId, companyId]
    ).catch((error) => {
      request.log.warn({ error, userId, companyId }, 'Failed to update last_access_at');
    });

    request.log.debug({ userId, companyId, role: membership.role, source: 'db' }, 'Tenant access validated from DB');

    return accessResult;
  } catch (error) {
    request.log.error({ error, userId, companyId }, 'Tenant validation error');

    // Audit the error
    await auditLog({
      companyId,
      userId,
      action: AuditAction.SYSTEM_ERROR,
      resourceType: 'company',
      resourceId: companyId,
      success: false,
      errorMessage: `Tenant validation error: ${(error as Error).message}`,
      request
    });

    return { hasAccess: false };
  }
}

/**
 * Tenant Scope Middleware
 *
 * Extracts and validates tenant context from requests.
 * Ensures users can only access their assigned companies.
 *
 * Usage:
 *   fastify.get('/api/companies/:companyId/data', { onRequest: [authenticateJWT, tenantScope] }, handler)
 */
export async function tenantScope(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;

  // Ensure user is authenticated first
  if (!authRequest.user) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required before tenant scope validation'
    });
  }

  // Extract tenant ID from request
  const { tenantId, source } = extractTenantId(request);

  if (!tenantId) {
    return reply.status(400).send({
      success: false,
      error: 'Bad Request',
      message: 'Tenant ID (companyId) is required. Provide via route param, X-Tenant-ID header, or query parameter.'
    });
  }

  // Validate UUID format
  if (!isValidUUID(tenantId)) {
    return reply.status(400).send({
      success: false,
      error: 'Bad Request',
      message: 'Invalid tenant ID format. Must be a valid UUID.'
    });
  }

  // Validate user has access to this tenant
  const { hasAccess, userRole, permissions } = await validateTenantAccess(
    authRequest.user.userId,
    tenantId,
    authRequest.user.role,
    request
  );

  if (!hasAccess) {
    // Log unauthorized access attempt
    request.log.warn({
      userId: authRequest.user.userId,
      attemptedTenantId: tenantId,
      userTenantId: authRequest.user.companyId,
      ip: request.ip,
      url: request.url
    }, 'Unauthorized tenant access attempt');

    return reply.status(403).send({
      success: false,
      error: 'Forbidden',
      message: 'Access denied. You do not have permission to access this company\'s data.'
    });
  }

  // Attach tenant context to request
  const tenantRequest = request as TenantRequest;
  tenantRequest.tenant = {
    companyId: tenantId,
    role: userRole || authRequest.user.role,
    userId: authRequest.user.userId,
    permissions: permissions || []
  };

  // Log successful tenant context attachment
  request.log.debug({
    userId: authRequest.user.userId,
    tenantId,
    source,
    role: userRole
  }, 'Tenant context attached to request');
}

/**
 * Optional tenant scope middleware
 * Attaches tenant context if available, but doesn't fail if missing
 * Useful for endpoints that support both tenant-specific and global views
 */
export async function optionalTenantScope(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;

  if (!authRequest.user) {
    return; // Skip if not authenticated
  }

  const { tenantId, source } = extractTenantId(request);

  if (!tenantId || !isValidUUID(tenantId)) {
    return; // Skip if no valid tenant ID
  }

  const { hasAccess, userRole, permissions } = await validateTenantAccess(
    authRequest.user.userId,
    tenantId,
    authRequest.user.role,
    request
  );

  if (hasAccess) {
    const tenantRequest = request as TenantRequest;
    tenantRequest.tenant = {
      companyId: tenantId,
      role: userRole || authRequest.user.role,
      userId: authRequest.user.userId,
      permissions: permissions || []
    };
  }
}

/**
 * Tenant isolation enforcement helper
 * Use this in database queries to ensure data isolation
 */
export function getTenantId(request: FastifyRequest): string {
  const tenantRequest = request as TenantRequest;

  if (!tenantRequest.tenant?.companyId) {
    throw new Error('Tenant context not available. Ensure tenantScope middleware is applied.');
  }

  return tenantRequest.tenant.companyId;
}

/**
 * Check if user is admin of current tenant
 */
export function isTenantAdmin(request: FastifyRequest): boolean {
  const tenantRequest = request as TenantRequest;
  return tenantRequest.tenant?.role === 'company_admin' ||
         tenantRequest.tenant?.role === 'system_admin' ||
         tenantRequest.tenant?.role === 'admin';
}

/**
 * Get tenant context from request
 */
export function getTenantContext(request: FastifyRequest): TenantContext {
  const tenantRequest = request as TenantRequest;

  if (!tenantRequest.tenant) {
    throw new Error('Tenant context not available. Ensure tenantScope middleware is applied.');
  }

  return tenantRequest.tenant;
}
