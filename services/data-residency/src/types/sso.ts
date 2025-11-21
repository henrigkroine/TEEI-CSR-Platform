/**
 * SSO Configuration Types
 * SAML and OIDC configuration management
 */

export type SsoType = 'saml' | 'oidc';
export type SsoStatus = 'draft' | 'active' | 'disabled';

export interface SamlConfig {
  entityId: string;
  ssoUrl: string;
  certificate: string; // PEM-encoded X.509
  signRequests?: boolean;
  wantAssertionsSigned?: boolean;
  nameIdFormat?: string;
  attributeMapping?: Record<string, string>;
}

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret: string; // Encrypted in DB
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint?: string;
  jwksUri?: string;
  scopes?: string[];
}

export interface SsoConfig {
  id: string;
  tenantId: string;
  name: string;
  type: SsoType;
  status: SsoStatus;
  samlConfig?: SamlConfig;
  oidcConfig?: OidcConfig;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export interface SsoConfigCreate {
  tenantId: string;
  name: string;
  type: SsoType;
  samlConfig?: SamlConfig;
  oidcConfig?: OidcConfig;
}

export interface SsoConfigUpdate {
  name?: string;
  status?: SsoStatus;
  samlConfig?: SamlConfig;
  oidcConfig?: OidcConfig;
}

export interface SsoTestResult {
  success: boolean;
  tests: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
  errors: string[];
}

export interface SpMetadata {
  entityId: string;
  acsUrl: string; // Assertion Consumer Service URL
  sloUrl: string; // Single Logout URL
  certificate: string;
}
