/**
 * Approval History Component
 *
 * Dedicated timeline view for approval audit trail
 * - Chronological list of all approval events
 * - User actions, timestamps, comments
 * - Filterable by action type
 * - Exportable audit log
 *
 * @module components/reports/ApprovalHistory
 */

import React, { useState, useMemo } from 'react';

interface ApprovalEvent {
  id: string;
  timestamp: string | Date;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  from_status?: string;
  to_status: string;
  comment?: string;
  metadata?: Record<string, any>;
}

interface ApprovalHistoryProps {
  events: ApprovalEvent[];
  companyId?: string;
  reportId?: string;
  showFilters?: boolean;
  exportable?: boolean;
  maxHeight?: string;
}

export default function ApprovalHistory({
  events,
  companyId,
  reportId,
  showFilters = true,
  exportable = true,
  maxHeight = '600px',
}: ApprovalHistoryProps) {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get unique actions and roles for filters
  const { uniqueActions, uniqueRoles } = useMemo(() => {
    const actions = new Set<string>();
    const roles = new Set<string>();
    events.forEach((event) => {
      actions.add(event.action);
      roles.add(event.user_role);
    });
    return {
      uniqueActions: Array.from(actions).sort(),
      uniqueRoles: Array.from(roles).sort(),
    };
  }, [events]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Filter by action
      if (filterAction !== 'all' && event.action !== filterAction) {
        return false;
      }

      // Filter by role
      if (filterRole !== 'all' && event.user_role !== filterRole) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const searchableText = [
          event.user_name,
          event.action,
          event.to_status,
          event.comment || '',
        ]
          .join(' ')
          .toLowerCase();
        return searchableText.includes(query);
      }

      return true;
    });
  }, [events, filterAction, filterRole, searchQuery]);

  // Export to CSV
  const exportToCsv = () => {
    const headers = ['Timestamp', 'User', 'Role', 'Action', 'From Status', 'To Status', 'Comment'];
    const rows = filteredEvents.map((event) => [
      new Date(event.timestamp).toISOString(),
      event.user_name,
      event.user_role,
      event.action,
      event.from_status || '',
      event.to_status,
      event.comment || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `approval-history-${reportId || 'report'}-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="approval-history" role="region" aria-label="Approval history">
      {/* Header */}
      <div className="history-header">
        <div className="header-title">
          <h3>Approval Audit Trail</h3>
          <span className="event-count" role="status">
            {filteredEvents.length} {filteredEvents.length === 1 ? 'event' : 'events'}
          </span>
        </div>

        {exportable && (
          <button
            onClick={exportToCsv}
            className="export-btn"
            aria-label="Export approval history to CSV"
          >
            <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Export CSV
          </button>
        )}
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="filters" role="search">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            aria-label="Search approval events"
          />

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="filter-select"
            aria-label="Filter by action"
          >
            <option value="all">All Actions</option>
            {uniqueActions.map((action) => (
              <option key={action} value={action}>
                {formatAction(action)}
              </option>
            ))}
          </select>

          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="filter-select"
            aria-label="Filter by role"
          >
            <option value="all">All Roles</option>
            {uniqueRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>

          {(filterAction !== 'all' || filterRole !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setFilterAction('all');
                setFilterRole('all');
                setSearchQuery('');
              }}
              className="clear-filters-btn"
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="timeline-container" style={{ maxHeight }} role="feed">
        {filteredEvents.length === 0 ? (
          <div className="empty-state" role="status">
            <p>No approval events found</p>
          </div>
        ) : (
          <div className="timeline">
            {filteredEvents.map((event, index) => (
              <ApprovalEventCard key={event.id} event={event} isLatest={index === 0} />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .approval-history {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
        }

        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .header-title {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .header-title h3 {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
        }

        .event-count {
          padding: 2px 8px;
          background: #e5e7eb;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .export-btn:hover {
          background: #1d4ed8;
        }

        .export-btn .icon {
          width: 16px;
          height: 16px;
        }

        .filters {
          display: flex;
          gap: 12px;
          padding: 16px 24px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
        }

        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .search-input:focus {
          outline: none;
          border-color: #2563eb;
          ring: 2px solid #2563eb20;
        }

        .filter-select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          background: white;
          cursor: pointer;
        }

        .filter-select:focus {
          outline: none;
          border-color: #2563eb;
        }

        .clear-filters-btn {
          padding: 8px 12px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .clear-filters-btn:hover {
          background: #f9fafb;
          color: #111827;
        }

        .timeline-container {
          overflow-y: auto;
          padding: 24px;
        }

        .timeline {
          position: relative;
          padding-left: 32px;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 7px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e5e7eb;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: #6b7280;
        }

        @media (max-width: 768px) {
          .history-header {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .filters {
            flex-direction: column;
          }

          .search-input {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Individual event card in timeline
 */
function ApprovalEventCard({
  event,
  isLatest,
}: {
  event: ApprovalEvent;
  isLatest: boolean;
}) {
  const timestamp = new Date(event.timestamp);
  const actionColor = getActionColor(event.action);

  return (
    <article className={`event-card ${isLatest ? 'latest' : ''}`} role="article">
      <div
        className="event-marker"
        style={{ backgroundColor: actionColor }}
        role="presentation"
      />

      <div className="event-content">
        <div className="event-header">
          <div className="event-user">
            <span className="user-name">{event.user_name}</span>
            <span className="user-role" role="note">
              {event.user_role}
            </span>
          </div>
          <time dateTime={timestamp.toISOString()} className="event-time">
            {formatTimestamp(timestamp)}
          </time>
        </div>

        <div className="event-action">
          <strong style={{ color: actionColor }}>{formatAction(event.action)}</strong>
          {event.from_status && event.to_status && (
            <span className="status-transition">
              {' '}
              {formatStatus(event.from_status)} → {formatStatus(event.to_status)}
            </span>
          )}
          {!event.from_status && event.to_status && (
            <span className="status-transition"> → {formatStatus(event.to_status)}</span>
          )}
        </div>

        {event.comment && (
          <blockquote className="event-comment">"{event.comment}"</blockquote>
        )}

        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <details className="event-metadata">
            <summary>Additional details</summary>
            <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
          </details>
        )}
      </div>

      <style jsx>{`
        .event-card {
          position: relative;
          margin-bottom: 24px;
          animation: fadeIn 0.3s ease;
        }

        .event-card.latest {
          background: #eff6ff;
          padding: 12px;
          margin-left: -12px;
          margin-right: -12px;
          border-radius: 6px;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .event-marker {
          position: absolute;
          left: -28px;
          top: 6px;
          width: 14px;
          height: 14px;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 2px #e5e7eb;
          z-index: 2;
        }

        .event-content {
          background: white;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .event-card.latest .event-content {
          border-color: #3b82f6;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          gap: 12px;
        }

        .event-user {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .user-name {
          font-weight: 600;
          color: #111827;
        }

        .user-role {
          padding: 2px 8px;
          background: #e5e7eb;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #6b7280;
        }

        .event-time {
          font-size: 0.875rem;
          color: #6b7280;
          white-space: nowrap;
        }

        .event-action {
          font-size: 0.9375rem;
          margin-bottom: 8px;
        }

        .status-transition {
          color: #6b7280;
        }

        .event-comment {
          margin: 12px 0 0 0;
          padding: 12px;
          background: #f9fafb;
          border-left: 3px solid #d1d5db;
          font-style: italic;
          color: #4b5563;
          font-size: 0.875rem;
        }

        .event-metadata {
          margin-top: 12px;
          font-size: 0.875rem;
        }

        .event-metadata summary {
          cursor: pointer;
          color: #6b7280;
          font-weight: 600;
        }

        .event-metadata pre {
          margin-top: 8px;
          padding: 8px;
          background: #f3f4f6;
          border-radius: 4px;
          font-size: 0.75rem;
          overflow-x: auto;
        }

        @media (max-width: 768px) {
          .event-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .event-time {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </article>
  );
}

/**
 * Helper: Get color for action type
 */
function getActionColor(action: string): string {
  const colors: Record<string, string> = {
    create: '#6b7280',
    submit: '#3b82f6',
    withdraw: '#f59e0b',
    start_review: '#8b5cf6',
    request_changes: '#ef4444',
    approve_review: '#10b981',
    approve_final: '#059669',
    reject: '#dc2626',
    lock: '#065f46',
    unlock: '#f59e0b',
    comment: '#6b7280',
    version_created: '#3b82f6',
  };
  return colors[action] || '#6b7280';
}

/**
 * Helper: Format action name
 */
function formatAction(action: string): string {
  const labels: Record<string, string> = {
    create: 'Created',
    submit: 'Submitted for Review',
    withdraw: 'Withdrawn',
    start_review: 'Review Started',
    request_changes: 'Changes Requested',
    approve_review: 'Review Approved',
    approve_final: 'Final Approval',
    reject: 'Rejected',
    lock: 'Locked',
    unlock: 'Unlocked',
    comment: 'Comment Added',
    version_created: 'Version Created',
  };
  return labels[action] || action;
}

/**
 * Helper: Format status name
 */
function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper: Format timestamp
 */
function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
