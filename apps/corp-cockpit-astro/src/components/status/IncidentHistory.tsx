/**
 * Incident History Component
 *
 * Displays timeline of past incidents with timestamps, resolution times,
 * and root cause summaries.
 *
 * @module components/status/IncidentHistory
 */

import React, { useState, useEffect } from 'react';

export type IncidentSeverity = 'minor' | 'major' | 'critical';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedServices: string[];
  startedAt: string;
  resolvedAt?: string;
  rootCause?: string;
  resolution?: string;
  updates: IncidentUpdate[];
}

interface IncidentUpdate {
  id: string;
  timestamp: string;
  status: IncidentStatus;
  message: string;
  author: string;
}

interface IncidentHistoryData {
  incidents: Incident[];
  lastUpdate: string;
}

export default function IncidentHistory() {
  const [data, setData] = useState<IncidentHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedIncident, setExpandedIncident] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    fetchIncidentHistory();
  }, []);

  async function fetchIncidentHistory() {
    try {
      // TODO: Fetch from Worker-1 incident management API
      // For now, use mock data
      const mockData = getMockIncidentHistory();
      setData(mockData);
    } catch (error) {
      console.error('Failed to fetch incident history:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="incident-history loading">
        <div className="loading-spinner"></div>
        <p>Loading incident history...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="incident-history error">
        <p>Unable to load incident history. Please try again later.</p>
      </div>
    );
  }

  // Filter incidents
  const filteredIncidents = data.incidents.filter((incident) => {
    if (filter === 'active') return incident.status !== 'resolved';
    if (filter === 'resolved') return incident.status === 'resolved';
    return true;
  });

  return (
    <div className="incident-history">
      {/* Header */}
      <div className="history-header">
        <div>
          <h3>Incident History</h3>
          <p className="subtitle">
            Past incidents, resolutions, and post-mortem summaries
          </p>
        </div>
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All ({data.incidents.length})
          </button>
          <button
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            Active ({data.incidents.filter((i) => i.status !== 'resolved').length})
          </button>
          <button
            className={filter === 'resolved' ? 'active' : ''}
            onClick={() => setFilter('resolved')}
          >
            Resolved ({data.incidents.filter((i) => i.status === 'resolved').length})
          </button>
        </div>
      </div>

      {/* Timeline */}
      {filteredIncidents.length === 0 ? (
        <div className="no-incidents">
          <p>No incidents found for the selected filter.</p>
        </div>
      ) : (
        <div className="incidents-timeline">
          {filteredIncidents.map((incident) => (
            <IncidentCard
              key={incident.id}
              incident={incident}
              expanded={expandedIncident === incident.id}
              onToggle={() =>
                setExpandedIncident(expandedIncident === incident.id ? null : incident.id)
              }
            />
          ))}
        </div>
      )}

      <style jsx>{`
        .incident-history {
          width: 100%;
        }

        .loading,
        .error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          gap: 16px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          gap: 24px;
        }

        h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          color: #111827;
        }

        .subtitle {
          margin: 0;
          font-size: 0.9375rem;
          color: #6b7280;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 8px;
        }

        .filter-buttons button {
          padding: 8px 16px;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .filter-buttons button:hover {
          color: #111827;
        }

        .filter-buttons button.active {
          background: white;
          color: #2563eb;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .no-incidents {
          text-align: center;
          padding: 48px 24px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          color: #6b7280;
        }

        .incidents-timeline {
          position: relative;
          padding-left: 32px;
        }

        .incidents-timeline::before {
          content: '';
          position: absolute;
          left: 8px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e5e7eb;
        }

        @media (max-width: 768px) {
          .history-header {
            flex-direction: column;
          }

          .filter-buttons {
            width: 100%;
            justify-content: stretch;
          }

          .filter-buttons button {
            flex: 1;
            font-size: 0.8125rem;
            padding: 8px 12px;
          }

          .incidents-timeline {
            padding-left: 24px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Incident Card Component
 */
function IncidentCard({
  incident,
  expanded,
  onToggle,
}: {
  incident: Incident;
  expanded: boolean;
  onToggle: () => void;
}) {
  const resolutionTime = incident.resolvedAt
    ? calculateResolutionTime(incident.startedAt, incident.resolvedAt)
    : null;

  return (
    <div className={`incident-card severity-${incident.severity}`}>
      {/* Timeline dot */}
      <div className="timeline-dot"></div>

      {/* Card header */}
      <div className="card-header" onClick={onToggle}>
        <div className="header-left">
          <div className="severity-badge">{incident.severity}</div>
          <div className="status-badge status-${incident.status}">{getStatusLabel(incident.status)}</div>
        </div>
        <div className="header-content">
          <h4 className="incident-title">{incident.title}</h4>
          <div className="incident-meta">
            <span className="timestamp">{formatTimestamp(new Date(incident.startedAt))}</span>
            {resolutionTime && (
              <>
                <span className="separator">•</span>
                <span className="resolution-time">Resolved in {resolutionTime}</span>
              </>
            )}
          </div>
        </div>
        <button className="expand-btn" aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? '−' : '+'}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="card-content">
          <div className="incident-description">
            <p>{incident.description}</p>
          </div>

          {incident.affectedServices.length > 0 && (
            <div className="affected-services">
              <strong>Affected Services:</strong>
              <div className="service-tags">
                {incident.affectedServices.map((service) => (
                  <span key={service} className="service-tag">
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {incident.rootCause && (
            <div className="root-cause">
              <strong>Root Cause:</strong>
              <p>{incident.rootCause}</p>
            </div>
          )}

          {incident.resolution && (
            <div className="resolution">
              <strong>Resolution:</strong>
              <p>{incident.resolution}</p>
            </div>
          )}

          {incident.updates.length > 0 && (
            <div className="incident-updates">
              <strong>Updates:</strong>
              <div className="updates-list">
                {incident.updates.map((update) => (
                  <div key={update.id} className="update-item">
                    <div className="update-header">
                      <span className="update-status">{getStatusLabel(update.status)}</span>
                      <span className="update-timestamp">
                        {formatTimestamp(new Date(update.timestamp))}
                      </span>
                    </div>
                    <p className="update-message">{update.message}</p>
                    <span className="update-author">— {update.author}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .incident-card {
          position: relative;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 16px;
          transition: all 0.2s;
        }

        .incident-card:hover {
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .incident-card.severity-critical {
          border-left: 4px solid #dc2626;
        }

        .incident-card.severity-major {
          border-left: 4px solid #f59e0b;
        }

        .incident-card.severity-minor {
          border-left: 4px solid #3b82f6;
        }

        .timeline-dot {
          position: absolute;
          left: -27px;
          top: 24px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          border: 3px solid #e5e7eb;
        }

        .incident-card.severity-critical .timeline-dot {
          border-color: #dc2626;
          background: #fee2e2;
        }

        .incident-card.severity-major .timeline-dot {
          border-color: #f59e0b;
          background: #fef3c7;
        }

        .incident-card.severity-minor .timeline-dot {
          border-color: #3b82f6;
          background: #dbeafe;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          cursor: pointer;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 100px;
        }

        .severity-badge,
        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          text-align: center;
        }

        .severity-badge {
          background: #f3f4f6;
          color: #374151;
        }

        .incident-card.severity-critical .severity-badge {
          background: #fee2e2;
          color: #991b1b;
        }

        .incident-card.severity-major .severity-badge {
          background: #fef3c7;
          color: #92400e;
        }

        .incident-card.severity-minor .severity-badge {
          background: #dbeafe;
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

        .header-content {
          flex: 1;
        }

        .incident-title {
          margin: 0 0 8px 0;
          font-size: 1.0625rem;
          font-weight: 600;
          color: #111827;
        }

        .incident-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          color: #6b7280;
        }

        .separator {
          opacity: 0.5;
        }

        .resolution-time {
          font-weight: 600;
          color: #059669;
        }

        .expand-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #d1d5db;
          background: white;
          cursor: pointer;
          font-size: 1.25rem;
          font-weight: 700;
          color: #6b7280;
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .expand-btn:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .card-content {
          padding: 0 20px 20px 20px;
          border-top: 1px solid #f3f4f6;
          animation: slideDown 0.3s ease;
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

        .incident-description {
          padding: 20px 0;
        }

        .incident-description p {
          margin: 0;
          color: #4b5563;
          line-height: 1.6;
        }

        .affected-services,
        .root-cause,
        .resolution,
        .incident-updates {
          padding: 16px 0;
          border-top: 1px solid #f3f4f6;
        }

        .affected-services strong,
        .root-cause strong,
        .resolution strong,
        .incident-updates strong {
          display: block;
          margin-bottom: 12px;
          color: #111827;
          font-size: 0.9375rem;
        }

        .service-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .service-tag {
          padding: 4px 12px;
          background: #f3f4f6;
          border-radius: 12px;
          font-size: 0.8125rem;
          color: #374151;
          font-weight: 500;
        }

        .root-cause p,
        .resolution p {
          margin: 0;
          color: #4b5563;
          line-height: 1.6;
        }

        .updates-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .update-item {
          background: #f9fafb;
          border-left: 3px solid #3b82f6;
          padding: 12px 16px;
          border-radius: 6px;
        }

        .update-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .update-status {
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          color: #2563eb;
        }

        .update-timestamp {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .update-message {
          margin: 0 0 8px 0;
          color: #374151;
          line-height: 1.5;
        }

        .update-author {
          font-size: 0.8125rem;
          color: #6b7280;
          font-style: italic;
        }

        @media (max-width: 768px) {
          .card-header {
            flex-direction: column;
            gap: 12px;
          }

          .header-left {
            flex-direction: row;
            width: 100%;
          }

          .incident-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .separator {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function getStatusLabel(status: IncidentStatus): string {
  switch (status) {
    case 'investigating':
      return 'Investigating';
    case 'identified':
      return 'Identified';
    case 'monitoring':
      return 'Monitoring';
    case 'resolved':
      return 'Resolved';
  }
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function calculateResolutionTime(startedAt: string, resolvedAt: string): string {
  const start = new Date(startedAt);
  const end = new Date(resolvedAt);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'}`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'}`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

/**
 * Mock data function (replace with real API calls to Worker-1)
 */
function getMockIncidentHistory(): IncidentHistoryData {
  const now = new Date();

  const incidents: Incident[] = [
    {
      id: 'inc-001',
      title: 'Database connection pool exhaustion',
      description:
        'Users experienced intermittent 503 errors when accessing the platform. Investigation revealed database connection pool exhaustion due to long-running queries.',
      severity: 'major',
      status: 'resolved',
      affectedServices: ['API Gateway', 'Database'],
      startedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      rootCause:
        'A batch job was running inefficient queries without pagination, holding database connections open for extended periods.',
      resolution:
        'Implemented query pagination, increased connection pool size, and added connection timeout monitoring.',
      updates: [
        {
          id: 'upd-001',
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'investigating',
          message: 'We are investigating elevated 503 errors reported by multiple users.',
          author: 'Platform Team',
        },
        {
          id: 'upd-002',
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          status: 'identified',
          message:
            'Issue identified: database connection pool exhaustion. Implementing fix.',
          author: 'Platform Team',
        },
        {
          id: 'upd-003',
          timestamp: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          status: 'resolved',
          message: 'Fix deployed. All services operating normally. Monitoring for stability.',
          author: 'Platform Team',
        },
      ],
    },
    {
      id: 'inc-002',
      title: 'Scheduled maintenance: Security patches',
      description:
        'Planned maintenance window to apply critical security patches to infrastructure.',
      severity: 'minor',
      status: 'resolved',
      affectedServices: ['All Services'],
      startedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
      resolution: 'Security patches applied successfully. All services restored.',
      updates: [
        {
          id: 'upd-004',
          timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'monitoring',
          message: 'Scheduled maintenance has begun. Platform may be unavailable.',
          author: 'Platform Team',
        },
        {
          id: 'upd-005',
          timestamp: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
          status: 'resolved',
          message: 'Maintenance completed. All systems operational.',
          author: 'Platform Team',
        },
      ],
    },
    {
      id: 'inc-003',
      title: 'Elevated API latency',
      description:
        'API response times increased to 2-3 seconds (normal: <200ms). Users experiencing slow page loads.',
      severity: 'major',
      status: 'resolved',
      affectedServices: ['API Gateway', 'Cache Layer'],
      startedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
      resolvedAt: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
      rootCause: 'Redis cache cluster failover triggered by memory pressure.',
      resolution: 'Scaled cache cluster, optimized cache eviction policy.',
      updates: [
        {
          id: 'upd-006',
          timestamp: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'investigating',
          message: 'Investigating reports of slow API response times.',
          author: 'Platform Team',
        },
        {
          id: 'upd-007',
          timestamp: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          status: 'resolved',
          message: 'Cache cluster scaled. API latency back to normal levels.',
          author: 'Platform Team',
        },
      ],
    },
  ];

  return {
    incidents,
    lastUpdate: new Date().toISOString(),
  };
}
