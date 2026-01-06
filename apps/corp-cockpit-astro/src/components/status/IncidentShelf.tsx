/**
 * Incident Shelf Component
 *
 * Expandable panel displaying active incidents with severity, affected components,
 * and estimated resolution times. Sortable by severity.
 *
 * @module components/status/IncidentShelf
 */

import React, { useState, useEffect } from 'react';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedComponents: string[];
  impact: string;
  startTime: string;
  estimatedResolution?: string;
  runbookUrl?: string;
}

interface IncidentShelfProps {
  isOpen?: boolean;
  onToggle?: () => void;
  statusPageUrl?: string;
}

export default function IncidentShelf({
  isOpen: controlledIsOpen,
  onToggle,
  statusPageUrl = 'https://status.example.com',
}: IncidentShelfProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Use controlled or internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const handleToggle = onToggle || (() => setInternalIsOpen(!internalIsOpen));

  useEffect(() => {
    fetchIncidents();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchIncidents, 30000);
    return () => clearInterval(interval);
  }, []);

  async function fetchIncidents() {
    try {
      // TODO: Replace with actual Worker 1/2 API endpoint
      // const response = await fetch('/api/status/incidents');
      // const data = await response.json();

      const mockIncidents = getMockIncidents();
      setIncidents(mockIncidents);
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
    } finally {
      setLoading(false);
    }
  }

  // Sort incidents by severity (Critical > High > Medium > Low)
  const sortedIncidents = [...incidents].sort((a, b) => {
    const severityOrder: Record<IncidentSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const activeIncidents = sortedIncidents.filter((inc) => inc.status !== 'resolved');

  // Don't render if no active incidents
  if (!loading && activeIncidents.length === 0) {
    return null;
  }

  return (
    <div className="incident-shelf-container">
      {/* Toggle Button */}
      <button
        className="shelf-toggle"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls="incident-shelf"
        aria-label={isOpen ? 'Hide incident details' : 'Show incident details'}
      >
        <span className="toggle-icon">{isOpen ? '▼' : '▶'}</span>
        <span className="toggle-text">
          {activeIncidents.length} Active Incident{activeIncidents.length !== 1 ? 's' : ''}
        </span>
        <span className="severity-indicator">
          {activeIncidents.some((i) => i.severity === 'critical') && (
            <span className="severity-badge critical" aria-label="Critical incidents present">
              Critical
            </span>
          )}
          {activeIncidents.some((i) => i.severity === 'high') && !activeIncidents.some((i) => i.severity === 'critical') && (
            <span className="severity-badge high" aria-label="High severity incidents present">
              High
            </span>
          )}
        </span>
      </button>

      {/* Incident Panel */}
      {isOpen && (
        <div
          id="incident-shelf"
          className="incident-panel"
          role="region"
          aria-live="polite"
          aria-label="Active incidents"
        >
          {loading ? (
            <div className="panel-loading">
              <div className="spinner"></div>
              <p>Loading incident details...</p>
            </div>
          ) : (
            <>
              <div className="incidents-list">
                {activeIncidents.map((incident) => (
                  <IncidentCard key={incident.id} incident={incident} />
                ))}
              </div>

              {statusPageUrl && (
                <div className="panel-footer">
                  <a
                    href={statusPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="status-page-link"
                  >
                    View Full Status Page →
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .incident-shelf-container {
          width: 100%;
        }

        .shelf-toggle {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-left: 4px solid #f59e0b;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.9375rem;
          font-weight: 600;
          color: #92400e;
        }

        .shelf-toggle:hover {
          background: #fde68a;
        }

        .shelf-toggle:focus {
          outline: 2px solid #f59e0b;
          outline-offset: 2px;
        }

        .toggle-icon {
          font-size: 0.875rem;
          transition: transform 0.2s;
        }

        .toggle-text {
          flex: 1;
          text-align: left;
        }

        .severity-indicator {
          display: flex;
          gap: 8px;
        }

        .severity-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .severity-badge.critical {
          background: #7f1d1d;
          color: #fee2e2;
        }

        .severity-badge.high {
          background: #9a3412;
          color: #fed7aa;
        }

        .incident-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-top: none;
          animation: slideDown 0.3s ease-out;
          overflow: hidden;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            max-height: 0;
          }
          to {
            opacity: 1;
            max-height: 1000px;
          }
        }

        .panel-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          gap: 16px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .incidents-list {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .panel-footer {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
          text-align: center;
        }

        .status-page-link {
          color: #2563eb;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9375rem;
          transition: color 0.2s;
        }

        .status-page-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .shelf-toggle {
            padding: 12px 16px;
            font-size: 0.875rem;
          }

          .severity-indicator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Incident Card Component
 */
function IncidentCard({ incident }: { incident: Incident }) {
  const severityConfig = getSeverityConfig(incident.severity);
  const statusConfig = getStatusConfig(incident.status);

  return (
    <div className={`incident-card severity-${incident.severity}`}>
      <div className="card-header">
        <div className="incident-id">{incident.id}</div>
        <div className="badges">
          <span className={`severity-badge severity-${incident.severity}`}>
            {incident.severity}
          </span>
          <span className={`status-badge status-${incident.status}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      <h4 className="incident-title">{incident.title}</h4>

      <div className="incident-details">
        <div className="detail-row">
          <span className="detail-label">Affected Components:</span>
          <span className="detail-value">
            {incident.affectedComponents.join(', ')}
          </span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Impact:</span>
          <span className="detail-value">{incident.impact}</span>
        </div>

        <div className="detail-row">
          <span className="detail-label">Started:</span>
          <span className="detail-value">
            {formatTimestamp(new Date(incident.startTime))}
          </span>
        </div>

        {incident.estimatedResolution && (
          <div className="detail-row">
            <span className="detail-label">Est. Resolution:</span>
            <span className="detail-value">
              {formatTimestamp(new Date(incident.estimatedResolution))}
            </span>
          </div>
        )}
      </div>

      {incident.runbookUrl && (
        <div className="card-footer">
          <a
            href={incident.runbookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="runbook-link"
          >
            View Runbook →
          </a>
        </div>
      )}

      <style jsx>{`
        .incident-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .incident-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .incident-card.severity-critical {
          border-left: 4px solid #dc2626;
          background: linear-gradient(90deg, #fef2f2 0%, white 20px);
        }

        .incident-card.severity-high {
          border-left: 4px solid #f97316;
          background: linear-gradient(90deg, #fff7ed 0%, white 20px);
        }

        .incident-card.severity-medium {
          border-left: 4px solid #f59e0b;
          background: linear-gradient(90deg, #fffbeb 0%, white 20px);
        }

        .incident-card.severity-low {
          border-left: 4px solid #3b82f6;
          background: linear-gradient(90deg, #eff6ff 0%, white 20px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .incident-id {
          font-family: 'Courier New', monospace;
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6b7280;
        }

        .badges {
          display: flex;
          gap: 8px;
        }

        .severity-badge,
        .status-badge {
          padding: 3px 8px;
          border-radius: 10px;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .severity-badge.severity-critical {
          background: #fef2f2;
          color: #991b1b;
        }

        .severity-badge.severity-high {
          background: #fff7ed;
          color: #9a3412;
        }

        .severity-badge.severity-medium {
          background: #fffbeb;
          color: #92400e;
        }

        .severity-badge.severity-low {
          background: #eff6ff;
          color: #1e40af;
        }

        .status-badge.status-investigating {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.status-identified {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.status-monitoring {
          background: #e0e7ff;
          color: #3730a3;
        }

        .status-badge.status-resolved {
          background: #d1fae5;
          color: #065f46;
        }

        .incident-title {
          margin: 0 0 12px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          line-height: 1.4;
        }

        .incident-details {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 12px;
        }

        .detail-row {
          display: flex;
          gap: 8px;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .detail-label {
          font-weight: 600;
          color: #6b7280;
          min-width: 140px;
          flex-shrink: 0;
        }

        .detail-value {
          color: #374151;
        }

        .card-footer {
          padding-top: 12px;
          border-top: 1px solid #f3f4f6;
        }

        .runbook-link {
          color: #2563eb;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          transition: color 0.2s;
        }

        .runbook-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .card-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .detail-row {
            flex-direction: column;
            gap: 2px;
          }

          .detail-label {
            min-width: auto;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function getSeverityConfig(severity: IncidentSeverity) {
  const configs = {
    critical: { color: '#dc2626', bgColor: '#fef2f2' },
    high: { color: '#f97316', bgColor: '#fff7ed' },
    medium: { color: '#f59e0b', bgColor: '#fffbeb' },
    low: { color: '#3b82f6', bgColor: '#eff6ff' },
  };
  return configs[severity];
}

function getStatusConfig(status: IncidentStatus) {
  const configs = {
    investigating: { label: 'Investigating', color: '#f59e0b' },
    identified: { label: 'Identified', color: '#3b82f6' },
    monitoring: { label: 'Monitoring', color: '#6366f1' },
    resolved: { label: 'Resolved', color: '#10b981' },
  };
  return configs[status];
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Mock data function (replace with real API calls)
 */
function getMockIncidents(): Incident[] {
  const now = new Date();

  // Most of the time, return no incidents
  if (Math.random() > 0.3) {
    return [];
  }

  return [
    {
      id: 'INC-2024-001',
      title: 'Elevated API latency in Reporting service',
      severity: 'medium',
      status: 'monitoring',
      affectedComponents: ['Reporting API', 'Dashboard'],
      impact: 'Users may experience slower report generation times (2-3s instead of <500ms)',
      startTime: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
      estimatedResolution: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      runbookUrl: '/docs/runbooks/api-latency',
    },
  ];
}
