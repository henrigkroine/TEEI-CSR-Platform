/**
 * Tenant Scope Middleware for Insights NLQ
 *
 * Extracts and validates tenant context from requests
 */

import { FastifyRequest, FastifyReply } from 'fastify';

export interface TenantContext {
  companyId: string;
  companyName?: string;
  role: string;
  userId: string;
  permissions?: string[];
}

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    userId: string;
    companyId: string;
    role: string;
    email?: string;
  };
}

export interface TenantRequest extends AuthenticatedRequest {
  tenant: TenantContext;
}

/**
 * Extract tenant ID from request
 */
function extractTenantId(request: FastifyRequest): string | null {
  // Try route parameters
  const routeParams = request.params as Record<string, string>;
  if (routeParams.companyId) {
    return routeParams.companyId;
  }

  // Try header
  const headerTenantId = request.headers['x-tenant-id'] as string;
  if (headerTenantId) {
    return headerTenantId;
  }

  // Try JWT claims
  const authRequest = request as AuthenticatedRequest;
  if (authRequest.user?.companyId) {
    return authRequest.user.companyId;
  }

  // Try query parameters
  const queryParams = request.query as Record<string, string>;
  if (queryParams.companyId) {
    return queryParams.companyId;
  }

  return null;
}

/**
 * Validate UUID format
 */
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Tenant scope middleware
 */
export async function tenantScope(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;

  // Ensure user is authenticated
  if (!authRequest.user) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  // Extract tenant ID
  const tenantId = extractTenantId(request);

  if (!tenantId) {
    return reply.status(400).send({
      success: false,
      error: 'Bad Request',
      message: 'Tenant ID (companyId) is required'
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

  // Attach tenant context
  const tenantRequest = request as TenantRequest;
  tenantRequest.tenant = {
    companyId: tenantId,
    role: authRequest.user.role,
    userId: authRequest.user.userId,
    permissions: []
  };

  request.log.debug({
    userId: authRequest.user.userId,
    tenantId,
    role: authRequest.user.role
  }, 'Tenant context attached');
}

/**
 * Get tenant ID from request
 */
export function getTenantId(request: FastifyRequest): string {
  const tenantRequest = request as TenantRequest;

  if (!tenantRequest.tenant?.companyId) {
    throw new Error('Tenant context not available');
  }

  return tenantRequest.tenant.companyId;
}

/**
 * Get tenant context from request
 */
export function getTenantContext(request: FastifyRequest): TenantContext {
  const tenantRequest = request as TenantRequest;

  if (!tenantRequest.tenant) {
    throw new Error('Tenant context not available');
  }

  return tenantRequest.tenant;
}
