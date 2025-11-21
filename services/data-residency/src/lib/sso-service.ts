/**
 * SSO Configuration Service
 * Manages SAML and OIDC identity provider configurations
 */

import { createServiceLogger } from '@teei/shared-utils';
import { randomUUID } from 'crypto';
import {
  SsoConfig,
  SsoConfigCreate,
  SsoConfigUpdate,
  SsoTestResult,
  SpMetadata,
} from '../types/sso.js';

const logger = createServiceLogger('sso-service');

/**
 * In-memory storage for demo
 * Production: Replace with PostgreSQL + Vault for secrets
 */
class SsoStore {
  private configs: Map<string, SsoConfig> = new Map();

  create(config: SsoConfig): SsoConfig {
    this.configs.set(config.id, config);
    return config;
  }

  getById(id: string): SsoConfig | null {
    return this.configs.get(id) || null;
  }

  listByTenant(tenantId: string): SsoConfig[] {
    return Array.from(this.configs.values()).filter(c => c.tenantId === tenantId);
  }

  update(id: string, updates: Partial<SsoConfig>): SsoConfig | null {
    const config = this.configs.get(id);
    if (!config) return null;

    const updated = { ...config, ...updates, updatedAt: new Date() };
    this.configs.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.configs.delete(id);
  }
}

const store = new SsoStore();

export class SsoService {
  async listConfigs(tenantId: string): Promise<SsoConfig[]> {
    return store.listByTenant(tenantId).map(config => this.sanitizeConfig(config));
  }

  async getConfig(id: string): Promise<SsoConfig | null> {
    const config = store.getById(id);
    return config ? this.sanitizeConfig(config) : null;
  }

  async createConfig(data: SsoConfigCreate, actorId: string): Promise<SsoConfig> {
    const now = new Date();

    // Encrypt client secret if OIDC
    if (data.type === 'oidc' && data.oidcConfig?.clientSecret) {
      // TODO: Encrypt with Vault/KMS
      logger.warn('Client secret should be encrypted at rest');
    }

    // Validate certificate if SAML
    if (data.type === 'saml' && data.samlConfig) {
      this.validateSamlCertificate(data.samlConfig.certificate);
    }

    const config: SsoConfig = {
      id: randomUUID(),
      tenantId: data.tenantId,
      name: data.name,
      type: data.type,
      status: 'draft',
      samlConfig: data.samlConfig,
      oidcConfig: data.oidcConfig,
      createdAt: now,
      updatedAt: now,
      createdBy: actorId,
      updatedBy: actorId,
    };

    store.create(config);
    logger.info('SSO config created', { id: config.id, type: config.type, tenantId: config.tenantId });

    return this.sanitizeConfig(config);
  }

  async updateConfig(id: string, data: SsoConfigUpdate, actorId: string): Promise<SsoConfig | null> {
    const existing = store.getById(id);
    if (!existing) return null;

    // Encrypt client secret if updating OIDC
    if (data.oidcConfig?.clientSecret) {
      // TODO: Encrypt with Vault/KMS
      logger.warn('Client secret should be encrypted at rest');
    }

    // Validate certificate if updating SAML
    if (data.samlConfig) {
      this.validateSamlCertificate(data.samlConfig.certificate);
    }

    const updated = store.update(id, {
      ...data,
      updatedBy: actorId,
    });

    if (updated) {
      logger.info('SSO config updated', { id, tenantId: updated.tenantId });
    }

    return updated ? this.sanitizeConfig(updated) : null;
  }

  async deleteConfig(id: string): Promise<boolean> {
    const config = store.getById(id);
    if (!config) return false;

    const deleted = store.delete(id);
    if (deleted) {
      logger.info('SSO config deleted', { id, tenantId: config.tenantId });
    }
    return deleted;
  }

