import { defineMiddleware } from 'astro:middleware';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'teei-csr-platform-secret-key-change-in-production';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/health'];

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request, locals, redirect } = context;
  const pathname = url.pathname;

  // Allow public routes
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    locals.isAuthenticated = false;
    return next();
  }

  // Check for JWT token in cookies or Authorization header
  let token: string | undefined;

  // Try Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // Fall back to cookie
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map((c) => {
          const [key, ...v] = c.split('=');
          return [key, v.join('=')];
        })
      );
      token = cookies.token;
    }
  }

  // If no token, redirect to login
  if (!token) {
    locals.isAuthenticated = false;
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

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      organizationId?: string;
    };

    locals.user = decoded;
    locals.isAuthenticated = true;

    return next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    locals.isAuthenticated = false;

    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return redirect('/login?redirect=' + encodeURIComponent(pathname));
  }
});
