/**
 * Authentication & Authorization Middleware
 *
 * Provides JWT validation and role-based access control for campaign service endpoints.
 * Ensures only company admins can manage campaigns for their company.
 */

import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * User roles in the TEEI CSR Platform
 */
export enum UserRole {
  ADMIN = 'admin',
  COMPANY_ADMIN = 'company_admin',
  COMPANY_USER = 'company_user',
  PARTICIPANT = 'participant',
  VOLUNTEER = 'volunteer'
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Extended FastifyRequest with user information
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
}

/**
 * JWT verification middleware
 * Validates JWT token and attaches user info to request
 */
export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verify JWT token using Fastify JWT plugin
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token'
    });
  }
}

/**
 * Role-Based Access Control (RBAC) decorator
 * Returns a middleware that checks if user has required role(s)
 *
 * @param allowedRoles - Array of roles that can access the route
 * @returns Middleware function for role checking
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = authRequest.user.role;

    if (!allowedRoles.includes(userRole)) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }
  };
}

/**
 * Admin-only middleware (platform admins)
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Company admin or platform admin middleware
 * Used for campaign management endpoints
 */
export const requireCompanyAdmin = requireRole(UserRole.ADMIN, UserRole.COMPANY_ADMIN);

/**
 * Company user, admin, or platform admin middleware
 * Used for read-only campaign endpoints
 */
export const requireCompanyAccess = requireRole(
  UserRole.ADMIN,
  UserRole.COMPANY_ADMIN,
  UserRole.COMPANY_USER
);

/**
 * Tenant isolation middleware
 * Ensures users can only access campaigns for their own company
 *
 * @param request - Fastify request
 * @param reply - Fastify reply
 */
export async function enforceTenantIsolation(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;

  // Platform admins can access all companies
  if (authRequest.user.role === UserRole.ADMIN) {
    return;
  }

  // Extract companyId from request params or body
  const params = request.params as any;
  const body = request.body as any;
  const query = request.query as any;

  const requestedCompanyId = params.companyId || body?.companyId || query?.companyId;

  // If no companyId in request, require user to have a companyId
  if (!requestedCompanyId) {
    if (!authRequest.user.companyId) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'User must be associated with a company'
      });
    }
    return;
  }

  // Ensure requested companyId matches user's companyId
  if (authRequest.user.companyId !== requestedCompanyId) {
    return reply.status(403).send({
      success: false,
      error: 'Forbidden',
      message: 'Cannot access campaigns for other companies'
    });
  }
}

/**
 * Combined middleware: Authentication + Company Admin + Tenant Isolation
 * Use this for campaign CRUD endpoints
 */
export const requireCampaignManagement = [
  authenticateJWT,
  requireCompanyAdmin,
  enforceTenantIsolation
];

/**
 * Combined middleware: Authentication + Company Access + Tenant Isolation
 * Use this for read-only campaign endpoints
 */
export const requireCampaignRead = [
  authenticateJWT,
  requireCompanyAccess,
  enforceTenantIsolation
];
