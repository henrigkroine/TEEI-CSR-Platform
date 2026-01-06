import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UserRole } from './auth.js';

/**
 * OIDC (OpenID Connect) SSO Implementation
 *
 * Supports Google Workspace and Azure AD for company_admin authentication
 *
 * Configuration required in .env:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REDIRECT_URI
 * - AZURE_CLIENT_ID
 * - AZURE_CLIENT_SECRET
 * - AZURE_TENANT_ID
 * - AZURE_REDIRECT_URI
 * - OIDC_SESSION_SECRET
 */

export interface OIDCConfig {
  google?: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    hostedDomain?: string;  // Optional: restrict to specific domain
  };
  azure?: {
    clientId: string;
    clientSecret: string;
    tenantId: string;
    redirectUri: string;
  };
  sessionSecret: string;
}

export interface OIDCUserInfo {
  sub: string;  // Subject (unique user ID)
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  hd?: string;  // Google hosted domain
}

/**
 * Google OAuth 2.0 / OIDC endpoints
 */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

/**
 * Azure AD / Microsoft Identity Platform endpoints
 */
const getAzureAuthUrl = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`;
const getAzureTokenUrl = (tenantId: string) =>
  `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
const AZURE_USERINFO_URL = 'https://graph.microsoft.com/v1.0/me';

/**
 * Load OIDC configuration from environment
 */
export function loadOIDCConfig(): OIDCConfig {
  const config: OIDCConfig = {
    sessionSecret: process.env.OIDC_SESSION_SECRET || 'change-me-in-production'
  };

  // Google configuration
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    config.google = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3017/auth/google/callback',
      hostedDomain: process.env.GOOGLE_HOSTED_DOMAIN  // Optional
    };
  }

  // Azure AD configuration
  if (process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET && process.env.AZURE_TENANT_ID) {
    config.azure = {
      clientId: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      tenantId: process.env.AZURE_TENANT_ID,
      redirectUri: process.env.AZURE_REDIRECT_URI || 'http://localhost:3017/auth/azure/callback'
    };
  }

  return config;
}

/**
 * Generate authorization URL for Google OAuth 2.0
 */
export function getGoogleAuthUrl(config: OIDCConfig['google'], state: string): string {
  if (!config) throw new Error('Google OIDC not configured');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent',
    ...(config.hostedDomain && { hd: config.hostedDomain })
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Generate authorization URL for Azure AD
 */
export function getAzureAuthUrl(config: OIDCConfig['azure'], state: string): string {
  if (!config) throw new Error('Azure OIDC not configured');

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: 'code',
    scope: 'openid email profile User.Read',
    state,
    response_mode: 'query'
  });

  return `${getAzureAuthUrl(config.tenantId)}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens (Google)
 */
export async function exchangeGoogleCode(
  code: string,
  config: OIDCConfig['google']
): Promise<{ access_token: string; id_token: string }> {
  if (!config) throw new Error('Google OIDC not configured');

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Exchange authorization code for tokens (Azure)
 */
export async function exchangeAzureCode(
  code: string,
  config: OIDCConfig['azure']
): Promise<{ access_token: string; id_token: string }> {
  if (!config) throw new Error('Azure OIDC not configured');

  const response = await fetch(getAzureTokenUrl(config.tenantId), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
      scope: 'openid email profile User.Read'
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure token exchange failed: ${error}`);
  }

  return response.json();
}

/**
 * Fetch user info from Google
 */
export async function fetchGoogleUserInfo(accessToken: string): Promise<OIDCUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Google user info');
  }

  return response.json();
}

/**
 * Fetch user info from Azure AD / Microsoft Graph
 */
export async function fetchAzureUserInfo(accessToken: string): Promise<OIDCUserInfo> {
  const response = await fetch(AZURE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Azure user info');
  }

  const data = await response.json();

  // Map Microsoft Graph response to OIDC format
  return {
    sub: data.id,
    email: data.mail || data.userPrincipalName,
    email_verified: true,  // Assume verified from Azure AD
    name: data.displayName,
    picture: undefined
  };
}

/**
 * Decode and validate ID token (basic validation without full JWT verification)
 * For production, use a proper JWT library with key verification
 */
export function decodeIdToken(idToken: string): any {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid ID token format');
  }

  const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
  return JSON.parse(payload);
}

/**
 * Register OIDC routes on Fastify instance
 */
