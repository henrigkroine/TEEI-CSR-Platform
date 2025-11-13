import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Service-to-Service Authentication SDK
 *
 * Implements JWT-based authentication for inter-service communication
 * using RS256 or mTLS (mutual TLS) for production environments.
 *
 * Use Cases:
 * - API Gateway → Profile Service
 * - Profile Service → Q2Q Service
 * - Connector Services → Event Bus → Profile Service
 *
 * Security Features:
 * - RS256 JWT with short expiration (5 minutes)
 * - Service identity verification
 * - Audience validation
 * - Optional mTLS support
 */

export interface ServiceIdentity {
  serviceId: string;      // e.g., "api-gateway", "profile-service"
  serviceType: string;    // e.g., "gateway", "connector", "core"
  environment: string;    // e.g., "production", "staging", "development"
  region?: string;        // e.g., "us-east-1"
}

export interface ServiceJWTPayload extends ServiceIdentity {
  iat: number;
  exp: number;
  iss: string;  // Issuer (service ID that signed the token)
  aud: string;  // Audience (target service ID)
  jti: string;  // JWT ID (for replay prevention)
}

export interface ServiceAuthConfig {
  serviceId: string;
  serviceType: string;
  environment: string;
  privateKey?: string;
  publicKey?: string;
  keysDir?: string;
  tokenExpiration?: number;  // Seconds (default: 300 = 5 minutes)
  allowedServices?: string[]; // Whitelist of allowed caller services
}

/**
 * Service Authentication Manager
 * Handles signing and verification of service-to-service JWTs
 */
export class ServiceAuthManager {
  private config: Required<ServiceAuthConfig>;
  private privateKey: string;
  private publicKey: string;
  private publicKeys: Map<string, string>; // Cache of other services' public keys

  constructor(config: ServiceAuthConfig) {
    this.config = {
      tokenExpiration: 300,
      allowedServices: [],
      keysDir: process.env.SERVICE_KEYS_DIR || path.join(process.cwd(), '.keys'),
      ...config
    } as Required<ServiceAuthConfig>;

    this.publicKeys = new Map();

    // Load keys
    if (config.privateKey && config.publicKey) {
      this.privateKey = config.privateKey;
      this.publicKey = config.publicKey;
    } else {
      const keys = this.loadKeys();
      this.privateKey = keys.privateKey;
      this.publicKey = keys.publicKey;
    }
  }

  /**
   * Load RSA keys from filesystem
   */
  private loadKeys(): { privateKey: string; publicKey: string } {
    const privateKeyPath = path.join(this.config.keysDir, 'service-private.pem');
    const publicKeyPath = path.join(this.config.keysDir, 'service-public.pem');

    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      return {
        privateKey: fs.readFileSync(privateKeyPath, 'utf-8'),
        publicKey: fs.readFileSync(publicKeyPath, 'utf-8')
      };
    }

    // Generate new keys in development
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Service auth keys not found in production! ' +
        'Generate keys and set SERVICE_KEYS_DIR environment variable.'
      );
    }

    console.warn('⚠️  Generating new service auth RSA keys (development only)');
    const keys = this.generateKeys();

    if (!fs.existsSync(this.config.keysDir)) {
      fs.mkdirSync(this.config.keysDir, { recursive: true });
    }

    fs.writeFileSync(privateKeyPath, keys.privateKey);
    fs.writeFileSync(publicKeyPath, keys.publicKey);

    return keys;
  }

  /**
   * Generate new RSA key pair
   */
  private generateKeys(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    return { privateKey, publicKey };
  }

  /**
   * Sign a service token for calling another service
   *
   * @param targetServiceId - The service ID this token is for (audience)
   * @returns Signed JWT token
   */
  signServiceToken(targetServiceId: string): string {
    const now = Math.floor(Date.now() / 1000);

    const payload: ServiceJWTPayload = {
      serviceId: this.config.serviceId,
      serviceType: this.config.serviceType,
      environment: this.config.environment,
      iss: this.config.serviceId,
      aud: targetServiceId,
      iat: now,
      exp: now + this.config.tokenExpiration,
      jti: crypto.randomUUID()
    };

    return jwt.sign(payload, this.privateKey, {
      algorithm: 'RS256',
      keyid: this.config.serviceId
    });
  }

  /**
   * Verify a service token from another service
   *
   * @param token - JWT token to verify
   * @param expectedIssuer - Optional: Expected issuer service ID
   * @returns Decoded payload if valid
   * @throws Error if verification fails
   */
  verifyServiceToken(token: string, expectedIssuer?: string): ServiceJWTPayload {
    try {
      // Decode to get issuer
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (!decoded) {
        throw new Error('Invalid token format');
      }

      const issuer = decoded.payload.iss;

      // Check if issuer is allowed
      if (this.config.allowedServices.length > 0) {
        if (!this.config.allowedServices.includes(issuer)) {
          throw new Error(`Service '${issuer}' not in allowed services list`);
        }
      }

      if (expectedIssuer && issuer !== expectedIssuer) {
        throw new Error(`Expected issuer '${expectedIssuer}', got '${issuer}'`);
      }

      // Get public key for issuer
      const publicKey = this.getPublicKeyForService(issuer);

      // Verify token
      const payload = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        audience: this.config.serviceId,  // Must be for this service
        issuer: expectedIssuer
      }) as ServiceJWTPayload;

      // Additional validation
      if (payload.environment !== this.config.environment) {
        throw new Error(
          `Environment mismatch: expected '${this.config.environment}', got '${payload.environment}'`
        );
      }

      return payload;

    } catch (error: any) {
      throw new Error(`Service token verification failed: ${error.message}`);
    }
  }

  /**
   * Get public key for a service
   * In production, this should fetch from a key management service
   */
  private getPublicKeyForService(serviceId: string): string {
    // Check cache
    if (this.publicKeys.has(serviceId)) {
      return this.publicKeys.get(serviceId)!;
    }

    // Try to load from filesystem
    const keyPath = path.join(this.config.keysDir, `${serviceId}-public.pem`);
    if (fs.existsSync(keyPath)) {
      const publicKey = fs.readFileSync(keyPath, 'utf-8');
      this.publicKeys.set(serviceId, publicKey);
      return publicKey;
    }

    // In development, use same key for all services (not recommended for prod!)
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`⚠️  Using shared public key for service '${serviceId}' (dev only)`);
      return this.publicKey;
    }

    throw new Error(`Public key not found for service: ${serviceId}`);
  }

  /**
   * Add a public key for a remote service
   */
  addServicePublicKey(serviceId: string, publicKey: string): void {
    this.publicKeys.set(serviceId, publicKey);
  }

  /**
   * Get current service identity
   */
  getIdentity(): ServiceIdentity {
    return {
      serviceId: this.config.serviceId,
      serviceType: this.config.serviceType,
      environment: this.config.environment
    };
  }
}

