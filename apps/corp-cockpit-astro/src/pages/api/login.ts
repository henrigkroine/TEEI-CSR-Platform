import type { APIRoute } from 'astro';

interface LoginRequest {
  email: string;
  password: string;
}

// ⚠️ DEVELOPMENT ONLY: Mock authentication for local development
// In production, this must connect to a real authentication service (e.g., Auth0, Cognito, or custom backend)
const USE_MOCK_AUTH = import.meta.env.DEV || process.env.USE_MOCK_AUTH === 'true';

const MOCK_USERS = USE_MOCK_AUTH ? [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@acme.com',
    password: 'admin123', // In production: NEVER store plaintext passwords
    name: 'ACME Admin (Demo)',
    company_id: '00000000-0000-0000-0000-000000000001',
    role: 'ADMIN' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'viewer@acme.com',
    password: 'viewer123',
    name: 'ACME Viewer (Demo)',
    company_id: '00000000-0000-0000-0000-000000000001',
    role: 'VIEWER' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'manager@acme.com',
    password: 'manager123',
    name: 'ACME Manager (Demo)',
    company_id: '00000000-0000-0000-0000-000000000001',
    role: 'MANAGER' as const,
  },
] : [];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json() as LoginRequest;
    const { email, password } = body;

    // Block mock authentication in production
    if (!USE_MOCK_AUTH) {
      console.error('[Auth] Mock authentication disabled. Configure real auth service.');
      return new Response(
        JSON.stringify({
          error: 'Authentication service not configured',
          message: 'Mock authentication is disabled in this environment. Please configure a production-ready auth service.'
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find user (mock only - replace with real auth)
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create session (in production: use JWT with signing, or server-side session store with Redis)
    const session = {
      sessionId: crypto.randomUUID(),
      userId: user.id,
      email: user.email,
      name: user.name,
      companyId: user.company_id,
      role: user.role,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    };

    // Set cookie
    cookies.set('session', JSON.stringify(session), {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    console.log(`[Auth] User logged in: ${user.email} (${user.role})`);

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          company_id: user.company_id,
          role: user.role,
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
