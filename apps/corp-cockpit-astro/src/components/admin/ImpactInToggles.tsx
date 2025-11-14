import { useState, useEffect } from 'react';
import './admin.css';

interface IntegrationConfig {
  platform: 'benevity' | 'goodera' | 'workday';
  enabled: boolean;
  apiEndpoint?: string;
  lastSyncedAt?: string;
  lastSyncStatus?: 'success' | 'failed' | 'pending';
  errorMessage?: string;
}

interface ImpactInTogglesProps {
  companyId: string;
}

const PLATFORM_INFO = {
  benevity: {
    name: 'Benevity',
    icon: '🎯',
    description: 'Employee giving and volunteering platform',
    docs: 'https://docs.benevity.com/api',
  },
  goodera: {
    name: 'Goodera',
    icon: '🌱',
    description: 'Corporate social responsibility platform',
    docs: 'https://api.goodera.com/docs',
  },
  workday: {
    name: 'Workday',
    icon: '💼',
    description: 'Enterprise HR and volunteering',
    docs: 'https://workday.com/api-docs',
  },
};

export default function ImpactInToggles({ companyId }: ImpactInTogglesProps) {
  const [integrations, setIntegrations] = useState<IntegrationConfig[]>([
    { platform: 'benevity', enabled: false },
    { platform: 'goodera', enabled: false },
    { platform: 'workday', enabled: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, [companyId]);

  async function fetchIntegrations() {
    try {
      setLoading(true);
      const response = await fetch(`/api/companies/${companyId}/integrations/impact-in`);
      if (response.ok) {
        const data = await response.json();
        setIntegrations(data.integrations);
      }
    } catch (error) {
      console.error('Failed to fetch integrations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleIntegration(platform: string, enabled: boolean) {
    setSaving(platform);
    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/impact-in/${platform}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setIntegrations(
          integrations.map((integration) =>
            integration.platform === platform ? { ...integration, enabled } : integration
          )
        );
      }
    } catch (error) {
      console.error('Failed to toggle integration:', error);
    } finally {
      setSaving(null);
    }
  }

  async function testConnection(platform: string) {
    setSaving(platform);
    try {
      const response = await fetch(`/api/companies/${companyId}/integrations/impact-in/${platform}/test`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Connection test ${data.success ? 'succeeded' : 'failed'}: ${data.message}`);
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      alert('Connection test failed');
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return <div className="loading">Loading integrations...</div>;
  }

  return (
    <div className="impact-in-toggles">
      <div className="integrations-grid">
        {integrations.map((integration) => {
          const info = PLATFORM_INFO[integration.platform];
          return (
            <div key={integration.platform} className="integration-card">
              <div className="integration-header">
                <div className="integration-title">
                  <span className="platform-icon">{info.icon}</span>
                  <div>
                    <h4>{info.name}</h4>
                    <p className="platform-description">{info.description}</p>
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={integration.enabled}
                    onChange={(e) => toggleIntegration(integration.platform, e.target.checked)}
                    disabled={saving === integration.platform}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              {integration.enabled && (
                <div className="integration-details">
                  <div className="status-row">
                    <span className="label">Status:</span>
                    <span className={`status-badge ${integration.lastSyncStatus || 'pending'}`}>
                      {integration.lastSyncStatus === 'success' && '✓ Connected'}
                      {integration.lastSyncStatus === 'failed' && '✗ Failed'}
                      {!integration.lastSyncStatus && '○ Not synced'}
                    </span>
                  </div>

                  {integration.lastSyncedAt && (
                    <div className="status-row">
                      <span className="label">Last Sync:</span>
                      <span>{new Date(integration.lastSyncedAt).toLocaleString()}</span>
                    </div>
                  )}

                  {integration.errorMessage && (
                    <div className="error-message">
                      <strong>Error:</strong> {integration.errorMessage}
                    </div>
                  )}

                  <div className="integration-actions">
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => testConnection(integration.platform)}
                      disabled={saving === integration.platform}
                    >
                      Test Connection
                    </button>
                    <a
                      href={`/${companyId}/cockpit/impact-in?platform=${integration.platform}`}
                      className="btn btn-secondary btn-sm"
                    >
                      View Deliveries
                    </a>
                    <a href={info.docs} target="_blank" rel="noopener noreferrer" className="link">
                      API Docs ↗
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="integration-note">
        <strong>Note:</strong> Enabling an integration will automatically push your impact data to the
        selected platform. Ensure you have configured the necessary API credentials in your environment
        variables.
      </div>
    </div>
  );
}
