import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as fs from 'fs';
import * as path from 'path';

/**
 * RS256 JWT and JWKS Configuration
 *
 * This module implements RS256 (RSA SHA-256) JWT signing and verification
 * with a public JWKS (JSON Web Key Set) endpoint for key distribution.
 *
 * Security Benefits over HS256:
 * - Asymmetric encryption (public key can be shared safely)
 * - Better key rotation support
 * - Industry standard for OAuth 2.0 / OIDC
 * - Allows external services to verify tokens without shared secrets
 */

export interface JWKSKey {
  kty: 'RSA';
  use: 'sig';
  kid: string;
  alg: 'RS256';
  n: string;  // RSA modulus (base64url)
  e: string;  // RSA exponent (base64url)
}

export interface JWKS {
  keys: JWKSKey[];
}

export interface RSAKeyPair {
  privateKey: string;
  publicKey: string;
  kid: string;  // Key ID for rotation support
}

/**
 * Generate RSA key pair for JWT signing
 * In production, these should be stored in a secure vault
 */
export function generateRSAKeyPair(kid?: string): RSAKeyPair {
  const keyId = kid || `jwt-key-${Date.now()}`;

  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return {
    privateKey,
    publicKey,
    kid: keyId
  };
}

/**
 * Load RSA keys from filesystem or environment
 * Falls back to generating new keys if not found (dev only!)
 */
export function loadRSAKeys(): RSAKeyPair {
  const keysDir = process.env.JWT_KEYS_DIR || path.join(process.cwd(), '.keys');
  const privateKeyPath = path.join(keysDir, 'jwt-private.pem');
  const publicKeyPath = path.join(keysDir, 'jwt-public.pem');
  const kidPath = path.join(keysDir, 'jwt-kid.txt');

  // Try to load existing keys
  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
    const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
    const kid = fs.existsSync(kidPath)
      ? fs.readFileSync(kidPath, 'utf-8').trim()
      : `jwt-key-default`;

    return { privateKey, publicKey, kid };
  }

  // Generate new keys in development only
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT RSA keys not found in production! ' +
      'Please generate keys and set JWT_KEYS_DIR environment variable.'
    );
  }

  console.warn('⚠️  Generating new RSA keys (development only)');
  const keyPair = generateRSAKeyPair();

  // Save keys for persistence across restarts
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  fs.writeFileSync(privateKeyPath, keyPair.privateKey);
  fs.writeFileSync(publicKeyPath, keyPair.publicKey);
  fs.writeFileSync(kidPath, keyPair.kid);

  // Add to .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes('.keys/')) {
      fs.appendFileSync(gitignorePath, '\n# JWT RSA Keys\n.keys/\n');
    }
  }

  return keyPair;
}

/**
 * Convert PEM public key to JWK format for JWKS endpoint
 */
export function publicKeyToJWK(publicKeyPem: string, kid: string): JWKSKey {
  const publicKey = crypto.createPublicKey(publicKeyPem);
  const jwk = publicKey.export({ format: 'jwk' }) as any;

  return {
    kty: 'RSA',
    use: 'sig',
    kid,
    alg: 'RS256',
    n: jwk.n,
    e: jwk.e
  };
}

/**
 * RS256 JWT Manager
 * Handles signing, verification, and JWKS endpoint
 */
export class RS256JWTManager {
  private keyPair: RSAKeyPair;
  private jwks: JWKS;

  constructor(keyPair?: RSAKeyPair) {
    this.keyPair = keyPair || loadRSAKeys();
    this.jwks = {
      keys: [publicKeyToJWK(this.keyPair.publicKey, this.keyPair.kid)]
    };
  }

  /**
   * Sign a JWT with RS256
   */
  sign(payload: object, options?: jwt.SignOptions): string {
    return jwt.sign(payload, this.keyPair.privateKey, {
      algorithm: 'RS256',
      keyid: this.keyPair.kid,
      expiresIn: '24h',
      ...options
    });
  }

  /**
   * Verify a JWT with RS256
   */
  verify(token: string): any {
    return jwt.verify(token, this.keyPair.publicKey, {
      algorithms: ['RS256']
    });
  }

  /**
   * Get JWKS for public endpoint
   */
  getJWKS(): JWKS {
    return this.jwks;
  }

  /**
   * Decode JWT without verification (for debugging)
   */
  decode(token: string): any {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Rotate keys (for production key rotation)
   * This would be called by a scheduled job
   */
  rotateKeys(newKeyPair: RSAKeyPair): void {
    // Keep old key in JWKS temporarily for grace period
    const oldJWK = publicKeyToJWK(this.keyPair.publicKey, this.keyPair.kid);
    const newJWK = publicKeyToJWK(newKeyPair.publicKey, newKeyPair.kid);

    this.keyPair = newKeyPair;
    this.jwks = {
      keys: [newJWK, oldJWK]  // New key first, old key for validation
    };

    console.log(`🔑 JWT keys rotated: ${newKeyPair.kid}`);
  }
}

/**
 * Register JWKS endpoint on Fastify instance
 * This allows external services to fetch public keys for verification
 */
export function registerJWKSEndpoint(
  app: FastifyInstance,
  jwtManager: RS256JWTManager
): void {
  app.get('/.well-known/jwks.json', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 'public, max-age=3600');  // Cache for 1 hour
    reply.header('Content-Type', 'application/json');
    return jwtManager.getJWKS();
  });

  // Alternative path for compatibility
  app.get('/auth/jwks', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('Cache-Control', 'public, max-age=3600');
    reply.header('Content-Type', 'application/json');
    return jwtManager.getJWKS();
  });

  console.log('✅ JWKS endpoints registered:');
  console.log('   - GET /.well-known/jwks.json');
  console.log('   - GET /auth/jwks');
}

/**
 * Fastify plugin for RS256 JWT authentication
 */
export async function registerRS256JWT(app: FastifyInstance): Promise<RS256JWTManager> {
  const jwtManager = new RS256JWTManager();

  // Decorate Fastify instance with JWT manager
  app.decorate('jwtManager', jwtManager);

  // Register JWKS endpoints
  registerJWKSEndpoint(app, jwtManager);

  // Add JWT verification hook
  app.decorateRequest('verifyRS256JWT', async function(this: FastifyRequest) {
    const authHeader = this.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      const decoded = jwtManager.verify(token);
      (this as any).user = decoded;
      return decoded;
    } catch (error: any) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
  });

  return jwtManager;
}

// CLI tool for generating keys (can be run standalone)
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === 'generate-keys') {
    const keyPair = generateRSAKeyPair();
    console.log('Generated RSA Key Pair:');
    console.log('\nPrivate Key (keep secure!):');
    console.log(keyPair.privateKey);
    console.log('\nPublic Key:');
    console.log(keyPair.publicKey);
    console.log('\nKey ID:', keyPair.kid);
    console.log('\nJWK:');
    console.log(JSON.stringify(publicKeyToJWK(keyPair.publicKey, keyPair.kid), null, 2));
  } else if (command === 'save-keys') {
    const keyPair = loadRSAKeys();
    console.log('✅ Keys loaded/generated and saved to .keys/');
    console.log('Key ID:', keyPair.kid);
  } else {
    console.log('Usage:');
    console.log('  tsx jwks.ts generate-keys  - Generate and display new RSA key pair');
    console.log('  tsx jwks.ts save-keys      - Load or generate keys and save to .keys/');
  }
}