export async function registerOIDCRoutes(app: FastifyInstance): Promise<void> {
  const config = loadOIDCConfig();

  // Simple in-memory state storage (use Redis in production!)
  const stateStore = new Map<string, { provider: string; createdAt: number }>();

  // Clean up expired states (5 min TTL)
  setInterval(() => {
    const now = Date.now();
    for (const [state, data] of stateStore.entries()) {
      if (now - data.createdAt > 5 * 60 * 1000) {
        stateStore.delete(state);
      }
    }
  }, 60 * 1000);

  /**
   * GET /auth/google - Initiate Google OAuth flow
   */
  if (config.google) {
    app.get('/auth/google', async (request: FastifyRequest, reply: FastifyReply) => {
      const state = crypto.randomUUID();
      stateStore.set(state, { provider: 'google', createdAt: Date.now() });

      const authUrl = getGoogleAuthUrl(config.google!, state);
      reply.redirect(authUrl);
    });

    /**
     * GET /auth/google/callback - Google OAuth callback
     */
    app.get('/auth/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
      const { code, state } = request.query as { code?: string; state?: string };

      if (!code || !state) {
        return reply.status(400).send({ error: 'Missing code or state parameter' });
      }

      // Validate state
      const stateData = stateStore.get(state);
      if (!stateData || stateData.provider !== 'google') {
        return reply.status(400).send({ error: 'Invalid state parameter' });
      }
      stateStore.delete(state);

      try {
        // Exchange code for tokens
        const tokens = await exchangeGoogleCode(code, config.google!);

        // Fetch user info
        const userInfo = await fetchGoogleUserInfo(tokens.access_token);

        // Validate hosted domain if configured
        if (config.google!.hostedDomain && userInfo.hd !== config.google!.hostedDomain) {
          return reply.status(403).send({
            error: 'Unauthorized domain',
            message: `Only ${config.google!.hostedDomain} users are allowed`
          });
        }

        // Generate internal JWT for this user (company_admin role)
        const jwtPayload = {
          userId: userInfo.sub,
          email: userInfo.email,
          role: UserRole.COMPANY_USER,  // Map to company_user or admin based on your logic
          name: userInfo.name,
          provider: 'google',
          iat: Math.floor(Date.now() / 1000)
        };

        // Sign with RS256 (using jwtManager from JWKS module)
        const jwtManager = (app as any).jwtManager;
        const token = jwtManager
          ? jwtManager.sign(jwtPayload, { expiresIn: '24h' })
          : app.jwt.sign(jwtPayload);  // Fallback to HS256 if RS256 not configured

        // Return token (in production, set as httpOnly cookie)
        reply.send({
          success: true,
          token,
          user: {
            email: userInfo.email,
            name: userInfo.name,
            provider: 'google'
          }
        });
      } catch (error: any) {
        app.log.error({ error }, 'Google OAuth callback error');
        reply.status(500).send({
          error: 'Authentication failed',
          message: error.message
        });
      }
    });
  }

  /**
   * GET /auth/azure - Initiate Azure AD OAuth flow
   */
  if (config.azure) {
    app.get('/auth/azure', async (request: FastifyRequest, reply: FastifyReply) => {
      const state = crypto.randomUUID();
      stateStore.set(state, { provider: 'azure', createdAt: Date.now() });

      const authUrl = getAzureAuthUrl(config.azure!, state);
      reply.redirect(authUrl);
    });

    /**
     * GET /auth/azure/callback - Azure AD OAuth callback
     */
    app.get('/auth/azure/callback', async (request: FastifyRequest, reply: FastifyReply) => {
      const { code, state } = request.query as { code?: string; state?: string };

      if (!code || !state) {
        return reply.status(400).send({ error: 'Missing code or state parameter' });
      }

      // Validate state
      const stateData = stateStore.get(state);
      if (!stateData || stateData.provider !== 'azure') {
        return reply.status(400).send({ error: 'Invalid state parameter' });
      }
      stateStore.delete(state);

      try {
        // Exchange code for tokens
        const tokens = await exchangeAzureCode(code, config.azure!);

        // Fetch user info from Microsoft Graph
        const userInfo = await fetchAzureUserInfo(tokens.access_token);

        // Generate internal JWT for this user
        const jwtPayload = {
          userId: userInfo.sub,
          email: userInfo.email,
          role: UserRole.COMPANY_USER,
          name: userInfo.name,
          provider: 'azure',
          iat: Math.floor(Date.now() / 1000)
        };

        // Sign with RS256
        const jwtManager = (app as any).jwtManager;
        const token = jwtManager
          ? jwtManager.sign(jwtPayload, { expiresIn: '24h' })
          : app.jwt.sign(jwtPayload);

        reply.send({
          success: true,
          token,
          user: {
            email: userInfo.email,
            name: userInfo.name,
            provider: 'azure'
          }
        });
      } catch (error: any) {
        app.log.error({ error }, 'Azure OAuth callback error');
        reply.status(500).send({
          error: 'Authentication failed',
          message: error.message
        });
      }
    });
  }

  /**
   * GET /auth/providers - List available SSO providers
   */
  app.get('/auth/providers', async (request: FastifyRequest, reply: FastifyReply) => {
    const providers = [];
    if (config.google) providers.push('google');
    if (config.azure) providers.push('azure');

    reply.send({
      success: true,
      providers,
      endpoints: {
        google: config.google ? '/auth/google' : null,
        azure: config.azure ? '/auth/azure' : null
      }
    });
  });

  const enabledProviders = [];
  if (config.google) enabledProviders.push('Google');
  if (config.azure) enabledProviders.push('Azure AD');

  if (enabledProviders.length > 0) {
    console.log(`✅ OIDC SSO enabled for: ${enabledProviders.join(', ')}`);
    console.log('   Routes:');
    if (config.google) {
      console.log('   - GET /auth/google');
      console.log('   - GET /auth/google/callback');
    }
    if (config.azure) {
      console.log('   - GET /auth/azure');
      console.log('   - GET /auth/azure/callback');
    }
    console.log('   - GET /auth/providers');
  } else {
    console.log('⚠️  OIDC SSO not configured (set GOOGLE_* or AZURE_* env vars)');
  }
}
