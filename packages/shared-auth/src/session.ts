import type { AstroCookies } from 'astro';
import { verifyToken, createToken } from './jwt';
import type { AuthContext, JWTPayload, UserRole } from './types';

const SESSION_COOKIE_NAME = 'teei_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * Cookie configuration for both domains
 */
const getCookieOptions = (domain?: string) => ({
  path: '/',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: COOKIE_MAX_AGE,
  domain: domain || (process.env.NODE_ENV === 'production' ? '.teei.io' : undefined),
});

/**
 * Get authentication context from cookies (works in both Astro apps)
 */
export async function getAuthContext(cookies: AstroCookies): Promise<AuthContext> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      hasRole: () => false,
      hasAnyRole: () => false,
    };
  }

  const payload = await verifyToken(token);

  if (!payload) {
    // Invalid token, clear it
    cookies.delete(SESSION_COOKIE_NAME, getCookieOptions());
    return {
      user: null,
      session: null,
      isAuthenticated: false,
      hasRole: () => false,
      hasAnyRole: () => false,
    };
  }

  const user = {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    roles: payload.roles,
    companyId: payload.companyId,
    locale: payload.locale,
  };

  return {
    user,
    session: {
      sessionId: payload.sub, // Using user ID as session ID for now
      userId: payload.sub,
      email: payload.email,
      roles: payload.roles,
      companyId: payload.companyId,
      createdAt: new Date(payload.iat * 1000),
      expiresAt: new Date(payload.exp * 1000),
      lastActivity: new Date(),
    },
    isAuthenticated: true,
    hasRole: (role: UserRole) => payload.roles.includes(role),
    hasAnyRole: (roles: UserRole[]) => roles.some((r) => payload.roles.includes(r)),
  };
}

/**
 * Create a new session (login)
 */
export async function createSession(
  cookies: AstroCookies,
  user: Omit<JWTPayload, 'iat' | 'exp'>
): Promise<string> {
  const token = await createToken(user);

  cookies.set(SESSION_COOKIE_NAME, token, getCookieOptions());

  return token;
}

/**
 * Destroy session (logout)
 */
export function destroySession(cookies: AstroCookies): void {
  cookies.delete(SESSION_COOKIE_NAME, getCookieOptions());
}

/**
 * Refresh session token (extend expiration)
 */
export async function refreshSession(cookies: AstroCookies): Promise<boolean> {
  const token = cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!token) return false;

  const payload = await verifyToken(token);

  if (!payload) return false;

  // Create new token with fresh expiration
  const newToken = await createToken({
    sub: payload.sub,
    email: payload.email,
    name: payload.name,
    roles: payload.roles,
    companyId: payload.companyId,
    locale: payload.locale,
  });

  cookies.set(SESSION_COOKIE_NAME, newToken, getCookieOptions());

  return true;
}

/**
 * Check if user has required role(s)
 */
export function requireRole(auth: AuthContext, roles: UserRole | UserRole[]): boolean {
  if (!auth.isAuthenticated) return false;

  const requiredRoles = Array.isArray(roles) ? roles : [roles];
  return auth.hasAnyRole(requiredRoles);
}

/**
 * Check if user is a company admin
 */
export function isCompanyAdmin(auth: AuthContext): boolean {
  return requireRole(auth, ['company_admin', 'teei_staff', 'super_admin']);
}