/**
 * HTTP Client with Service Authentication
 * Wrapper for making authenticated service-to-service HTTP calls
 */
export class AuthenticatedServiceClient {
  private authManager: ServiceAuthManager;
  private baseURL: string;
  private targetServiceId: string;

  constructor(
    authManager: ServiceAuthManager,
    baseURL: string,
    targetServiceId: string
  ) {
    this.authManager = authManager;
    this.baseURL = baseURL;
    this.targetServiceId = targetServiceId;
  }

  /**
   * Make an authenticated GET request
   */
  async get<T = any>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>('GET', path, options);
  }

  /**
   * Make an authenticated POST request
   */
  async post<T = any>(path: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>('POST', path, {
      ...options,
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
  }

  /**
   * Make an authenticated PUT request
   */
  async put<T = any>(path: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>('PUT', path, {
      ...options,
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
  }

  /**
   * Make an authenticated DELETE request
   */
  async delete<T = any>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>('DELETE', path, options);
  }

  /**
   * Make an authenticated HTTP request
   */
  private async request<T>(
    method: string,
    path: string,
    options?: RequestInit
  ): Promise<T> {
    // Generate service token
    const token = this.authManager.signServiceToken(this.targetServiceId);

    // Make request with service auth header
    const url = `${this.baseURL}${path}`;
    const response = await fetch(url, {
      ...options,
      method,
      headers: {
        ...options?.headers,
        'Authorization': `Bearer ${token}`,
        'X-Service-ID': this.authManager.getIdentity().serviceId
      }
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Service request failed (${response.status}): ${error}`);
    }

    return response.json();
  }
}

/**
 * Fastify middleware for service authentication
 *
 * Usage:
 *   import { createServiceAuthMiddleware } from '@teei/auth';
 *
 *   const authManager = new ServiceAuthManager({ ... });
 *   const serviceAuth = createServiceAuthMiddleware(authManager);
 *
 *   app.addHook('onRequest', serviceAuth);
 */
export function createServiceAuthMiddleware(authManager: ServiceAuthManager) {
  return async (request: any, reply: any): Promise<void> => {
    // Skip authentication for health checks
    if (request.url.startsWith('/health')) {
      return;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Missing service authentication token'
      });
    }

    const token = authHeader.substring(7);

    try {
      const payload = authManager.verifyServiceToken(token);

      // Attach service identity to request
      request.serviceAuth = payload;

      request.log.info({
        callerService: payload.serviceId,
        serviceType: payload.serviceType
      }, 'Service authenticated');

    } catch (error: any) {
      request.log.warn({ error: error.message }, 'Service authentication failed');
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: `Service authentication failed: ${error.message}`
      });
    }
  };
}

/**
 * Example usage
 */
export function exampleUsage() {
  return `
// Example 1: Initialize service auth manager
import { ServiceAuthManager } from '@teei/auth';

const authManager = new ServiceAuthManager({
  serviceId: 'profile-service',
  serviceType: 'core',
  environment: 'production',
  allowedServices: ['api-gateway', 'buddy-service', 'kintell-connector']
});

// Example 2: Protect routes with service auth
import { createServiceAuthMiddleware } from '@teei/auth';

const serviceAuth = createServiceAuthMiddleware(authManager);
app.addHook('onRequest', serviceAuth);

// Example 3: Make authenticated calls to other services
import { AuthenticatedServiceClient } from '@teei/auth';

const q2qClient = new AuthenticatedServiceClient(
  authManager,
  'http://q2q-service:3005',
  'q2q-service'
);

const result = await q2qClient.post('/classify', { text: 'Hello world' });
  `.trim();
}
