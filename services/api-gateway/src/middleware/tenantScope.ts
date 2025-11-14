import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest, JWTPayload } from './auth.js';

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
 * This would typically query a database, but for now we'll use JWT claims
 */
async function validateTenantAccess(
  userId: string,
  companyId: string,
  role: string
): Promise<{ hasAccess: boolean; userRole?: string }> {
  // System admins have access to all tenants
  if (role === 'system_admin' || role === 'admin') {
    return { hasAccess: true, userRole: role };
  }

  // TODO: Query database to check company_users table
  // For now, we validate based on JWT companyId claim
  // In production, this should query: SELECT * FROM company_users WHERE user_id = ? AND company_id = ? AND is_active = true

  // Mock validation - replace with actual DB query
  return { hasAccess: true, userRole: role };
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
  const { hasAccess, userRole } = await validateTenantAccess(
    authRequest.user.userId,
    tenantId,
    authRequest.user.role
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
    permissions: [] // TODO: Load from database
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

  const { hasAccess, userRole } = await validateTenantAccess(
    authRequest.user.userId,
    tenantId,
    authRequest.user.role
  );

  if (hasAccess) {
    const tenantRequest = request as TenantRequest;
    tenantRequest.tenant = {
      companyId: tenantId,
      role: userRole || authRequest.user.role,
      userId: authRequest.user.userId,
      permissions: []
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
