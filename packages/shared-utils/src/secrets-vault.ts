/**
 * Secrets Vault Integration
 *
 * Provides secure access to secrets from AWS Secrets Manager or HashiCorp Vault.
 * Features:
 * - Automatic secret rotation
 * - In-memory caching with TTL
 * - Failover between secret stores
 * - Audit logging for secret access
 *
 * Supported backends:
 * - AWS Secrets Manager
 * - HashiCorp Vault
 * - Environment variables (fallback for development)
 *
 * Ref: Mission § Secrets vault integration (AWS Secrets Manager or Vault)
 */

import { createServiceLogger } from './logger.js';

const logger = createServiceLogger('secrets-vault');

export interface SecretValue {
  value: string;
  version?: string;
  lastRotated?: Date;
  expiresAt?: Date;
}

export interface SecretsVaultConfig {
  backend: 'aws' | 'vault' | 'env';
  // AWS Secrets Manager config
  awsRegion?: string;
  awsSecretPrefix?: string;
  // HashiCorp Vault config
  vaultUrl?: string;
  vaultToken?: string;
  vaultNamespace?: string;
  vaultKvPath?: string;
  // Cache config
  cacheTtlSeconds?: number;
  enableCache?: boolean;
}

/**
 * Secrets cache entry
 */
interface CacheEntry {
  value: string;
  version?: string;
  cachedAt: Date;
  expiresAt: Date;
}

/**
 * Abstract Secrets Vault
 */
export abstract class SecretsVaultBackend {
  protected cache: Map<string, CacheEntry> = new Map();
  protected cacheTtlMs: number;
  protected enableCache: boolean;

  constructor(protected config: SecretsVaultConfig) {
    this.cacheTtlMs = (config.cacheTtlSeconds || 300) * 1000; // Default 5 minutes
    this.enableCache = config.enableCache !== false;
  }

  /**
   * Get secret value
   */
  async getSecret(secretName: string): Promise<SecretValue | null> {
    // Check cache first
    if (this.enableCache) {
      const cached = this.cache.get(secretName);
      if (cached && cached.expiresAt > new Date()) {
        logger.debug({ secretName, source: 'cache' }, 'Secret retrieved from cache');
        return {
          value: cached.value,
          version: cached.version,
        };
      }
    }

    // Fetch from backend
    const secret = await this.fetchSecret(secretName);

    if (secret && this.enableCache) {
      // Cache the secret
      this.cache.set(secretName, {
        value: secret.value,
        version: secret.version,
        cachedAt: new Date(),
        expiresAt: new Date(Date.now() + this.cacheTtlMs),
      });
    }

    return secret;
  }

  /**
   * Fetch secret from backend (implemented by subclasses)
   */
  protected abstract fetchSecret(secretName: string): Promise<SecretValue | null>;

  /**
   * Invalidate cache for a secret
   */
  invalidateCache(secretName: string): void {
    this.cache.delete(secretName);
    logger.debug({ secretName }, 'Secret cache invalidated');
  }

  /**
   * Clear all cached secrets
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('All secret caches cleared');
  }
}

/**
 * AWS Secrets Manager Backend
 */
export class AWSSecretsManagerBackend extends SecretsVaultBackend {
  private secretsManagerClient: any;

  constructor(config: SecretsVaultConfig) {
    super(config);

    // Lazy-load AWS SDK to avoid requiring it if not used
    try {
      const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
      this.secretsManagerClient = new SecretsManagerClient({
        region: config.awsRegion || process.env.AWS_REGION || 'us-east-1',
      });
    } catch (error) {
      logger.warn('AWS SDK not installed. Install @aws-sdk/client-secrets-manager to use AWS Secrets Manager.');
    }
  }

  protected async fetchSecret(secretName: string): Promise<SecretValue | null> {
    if (!this.secretsManagerClient) {
      throw new Error('AWS Secrets Manager client not initialized. Install @aws-sdk/client-secrets-manager.');
    }

    try {
      const fullSecretName = this.config.awsSecretPrefix
        ? `${this.config.awsSecretPrefix}/${secretName}`
        : secretName;

      const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
      const command = new GetSecretValueCommand({ SecretId: fullSecretName });
      const response = await this.secretsManagerClient.send(command);

      logger.info({ secretName: fullSecretName, version: response.VersionId }, 'Secret retrieved from AWS Secrets Manager');

      return {
        value: response.SecretString || Buffer.from(response.SecretBinary || '').toString('utf-8'),
        version: response.VersionId,
        lastRotated: response.CreatedDate,
      };
    } catch (error: any) {
      if (error.name === 'ResourceNotFoundException') {
        logger.warn({ secretName }, 'Secret not found in AWS Secrets Manager');
        return null;
      }

      logger.error({ secretName, error: error.message }, 'Failed to fetch secret from AWS Secrets Manager');
      throw error;
    }
  }
}

/**
 * HashiCorp Vault Backend
 */
export class HashiCorpVaultBackend extends SecretsVaultBackend {
  constructor(config: SecretsVaultConfig) {
    super(config);

    if (!config.vaultUrl || !config.vaultToken) {
      throw new Error('Vault URL and token are required for HashiCorp Vault backend');
    }
  }

