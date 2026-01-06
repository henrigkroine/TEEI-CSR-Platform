/**
 * Identity & SSO API Client
 *
 * Client-side API functions for SSO configuration, SCIM provisioning, and role mappings.
 * All functions call Worker-1 platform API endpoints (to be implemented).
 *
 * @module lib/api/identity
 */

import type {
  GetSSOConfigResponse,
  GetRoleMappingsResponse,
  CreateRoleMappingResponse,
  UpdateRoleMappingResponse,
  DeleteRoleMappingResponse,
  GetSCIMStatusResponse,
  TriggerSCIMTestResponse,
  RoleMappingFormData,
  SAMLConfig,
  OIDCConfig,
  IdentityAPIError,
} from '../../types/identity';

/**
 * Base API URL for identity endpoints
 * In production, this would point to Worker-1 platform API
 */
const API_BASE = '/api/identity';

/**
 * Fetch wrapper with error handling
 */
async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error: IdentityAPIError = await response.json();
      throw new Error(error.message || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
}

/**
 * SSO Configuration API
 */

/**
 * Get SSO configuration (SAML + OIDC) for a company
 */
export async function getSSOConfig(companyId: string): Promise<GetSSOConfigResponse> {
  return fetchAPI<GetSSOConfigResponse>(`${API_BASE}/sso/${companyId}`);
}

/**
 * Get SAML configuration
 */
export async function getSAMLConfig(companyId: string): Promise<SAMLConfig> {
  return fetchAPI<SAMLConfig>(`${API_BASE}/sso/${companyId}/saml`);
}

/**
 * Get OIDC configuration
 */
export async function getOIDCConfig(companyId: string): Promise<OIDCConfig> {
  return fetchAPI<OIDCConfig>(`${API_BASE}/sso/${companyId}/oidc`);
}

/**
 * Update SAML configuration (SUPER_ADMIN only)
 */
