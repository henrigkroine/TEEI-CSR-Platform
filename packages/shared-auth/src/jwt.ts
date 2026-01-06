import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload, JWTPayloadSchema } from './types';

/**
 * JWT configuration
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Get issuer and audience based on environment
function getJWTIssuer(): string {
  const env = process.env.NODE_ENV;

  if (env === 'production') {
    return 'theeducationalequalityinstitute.org';
  }

  if (env === 'staging') {
    return 'staging.teei.no';
  }

  return 'localhost';
}

function getJWTAudience(): string[] {
  const env = process.env.NODE_ENV;

  if (env === 'production') {
    return [
      'theeducationalequalityinstitute.org',
      'dashboard.theeducationalequalityinstitute.org',
    ];
  }

  if (env === 'staging') {
    return [
      'staging.teei.no',
      'dashboard.staging.teei.no',
    ];
  }

  return ['localhost', 'localhost:3000', 'localhost:4321'];
}

const JWT_ISSUER = getJWTIssuer();
const JWT_AUDIENCE = getJWTAudience();
const JWT_EXPIRATION = '7d'; // 7 days

const getSecretKey = () => new TextEncoder().encode(JWT_SECRET);

/**
 * Create a JWT token for a user
 */
export async function createToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const secret = getSecretKey();

  const token = await new SignJWT({
    ...payload,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(JWT_EXPIRATION)
    .sign(secret);

  return token;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecretKey();
    const { payload } = await jwtVerify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });

    // Validate payload structure
    const validated = JWTPayloadSchema.parse(payload);
    return validated;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Decode JWT without verification (use only for non-sensitive operations)
 */
export function decodeToken(token: string): Partial<JWTPayload> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadPart = parts[1];
    if (!payloadPart) return null;

    const payload = JSON.parse(atob(payloadPart));
    return payload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded?.exp) return true;

  return Date.now() >= decoded.exp * 1000;
}
