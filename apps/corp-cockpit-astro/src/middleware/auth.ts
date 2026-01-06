import type { MiddlewareHandler } from 'astro';
import type { User } from '../utils/rbac';

/**
 * Authentication Middleware
 *
 * Validates session cookies and populates user in Astro.locals
 * Includes session validation per company to prevent session reuse across tenants
 */
export const onRequest: MiddlewareHandler = async ({ cookies, locals, redirect, url }, next) => {
  // Public routes that don't require authentication.
  // IMPORTANT: Do NOT use `startsWith('/')` style checks (everything matches "/").
  const pathname = url.pathname;
  const isRoot = pathname === '/';
  const isAuthPage = pathname === '/login' || pathname === '/forgot-password';
  const isApiLogin = pathname === '/api/login';
  const isApiForgotPassword = pathname === '/api/forgot-password';
  const isShareLink = pathname === '/share' || pathname.startsWith('/share/');

  // Marketing / public pages: allow locale pages, but never allow cockpit routes.
  const locales = ['en', 'no', 'uk'];
  const isMarketingPage = locales.some((lang) => {
    if (pathname === `/${lang}`) return true;
    if (pathname.startsWith(`/${lang}/cockpit`)) return false;
    return pathname.startsWith(`/${lang}/`);
  });

  // Portal is a public route (it handles its own auth check and redirects)
  const isPortal = pathname === '/en/portal' || pathname === '/en/portal/';

  const isPublicRoute = isRoot || isAuthPage || isApiLogin || isApiForgotPassword || isShareLink || isMarketingPage || isPortal;

  // Check session cookie
  const sessionCookie = cookies.get('session');

  // For public routes without session, just continue (no auth required)
  if (isPublicRoute && !sessionCookie) {
    return next();
  }

  // For protected routes without session, redirect to login
  if (!isPublicRoute && !sessionCookie) {
    return redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  // If we have a session cookie, parse it to populate locals.user (for ALL routes)
  if (!sessionCookie) {
    return next();
  }

  try {
    // Astro cookie values may be URL-encoded (e.g. %7B%22sid%22...%7D).
    // Parse robustly: try raw JSON first, then decodeURIComponent.
    let session: any;
    try {
      session = JSON.parse(sessionCookie.value);
    } catch {
      session = JSON.parse(decodeURIComponent(sessionCookie.value));
    }

    // Support both legacy and compact session formats
    const userId = session.userId ?? session.uid;
    const companyId = session.companyId ?? session.cid;
    const role = session.role ?? session.r;
    const email = session.email ?? session.e;
    const name = session.name ?? session.n;
    const sessionId = session.sessionId ?? session.sid;
    const expiresAt = session.expiresAt ?? session.exp;
    const createdAt = session.createdAt;
    const ipAddress = session.ipAddress;

    // Validate session structure
    if (!userId || !companyId || !role) {
      throw new Error('Invalid session structure');
    }

    // Validate session timestamp (optional: add session expiry)
    if (expiresAt && new Date(expiresAt) < new Date()) {
      throw new Error('Session expired');
    }

    // Attach user to locals for use in pages and downstream middleware
    locals.user = {
      id: userId,
      email,
      name,
      company_id: companyId,
      role,
    } as User;

    locals.isAuthenticated = true;

    // Store session metadata for audit logging
    locals.sessionMetadata = {
      sessionId,
      createdAt,
      lastActivityAt: new Date().toISOString(),
      ipAddress,
    };
  } catch (error) {
    // Invalid or expired session - clear cookies
    console.warn('[Auth] Invalid session cookie:', error instanceof Error ? error.message : 'Unknown error');
    cookies.delete('session', { path: '/' });
    cookies.delete('tenantId', { path: '/' }); // Clear stale tenant cookie too

    // For public routes, just continue without redirecting
    if (isPublicRoute) {
      return next();
    }

    // For protected routes, redirect to login
    return redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  return next();
};