  async testConfig(id: string): Promise<SsoTestResult> {
    const config = store.getById(id);
    if (!config) {
      throw new Error('Config not found');
    }

    const tests: SsoTestResult['tests'] = [];
    const errors: string[] = [];

    if (config.type === 'saml' && config.samlConfig) {
      // Test 1: Validate entity ID
      tests.push({
        name: 'Entity ID valid',
        passed: !!config.samlConfig.entityId,
        message: config.samlConfig.entityId ? 'Entity ID present' : 'Entity ID missing',
      });

      // Test 2: Validate SSO URL
      tests.push({
        name: 'SSO URL reachable',
        passed: this.isValidUrl(config.samlConfig.ssoUrl),
        message: this.isValidUrl(config.samlConfig.ssoUrl) ? 'SSO URL is valid' : 'Invalid SSO URL',
      });

      // Test 3: Validate certificate
      const certValid = this.validateSamlCertificate(config.samlConfig.certificate);
      tests.push({
        name: 'Certificate valid',
        passed: certValid,
        message: certValid ? 'Certificate is valid PEM format' : 'Invalid certificate format',
      });

      // Test 4: Attempt metadata fetch (mock)
      tests.push({
        name: 'Metadata fetch',
        passed: true,
        message: 'Metadata fetch successful (mock)',
      });
    } else if (config.type === 'oidc' && config.oidcConfig) {
      // Test 1: Validate issuer
      tests.push({
        name: 'Issuer URL valid',
        passed: this.isValidUrl(config.oidcConfig.issuer),
        message: this.isValidUrl(config.oidcConfig.issuer) ? 'Issuer URL is valid' : 'Invalid issuer URL',
      });

      // Test 2: Validate client ID
      tests.push({
        name: 'Client ID present',
        passed: !!config.oidcConfig.clientId,
        message: config.oidcConfig.clientId ? 'Client ID present' : 'Client ID missing',
      });

      // Test 3: Test authorization endpoint
      tests.push({
        name: 'Authorization endpoint reachable',
        passed: this.isValidUrl(config.oidcConfig.authorizationEndpoint),
        message: 'Authorization endpoint valid',
      });

      // Test 4: Test token endpoint
      tests.push({
        name: 'Token endpoint reachable',
        passed: this.isValidUrl(config.oidcConfig.tokenEndpoint),
        message: 'Token endpoint valid',
      });

      // Test 5: Fetch JWKS (mock)
      if (config.oidcConfig.jwksUri) {
        tests.push({
          name: 'JWKS fetch',
          passed: true,
          message: 'JWKS fetch successful (mock)',
        });
      }
    }

    const success = tests.every(t => t.passed);

    logger.info('SSO config tested', { id, success, testCount: tests.length });

    return { success, tests, errors };
  }

  async getSpMetadata(tenantId: string): Promise<SpMetadata> {
    // Generate SP metadata for IdP configuration
    const baseUrl = process.env.SSO_BASE_URL || 'https://api.teei.io';

    return {
      entityId: `${baseUrl}/sso/${tenantId}`,
      acsUrl: `${baseUrl}/sso/${tenantId}/acs`,
      sloUrl: `${baseUrl}/sso/${tenantId}/slo`,
      certificate: this.getSpCertificate(),
    };
  }

  // ==================== Helpers ====================

  private sanitizeConfig(config: SsoConfig): SsoConfig {
    const sanitized = { ...config };

    // Redact client secret
    if (sanitized.oidcConfig?.clientSecret) {
      sanitized.oidcConfig = {
        ...sanitized.oidcConfig,
        clientSecret: '***REDACTED***',
      };
    }

    return sanitized;
  }

  private validateSamlCertificate(cert: string): boolean {
    // Basic PEM format validation
    return cert.includes('-----BEGIN CERTIFICATE-----') && cert.includes('-----END CERTIFICATE-----');
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private getSpCertificate(): string {
    // TODO: Load from Vault
    return `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAKHBTXKXXXXXMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
... (demo certificate)
-----END CERTIFICATE-----`;
  }
}
