import type { MiddlewareHandler, APIContext, MiddlewareNext } from 'astro';
import { getAuthContext, isCompanyAdmin } from './session';

/**
 * Astro middleware to protect dashboard routes
 * Use this in both apps to ensure consistent auth
 */
export const authMiddleware: MiddlewareHandler = async (
  { cookies, url, redirect }: APIContext,
  next: MiddlewareNext
) => {
  const auth = await getAuthContext(cookies);

  // Define protected routes
  const isDashboardRoute = url.pathname.startsWith('/dashboard');
  const isLoginRoute = url.pathname === '/login' || url.pathname === '/en/login';

  // Redirect to login if accessing dashboard without auth
  if (isDashboardRoute && !auth.isAuthenticated) {
    return redirect(`/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  // Redirect to dashboard if already logged in and trying to access login
  if (isLoginRoute && auth.isAuthenticated && isCompanyAdmin(auth)) {
    return redirect('/dashboard');
  }

  // Check if user has required role for dashboard
  if (isDashboardRoute && auth.isAuthenticated && !isCompanyAdmin(auth)) {
    return redirect('/unauthorized');
  }

  // Attach auth context to locals for use in pages
  const response = await next();

  return response;
};

/**
 * Sequence middleware helper to combine with other middleware
 */
export function sequence(...handlers: MiddlewareHandler[]): MiddlewareHandler {
  return async (context: APIContext, next: MiddlewareNext) => {
    let index = 0;

    const runNext = async (): Promise<Response> => {
      if (index >= handlers.length) {
        return next();
      }
      const handler = handlers[index++];
      if (!handler) {
        return next();
      }
      const result = await handler(context, runNext);
      // Handle case where middleware doesn't return a response
      if (result) {
        return result;
      }
      return next();
    };

    return runNext();
  };
}