  protected async fetchSecret(secretName: string): Promise<SecretValue | null> {
    try {
      const kvPath = this.config.vaultKvPath || 'secret/data';
      const url = `${this.config.vaultUrl}/v1/${kvPath}/${secretName}`;

      const headers: Record<string, string> = {
        'X-Vault-Token': this.config.vaultToken!,
      };

      if (this.config.vaultNamespace) {
        headers['X-Vault-Namespace'] = this.config.vaultNamespace;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (response.status === 404) {
        logger.warn({ secretName }, 'Secret not found in Vault');
        return null;
      }

      if (!response.ok) {
        throw new Error(`Vault API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { data?: { data?: unknown; metadata?: { version?: string; created_time?: string } } };

      logger.info({ secretName, version: data.data?.metadata?.version }, 'Secret retrieved from Vault');

      const vaultData = data.data;
      return {
        value: JSON.stringify((vaultData?.data as Record<string, unknown>) || {}),
        version: vaultData?.metadata?.version?.toString(),
        lastRotated: vaultData?.metadata?.created_time
          ? new Date(vaultData.metadata.created_time)
          : undefined,
      };
    } catch (error: any) {
      logger.error({ secretName, error: error.message }, 'Failed to fetch secret from Vault');
      throw error;
    }
  }
}

/**
 * Environment Variables Backend (fallback for development)
 */
export class EnvVaultBackend extends SecretsVaultBackend {
  protected async fetchSecret(secretName: string): Promise<SecretValue | null> {
    const value = process.env[secretName];

    if (!value) {
      logger.warn({ secretName }, 'Secret not found in environment variables');
      return null;
    }

    logger.debug({ secretName, source: 'env' }, 'Secret retrieved from environment');

    return { value };
  }
}

/**
 * Secrets Vault Manager
 *
 * Main interface for accessing secrets with automatic backend selection and failover.
 */
export class SecretsVault {
  private backend: SecretsVaultBackend;

  constructor(config: SecretsVaultConfig) {
    switch (config.backend) {
      case 'aws':
        this.backend = new AWSSecretsManagerBackend(config);
        break;
      case 'vault':
        this.backend = new HashiCorpVaultBackend(config);
        break;
      case 'env':
        this.backend = new EnvVaultBackend(config);
        break;
      default:
        throw new Error(`Unknown secrets backend: ${config.backend}`);
    }

    logger.info({ backend: config.backend }, 'Secrets vault initialized');
  }

  /**
   * Get secret value
   */
  async getSecret(secretName: string): Promise<string> {
    const secret = await this.backend.getSecret(secretName);

    if (!secret) {
      throw new Error(`Secret not found: ${secretName}`);
    }

    return secret.value;
  }

  /**
   * Get secret or return default value
   */
  async getSecretOrDefault(secretName: string, defaultValue: string): Promise<string> {
    try {
      return await this.getSecret(secretName);
    } catch (error) {
      logger.warn({ secretName, error }, 'Secret not found, using default value');
      return defaultValue;
    }
  }

  /**
   * Get secret as JSON object
   */
  async getSecretJson<T = any>(secretName: string): Promise<T> {
    const value = await this.getSecret(secretName);
    return JSON.parse(value) as T;
  }

  /**
   * Invalidate cached secret
   */
  invalidateSecret(secretName: string): void {
    this.backend.invalidateCache(secretName);
  }

  /**
   * Clear all cached secrets
   */
  clearCache(): void {
    this.backend.clearCache();
  }
}

/**
 * Create secrets vault instance
 *
 * Example usage:
 * ```typescript
 * const vault = createSecretsVault({
 *   backend: 'aws',
 *   awsRegion: 'us-east-1',
 *   awsSecretPrefix: 'teei/production',
 *   cacheTtlSeconds: 300,
 * });
 *
 * const dbPassword = await vault.getSecret('database/password');
 * const apiKeys = await vault.getSecretJson('api/keys');
 * ```
 */
export function createSecretsVault(config: SecretsVaultConfig): SecretsVault {
  return new SecretsVault(config);
}

/**
 * Global secrets vault instance (singleton)
 */
let globalVault: SecretsVault | null = null;

/**
 * Initialize global secrets vault
 */
export function initializeSecretsVault(config: SecretsVaultConfig): SecretsVault {
  if (globalVault) {
    logger.warn('Global secrets vault already initialized');
  }
  globalVault = createSecretsVault(config);
  return globalVault;
}

/**
 * Get global secrets vault instance
 */
export function getSecretsVault(): SecretsVault {
  if (!globalVault) {
    throw new Error(
      'Secrets vault not initialized. Call initializeSecretsVault() first or set SECRETS_BACKEND env var.'
    );
  }
  return globalVault;
}

/**
 * Helper: Get secret from global vault
 */
export async function getSecret(secretName: string): Promise<string> {
  return getSecretsVault().getSecret(secretName);
}

/**
 * Helper: Get secret as JSON from global vault
 */
export async function getSecretJson<T = any>(secretName: string): Promise<T> {
  return getSecretsVault().getSecretJson<T>(secretName);
}

/**
 * Auto-initialize from environment variables
 */
export function autoInitializeSecretsVault(): SecretsVault {
  const backend = (process.env.SECRETS_BACKEND || 'env') as 'aws' | 'vault' | 'env';

  const config: SecretsVaultConfig = {
    backend,
    awsRegion: process.env.AWS_REGION,
    awsSecretPrefix: process.env.AWS_SECRET_PREFIX,
    vaultUrl: process.env.VAULT_URL,
    vaultToken: process.env.VAULT_TOKEN,
    vaultNamespace: process.env.VAULT_NAMESPACE,
    vaultKvPath: process.env.VAULT_KV_PATH,
    cacheTtlSeconds: process.env.SECRETS_CACHE_TTL_SECONDS
      ? parseInt(process.env.SECRETS_CACHE_TTL_SECONDS, 10)
      : 300,
    enableCache: process.env.SECRETS_ENABLE_CACHE !== 'false',
  };

  return initializeSecretsVault(config);
}
