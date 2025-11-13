import { useState, useEffect } from 'react';
import './admin.css';

interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  severity: 'info' | 'warning' | 'error';
}

interface AuditLogProps {
  companyId: string;
  limit?: number;
}

const ACTION_ICONS: Record<string, string> = {
  CREATE: '➕',
  UPDATE: '✏️',
  DELETE: '🗑️',
  LOGIN: '🔓',
  LOGOUT: '🔒',
  API_KEY_CREATE: '🔑',
  API_KEY_REVOKE: '❌',
  INTEGRATION_ENABLE: '✓',
  INTEGRATION_DISABLE: '✗',
  WEIGHT_UPDATE: '⚖️',
  PERMISSION_CHANGE: '🛡️',
};

const SEVERITY_COLORS: Record<string, string> = {
  info: '#2196F3',
  warning: '#FF9800',
  error: '#F44336',
};

export default function AuditLog({ companyId, limit = 20 }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  useEffect(() => {
    fetchAuditLog();
  }, [companyId, page, severityFilter]);

  async function fetchAuditLog() {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: ((page - 1) * limit).toString(),
        ...(severityFilter !== 'all' && { severity: severityFilter }),
      });

      const response = await fetch(`/api/companies/${companyId}/audit-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setEntries(data.entries);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
    } finally {
      setLoading(false);
    }
  }

  function getActionIcon(action: string): string {
    return ACTION_ICONS[action] || '📋';
  }

  function formatDetails(details?: string): string {
    if (!details) return '';
    try {
      const parsed = JSON.parse(details);
      return Object.entries(parsed)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    } catch {
      return details;
    }
  }

  const filteredEntries = entries.filter(
    (entry) =>
      filter === '' ||
      entry.action.toLowerCase().includes(filter.toLowerCase()) ||
      entry.resource.toLowerCase().includes(filter.toLowerCase()) ||
      entry.userName.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading && entries.length === 0) {
    return <div className="loading">Loading audit log...</div>;
  }

  return (
    <div className="audit-log">
      <div className="audit-controls">
        <input
          type="text"
          placeholder="Filter by action, resource, or user..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="audit-search"
        />
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="audit-filter">
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>

      {filteredEntries.length === 0 ? (
        <div className="empty-state">
          <p>No audit log entries found.</p>
        </div>
      ) : (
        <div className="audit-entries">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className={`audit-entry severity-${entry.severity}`}>
              <div className="audit-entry-header">
                <span className="action-icon">{getActionIcon(entry.action)}</span>
                <div className="audit-meta">
                  <strong className="action-name">{entry.action}</strong>
                  <span className="resource-name">{entry.resource}</span>
                  {entry.resourceId && <code className="resource-id">{entry.resourceId}</code>}
                </div>
                <time className="audit-timestamp">
                  {new Date(entry.timestamp).toLocaleString()}
                </time>
              </div>

              <div className="audit-entry-body">
                <div className="audit-user">
                  <span className="user-name">{entry.userName}</span>
                  <span className="user-role">({entry.userRole})</span>
                  {entry.ipAddress && <span className="ip-address">from {entry.ipAddress}</span>}
                </div>

                {entry.details && (
                  <div className="audit-details">
                    <strong>Details:</strong> {formatDetails(entry.details)}
                  </div>
                )}
              </div>

              <div
                className="severity-indicator"
                style={{ backgroundColor: SEVERITY_COLORS[entry.severity] }}
              />
            </div>
          ))}
        </div>
      )}

      {(page > 1 || hasMore) && (
        <div className="audit-pagination">
          <button
            className="btn btn-secondary"
            onClick={() => setPage(page - 1)}
            disabled={page === 1 || loading}
          >
            ← Previous
          </button>
          <span className="page-indicator">Page {page}</span>
          <button
            className="btn btn-secondary"
            onClick={() => setPage(page + 1)}
            disabled={!hasMore || loading}
          >
            Next →
          </button>
        </div>
      )}

      <div className="audit-footer">
        Showing {filteredEntries.length} of {entries.length} entries
      </div>
    </div>
  );
}
