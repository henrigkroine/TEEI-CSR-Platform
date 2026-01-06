import { useMemo, useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { fetchComplianceAlerts } from '../../api/dashboard';
import { useSSEConnection, useSSEMessage } from '../../hooks/useSSEConnection';

type Severity = 'info' | 'warning' | 'fyi';
type AlertCategory = 'Policy Drift' | 'Missing Documents' | 'Deadline Risk';

interface Alert {
  id: string;
  title: string;
  summary?: string;
  type: AlertCategory;
  owner: string;
  due: string;
  severity: Severity;
}

interface Props {
  companyId?: string; // Optional to handle undefined during SSR/hydration
  alerts?: Alert[]; // Optional for backward compatibility
  filters?: string[]; // Optional for backward compatibility
  enableSSE?: boolean;
}

const defaultAlerts: Alert[] = [
  {
    id: 'a1',
    title: 'Consent policy exceeds 45-day freshness window',
    summary: 'Need revised consent language for STEM Equity Labs hybrid delivery.',
    type: 'Policy Drift',
    owner: 'Compliance',
    due: 'Mar 18',
    severity: 'warning',
  },
  {
    id: 'a2',
    title: 'AI writer evidence pack incomplete',
    summary: 'Upload 3 additional transcripts linked to Upskilling Ukraine brief.',
    type: 'Missing Documents',
    owner: 'Impact Studio',
    due: 'Mar 20',
    severity: 'fyi',
  },
  {
    id: 'a3',
    title: 'Policy attestation requires signature',
    summary: 'Executive sponsor signature missing for WEEI Mobility payout.',
    type: 'Deadline Risk',
    owner: 'Legal',
    due: 'Mar 22',
    severity: 'warning',
  },
];

const defaultFilters = ['All', 'Policy Drift', 'Missing Documents', 'Deadline Risk'];

const severityConfig: Record<Severity, { label: string; class: string }> = {
  warning: { label: 'Warning', class: 'severity-warning' },
  fyi: { label: 'FYI', class: 'severity-fyi' },
  info: { label: 'Info', class: 'severity-info' },
};

export default function ComplianceAlerts({
  companyId,
  alerts: propAlerts,
  filters: propFilters,
  enableSSE = true
}: Props) {
  // Validate companyId - check for undefined, null, empty string, or string "undefined"
  const isValidCompanyId = companyId &&
    typeof companyId === 'string' &&
    companyId !== 'undefined' &&
    companyId !== 'null' &&
    companyId.trim() !== '';

  if (!isValidCompanyId) {
    console.error('[ComplianceAlerts] Invalid companyId:', companyId);
    return (
      <div className="compliance-alerts">
        <div className="alert alert-error">
          Invalid company ID. Please refresh the page.
        </div>
      </div>
    );
  }

  const [alerts, setAlerts] = useState<Alert[]>(propAlerts || defaultAlerts);
  const [filters, setFilters] = useState<string[]>(propFilters || defaultFilters);
  const [loading, setLoading] = useState(!propAlerts);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // SSE connection for real-time updates
  const sseConnection = useSSEConnection({
    companyId,
    channel: 'dashboard-updates',
    autoConnect: enableSSE && !!companyId,
  });

  // Subscribe to compliance updates
  useSSEMessage(sseConnection, 'compliance_updated', useCallback((updateData: any) => {
    if (updateData.companyId === companyId) {
      console.log('[ComplianceAlerts] Refreshing due to SSE update');
      fetchData(true);
    }
  }, [companyId]));

  const fetchData = useCallback(async (skipCache = false) => {
    // If alerts provided as prop, use them (backward compatibility)
    if (propAlerts) {
      setAlerts(propAlerts);
      setFilters(propFilters || defaultFilters);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await fetchComplianceAlerts(companyId);

      setAlerts(data.alerts);
      setFilters(data.filters);
    } catch (err) {
      console.error('[ComplianceAlerts] Error fetching alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to load compliance alerts');
      // Fallback to empty alerts on error
      setAlerts([]);
      setFilters(defaultFilters);
    } finally {
      setLoading(false);
    }
  }, [companyId, propAlerts, propFilters]);

  useEffect(() => {
    // Only fetch if companyId is valid
    const isValidCompanyId = companyId &&
      typeof companyId === 'string' &&
      companyId !== 'undefined' &&
      companyId !== 'null' &&
      companyId.trim() !== '';

    if (isValidCompanyId) {
      fetchData();
    }
  }, [fetchData, companyId]);

  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchData(true);
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [fetchData]);

  const visibleAlerts = useMemo(() => {
    if (activeFilter === 'All') return alerts;
    return alerts.filter((alert) => alert.type === activeFilter);
  }, [activeFilter, alerts]);

  if (loading) {
    return (
      <section className="compliance-section compliance-section-loading">
        <div className="section-header">
          <div className="section-header-content">
            <div className="section-title-row">
              <h2 className="section-title">Compliance Alerts</h2>
              <span className="alert-count">...</span>
            </div>
            <p className="section-subtitle">Loading compliance alerts...</p>
          </div>
        </div>
        <div className="loading-placeholder">
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
          <div className="skeleton-row"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="compliance-section compliance-section-error">
        <div className="section-header">
          <div className="section-header-content">
            <div className="section-title-row">
              <h2 className="section-title">Compliance Alerts</h2>
            </div>
            <p className="section-subtitle error-message">{error}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="compliance-section">
      {/* Header */}
      <div className="section-header">
        <div className="section-header-content">
          <div className="section-title-row">
            <h2 className="section-title">Compliance Alerts</h2>
            <span className={clsx(
              'alert-count',
              alerts.filter(a => a.severity === 'warning').length > 0 && 'has-warnings'
            )}>
              {alerts.length}
            </span>
            {sseConnection.isConnected && (
              <span className="sse-indicator" title="Real-time updates active">
                <span className="sse-dot"></span>
              </span>
            )}
          </div>
          <p className="section-subtitle">Active policy issues and documentation gaps</p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="filter-bar">
        {filters.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={clsx('filter-chip', activeFilter === filter && 'active')}
          >
            {filter}
            {filter !== 'All' && (
              <span className="filter-count">
                {alerts.filter(a => a.type === filter).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts Table */}
      <div className="alerts-container">
        {visibleAlerts.length > 0 ? (
          <table className="alerts-table">
            <thead>
              <tr>
                <th>Alert</th>
                <th>Category</th>
                <th>Owner</th>
                <th>Due</th>
                <th>Severity</th>
              </tr>
            </thead>
            <tbody>
              {visibleAlerts.map((alert, index) => {
                const severity = severityConfig[alert.severity] || severityConfig.fyi;
                return (
                  <tr key={alert.id} className={clsx(index % 2 === 1 && 'row-alt')}>
                    <td className="alert-cell">
                      <div className="alert-content">
                        <span className="alert-title">{alert.title}</span>
                        {alert.summary && (
                          <span className="alert-summary">{alert.summary}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="category-badge">{alert.type}</span>
                    </td>
                    <td className="owner-cell">{alert.owner}</td>
                    <td className="due-cell">{alert.due}</td>
                    <td>
                      <span className={clsx('severity-badge', severity.class)}>
                        {severity.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <svg className="empty-icon" viewBox="0 0 48 48" aria-hidden="true">
              <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="2"/>
              <path d="M18 24l4 4 8-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="empty-title">All clear!</p>
            <p className="empty-description">No alerts match the selected filter.</p>
          </div>
        )}
      </div>

      <style>{`
        .compliance-section {
          background: var(--color-surface);
          border-radius: var(--card-radius);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }

        .section-header {
          padding: var(--space-5);
          border-bottom: 1px solid var(--color-border-subtle);
          background: var(--color-surface-alt);
        }

        .section-title-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .section-title {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-caps);
          color: var(--color-text-tertiary);
          margin: 0;
        }

        .alert-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: var(--radius-pill);
          background: var(--color-muted);
          color: var(--color-text-secondary);
          font-size: 11px;
          font-weight: var(--font-weight-bold);
        }

        .alert-count.has-warnings {
          background: var(--color-accent);
          color: var(--color-text-on-accent);
        }

        .section-subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-top: var(--space-1);
        }

        .filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
          padding: var(--space-4) var(--space-5);
          border-bottom: 1px solid var(--color-border-subtle);
        }

        .filter-chip {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-pill);
          border: 1px solid var(--color-border);
          background: transparent;
          font-size: var(--text-xs);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-secondary);
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .filter-chip:hover {
          border-color: var(--color-border-strong);
          background: var(--color-surface-alt);
        }

        .filter-chip.active {
          border-color: var(--color-accent);
          background: var(--color-accent-muted);
          color: var(--color-accent-dark);
        }

        .filter-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: var(--radius-pill);
          background: var(--color-muted);
          font-size: 10px;
          font-weight: var(--font-weight-bold);
          color: var(--color-text-tertiary);
        }

        .filter-chip.active .filter-count {
          background: var(--color-accent);
          color: var(--color-text-on-accent);
        }

        .alerts-container {
          max-height: 340px;
          overflow-y: auto;
        }

        .alerts-table {
          width: 100%;
          border-collapse: collapse;
        }

        .alerts-table thead {
          position: sticky;
          top: 0;
          z-index: 1;
        }

        .alerts-table th {
          padding: var(--space-3) var(--space-4);
          text-align: left;
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-caps);
          color: var(--color-text-tertiary);
          background: var(--color-surface-alt);
          border-bottom: 1px solid var(--color-border);
        }

        .alerts-table td {
          padding: var(--space-4);
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          border-bottom: 1px solid var(--color-border-subtle);
          vertical-align: top;
        }

        .alerts-table tbody tr {
          transition: background var(--duration-fast) var(--ease-out);
        }

        .alerts-table tbody tr.row-alt {
          background: var(--color-muted);
        }

        .alerts-table tbody tr:hover {
          background: var(--color-accent-muted);
        }

        .alert-cell {
          max-width: 280px;
        }

        .alert-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .alert-title {
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          line-height: var(--leading-snug);
        }

        .alert-summary {
          font-size: var(--text-xs);
          color: var(--color-text-tertiary);
          line-height: var(--leading-normal);
        }

        .category-badge {
          display: inline-flex;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          background: var(--color-muted);
          font-size: var(--text-xs);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-secondary);
          white-space: nowrap;
        }

        .owner-cell {
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
          white-space: nowrap;
        }

        .due-cell {
          white-space: nowrap;
        }

        .severity-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 12px;
          border-radius: var(--radius-pill);
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-wider);
        }

        .severity-warning {
          background: var(--color-accent);
          color: var(--color-text-on-accent);
        }

        .severity-fyi {
          background: transparent;
          border: 1px solid var(--color-primary);
          color: var(--color-primary);
        }

        .severity-info {
          background: var(--color-info-light);
          color: var(--color-info);
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-12);
          text-align: center;
        }

        .empty-icon {
          width: 48px;
          height: 48px;
          color: var(--color-success);
          margin-bottom: var(--space-4);
        }

        .empty-title {
          font-size: var(--text-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin: 0 0 var(--space-1);
        }

        .empty-description {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }

        .compliance-section-loading,
        .compliance-section-error {
          min-height: 200px;
        }

        .loading-placeholder {
          padding: var(--space-4);
        }

        .skeleton-row {
          height: 60px;
          background: var(--color-muted);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-2);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .error-message {
          color: var(--color-error);
        }

        .sse-indicator {
          display: inline-flex;
          align-items: center;
          margin-left: var(--space-2);
        }

        .sse-dot {
          display: block;
          width: 6px;
          height: 6px;
          border-radius: var(--radius-pill);
          background: var(--color-success);
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 768px) {
          .alerts-table {
            display: block;
          }

          .alerts-table thead {
            display: none;
          }

          .alerts-table tbody {
            display: block;
          }

          .alerts-table tr {
            display: flex;
            flex-direction: column;
            padding: var(--space-4);
            border-bottom: 1px solid var(--color-border-subtle);
          }

          .alerts-table td {
            padding: var(--space-1) 0;
            border: none;
          }

          .alert-cell {
            max-width: none;
          }

          .alerts-table td:before {
            content: attr(data-label);
            font-size: var(--text-xs);
            font-weight: var(--font-weight-semibold);
            text-transform: uppercase;
            letter-spacing: var(--tracking-caps);
            color: var(--color-text-tertiary);
            display: block;
            margin-bottom: var(--space-1);
          }
        }
      `}</style>
    </section>
  );
}

// Re-export the named version for backward compatibility
export { ComplianceAlerts };
