/**
 * Credentials Vault
 * Secure storage and retrieval of per-tenant credentials
 * Uses environment variables for now, can be extended to use HashiCorp Vault, AWS Secrets Manager, etc.
 */

import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('impact-in:credentials-vault');

export interface TenantCredentials {
  tenantId: string;
  companyId: string;
  connectorType: string;
  credentials: Record<string, string>;
}

/**
 * Credentials Vault
 * TODO: Integrate with proper secrets manager (Vault, AWS Secrets Manager, GCP Secret Manager)
 */
export class CredentialsVault {
  /**
   * Get credentials for a specific tenant and connector
   */
  async getCredentials(
    companyId: string,
    connectorType: string
  ): Promise<Record<string, string> | null> {
    logger.info('Retrieving credentials', { companyId, connectorType });

    // TODO: Replace with actual secrets manager integration
    // For now, use environment variables with tenant-specific prefixes
    const prefix = `${connectorType.toUpperCase()}_${companyId.replace(/-/g, '_').toUpperCase()}`;

    const credentials: Record<string, string> = {};
    let found = false;

    // Check for tenant-specific credentials
    for (const key in process.env) {
      if (key.startsWith(prefix + '_')) {
        const credKey = key.substring(prefix.length + 1).toLowerCase();
        credentials[credKey] = process.env[key]!;
        found = true;
      }
    }

    if (found) {
      logger.info('Tenant-specific credentials found', { companyId, connectorType });
      return credentials;
    }

    // Fall back to default credentials (for shared/development use)
    const defaultCredentials = this.getDefaultCredentials(connectorType);
    if (defaultCredentials) {
      logger.info('Using default credentials', { connectorType });
      return defaultCredentials;
    }

    logger.warn('No credentials found', { companyId, connectorType });
    return null;
  }

  /**
   * Store credentials for a specific tenant and connector
   * TODO: Implement secure storage
   */
  async storeCredentials(
    companyId: string,
    connectorType: string,
    credentials: Record<string, string>
  ): Promise<void> {
    logger.info('Storing credentials', { companyId, connectorType });

    // TODO: Implement secure storage using secrets manager
    // For now, just log a warning
    logger.warn('Credential storage not implemented - use environment variables');
  }

  /**
   * Delete credentials for a specific tenant and connector
   */
  async deleteCredentials(
    companyId: string,
    connectorType: string
  ): Promise<void> {
    logger.info('Deleting credentials', { companyId, connectorType });

    // TODO: Implement deletion using secrets manager
    logger.warn('Credential deletion not implemented');
  }

  /**
   * List all tenants with stored credentials for a connector
   */
  async listTenants(connectorType: string): Promise<string[]> {
    logger.info('Listing tenants with credentials', { connectorType });

    // TODO: Implement listing using secrets manager
    // For now, parse environment variables
    const prefix = `${connectorType.toUpperCase()}_`;
    const tenants = new Set<string>();

    for (const key in process.env) {
      if (key.startsWith(prefix)) {
        // Extract tenant ID from key pattern: CONNECTOR_TENANTID_CREDENTIAL
        const parts = key.substring(prefix.length).split('_');
        if (parts.length >= 2) {
          const tenantId = parts.slice(0, -1).join('_').toLowerCase().replace(/_/g, '-');
          tenants.add(tenantId);
        }
      }
    }

    return Array.from(tenants);
  }

  /**
   * Get default (fallback) credentials for a connector
   * Used for development and shared environments
   */
  private getDefaultCredentials(connectorType: string): Record<string, string> | null {
    const credentialMaps: Record<string, string[]> = {
      benevity: ['api_url', 'client_id', 'client_secret', 'tenant_id'],
      goodera: ['api_url', 'api_key', 'project_id'],
      workday: ['api_url', 'client_id', 'client_secret', 'tenant_id'],
      kintell: ['api_url', 'api_key'],
      upskilling: ['api_url', 'api_key'],
      buddy: ['api_url', 'api_key'],
      mentorship: ['api_url', 'api_key'],
    };

    const credentialKeys = credentialMaps[connectorType];
    if (!credentialKeys) {
      return null;
    }

    const prefix = connectorType.toUpperCase();
    const credentials: Record<string, string> = {};
    let found = false;

    for (const credKey of credentialKeys) {
      const envKey = `${prefix}_${credKey.toUpperCase()}`;
      if (process.env[envKey]) {
        credentials[credKey] = process.env[envKey]!;
        found = true;
      }
    }

    return found ? credentials : null;
  }

  /**
   * Validate that credentials are complete for a connector type
   */
  validateCredentials(
    connectorType: string,
    credentials: Record<string, string>
  ): { valid: boolean; missing: string[] } {
    const requiredFields: Record<string, string[]> = {
      benevity: ['api_url', 'client_id', 'client_secret', 'tenant_id'],
      goodera: ['api_url', 'api_key', 'project_id'],
      workday: ['api_url', 'client_id', 'client_secret', 'tenant_id'],
      kintell: ['api_url'],
      upskilling: ['api_url'],
      buddy: ['api_url'],
      mentorship: ['api_url'],
    };

    const required = requiredFields[connectorType] || [];
    const missing = required.filter(field => !credentials[field]);

    return {
      valid: missing.length === 0,
      missing,
    };
  }
}

/**
 * Singleton instance
 */
export const credentialsVault = new CredentialsVault();
