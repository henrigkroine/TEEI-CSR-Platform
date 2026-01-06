import { sequence } from 'astro:middleware';
import { onRequest as authMiddleware } from './middleware/auth';
import { tenantRouting } from './middleware/tenantRouting';
import { rbacGuard } from './middleware/rbacGuard';
import type { MiddlewareHandler } from 'astro';

// Root redirect handler - must run first to prevent i18n redirect loop
const rootRedirect: MiddlewareHandler = async ({ url, redirect, cookies }, next) => {
  // Handle root and /home redirects to prevent infinite loops
  if (url.pathname === '/' || url.pathname === '/home') {
    const savedTenantId = cookies.get('tenantId')?.value;
    const sessionCookie = cookies.get('session')?.value;

    // Only use tenantId if user also has a valid session (prevents stale cookie loops)
    if (savedTenantId && sessionCookie) {
      // Redirect authenticated users with tenant to portal (which will redirect to cockpit)
      return redirect('/en/portal', 301);
    }

    // Clear stale tenantId if session is missing
    if (savedTenantId && !sessionCookie) {
      cookies.delete('tenantId', { path: '/' });
    }

    // New visitors go to marketing page
    return redirect('/en', 301);
  }

  // Handle /portal redirect (without language prefix)
  if (url.pathname === '/portal') {
    return redirect('/en/portal', 301);
  }

  // Handle /en/port typo redirect
  if (url.pathname === '/en/port') {
    return redirect('/en/portal', 301);
  }

  // Handle /port typo redirect (stripped /en/)
  if (url.pathname === '/port') {
    return redirect('/en/portal', 301);
  }

  return next();
};

// Execute middleware in sequence:
// 1. Root redirect (handle / and /home)
// 2. Authentication (set user in locals)
// 3. Tenant routing validation (validate companyId, set tenantContext)
// 4. RBAC enforcement (check route-level permissions)
export const onRequest = sequence(rootRedirect, authMiddleware, tenantRouting, rbacGuard);
