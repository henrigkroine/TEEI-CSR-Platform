/**
 * Authentication Middleware for Insights NLQ Service
 *
 * Provides JWT validation and role-based access control.
 * Follows patterns from API Gateway service.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { config } from '../config.js';

/**
 * User roles in the TEEI CSR Platform
 */
export enum UserRole {
  ADMIN = 'admin',
  COMPANY_USER = 'company_user',
  ANALYST = 'analyst',
  PARTICIPANT = 'participant',
  VOLUNTEER = 'volunteer',
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId?: string;
  permissions?: string[];
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
 *
 * Usage:
 *   app.addHook('onRequest', authenticateJWT);
 */
export async function authenticateJWT(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip authentication for health checks
  if (request.url.startsWith('/health') || request.url === '/metrics') {
    return;
  }

  try {
    // Verify JWT token using Fastify JWT plugin
    await request.jwtVerify();
  } catch (err) {
    request.log.warn({ url: request.url, error: err }, 'JWT verification failed');

    reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Optional JWT verification
 * Attempts to verify JWT but doesn't fail if missing
 * Useful for endpoints that support both authenticated and anonymous access
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.url.startsWith('/health') || request.url === '/metrics') {
    return;
  }

  const authHeader = request.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      await request.jwtVerify();
    } catch (err) {
      request.log.debug({ error: err }, 'Optional auth failed, continuing as anonymous');
      // Continue without auth - don't throw
    }
  }
}

/**
 * Role-Based Access Control (RBAC) decorator
 * Returns a middleware that checks if user has required role(s)
 *
 * @param allowedRoles - Array of roles that can access the route
 * @returns Middleware function for role checking
 *
 * Usage:
 *   app.get('/admin/queries', {
 *     onRequest: [authenticateJWT, requireRole(UserRole.ADMIN)]
 *   }, handler);
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      request.log.warn({ url: request.url }, 'Role check failed: no user in request');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const userRole = authRequest.user.role;

    if (!allowedRoles.includes(userRole)) {
      request.log.warn(
        { userId: authRequest.user.userId, userRole, allowedRoles },
        'Role check failed: insufficient permissions'
      );

      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Log successful authorization
    request.log.debug(
      { userId: authRequest.user.userId, userRole },
      'Role check passed'
    );
  };
}

/**
 * Permission-based access control
 * Checks if user has specific permissions
 *
 * @param requiredPermissions - Array of permissions required
 * @returns Middleware function for permission checking
 */
export function requirePermission(...requiredPermissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    const userPermissions = authRequest.user.permissions || [];

    // Admin has all permissions
    if (authRequest.user.role === UserRole.ADMIN) {
      return;
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(perm =>
      userPermissions.includes(perm)
    );

    if (!hasAllPermissions) {
      request.log.warn(
        { userId: authRequest.user.userId, userPermissions, requiredPermissions },
        'Permission check failed'
      );

      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: `Missing required permissions: ${requiredPermissions.join(', ')}`,
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Company access control
 * Ensures user can only access data for their company
 */
export function requireCompanyAccess(companyIdParam: string = 'companyId') {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
        timestamp: new Date().toISOString(),
      });
    }

    // Admin can access all companies
    if (authRequest.user.role === UserRole.ADMIN) {
      return;
    }

    // Get company ID from request params or query
    const params = request.params as Record<string, string>;
    const query = request.query as Record<string, string>;
    const requestedCompanyId = params[companyIdParam] || query[companyIdParam];

    if (!requestedCompanyId) {
      return reply.status(400).send({
        success: false,
        error: 'BadRequest',
        message: `Missing company ID parameter: ${companyIdParam}`,
        timestamp: new Date().toISOString(),
      });
    }

    // Check if user's company matches requested company
    if (authRequest.user.companyId !== requestedCompanyId) {
      request.log.warn(
        {
          userId: authRequest.user.userId,
          userCompanyId: authRequest.user.companyId,
          requestedCompanyId,
        },
        'Company access denied'
      );

      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'You can only access data for your own company',
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Predefined role middleware shortcuts
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

export const requireAnalystOrAdmin = requireRole(
  UserRole.ADMIN,
  UserRole.ANALYST,
  UserRole.COMPANY_USER
);

export const requireCompanyUser = requireRole(
  UserRole.ADMIN,
  UserRole.COMPANY_USER
);

export const requireAuthenticated = requireRole(
  UserRole.ADMIN,
  UserRole.COMPANY_USER,
  UserRole.ANALYST,
  UserRole.PARTICIPANT,
  UserRole.VOLUNTEER
);

/**
 * Extract user info from request
 * Helper function to safely get user from authenticated request
 */
export function getUser(request: FastifyRequest): JWTPayload | null {
  const authRequest = request as AuthenticatedRequest;
  return authRequest.user || null;
}

/**
 * Check if user is admin
 */
export function isAdmin(request: FastifyRequest): boolean {
  const user = getUser(request);
  return user?.role === UserRole.ADMIN;
}

/**
 * Get user's company ID
 */
export function getUserCompanyId(request: FastifyRequest): string | null {
  const user = getUser(request);
  return user?.companyId || null;
}