export async function updateSAMLConfig(
  companyId: string,
  config: Partial<SAMLConfig>
): Promise<SAMLConfig> {
  return fetchAPI<SAMLConfig>(`${API_BASE}/sso/${companyId}/saml`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

/**
 * Update OIDC configuration (SUPER_ADMIN only)
 */
export async function updateOIDCConfig(
  companyId: string,
  config: Partial<OIDCConfig>
): Promise<OIDCConfig> {
  return fetchAPI<OIDCConfig>(`${API_BASE}/sso/${companyId}/oidc`, {
    method: 'PUT',
    body: JSON.stringify(config),
  });
}

/**
 * Download SAML metadata XML
 */
export async function downloadSAMLMetadata(companyId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE}/sso/${companyId}/saml/metadata.xml`);

  if (!response.ok) {
    throw new Error('Failed to download SAML metadata');
  }

  return await response.blob();
}

/**
 * Role Mapping API
 */

/**
 * Get all role mappings for a company
 */
export async function getRoleMappings(companyId: string): Promise<GetRoleMappingsResponse> {
  return fetchAPI<GetRoleMappingsResponse>(`${API_BASE}/scim/${companyId}/mappings`);
}

/**
 * Get a specific role mapping by ID
 */
export async function getRoleMapping(
  companyId: string,
  mappingId: string
): Promise<CreateRoleMappingResponse> {
  return fetchAPI<CreateRoleMappingResponse>(
    `${API_BASE}/scim/${companyId}/mappings/${mappingId}`
  );
}

/**
 * Create a new role mapping (SUPER_ADMIN only)
 */
export async function createRoleMapping(
  companyId: string,
  data: RoleMappingFormData
): Promise<CreateRoleMappingResponse> {
  return fetchAPI<CreateRoleMappingResponse>(`${API_BASE}/scim/${companyId}/mappings`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing role mapping (SUPER_ADMIN only)
 */
export async function updateRoleMapping(
  companyId: string,
  mappingId: string,
  data: Partial<RoleMappingFormData>
): Promise<UpdateRoleMappingResponse> {
  return fetchAPI<UpdateRoleMappingResponse>(
    `${API_BASE}/scim/${companyId}/mappings/${mappingId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}

/**
 * Delete a role mapping (SUPER_ADMIN only)
 */
export async function deleteRoleMapping(
  companyId: string,
  mappingId: string
): Promise<DeleteRoleMappingResponse> {
  return fetchAPI<DeleteRoleMappingResponse>(
    `${API_BASE}/scim/${companyId}/mappings/${mappingId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * SCIM Provisioning API
 */

/**
 * Get SCIM status and metrics
 */
export async function getSCIMStatus(companyId: string): Promise<GetSCIMStatusResponse> {
  return fetchAPI<GetSCIMStatusResponse>(`${API_BASE}/scim/${companyId}/status`);
}

/**
 * Trigger a SCIM sync test (does not modify data)
 */
export async function triggerSCIMTest(companyId: string): Promise<TriggerSCIMTestResponse> {
  return fetchAPI<TriggerSCIMTestResponse>(`${API_BASE}/scim/${companyId}/test`, {
    method: 'POST',
  });
}

/**
 * Trigger a manual SCIM sync (SUPER_ADMIN only)
 */
export async function triggerSCIMSync(companyId: string): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(`${API_BASE}/scim/${companyId}/sync`, {
    method: 'POST',
  });
}

/**
 * Get SCIM error log
 */
export async function getSCIMErrors(
  companyId: string,
  options?: { limit?: number; offset?: number; unresolved_only?: boolean }
): Promise<GetSCIMStatusResponse['errors']> {
  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.offset) params.set('offset', options.offset.toString());
  if (options?.unresolved_only) params.set('unresolved_only', 'true');

  const response = await fetchAPI<{ errors: GetSCIMStatusResponse['errors'] }>(
    `${API_BASE}/scim/${companyId}/errors?${params.toString()}`
  );

  return response.errors;
}

/**
 * Resolve a SCIM error (mark as resolved)
 */
export async function resolveSCIMError(
  companyId: string,
  errorId: string
): Promise<{ success: boolean }> {
  return fetchAPI<{ success: boolean }>(
    `${API_BASE}/scim/${companyId}/errors/${errorId}/resolve`,
    {
      method: 'POST',
    }
  );
}

/**
 * Mock Data Helpers (for development/testing)
 * TODO: Remove these when Worker-1 API is ready
 */

/**
 * Generate mock SSO config for development
 */
export function getMockSSOConfig(companyId: string): GetSSOConfigResponse {
  return {
    saml: {
      enabled: true,
      entity_id: `https://teei.platform/saml/${companyId}`,
      acs_url: `https://teei.platform/api/auth/saml/${companyId}/acs`,
      metadata_url: `https://teei.platform/api/auth/saml/${companyId}/metadata.xml`,
      certificate_fingerprint: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD',
      sign_requests: true,
      want_assertions_signed: true,
      name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    },
    oidc: {
      enabled: false,
      issuer: 'https://accounts.google.com',
      client_id: `teei-${companyId}.apps.googleusercontent.com`,
      redirect_uri: `https://teei.platform/api/auth/oidc/${companyId}/callback`,
      scopes: ['openid', 'profile', 'email'],
      response_type: 'code',
      grant_type: 'authorization_code',
    },
    active_protocol: 'saml',
  };
}

/**
 * Export all identity API functions
 */
export default {
  // SSO Config
  getSSOConfig,
  getSAMLConfig,
  getOIDCConfig,
  updateSAMLConfig,
  updateOIDCConfig,
  downloadSAMLMetadata,

  // Role Mappings
  getRoleMappings,
  getRoleMapping,
  createRoleMapping,
  updateRoleMapping,
  deleteRoleMapping,

  // SCIM
  getSCIMStatus,
  triggerSCIMTest,
  triggerSCIMSync,
  getSCIMErrors,
  resolveSCIMError,

  // Mock (temporary)
  getMockSSOConfig,
};
