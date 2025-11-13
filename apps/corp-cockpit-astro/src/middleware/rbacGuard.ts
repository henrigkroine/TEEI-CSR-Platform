import type { MiddlewareHandler } from 'astro';
import { hasPermission, type Permission } from '../types/roles';

/**
 * RBAC Guard Middleware
 *
 * Enforces permission-based access control for routes
 * Must run after auth middleware and tenant routing middleware
 */

/**
 * Route-to-permission mapping
 *
 * Maps route patterns to required permissions
 * Routes not listed here are accessible to all authenticated users
 */
const ROUTE_PERMISSIONS: Record<string, Permission> = {
  // Admin Console routes
  '/admin': 'ADMIN_CONSOLE',
  '/admin/api-keys': 'MANAGE_API_KEYS',
  '/admin/integrations': 'MANAGE_INTEGRATIONS',
  '/admin/theme': 'MANAGE_THEME',
  '/admin/weights': 'OVERRIDE_WEIGHTS',
  '/admin/users': 'MANAGE_USERS',

  // Evidence Explorer routes
  '/evidence': 'VIEW_EVIDENCE',

  // Report routes
  '/reports/new': 'GENERATE_REPORTS',
  '/reports/schedule': 'SCHEDULE_REPORTS',

  // Impact-In Monitor routes
  '/impact-in': 'VIEW_IMPACTIN_MONITOR',

  // Export routes
  '/export': 'EXPORT_DATA',
};

/**
 * Matches a route path against permission rules
 *
 * Supports exact matches and prefix matches (for nested routes)
 */
function getRequiredPermission(pathname: string): Permission | null {
  // Extract the route path after /[lang]/cockpit/[companyId]/
  const match = pathname.match(/^\/[^/]+\/cockpit\/[^/]+\/(.*)$/);

  if (!match) {
    return null;
  }

  const routePath = '/' + (match[1] || '');

  // Check exact match first
  if (routePath in ROUTE_PERMISSIONS) {
    return ROUTE_PERMISSIONS[routePath];
  }

  // Check prefix matches for nested routes
  for (const [pattern, permission] of Object.entries(ROUTE_PERMISSIONS)) {
    if (routePath.startsWith(pattern + '/')) {
      return permission;
    }
  }

  return null;
}

export const rbacGuard: MiddlewareHandler = async ({ locals, url, redirect }, next) => {
  const user = locals.user;
  const tenantContext = locals.tenantContext;

  // Skip if not authenticated (auth middleware will handle)
  if (!user) {
    return next();
  }

  // Skip if not a cockpit route
  if (!tenantContext) {
    return next();
  }

  const { lang, companyId } = tenantContext;
  const requiredPermission = getRequiredPermission(url.pathname);

  // If no specific permission required, allow access
  if (!requiredPermission) {
    return next();
  }

  // Check if user has required permission
  if (!hasPermission(user.role, requiredPermission)) {
    console.warn(
      `[RBAC] Access denied: User ${user.id} (${user.role}) attempted to access ${url.pathname} which requires ${requiredPermission}`
    );

    return redirect(`/${lang}/cockpit/401?reason=insufficient_permissions`);
  }

  // Permission granted
  return next();
};
