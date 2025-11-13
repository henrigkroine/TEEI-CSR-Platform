import type { APIRoute } from 'astro';

interface LoginRequest {
  email: string;
  password: string;
}

// Mock authentication - replace with real auth in production
const MOCK_USERS = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@acme.com',
    password: 'admin123', // In production: hash with bcrypt
    name: 'ACME Admin',
    company_id: '00000000-0000-0000-0000-000000000001',
    role: 'admin' as const,
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'viewer@acme.com',
    password: 'viewer123',
    name: 'ACME Viewer',
    company_id: '00000000-0000-0000-0000-000000000001',
    role: 'viewer' as const,
  },
];

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json() as LoginRequest;
    const { email, password } = body;

    // Find user
    const user = MOCK_USERS.find(u => u.email === email && u.password === password);

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create session (in production: use JWT or secure session store)
    const session = {
      userId: user.id,
      email: user.email,
      name: user.name,
      companyId: user.company_id,
      role: user.role,
    };

    // Set cookie
    cookies.set('session', JSON.stringify(session), {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

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
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
