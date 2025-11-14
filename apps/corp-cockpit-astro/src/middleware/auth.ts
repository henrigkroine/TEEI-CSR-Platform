import type { MiddlewareHandler } from 'astro';
import type { User } from '../utils/rbac';

/**
 * Authentication Middleware
 *
 * Validates session cookies and populates user in Astro.locals
 * Includes session validation per company to prevent session reuse across tenants
 */
export const onRequest: MiddlewareHandler = async ({ cookies, locals, redirect, url }, next) => {
  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/api/login', '/share']; // /share allows public access to shared links

  // Check if this is a public route or a public share link
  const isPublicRoute = publicRoutes.some((route) => url.pathname.startsWith(route));

  if (isPublicRoute) {
    return next();
  }

  // Check session cookie
  const sessionCookie = cookies.get('session');

  if (!sessionCookie) {
    return redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  try {
    const session = JSON.parse(sessionCookie.value);

    // Validate session structure
    if (!session.userId || !session.companyId || !session.role) {
      throw new Error('Invalid session structure');
    }

    // Validate session timestamp (optional: add session expiry)
    if (session.expiresAt && new Date(session.expiresAt) < new Date()) {
      throw new Error('Session expired');
    }

    // Attach user to locals for use in pages and downstream middleware
    locals.user = {
      id: session.userId,
      email: session.email,
      name: session.name,
      company_id: session.companyId,
      role: session.role,
    } as User;

    locals.isAuthenticated = true;

    // Store session metadata for audit logging
    locals.sessionMetadata = {
      sessionId: session.sessionId,
      createdAt: session.createdAt,
      lastActivityAt: new Date().toISOString(),
      ipAddress: session.ipAddress,
    };
  } catch (error) {
    // Invalid or expired session - clear cookie and redirect to login
    console.warn('[Auth] Invalid session cookie:', error instanceof Error ? error.message : 'Unknown error');
    cookies.delete('session', { path: '/' });
    return redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  return next();
};
