/**
 * SCIM Status Component
 *
 * Displays SCIM provisioning status (read-only).
 * Shows last sync timestamp, user/group counts, and error logs.
 *
 * @module components/identity/SCIMStatus
 */

import React, { useState, useEffect } from 'react';

interface SCIMStatusProps {
  companyId: string;
}

interface SCIMConfig {
  enabled: boolean;
  endpoint: string;
  sync_frequency_minutes: number;
  supported_operations: string[];
}

interface SCIMSyncStatus {
  last_sync_at: string | null;
  last_sync_status: 'success' | 'failed' | 'in_progress' | 'never';
  next_sync_at: string | null;
  users_synced: number;
  groups_synced: number;
  errors_count: number;
  duration_ms: number;
}

interface SCIMError {
  id: string;
  timestamp: string;
  error_type: string;
  message: string;
  resource_type: 'user' | 'group';
  resource_id?: string;
  resolved: boolean;
}

interface SCIMMetrics {
  total_users: number;
  total_groups: number;
  users_created_last_sync: number;
  users_updated_last_sync: number;
  users_deleted_last_sync: number;
  groups_created_last_sync: number;
  groups_updated_last_sync: number;
  groups_deleted_last_sync: number;
}

export default function SCIMStatus({ companyId }: SCIMStatusProps) {
  const [config, setConfig] = useState<SCIMConfig | null>(null);
  const [syncStatus, setSyncStatus] = useState<SCIMSyncStatus | null>(null);
  const [metrics, setMetrics] = useState<SCIMMetrics | null>(null);
  const [errors, setErrors] = useState<SCIMError[]>([]);
  const [loading, setLoading] = useState(true);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    fetchSCIMData();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchSCIMData, 30000);
    return () => clearInterval(interval);
  }, [companyId]);

  async function fetchSCIMData() {
    try {
      // TODO: Fetch from Worker-1 platform API
      // For now, use mock data
      setConfig(getMockSCIMConfig());
      setSyncStatus(getMockSyncStatus());
      setMetrics(getMockMetrics());
      setErrors(getMockErrors());
    } catch (error) {
      console.error('Failed to fetch SCIM data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="scim-status loading">Loading SCIM status...</div>;
  }

  if (!config) {
    return <div className="scim-status">No SCIM configuration found</div>;
  }

  return (
    <div className="scim-status">
      {/* Status Banner */}
      {!config.enabled && (
        <div className="alert-warning">
          <strong>SCIM Provisioning is Disabled</strong>
          <p>User and group synchronization is currently turned off. Contact your administrator to enable SCIM.</p>
        </div>
      )}

      {syncStatus?.last_sync_status === 'failed' && (
        <div className="alert-error">
          <strong>Last Sync Failed</strong>
          <p>
            SCIM synchronization encountered errors. Check the error log below for details.
          </p>
        </div>
      )}

      {/* Configuration Summary */}
      <div className="config-summary">
        <div className="summary-card">
          <div className="card-icon">🔗</div>
          <div className="card-content">
            <h4>SCIM Endpoint</h4>
            <code className="endpoint">{config.endpoint}</code>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">⏱️</div>
          <div className="card-content">
            <h4>Sync Frequency</h4>
            <p className="value">Every {config.sync_frequency_minutes} minutes</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon">⚙️</div>
          <div className="card-content">
            <h4>Supported Operations</h4>
            <div className="operations">
              {config.supported_operations.map((op) => (
                <span key={op} className="operation-badge">
                  {op}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status */}
      {syncStatus && (
        <div className="sync-status-panel">
          <h3>Latest Sync Status</h3>

          <div className="status-grid">
            <div className="status-item">
              <label>Status</label>
              <SyncStatusBadge status={syncStatus.last_sync_status} />
            </div>

            <div className="status-item">
              <label>Last Sync</label>
              <div className="value">
                {syncStatus.last_sync_at
                  ? new Date(syncStatus.last_sync_at).toLocaleString()
                  : 'Never'}
              </div>
            </div>

            <div className="status-item">
              <label>Next Sync</label>
              <div className="value">
                {syncStatus.next_sync_at
                  ? new Date(syncStatus.next_sync_at).toLocaleString()
                  : '—'}
              </div>
            </div>

            <div className="status-item">
              <label>Duration</label>
              <div className="value">{syncStatus.duration_ms}ms</div>
            </div>

            <div className="status-item">
              <label>Users Synced</label>
              <div className="value large">{syncStatus.users_synced}</div>
            </div>

            <div className="status-item">
              <label>Groups Synced</label>
              <div className="value large">{syncStatus.groups_synced}</div>
            </div>

            <div className="status-item">
              <label>Errors</label>
              <div className={`value large ${syncStatus.errors_count > 0 ? 'error' : ''}`}>
                {syncStatus.errors_count}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      {metrics && (
        <div className="metrics-panel">
          <h3>Provisioning Metrics</h3>

          <div className="metrics-grid">
            <div className="metric-card">
              <h4>Total Users</h4>
              <div className="metric-value">{metrics.total_users}</div>
              <div className="metric-changes">
                <span className="change created">+{metrics.users_created_last_sync} created</span>
                <span className="change updated">~{metrics.users_updated_last_sync} updated</span>
                <span className="change deleted">-{metrics.users_deleted_last_sync} deleted</span>
              </div>
            </div>

            <div className="metric-card">
              <h4>Total Groups</h4>
              <div className="metric-value">{metrics.total_groups}</div>
              <div className="metric-changes">
                <span className="change created">+{metrics.groups_created_last_sync} created</span>
                <span className="change updated">~{metrics.groups_updated_last_sync} updated</span>
                <span className="change deleted">-{metrics.groups_deleted_last_sync} deleted</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Log */}
      {errors.length > 0 && (
        <div className="errors-panel">
          <div className="errors-header">
            <h3>Error Log ({errors.length})</h3>
            <button onClick={() => setShowErrors(!showErrors)} className="toggle-btn">
              {showErrors ? 'Hide Errors' : 'Show Errors'}
            </button>
          </div>

          {showErrors && (
            <div className="errors-list">
              {errors.map((error) => (
                <div key={error.id} className={`error-item ${error.resolved ? 'resolved' : ''}`}>
                  <div className="error-header">
                    <span className="error-type">{error.error_type}</span>
                    <span className="error-resource">
                      {error.resource_type}: {error.resource_id || 'unknown'}
                    </span>
                    <span className="error-timestamp">
                      {new Date(error.timestamp).toLocaleString()}
                    </span>
                    {error.resolved && <span className="resolved-badge">✓ Resolved</span>}
                  </div>
                  <p className="error-message">{error.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .scim-status {
          background: white;
        }

        .alert-warning,
        .alert-error {
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .alert-warning {
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-left: 4px solid #f59e0b;
        }

        .alert-error {
          background: #fee2e2;
          border: 1px solid #fca5a5;
          border-left: 4px solid #ef4444;
        }

        .alert-warning strong,
        .alert-error strong {
          display: block;
          margin-bottom: 4px;
        }

        .alert-warning strong {
          color: #92400e;
        }

        .alert-error strong {
          color: #991b1b;
        }

        .alert-warning p,
        .alert-error p {
          margin: 0;
        }

        .alert-warning p {
          color: #78350f;
        }

        .alert-error p {
          color: #7f1d1d;
        }

        .config-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 32px;
        }

        .summary-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .card-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .card-content {
          flex: 1;
        }

        .card-content h4 {
          margin: 0 0 8px;
          font-size: 0.875rem;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .card-content .value {
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .endpoint {
          display: block;
          background: #e5e7eb;
          padding: 8px 12px;
          border-radius: 6px;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          word-break: break-all;
        }

        .operations {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .operation-badge {
          background: #dbeafe;
          color: #1e40af;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.8125rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .sync-status-panel,
        .metrics-panel,
        .errors-panel {
          background: white;
          padding: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .sync-status-panel h3,
        .metrics-panel h3,
        .errors-panel h3 {
          margin-top: 0;
          margin-bottom: 20px;
        }

        .status-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 20px;
        }

        .status-item label {
          display: block;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .status-item .value {
          font-size: 1rem;
          color: #111827;
        }

        .status-item .value.large {
          font-size: 2rem;
          font-weight: 700;
        }

        .status-item .value.error {
          color: #dc2626;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 24px;
        }

        .metric-card {
          background: #f9fafb;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .metric-card h4 {
          margin: 0 0 12px;
          font-size: 0.875rem;
          color: #6b7280;
          text-transform: uppercase;
        }

        .metric-value {
          font-size: 3rem;
          font-weight: 700;
          color: #2563eb;
          margin-bottom: 16px;
        }

        .metric-changes {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .change {
          font-size: 0.875rem;
          font-weight: 600;
        }

        .change.created {
          color: #059669;
        }

        .change.updated {
          color: #3b82f6;
        }

        .change.deleted {
          color: #dc2626;
        }

        .errors-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .toggle-btn {
          padding: 8px 16px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
        }

        .toggle-btn:hover {
          background: #e5e7eb;
        }

        .errors-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .error-item {
          background: #fef2f2;
          border: 1px solid #fca5a5;
          border-left: 4px solid #dc2626;
          padding: 16px;
          border-radius: 6px;
        }

        .error-item.resolved {
          background: #f3f4f6;
          border-color: #d1d5db;
          border-left-color: #10b981;
          opacity: 0.7;
        }

        .error-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .error-type {
          background: #dc2626;
          color: white;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .error-resource {
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          font-family: 'Courier New', monospace;
        }

        .error-timestamp {
          color: #6b7280;
          font-size: 0.8125rem;
        }

        .resolved-badge {
          color: #10b981;
          font-weight: 600;
          margin-left: auto;
        }

        .error-message {
          margin: 0;
          color: #7f1d1d;
          font-size: 0.9375rem;
        }

        @media (max-width: 768px) {
          .config-summary,
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .status-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Sync Status Badge Component
 */
function SyncStatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    success: { bg: '#d1fae5', text: '#065f46' },
    failed: { bg: '#fee2e2', text: '#991b1b' },
    in_progress: { bg: '#fef3c7', text: '#92400e' },
    never: { bg: '#e5e7eb', text: '#374151' },
  };

  const labels: Record<string, string> = {
    success: '✓ Success',
    failed: '✗ Failed',
    in_progress: '⟳ In Progress',
    never: '— Never Synced',
  };

  const color = colors[status] || colors.never;

  return (
    <span
      className="sync-status-badge"
      style={{ backgroundColor: color.bg, color: color.text }}
    >
      {labels[status]}
      <style jsx>{`
        .sync-status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
        }
      `}</style>
    </span>
  );
}

/**
 * Mock data functions (replace with real API calls to Worker-1)
 */
function getMockSCIMConfig(): SCIMConfig {
  return {
    enabled: true,
    endpoint: 'https://teei.platform/api/scim/v2',
    sync_frequency_minutes: 15,
    supported_operations: ['CREATE', 'UPDATE', 'DELETE', 'PATCH'],
  };
}

function getMockSyncStatus(): SCIMSyncStatus {
  return {
    last_sync_at: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    last_sync_status: 'success',
    next_sync_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
    users_synced: 247,
    groups_synced: 12,
    errors_count: 0,
    duration_ms: 3420,
  };
}

function getMockMetrics(): SCIMMetrics {
  return {
    total_users: 247,
    total_groups: 12,
    users_created_last_sync: 3,
    users_updated_last_sync: 12,
    users_deleted_last_sync: 1,
    groups_created_last_sync: 0,
    groups_updated_last_sync: 2,
    groups_deleted_last_sync: 0,
  };
}

function getMockErrors(): SCIMError[] {
  return [
    {
      id: '1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      error_type: 'DUPLICATE_EMAIL',
      message: 'User with email john.doe@company.com already exists',
      resource_type: 'user',
      resource_id: 'user-12345',
      resolved: true,
    },
  ];
}
