/**
 * Activity Stream - Phase H3-B
 *
 * Real-time feed of administrative actions with SSE updates.
 * Shows audit trail for all Admin Studio operations.
 */

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSSEConnection } from '../../hooks/useSSEConnection';

interface ActivityEvent {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  userId: string;
  userName: string;
  details: Record<string, any>;
  severity: 'info' | 'warning' | 'critical';
}

interface ActivityStreamProps {
  companyId: string;
}

export default function ActivityStream({ companyId }: ActivityStreamProps) {
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'info' | 'warning' | 'critical'>('all');

  // Fetch historical events
  const { data: historicalEvents, isLoading } = useQuery({
    queryKey: ['admin-studio', 'audit', companyId],
    queryFn: async () => {
      const response = await fetch(`/api/admin-studio/audit/${companyId}?limit=50`);
      if (!response.ok) throw new Error('Failed to fetch audit log');
      return response.json() as Promise<ActivityEvent[]>;
    },
  });

  // Subscribe to live events via SSE
  const { subscribe } = useSSEConnection({
    companyId,
    channel: 'admin-audit',
    autoConnect: true,
    enablePollingFallback: true,
  });

  useEffect(() => {
    const unsubscribe = subscribe((event) => {
      try {
        const activityEvent = JSON.parse(event.data) as ActivityEvent;
        setLiveEvents((prev) => [activityEvent, ...prev].slice(0, 50));
      } catch (err) {
        console.error('[ActivityStream] Failed to parse event:', err);
      }
    });

    return unsubscribe;
  }, [subscribe]);

  // Merge live and historical events
  const allEvents = [...liveEvents, ...(historicalEvents || [])];
  const filteredEvents = filter === 'all'
    ? allEvents
    : allEvents.filter(e => e.severity === filter);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      default: return '🔵';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'residency.update': 'Updated data residency',
      'embed-token.create': 'Created embed token',
      'embed-token.revoke': 'Revoked embed token',
      'domain.add': 'Added allowed domain',
      'domain.remove': 'Removed allowed domain',
    };
    return labels[action] || action;
  };

  return (
    <div className="activity-stream">
      {/* Filter Controls */}
      <div className="stream-controls">
        <div className="filter-buttons" role="group" aria-label="Filter by severity">
          {(['all', 'info', 'warning', 'critical'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-button ${filter === f ? 'active' : ''}`}
              aria-pressed={filter === f}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        {liveEvents.length > 0 && (
          <span className="live-indicator">
            <span className="live-dot"></span>
            Live
          </span>
        )}
      </div>

      {/* Event Stream */}
      {isLoading ? (
        <div className="loading">Loading activity stream...</div>
      ) : (
        <div className="event-list">
          {filteredEvents.length > 0 ? (
            filteredEvents.map((event, idx) => (
              <div
                key={event.id || idx}
                className={`event-item severity-${event.severity}`}
              >
                <div className="event-icon">{getSeverityIcon(event.severity)}</div>
                <div className="event-content">
                  <div className="event-header">
                    <span className="event-action">{getActionLabel(event.action)}</span>
                    <span className="event-time">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="event-details">
                    <span className="event-user">{event.userName}</span>
                    {event.resource && (
                      <>
                        <span className="event-divider">•</span>
                        <span className="event-resource">{event.resource}</span>
                      </>
                    )}
                  </div>
                  {event.details && Object.keys(event.details).length > 0 && (
                    <details className="event-metadata">
                      <summary>View details</summary>
                      <pre>{JSON.stringify(event.details, null, 2)}</pre>
                    </details>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No activity events found.</p>
          )}
        </div>
      )}

      <style>{`
        .activity-stream {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stream-controls {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
        }

        .filter-buttons {
          display: flex;
          gap: 8px;
        }

        .filter-button {
          padding: 6px 12px;
          border: 1px solid var(--color-border);
          background: white;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-button:hover {
          background: var(--color-bg-light, #f9fafb);
        }

        .filter-button.active {
          background: var(--color-primary, #3b82f6);
          color: white;
          border-color: var(--color-primary, #3b82f6);
        }

        .live-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #10b981;
        }

        .live-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .event-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: 600px;
          overflow-y: auto;
        }

        .event-item {
          display: flex;
          gap: 12px;
          padding: 12px;
          background: var(--color-bg-light, #f9fafb);
          border-left: 3px solid var(--color-border);
          border-radius: 6px;
        }

        .event-item.severity-warning {
          border-left-color: #fbbf24;
          background: rgba(251, 191, 36, 0.05);
        }

        .event-item.severity-critical {
          border-left-color: #ef4444;
          background: rgba(239, 68, 68, 0.05);
        }

        .event-icon {
          font-size: 1.25rem;
          line-height: 1;
        }

        .event-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .event-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .event-action {
          font-weight: 600;
          color: var(--color-text);
          font-size: 0.9375rem;
        }

        .event-time {
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
          white-space: nowrap;
        }

        .event-details {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          color: var(--color-text-secondary);
        }

        .event-user {
          font-weight: 500;
        }

        .event-divider {
          color: var(--color-border);
        }

        .event-metadata {
          margin-top: 8px;
        }

        .event-metadata summary {
          cursor: pointer;
          font-size: 0.8125rem;
          color: var(--color-primary, #3b82f6);
        }

        .event-metadata pre {
          margin-top: 8px;
          padding: 12px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          font-size: 0.75rem;
          overflow-x: auto;
        }

        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: var(--color-text-secondary);
        }

        .loading {
          text-align: center;
          padding: 32px;
          color: var(--color-text-secondary);
        }
      `}</style>
    </div>
  );
}
