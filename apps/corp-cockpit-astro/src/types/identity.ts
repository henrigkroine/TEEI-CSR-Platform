/**
 * Identity & SSO Type Definitions
 *
 * TypeScript types for SSO configuration, SCIM provisioning, and role mappings.
 * Used across identity components and API clients.
 *
 * @module types/identity
 */

/**
 * Platform Roles
 */
export type TEEIRole = 'VIEWER' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';

/**
 * SSO Protocol Types
 */
export type SSOProtocol = 'saml' | 'oidc';

/**
 * SCIM Resource Types
 */
export type SCIMResourceType = 'user' | 'group';

/**
 * Sync Status Types
 */
export type SyncStatus = 'success' | 'failed' | 'in_progress' | 'never';

/**
 * SAML Configuration
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
  created_at?: string;
  updated_at?: string;
}

/**
 * OIDC/OAuth 2.0 Configuration
 */
export interface OIDCConfig {
  enabled: boolean;
  issuer: string;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  response_type: string;
  grant_type: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Combined SSO Configuration
 */
export interface SSOConfig {
  saml?: SAMLConfig;
  oidc?: OIDCConfig;
  active_protocol?: SSOProtocol;
}

/**
 * Role Mapping Rule
 *
 * Maps IdP claims to TEEI roles
 */
export interface RoleMapping {
  id: string;
  company_id: string;
  idp_claim: string;
  claim_value: string;
  teei_role: TEEIRole;
  priority: number;
  enabled: boolean;
  description?: string;
  created_at: string;
  updated_at?: string;
  created_by?: string;
}

/**
 * Role Mapping Form Data
 */
export interface RoleMappingFormData {
  idp_claim: string;
  claim_value: string;
  teei_role: TEEIRole;
  priority: number;
  enabled: boolean;
  description?: string;
}

/**
 * SCIM Configuration
 */
export interface SCIMConfig {
  enabled: boolean;
  endpoint: string;
  bearer_token?: string; // Masked in responses
  sync_frequency_minutes: number;
  supported_operations: string[];
  created_at?: string;
  updated_at?: string;
}

/**
 * SCIM Sync Status
 */
export interface SCIMSyncStatus {
  last_sync_at: string | null;
  last_sync_status: SyncStatus;
  next_sync_at: string | null;
  users_synced: number;
  groups_synced: number;
  errors_count: number;
  duration_ms: number;
}

/**
 * SCIM Sync Metrics
 */
export interface SCIMMetrics {
  total_users: number;
  total_groups: number;
  users_created_last_sync: number;
  users_updated_last_sync: number;
  users_deleted_last_sync: number;
  groups_created_last_sync: number;
  groups_updated_last_sync: number;
  groups_deleted_last_sync: number;
}

/**
 * SCIM Error
 */
export interface SCIMError {
  id: string;
  timestamp: string;
  error_type: string;
  message: string;
  resource_type: SCIMResourceType;
  resource_id?: string;
  resolved: boolean;
}

/**
 * SCIM Test Result
 */
export interface SCIMTestResult {
  status: 'success' | 'error';
  timestamp: string;
  users_found: number;
  groups_found: number;
  users_to_create: number;
  users_to_update: number;
  users_to_delete: number;
  groups_to_create: number;
  groups_to_update: number;
  groups_to_delete: number;
  validation_errors: Array<{
    resource_type: SCIMResourceType;
    resource_id: string;
    error: string;
  }>;
  connection_status: 'ok' | 'failed';
  response_time_ms: number;
  message?: string;
}

/**
 * Identity Provider Info
 */
export interface IdentityProvider {
  id: string;
  name: string;
  type: 'saml' | 'oidc' | 'ldap';
  enabled: boolean;
  company_id: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

/**
 * User Provisioning Info
 */
export interface UserProvisioning {
  user_id: string;
  email: string;
  name: string;
  idp_user_id: string;
  idp_source: string;
  assigned_role: TEEIRole;
  role_mapping_id?: string;
  provisioned_at: string;
  last_login?: string;
}

/**
 * API Response Types
 */

export interface GetSSOConfigResponse {
  saml: SAMLConfig;
  oidc: OIDCConfig;
  active_protocol?: SSOProtocol;
}

export interface GetRoleMappingsResponse {
  mappings: RoleMapping[];
  total: number;
}

export interface CreateRoleMappingResponse {
  mapping: RoleMapping;
}

export interface UpdateRoleMappingResponse {
  mapping: RoleMapping;
}

export interface DeleteRoleMappingResponse {
  success: boolean;
  deleted_id: string;
}

export interface GetSCIMStatusResponse {
  config: SCIMConfig;
  status: SCIMSyncStatus;
  metrics: SCIMMetrics;
  errors: SCIMError[];
}

export interface TriggerSCIMTestResponse {
  result: SCIMTestResult;
}

/**
 * Error Response
 */
export interface IdentityAPIError {
  error: string;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
