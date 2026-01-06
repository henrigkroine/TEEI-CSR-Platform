import type { APIRoute } from 'astro';

interface ForgotPasswordRequest {
  email: string;
}

/**
 * Check if user exists in database
 */
async function findUserByEmail(email: string) {
  try {
    // Lazy-load DB deps so localhost/demo can run without them
    const [{ eq }, { db, users }] = await Promise.all([
      import('drizzle-orm'),
      import('@teei/shared-schema'),
    ]);

    // Lookup user by email
    const userResult = await db
      .select({
        id: users.id,
        email: users.email,
      })
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    return userResult.length > 0 ? userResult[0] : null;
  } catch (error) {
    console.error('[ForgotPassword] Database lookup error:', error);
    return null;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json() as ForgotPasswordRequest;
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user exists (but don't reveal if they don't - security best practice)
    const user = await findUserByEmail(email);

    // Always return success to prevent user enumeration attacks
    // In production, this would:
    // 1. Generate a secure reset token
    // 2. Store token in database with expiration (e.g., 1 hour)
    // 3. Send email with reset link containing the token
    // 4. The reset link would be: /reset-password?token=<token>

    if (user) {
      console.log(`[ForgotPassword] Password reset requested for: ${email}`);

      // TODO: In production, implement:
      // - Generate secure token: crypto.randomBytes(32).toString('hex')
      // - Store in password_reset_tokens table with expiration
      // - Send email via notifications service with reset link
      // - Reset link: /reset-password?token=${token}&email=${encodeURIComponent(email)}
    }

    // Return generic success message (doesn't reveal if email exists)
    return new Response(
      JSON.stringify({
        success: true,
        message: 'If an account exists with that email, we\'ve sent you a password reset link.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Invalid request' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
