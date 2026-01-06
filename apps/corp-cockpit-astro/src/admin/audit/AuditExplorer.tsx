/**
 * Audit Log Explorer
 *
 * Main page for querying and viewing audit events with:
 * - Faceted filters (time range, actor, resource type, action)
 * - Timeline heatmap visualization
 * - Event table with pagination
 * - Event detail modal with diff viewer
 * - Compliance export button
 */

import { useState, useEffect } from 'react';
import type { AuditEvent, AuditEventFilters, AuditTimelineBucket } from '@teei/shared-types';

interface AuditExplorerProps {
  companyId: string;
  userRole: string;
}

interface QueryResult {
  events: AuditEvent[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

export default function AuditExplorer({ companyId, userRole }: AuditExplorerProps) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<AuditTimelineBucket[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  // Filters
  const [filters, setFilters] = useState<AuditEventFilters>({
    tenantId: companyId,
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
    to: new Date(),
    limit: 50,
    offset: 0,
  });

  // Fetch audit events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.from) queryParams.append('from', filters.from.toISOString());
      if (filters.to) queryParams.append('to', filters.to.toISOString());
      if (filters.tenantId) queryParams.append('tenantId', filters.tenantId);
      if (filters.actorEmail) queryParams.append('actorEmail', filters.actorEmail);
      if (filters.resourceType) queryParams.append('resourceType', filters.resourceType);
      if (filters.action) queryParams.append('action', filters.action);
      if (filters.actionCategory) queryParams.append('actionCategory', filters.actionCategory);
      if (filters.search) queryParams.append('search', filters.search);
      queryParams.append('limit', String(filters.limit || 50));
      queryParams.append('offset', String(filters.offset || 0));

      const response = await fetch(`/v1/audit/events?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        setEvents(result.data.events);
        setTotal(result.data.total);
      } else {
        console.error('Failed to fetch audit events:', result.message);
      }
    } catch (error) {
      console.error('Error fetching audit events:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch timeline
  const fetchTimeline = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.from) queryParams.append('from', filters.from.toISOString());
      if (filters.to) queryParams.append('to', filters.to.toISOString());
      if (filters.tenantId) queryParams.append('tenantId', filters.tenantId);

      const response = await fetch(`/v1/audit/timeline?${queryParams.toString()}`);
      const result = await response.json();

      if (result.success) {
        setTimeline(result.data);
      }
    } catch (error) {
      console.error('Error fetching timeline:', error);
    }
  };

  // Export compliance bundle
  const exportAuditLog = async () => {
    setExportLoading(true);
    try {
      const response = await fetch('/v1/audit/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: companyId,
          from: filters.from?.toISOString(),
          to: filters.to?.toISOString(),
          maskPII: false,
          filters: {
            actorId: filters.actorId,
            resourceType: filters.resourceType,
            action: filters.action,
            actionCategory: filters.actionCategory,
          },
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
          response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] ||
          'audit_export.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Export failed. Please try again.');
      }
    } catch (error) {
      console.error('Error exporting audit log:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchTimeline();
  }, [filters.from, filters.to, filters.tenantId, filters.offset]);

  useEffect(() => {
    // Debounce search and other filters
    const timeout = setTimeout(() => {
      fetchEvents();
    }, 500);
    return () => clearTimeout(timeout);
  }, [
    filters.actorEmail,
    filters.resourceType,
    filters.action,
    filters.actionCategory,
    filters.search,
  ]);

  return (
    <div className="audit-explorer">
      <header className="audit-header">
        <h1>Audit Log Explorer</h1>
        <div className="audit-actions">
          {userRole === 'AuditAdmin' || userRole === 'admin' ? (
            <button
              className="btn-export"
              onClick={exportAuditLog}
              disabled={exportLoading}
              aria-label="Export compliance bundle"
            >
              {exportLoading ? 'Exporting...' : 'Export Compliance Bundle'}
            </button>
          ) : null}
        </div>
      </header>

      {/* Filters */}
      <div className="audit-filters">
        <div className="filter-group">
          <label htmlFor="date-from">From:</label>
          <input
            id="date-from"
            type="datetime-local"
            value={filters.from?.toISOString().slice(0, 16) || ''}
            onChange={(e) =>
              setFilters({ ...filters, from: new Date(e.target.value), offset: 0 })
            }
          />
        </div>

        <div className="filter-group">
          <label htmlFor="date-to">To:</label>
          <input
            id="date-to"
            type="datetime-local"
            value={filters.to?.toISOString().slice(0, 16) || ''}
            onChange={(e) => setFilters({ ...filters, to: new Date(e.target.value), offset: 0 })}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="actor-email">Actor Email:</label>
          <input
            id="actor-email"
            type="text"
            placeholder="user@example.com"
            value={filters.actorEmail || ''}
            onChange={(e) => setFilters({ ...filters, actorEmail: e.target.value, offset: 0 })}
          />
        </div>

        <div className="filter-group">
          <label htmlFor="resource-type">Resource Type:</label>
          <select
            id="resource-type"
            value={filters.resourceType || ''}
            onChange={(e) => setFilters({ ...filters, resourceType: e.target.value, offset: 0 })}
          >
            <option value="">All</option>
            <option value="user">User</option>
            <option value="company">Company</option>
            <option value="report">Report</option>
            <option value="evidence">Evidence</option>
            <option value="dsar_request">DSAR Request</option>
            <option value="ai_prompt">AI Prompt</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="action">Action:</label>
          <select
            id="action"
            value={filters.action || ''}
            onChange={(e) => setFilters({ ...filters, action: e.target.value, offset: 0 })}
          >
            <option value="">All</option>
            <option value="LOGIN">Login</option>
            <option value="LOGOUT">Logout</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
            <option value="EXPORT">Export</option>
            <option value="APPROVE">Approve</option>
            <option value="REJECT">Reject</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="search">Search:</label>
          <input
            id="search"
            type="text"
            placeholder="Search metadata..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value, offset: 0 })}
          />
        </div>
      </div>

      {/* Timeline Heatmap */}
      {timeline.length > 0 && (
        <div className="audit-timeline">
          <h2>Activity Timeline</h2>
          <div className="timeline-heatmap">
            {timeline.map((bucket, idx) => {
              const maxCount = Math.max(...timeline.map((b) => b.count));
              const intensity = bucket.count / maxCount;
              return (
                <div
                  key={idx}
                  className="timeline-bucket"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                    height: '40px',
                    flex: 1,
                  }}
                  title={`${new Date(bucket.timestamp).toLocaleDateString()}: ${bucket.count} events`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="audit-results-summary">
        <p>
          Showing {events.length} of {total} events
        </p>
      </div>

      {/* Event Table */}
      {loading ? (
        <div className="audit-loading">Loading audit events...</div>
      ) : (
        <table className="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Resource</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id} onClick={() => setSelectedEvent(event)} className="clickable-row">
                <td>{new Date(event.timestamp).toLocaleString()}</td>
                <td>
                  {event.actor.email}
                  <br />
                  <small>{event.actor.role}</small>
                </td>
                <td>
                  <span className={`action-badge action-${event.actionCategory.toLowerCase()}`}>
                    {event.action}
                  </span>
                </td>
                <td>
                  {event.resource.type}
                  {event.resource.identifier && (
                    <>
                      <br />
                      <small>{event.resource.identifier}</small>
                    </>
                  )}
                </td>
                <td>
                  <button
                    className="btn-view-details"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(event);
                    }}
                    aria-label={`View details for event ${event.id}`}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      <div className="audit-pagination">
        <button
          disabled={!filters.offset || filters.offset === 0}
          onClick={() =>
            setFilters({ ...filters, offset: Math.max(0, (filters.offset || 0) - (filters.limit || 50)) })
          }
          aria-label="Previous page"
        >
          Previous
        </button>
        <span>
          Page {Math.floor((filters.offset || 0) / (filters.limit || 50)) + 1} of{' '}
          {Math.ceil(total / (filters.limit || 50))}
        </span>
        <button
          disabled={!((filters.offset || 0) + events.length < total)}
          onClick={() =>
            setFilters({ ...filters, offset: (filters.offset || 0) + (filters.limit || 50) })
          }
          aria-label="Next page"
        >
          Next
        </button>
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      )}
    </div>
  );
}

/**
 * Event Detail Modal with Diff Viewer
 */
interface EventDetailModalProps {
  event: AuditEvent;
  onClose: () => void;
}

function EventDetailModal({ event, onClose }: EventDetailModalProps) {
  const getDiff = () => {
    if (!event.before || !event.after) return null;

    const diffs: Array<{ field: string; before: any; after: any }> = [];

    const allKeys = new Set([...Object.keys(event.before), ...Object.keys(event.after)]);

    for (const key of allKeys) {
      const before = event.before[key];
      const after = event.after[key];

      if (JSON.stringify(before) !== JSON.stringify(after)) {
        diffs.push({ field: key, before, after });
      }
    }

    return diffs;
  };

  const diffs = getDiff();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Audit Event Details</h2>
          <button onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </header>

        <div className="modal-body">
          <section>
            <h3>Event Information</h3>
            <dl>
              <dt>ID:</dt>
              <dd>{event.id}</dd>

              <dt>Timestamp:</dt>
              <dd>{new Date(event.timestamp).toLocaleString()}</dd>

              <dt>Action:</dt>
              <dd>
                <span className={`action-badge action-${event.actionCategory.toLowerCase()}`}>
                  {event.action}
                </span>
              </dd>

              <dt>Category:</dt>
              <dd>{event.actionCategory}</dd>
            </dl>
          </section>

          <section>
            <h3>Actor</h3>
            <dl>
              <dt>Email:</dt>
              <dd>{event.actor.email}</dd>

              <dt>Role:</dt>
              <dd>{event.actor.role}</dd>

              <dt>ID:</dt>
              <dd>{event.actor.id}</dd>
            </dl>
          </section>

          <section>
            <h3>Resource</h3>
            <dl>
              <dt>Type:</dt>
              <dd>{event.resource.type}</dd>

              {event.resource.id && (
                <>
                  <dt>ID:</dt>
                  <dd>{event.resource.id}</dd>
                </>
              )}

              {event.resource.identifier && (
                <>
                  <dt>Identifier:</dt>
                  <dd>{event.resource.identifier}</dd>
                </>
              )}
            </dl>
          </section>

          <section>
            <h3>Origin</h3>
            <dl>
              {event.origin.ip && (
                <>
                  <dt>IP Address:</dt>
                  <dd>{event.origin.ip}</dd>
                </>
              )}

              {event.origin.userAgent && (
                <>
                  <dt>User Agent:</dt>
                  <dd>{event.origin.userAgent}</dd>
                </>
              )}

              {event.origin.requestId && (
                <>
                  <dt>Request ID:</dt>
                  <dd>{event.origin.requestId}</dd>
                </>
              )}
            </dl>
          </section>

          {diffs && diffs.length > 0 && (
            <section>
              <h3>Changes</h3>
              <table className="diff-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>Before</th>
                    <th>After</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((diff, idx) => (
                    <tr key={idx}>
                      <td>{diff.field}</td>
                      <td className="diff-before">
                        <code>{JSON.stringify(diff.before, null, 2)}</code>
                      </td>
                      <td className="diff-after">
                        <code>{JSON.stringify(diff.after, null, 2)}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {event.metadata && (
            <section>
              <h3>Metadata</h3>
              <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
