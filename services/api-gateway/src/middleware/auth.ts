import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * User roles in the TEEI CSR Platform
 */
export enum UserRole {
  ADMIN = 'admin',
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
 * Admin-only middleware
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Company user or admin middleware
 */
export const requireCompanyAccess = requireRole(UserRole.ADMIN, UserRole.COMPANY_USER);

/**
 * Participant or admin middleware
 */
export const requireParticipantAccess = requireRole(UserRole.ADMIN, UserRole.PARTICIPANT);

/**
 * Volunteer or admin middleware
 */
export const requireVolunteerAccess = requireRole(UserRole.ADMIN, UserRole.VOLUNTEER);

/**
 * Any authenticated user middleware
 */
export const requireAuthenticated = requireRole(
  UserRole.ADMIN,
  UserRole.COMPANY_USER,
  UserRole.PARTICIPANT,
  UserRole.VOLUNTEER
);
