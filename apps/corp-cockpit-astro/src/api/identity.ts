/**
 * Identity & SSO API Client
 *
 * Provides API client functions for SSO configuration, SCIM provisioning,
 * and identity management. Connects to Worker-1 platform identity service.
 *
 * @module api/identity
 */

const IDENTITY_SERVICE_URL =
  import.meta.env.IDENTITY_SERVICE_URL ||
  import.meta.env.PUBLIC_IDENTITY_SERVICE_URL ||
  'http://localhost:3000/v1/identity';

// Feature flag to toggle between mock and real API
const USE_REAL_IDENTITY_API =
  import.meta.env.USE_REAL_IDENTITY_API === 'true' ||
  import.meta.env.PUBLIC_USE_REAL_IDENTITY_API === 'true' ||
  false;

/**
 * Type Definitions (matching API spec from worker3_api-diff.md section 2.4)
 */

export interface SAMLConfig {
  enabled: boolean;
  entity_id: string;
  acs_url: string;
  metadata_url: string;
  certificate_fingerprint: string;
  sign_requests: boolean;
  want_assertions_signed: boolean;
  name_id_format: string;
}

export interface OIDCConfig {
  enabled: boolean;
  issuer: string;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  response_type: string;
  grant_type: string;
}

export interface SSOConfigResponse {
  companyId: string;
  saml: SAMLConfig;
  oidc: OIDCConfig;
}

export interface RoleMapping {
  externalRoleId: string;
  internalRoleId: string;
  description: string;
}

export interface SCIMConfig {
  enabled: boolean;
  version: string;
  endpoint: string;
  token: string; // Redacted in responses
  lastSyncAt: string | null;
  syncStatus: 'success' | 'failed' | 'in_progress' | 'never';
  roleMappings: RoleMapping[];
}

export interface SCIMConfigResponse {
  companyId: string;
  scim: SCIMConfig;
}

export interface SCIMTestSyncResponse {
  success: boolean;
  usersFound: number;
  groupsFound: number;
  latency: number;
  errors: string[];
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}

/**
 * Identity API Client
 */
export class IdentityApiClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string = IDENTITY_SERVICE_URL, token?: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options?.headers);
    headers.set('Content-Type', 'application/json');

    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw {
          error: errorData.error || 'API request failed',
          message: errorData.message || response.statusText,
          statusCode: response.status,
        } as ApiError;
      }

      return await response.json();
    } catch (error) {
      if ((error as ApiError).statusCode) {
        throw error;
      }
      throw {
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error',
      } as ApiError;
    }
  }

  /**
   * Get SSO configuration (SAML and OIDC) for a company
   * GET /v1/identity/sso-config/{companyId}
   */
  async getSSOConfig(companyId: string): Promise<SSOConfigResponse> {
    if (!USE_REAL_IDENTITY_API) {
      console.warn(
        '[Identity API] Using mock data. Set USE_REAL_IDENTITY_API=true to use real API.'
      );
      return getMockSSOConfig(companyId);
    }

    return this.fetch<SSOConfigResponse>(`/sso-config/${companyId}`);
  }

  /**
   * Get SCIM provisioning configuration for a company
   * GET /v1/identity/scim-config/{companyId}
   */
  async getSCIMConfig(companyId: string): Promise<SCIMConfigResponse> {
    if (!USE_REAL_IDENTITY_API) {
      console.warn(
        '[Identity API] Using mock data. Set USE_REAL_IDENTITY_API=true to use real API.'
      );
      return getMockSCIMConfig(companyId);
    }

    return this.fetch<SCIMConfigResponse>(`/scim-config/${companyId}`);
  }

  /**
   * Test SCIM connection and sync
   * POST /v1/identity/scim-config/{companyId}/test-sync
   */
  async testSCIMSync(companyId: string): Promise<SCIMTestSyncResponse> {
    if (!USE_REAL_IDENTITY_API) {
      console.warn(
        '[Identity API] Using mock data. Set USE_REAL_IDENTITY_API=true to use real API.'
      );
      return getMockSCIMTestSync();
    }

    return this.fetch<SCIMTestSyncResponse>(`/scim-config/${companyId}/test-sync`, {
      method: 'POST',
    });
  }
}

/**
 * Convenience function to create an Identity API client
 */
export function createIdentityApiClient(token?: string): IdentityApiClient {
  return new IdentityApiClient(IDENTITY_SERVICE_URL, token);
}

/**
 * Mock Data Functions (fallback for development when API is not available)
 */

function getMockSSOConfig(companyId: string): SSOConfigResponse {
  return {
    companyId,
    saml: {
      enabled: true,
      entity_id: `https://teei.io/saml/metadata/${companyId}`,
      acs_url: `https://teei.io/saml/acs`,
      metadata_url: `https://teei.io/saml/metadata/${companyId}`,
      certificate_fingerprint: 'A1:B2:C3:D4:E5:F6:07:08:09:0A:0B:0C:0D:0E:0F:10:11:12:13:14',
      sign_requests: true,
      want_assertions_signed: true,
      name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    },
    oidc: {
      enabled: false,
      issuer: 'https://accounts.google.com',
      client_id: `1234567890.apps.googleusercontent.com`,
      redirect_uri: `https://teei.io/auth/oidc/callback`,
      scopes: ['openid', 'email', 'profile'],
      response_type: 'code',
      grant_type: 'authorization_code',
    },
  };
}

function getMockSCIMConfig(companyId: string): SCIMConfigResponse {
  return {
    companyId,
    scim: {
      enabled: true,
      version: '2.0',
      endpoint: 'https://teei.io/scim/v2',
      token: 'scim_abc123_redacted',
      lastSyncAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
      syncStatus: 'success',
      roleMappings: [
        {
          externalRoleId: 'okta-admin',
          internalRoleId: 'company-admin',
          description: 'Full admin access',
        },
        {
          externalRoleId: 'okta-viewer',
          internalRoleId: 'company-viewer',
          description: 'Read-only access',
        },
        {
          externalRoleId: 'okta-manager',
          internalRoleId: 'company-manager',
          description: 'Manage reports and data',
        },
      ],
    },
  };
}

function getMockSCIMTestSync(): SCIMTestSyncResponse {
  // Simulate async delay for more realistic testing
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        usersFound: 42,
        groupsFound: 5,
        latency: 127,
        errors: [],
      });
    }, 1500); // 1.5 second delay to simulate API call
  }) as any;
}

/**
 * Standalone API functions (for use in components without creating a client)
 */

export async function getSSOConfig(
  companyId: string,
  token?: string
): Promise<SSOConfigResponse> {
  const client = createIdentityApiClient(token);
  return client.getSSOConfig(companyId);
}

export async function getSCIMConfig(
  companyId: string,
  token?: string
): Promise<SCIMConfigResponse> {
  const client = createIdentityApiClient(token);
  return client.getSCIMConfig(companyId);
}

export async function testSCIMSync(
  companyId: string,
  token?: string
): Promise<SCIMTestSyncResponse> {
  const client = createIdentityApiClient(token);
  return client.testSCIMSync(companyId);
}

/**
 * Error handling utility
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'error' in error &&
    typeof (error as ApiError).error === 'string'
  );
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message || error.error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unknown error occurred';
}
