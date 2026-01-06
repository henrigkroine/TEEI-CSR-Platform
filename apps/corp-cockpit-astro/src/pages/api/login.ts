import type { APIRoute } from 'astro';

interface LoginRequest {
  email: string;
  password: string;
}

// ⚠️ DEVELOPMENT ONLY: Mock authentication fallback for local development
// Falls back to mock if database lookup fails or USE_MOCK_AUTH is enabled
const USE_MOCK_AUTH = process.env.USE_MOCK_AUTH === 'true' || import.meta.env.DEV;

const MOCK_USERS = USE_MOCK_AUTH ? [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'admin@acme.com',
    password: 'admin123', // In production: NEVER store plaintext passwords
    name: 'Super Admin (Demo)',
    company_id: '00000000-0000-0000-0000-000000000001',
    // SUPER_ADMIN can access any tenant in dev (bypasses tenantRouting company check)
    role: 'SUPER_ADMIN' as const,
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

/**
 * Authenticate user against database
 */
async function authenticateUser(email: string, password: string) {
  try {
    // Lazy-load DB deps so localhost/demo can run without them.
    // If these packages aren't installed for this app, we just fall back to mock auth.
    const [{ eq }, { db, users, companyUsers }, bcrypt] = await Promise.all([
      import('drizzle-orm'),
      import('@teei/shared-schema'),
      import('bcryptjs'),
    ]);

    // Lookup user by email
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        passwordHash: users.passwordHash,
        role: users.role,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (userResult.length === 0) {
      return null;
    }

    const user = userResult[0];

    // Check if user has a password (SSO users may not have passwordHash)
    if (!user.passwordHash) {
      console.warn(`[Auth] User ${email} has no password hash (SSO-only user?)`);
      return null;
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return null;
    }

    // Lookup user's company (users can belong to multiple companies, take first)
    const companyResult = await db
      .select({
        companyId: companyUsers.companyId,
      })
      .from(companyUsers)
      .where(eq(companyUsers.userId, user.id))
      .limit(1);

    const companyId = companyResult.length > 0 ? companyResult[0].companyId : null;

    // Build user name from first/last name
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || email;

    return {
      id: user.id,
      email: user.email,
      name,
      company_id: companyId,
      role: user.role,
    };
  } catch (error) {
    console.error('[Auth] Database authentication error:', error);
    return null;
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json() as LoginRequest;
    const { email, password } = body;

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email and password are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let user: {
      id: string;
      email: string;
      name: string;
      company_id: string | null;
      role: string;
    } | null = null;

    // Try database authentication first
    if (!USE_MOCK_AUTH) {
      user = await authenticateUser(email, password);
    }

    // Fallback to mock users if database auth fails or USE_MOCK_AUTH is enabled
    if (!user && USE_MOCK_AUTH) {
      const mockUser = MOCK_USERS.find(u => u.email === email && u.password === password);
      if (mockUser) {
        user = {
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          company_id: mockUser.company_id,
          role: mockUser.role,
        };
      }
    }

    if (!user) {
      // Don't reveal whether email exists or password is wrong (security best practice)
      return new Response(
        JSON.stringify({ error: 'Invalid credentials' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate company_id exists (required for multi-tenant)
    if (!user.company_id) {
      console.warn(`[Auth] User ${user.email} has no company association`);
      return new Response(
        JSON.stringify({ 
          error: 'Account configuration error',
          message: 'Your account is not associated with a company. Please contact support.'
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create session
    // NOTE: Keep the cookie payload SMALL (<4KB) or browsers will silently drop it.
    // Use short keys to avoid exceeding cookie limits in dev.
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = {
      // compact session format
      sid: sessionId,
      uid: user.id,
      cid: user.company_id,
      r: user.role,
      // optional display fields (kept short)
      e: user.email,
      n: user.name,
      exp: expiresAt.toISOString(),
    };

    // Set session cookie
    cookies.set('session', JSON.stringify(session), {
      httpOnly: true,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    // Set tenantId cookie for redirect chain (root → portal → cockpit)
    // This ensures user lands in their cockpit after login
    cookies.set('tenantId', user.company_id, {
      httpOnly: false, // Allow JS access for client-side routing
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
