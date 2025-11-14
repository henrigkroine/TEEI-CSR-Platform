/**
 * SSO Settings Component
 *
 * Displays SAML and OIDC configuration (read-only).
 * Configuration managed by Worker-1 platform API.
 *
 * @module components/identity/SSOSettings
 */

import React, { useState, useEffect } from 'react';

interface SSOSettingsProps {
  companyId: string;
}

interface SAMLConfig {
  enabled: boolean;
  entity_id: string;
  acs_url: string;
  metadata_url: string;
  certificate_fingerprint: string;
  sign_requests: boolean;
  want_assertions_signed: boolean;
  name_id_format: string;
}

interface OIDCConfig {
  enabled: boolean;
  issuer: string;
  client_id: string;
  redirect_uri: string;
  scopes: string[];
  response_type: string;
  grant_type: string;
}

export default function SSOSettings({ companyId }: SSOSettingsProps) {
  const [samlConfig, setSamlConfig] = useState<SAMLConfig | null>(null);
  const [oidcConfig, setOidcConfig] = useState<OIDCConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'saml' | 'oidc'>('saml');

  useEffect(() => {
    fetchSSOConfig();
  }, [companyId]);

  async function fetchSSOConfig() {
    try {
      // TODO: Fetch from Worker-1 platform API
      // For now, use mock data
      setSamlConfig(getMockSAMLConfig(companyId));
      setOidcConfig(getMockOIDCConfig(companyId));
    } catch (error) {
      console.error('Failed to fetch SSO config:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="sso-settings loading" role="status" aria-live="polite">
        Loading SSO configuration...
      </div>
    );
  }

  return (
    <div className="sso-settings">
      {/* Tab Navigation */}
      <div className="tab-nav" role="tablist" aria-label="SSO configuration options">
        <button
          className={`tab-btn ${activeTab === 'saml' ? 'active' : ''}`}
          onClick={() => setActiveTab('saml')}
          role="tab"
          aria-selected={activeTab === 'saml'}
          aria-controls="saml-panel"
          id="saml-tab"
        >
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <title>Lock icon</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          SAML 2.0
          {samlConfig?.enabled && <span className="status-badge enabled" aria-label="SAML is enabled">Enabled</span>}
        </button>
        <button
          className={`tab-btn ${activeTab === 'oidc' ? 'active' : ''}`}
          onClick={() => setActiveTab('oidc')}
          role="tab"
          aria-selected={activeTab === 'oidc'}
          aria-controls="oidc-panel"
          id="oidc-tab"
        >
          <svg className="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <title>Key icon</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          OIDC / OAuth 2.0
          {oidcConfig?.enabled && <span className="status-badge enabled" aria-label="OIDC is enabled">Enabled</span>}
        </button>
      </div>

      {/* SAML Tab */}
      {activeTab === 'saml' && samlConfig && (
        <div
          className="config-panel"
          role="tabpanel"
          id="saml-panel"
          aria-labelledby="saml-tab"
        >
          {!samlConfig.enabled && (
            <div className="alert-warning" role="alert">
              <strong>SAML is currently disabled</strong>
              <p>Contact your administrator to enable SAML authentication.</p>
            </div>
          )}

          <div className="config-grid">
            <ConfigField label="Status" value={samlConfig.enabled ? 'Enabled' : 'Disabled'} />
            <ConfigField label="Entity ID" value={samlConfig.entity_id} copyable />
            <ConfigField label="ACS URL" value={samlConfig.acs_url} copyable />
            <ConfigField label="Metadata URL" value={samlConfig.metadata_url} copyable link />
            <ConfigField
              label="Certificate Fingerprint"
              value={samlConfig.certificate_fingerprint}
              monospace
            />
            <ConfigField
              label="Sign Requests"
              value={samlConfig.sign_requests ? 'Yes' : 'No'}
            />
            <ConfigField
              label="Want Assertions Signed"
              value={samlConfig.want_assertions_signed ? 'Yes' : 'No'}
            />
            <ConfigField label="NameID Format" value={samlConfig.name_id_format} />
          </div>

          <div className="integration-guide">
            <h4>IdP Integration Instructions</h4>
            <ol>
              <li>
                Download SAML metadata: <a href={samlConfig.metadata_url}>Download XML</a>
              </li>
              <li>In your IdP (Okta, Azure AD, etc.), create a new SAML application</li>
              <li>Upload the metadata XML or manually configure with the values above</li>
              <li>Configure attribute mappings (email, name, groups)</li>
              <li>Assign users or groups to the application</li>
              <li>Test login and verify user provisioning</li>
            </ol>
          </div>
        </div>
      )}

      {/* OIDC Tab */}
      {activeTab === 'oidc' && oidcConfig && (
        <div
          className="config-panel"
          role="tabpanel"
          id="oidc-panel"
          aria-labelledby="oidc-tab"
        >
          {!oidcConfig.enabled && (
            <div className="alert-warning" role="alert">
              <strong>OIDC is currently disabled</strong>
              <p>Contact your administrator to enable OIDC authentication.</p>
            </div>
          )}

          <div className="config-grid">
            <ConfigField label="Status" value={oidcConfig.enabled ? 'Enabled' : 'Disabled'} />
            <ConfigField label="Issuer" value={oidcConfig.issuer} copyable link />
            <ConfigField label="Client ID" value={oidcConfig.client_id} copyable />
            <ConfigField label="Redirect URI" value={oidcConfig.redirect_uri} copyable />
            <ConfigField label="Scopes" value={oidcConfig.scopes.join(', ')} />
            <ConfigField label="Response Type" value={oidcConfig.response_type} />
            <ConfigField label="Grant Type" value={oidcConfig.grant_type} />
          </div>

          <div className="integration-guide">
            <h4>IdP Integration Instructions</h4>
            <ol>
              <li>In your OAuth provider (Google, GitHub, Auth0, etc.), create a new OAuth app</li>
              <li>Configure the redirect URI: <code>{oidcConfig.redirect_uri}</code></li>
              <li>Set the scopes: <code>{oidcConfig.scopes.join(' ')}</code></li>
              <li>Note your Client ID and Client Secret</li>
              <li>
                Provide the Client ID and Secret to your TEEI administrator via the platform API
              </li>
              <li>Test login and verify token exchange</li>
            </ol>
          </div>
        </div>
      )}

      <style jsx>{`
        .sso-settings {
          background: white;
        }

        .tab-nav {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .tab-btn {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tab-btn:hover {
          color: #111827;
          background: #f9fafb;
        }

        .tab-btn.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .tab-icon {
          width: 1.25rem;
          height: 1.25rem;
          flex-shrink: 0;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.enabled {
          background: #d1fae5;
          color: #065f46;
        }

        .config-panel {
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .alert-warning {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-left: 4px solid #f59e0b;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .alert-warning strong {
          display: block;
          margin-bottom: 4px;
          color: #92400e;
        }

        .alert-warning p {
          margin: 0;
          color: #78350f;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .integration-guide {
          background: #f9fafb;
          padding: 24px;
          border-radius: 8px;
          margin-top: 32px;
        }

        .integration-guide h4 {
          margin-top: 0;
          margin-bottom: 16px;
          color: #111827;
        }

        .integration-guide ol {
          margin: 0;
          padding-left: 24px;
        }

        .integration-guide li {
          margin-bottom: 12px;
          line-height: 1.6;
        }

        .integration-guide code {
          background: #e5e7eb;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .integration-guide a {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
        }

        .integration-guide a:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .config-grid {
            grid-template-columns: 1fr;
          }

          .tab-btn {
            padding: 12px 16px;
            font-size: 0.9375rem;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Config Field Component
 */
function ConfigField({
  label,
  value,
  copyable = false,
  monospace = false,
  link = false,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  monospace?: boolean;
  link?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="config-field">
      <label>{label}</label>
      <div className="value-wrapper">
        {link ? (
          <a href={value} className="value-link" target="_blank" rel="noopener noreferrer">
            {value}
          </a>
        ) : (
          <div className={`value ${monospace ? 'monospace' : ''}`}>{value}</div>
        )}
        {copyable && (
          <button
            onClick={copyToClipboard}
            className="copy-btn"
            aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
          >
            {copied ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <title>Check mark</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <title>Clipboard</title>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            )}
          </button>
        )}
      </div>

      <style jsx>{`
        .config-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .value-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .value {
          flex: 1;
          padding: 10px 12px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.9375rem;
          color: #111827;
          word-break: break-all;
        }

        .value.monospace {
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
        }

        .value-link {
          flex: 1;
          padding: 10px 12px;
          background: #eff6ff;
          border: 1px solid #3b82f6;
          border-radius: 6px;
          font-size: 0.9375rem;
          color: #2563eb;
          text-decoration: none;
          word-break: break-all;
        }

        .value-link:hover {
          background: #dbeafe;
        }

        .copy-btn {
          padding: 8px 12px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-btn svg {
          width: 1.25rem;
          height: 1.25rem;
        }

        .copy-btn:hover {
          background: #e5e7eb;
        }

        .copy-btn:active {
          transform: scale(0.95);
        }
      `}</style>
    </div>
  );
}

/**
 * Mock data functions (replace with real API calls to Worker-1)
 */
function getMockSAMLConfig(companyId: string): SAMLConfig {
  return {
    enabled: true,
    entity_id: `https://teei.platform/saml/${companyId}`,
    acs_url: `https://teei.platform/api/auth/saml/${companyId}/acs`,
    metadata_url: `https://teei.platform/api/auth/saml/${companyId}/metadata.xml`,
    certificate_fingerprint: 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD',
    sign_requests: true,
    want_assertions_signed: true,
    name_id_format: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
  };
}

function getMockOIDCConfig(companyId: string): OIDCConfig {
  return {
    enabled: false,
    issuer: 'https://accounts.google.com',
    client_id: `teei-${companyId}.apps.googleusercontent.com`,
    redirect_uri: `https://teei.platform/api/auth/oidc/${companyId}/callback`,
    scopes: ['openid', 'profile', 'email'],
    response_type: 'code',
    grant_type: 'authorization_code',
  };
}
