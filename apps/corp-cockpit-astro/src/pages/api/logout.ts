import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
  // Clear both session and tenant cookies
  cookies.delete('session', { path: '/' });
  cookies.delete('tenantId', { path: '/' });

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};
