import { defineMiddleware } from 'astro:middleware';
import { getAuthContext } from '@teei/shared-auth/session';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/health', '/api/auth'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, cookies, locals, redirect } = context;
  const pathname = url.pathname;

  // Get auth context from shared package (works across both apps)
  const auth = await getAuthContext(cookies);

  // Attach auth to locals for use in pages/components
  locals.auth = auth;
  locals.user = auth.user;
  locals.isAuthenticated = auth.isAuthenticated;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return next();
  }

  // Check if user is authenticated
  if (!auth.isAuthenticated) {
    if (pathname.startsWith('/api/')) {
      // API routes return 401
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    // Web routes redirect to login
    return redirect('/login?redirect=' + encodeURIComponent(pathname));
  }

  // Check if user has required role (company_admin or higher)
  const allowedRoles = ['company_admin', 'teei_staff', 'super_admin'];
  const hasAccess = auth.hasAnyRole(allowedRoles);

  if (!hasAccess) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Forbidden: Insufficient permissions' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return redirect('/unauthorized');
  }

  return next();
});
