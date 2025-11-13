import type { MiddlewareHandler } from 'astro';
import type { User } from '../utils/rbac';

export const onRequest: MiddlewareHandler = async ({ cookies, locals, redirect, url }, next) => {
  // Public routes
  const publicRoutes = ['/', '/login', '/api/login'];
  if (publicRoutes.includes(url.pathname)) {
    return next();
  }

  // Check session
  const sessionCookie = cookies.get('session');

  if (!sessionCookie) {
    return redirect('/login');
  }

  try {
    const session = JSON.parse(sessionCookie.value);

    // Attach user to locals for use in pages
    locals.user = {
      id: session.userId,
      email: session.email,
      name: session.name,
      company_id: session.companyId,
      role: session.role,
    } as User;

    locals.isAuthenticated = true;
  } catch (error) {
    cookies.delete('session', { path: '/' });
    return redirect('/login');
  }

  return next();
};
