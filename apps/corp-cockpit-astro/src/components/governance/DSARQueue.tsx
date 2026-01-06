/**
 * DSAR Queue Viewer Component
 *
 * Displays Data Subject Access Request (DSAR) queue with filtering and status tracking.
 * Shows request ID, participant name, type, status, dates, and assignee.
 *
 * @module components/governance/DSARQueue
 */

import React, { useState, useEffect } from 'react';

interface DSARQueueProps {
  companyId: string;
}

type DSARRequestType =
  | 'access'
  | 'deletion'
  | 'correction'
  | 'portability'
  | 'restriction'
  | 'objection';

type DSARStatus = 'pending' | 'in-progress' | 'completed' | 'rejected';

interface DSARRequest {
  id: string;
  participant_id: string;
  participant_name?: string;
  request_type: DSARRequestType;
  status: DSARStatus;
  submitted_date: string;
  due_date: string;
  completed_date?: string;
  assignee?: string;
  assignee_id?: string;
  description: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  approval_id?: string;
}

export default function DSARQueue({ companyId }: DSARQueueProps) {
  const [requests, setRequests] = useState<DSARRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<DSARStatus | 'all'>('all');
  const [filterType, setFilterType] = useState<DSARRequestType | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  useEffect(() => {
    fetchDSARRequests();
  }, [companyId]);

  async function fetchDSARRequests() {
    try {
      // TODO: GET /governance/dsar?companyId=X&status
      // For now, use mock data
      const mockRequests = getMockDSARRequests(companyId);
      setRequests(mockRequests);
    } catch (error) {
      console.error('Failed to fetch DSAR requests:', error);
    } finally {
      setLoading(false);
    }
  }

  // Apply filters
  let filteredRequests = requests;

  if (filterStatus !== 'all') {
    filteredRequests = filteredRequests.filter((req) => req.status === filterStatus);
  }

  if (filterType !== 'all') {
    filteredRequests = filteredRequests.filter((req) => req.request_type === filterType);
  }

  if (dateFrom) {
    const fromDate = new Date(dateFrom).getTime();
    filteredRequests = filteredRequests.filter(
      (req) => new Date(req.submitted_date).getTime() >= fromDate
    );
  }

  if (dateTo) {
    const toDate = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000;
    filteredRequests = filteredRequests.filter(
      (req) => new Date(req.submitted_date).getTime() < toDate
    );
  }

  if (showOverdueOnly) {
    filteredRequests = filteredRequests.filter(
      (req) => new Date(req.due_date).getTime() < Date.now() && req.status !== 'completed'
    );
  }

  // Sort by due date (urgent first)
  filteredRequests = [...filteredRequests].sort((a, b) => {
    if (a.priority !== b.priority) {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  if (loading) {
    return <div className="dsar-queue loading">Loading DSAR requests...</div>;
  }

  return (
    <div className="dsar-queue">
      {/* Summary Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Requests</h4>
          <p className="stat-value">{requests.length}</p>
        </div>
        <div className="stat-card pending">
          <h4>Pending</h4>
          <p className="stat-value">{requests.filter((r) => r.status === 'pending').length}</p>
        </div>
        <div className="stat-card in-progress">
          <h4>In Progress</h4>
          <p className="stat-value">{requests.filter((r) => r.status === 'in-progress').length}</p>
        </div>
        <div className="stat-card overdue">
          <h4>Overdue</h4>
          <p className="stat-value">
            {
              requests.filter(
                (r) =>
                  new Date(r.due_date).getTime() < Date.now() &&
                  r.status !== 'completed' &&
                  r.status !== 'rejected'
              ).length
            }
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-panel">
        <div className="filter-row">
          <div className="filter-field">
            <label>Status:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
              <option value="all">All Statuses ({requests.length})</option>
              <option value="pending">
                Pending ({requests.filter((r) => r.status === 'pending').length})
              </option>
              <option value="in-progress">
                In Progress ({requests.filter((r) => r.status === 'in-progress').length})
              </option>
              <option value="completed">
                Completed ({requests.filter((r) => r.status === 'completed').length})
              </option>
              <option value="rejected">
                Rejected ({requests.filter((r) => r.status === 'rejected').length})
              </option>
            </select>
          </div>

          <div className="filter-field">
            <label>Request Type:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
              <option value="all">All Types</option>
              <option value="access">Access</option>
              <option value="deletion">Deletion</option>
              <option value="correction">Correction</option>
              <option value="portability">Portability</option>
              <option value="restriction">Restriction</option>
              <option value="objection">Objection</option>
            </select>
          </div>

          <div className="filter-field">
            <label>Submitted From:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>

          <div className="filter-field">
            <label>Submitted To:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="filter-row">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showOverdueOnly}
              onChange={(e) => setShowOverdueOnly(e.target.checked)}
            />
            <span>Show overdue only</span>
          </label>

          {(filterStatus !== 'all' ||
            filterType !== 'all' ||
            dateFrom ||
            dateTo ||
            showOverdueOnly) && (
            <button
              className="btn-clear"
              onClick={() => {
                setFilterStatus('all');
                setFilterType('all');
                setDateFrom('');
                setDateTo('');
                setShowOverdueOnly(false);
              }}
            >
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      {/* Requests Table */}
      {filteredRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h4>No DSAR requests found</h4>
          <p>No requests match your current filters.</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="dsar-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Participant</th>
                <th>Type</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Due Date</th>
                <th>Completed</th>
                <th>Assignee</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((request) => {
                const daysUntilDue = Math.ceil(
                  (new Date(request.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue =
                  daysUntilDue < 0 &&
                  request.status !== 'completed' &&
                  request.status !== 'rejected';

                return (
                  <tr key={request.id} className={isOverdue ? 'overdue-row' : ''}>
                    <td className="id-cell">
                      <a href={`#dsar-${request.id}`} className="request-link">
                        {request.id}
                      </a>
                    </td>
                    <td className="participant-cell">
                      {request.participant_name || (
                        <span className="redacted">
                          {request.participant_id}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`type-badge ${request.request_type}`}>
                        {formatRequestType(request.request_type)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${request.status}`}>
                        {formatStatus(request.status)}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(request.submitted_date).toLocaleDateString()}
                    </td>
                    <td className={`date-cell ${isOverdue ? 'overdue' : daysUntilDue <= 7 ? 'warning' : ''}`}>
                      {new Date(request.due_date).toLocaleDateString()}
                      {request.status !== 'completed' && request.status !== 'rejected' && (
                        <div className="days-badge">
                          {daysUntilDue > 0
                            ? `${daysUntilDue} days left`
                            : `${Math.abs(daysUntilDue)} days overdue`}
                        </div>
                      )}
                    </td>
                    <td className="date-cell">
                      {request.completed_date
                        ? new Date(request.completed_date).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="assignee-cell">
                      {request.assignee || <span className="no-assignee">Unassigned</span>}
                    </td>
                    <td>
                      <span className={`priority-badge ${request.priority}`}>
                        {request.priority}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx>{`
        .dsar-queue {
          background: white;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .stat-card {
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .stat-card.pending {
          border-color: #f59e0b;
          background: #fef3c7;
        }

        .stat-card.in-progress {
          border-color: #3b82f6;
          background: #dbeafe;
        }

        .stat-card.overdue {
          border-color: #ef4444;
          background: #fee2e2;
        }

        .stat-card h4 {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .stat-value {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
        }

        /* Filters */
        .filter-panel {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .filter-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
          align-items: end;
        }

        .filter-row:last-child {
          margin-bottom: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .filter-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .filter-field label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
        }

        .filter-field input,
        .filter-field select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 0.875rem;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          cursor: pointer;
        }

        .checkbox-label input {
          cursor: pointer;
          width: 16px;
          height: 16px;
        }

        .btn-clear {
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-clear:hover {
          background: #e5e7eb;
        }

        /* Table */
        .table-wrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .dsar-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .dsar-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .dsar-table th {
          padding: 12px;
          text-align: left;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .dsar-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .dsar-table tbody tr:hover {
          background: #f9fafb;
        }

        .dsar-table tbody tr.overdue-row {
          background: #fee2e2;
        }

        .dsar-table tbody tr.overdue-row:hover {
          background: #fecaca;
        }

        .id-cell {
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
        }

        .request-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
        }

        .request-link:hover {
          text-decoration: underline;
        }

        .participant-cell {
          font-weight: 600;
          color: #111827;
        }

        .redacted {
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
          color: #6b7280;
        }

        .type-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .type-badge.access {
          background: #dbeafe;
          color: #1e40af;
        }

        .type-badge.deletion {
          background: #fee2e2;
          color: #991b1b;
        }

        .type-badge.correction {
          background: #fef3c7;
          color: #92400e;
        }

        .type-badge.portability {
          background: #e0e7ff;
          color: #3730a3;
        }

        .type-badge.restriction {
          background: #fce7f3;
          color: #831843;
        }

        .type-badge.objection {
          background: #f3f4f6;
          color: #374151;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.in-progress {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.completed {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.rejected {
          background: #fee2e2;
          color: #991b1b;
        }

        .date-cell {
          font-family: 'Courier New', monospace;
          color: #6b7280;
          white-space: nowrap;
          font-size: 0.75rem;
        }

        .date-cell.overdue {
          color: #dc2626;
          font-weight: 700;
        }

        .date-cell.warning {
          color: #f59e0b;
          font-weight: 600;
        }

        .days-badge {
          font-size: 0.625rem;
          margin-top: 4px;
          padding: 2px 6px;
          background: rgba(0, 0, 0, 0.05);
          border-radius: 4px;
          display: inline-block;
        }

        .assignee-cell {
          color: #111827;
        }

        .no-assignee {
          color: #9ca3af;
          font-style: italic;
        }

        .priority-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .priority-badge.low {
          background: #f3f4f6;
          color: #6b7280;
        }

        .priority-badge.normal {
          background: #dbeafe;
          color: #1e40af;
        }

        .priority-badge.high {
          background: #fef3c7;
          color: #92400e;
        }

        .priority-badge.urgent {
          background: #fee2e2;
          color: #991b1b;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px dashed #e5e7eb;
        }

        .empty-icon {
          font-size: 4rem;
          margin-bottom: 16px;
        }

        .empty-state h4 {
          margin: 0 0 8px 0;
          font-size: 1.25rem;
          color: #111827;
        }

        .empty-state p {
          margin: 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }

          .filter-row {
            grid-template-columns: 1fr;
          }

          .dsar-table {
            font-size: 0.75rem;
          }

          .dsar-table th,
          .dsar-table td {
            padding: 8px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function formatRequestType(type: DSARRequestType): string {
  const labels: Record<DSARRequestType, string> = {
    access: 'Access',
    deletion: 'Deletion',
    correction: 'Correction',
    portability: 'Portability',
    restriction: 'Restriction',
    objection: 'Objection',
  };
  return labels[type];
}

function formatStatus(status: DSARStatus): string {
  const labels: Record<DSARStatus, string> = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
    rejected: 'Rejected',
  };
  return labels[status];
}

/**
 * Mock data function (replace with real API call to Worker 2)
 * GET /governance/dsar?companyId=X&status
 */
function getMockDSARRequests(companyId: string): DSARRequest[] {
  const now = Date.now();
  const requests: DSARRequest[] = [];

  const types: DSARRequestType[] = [
    'access',
    'deletion',
    'correction',
    'portability',
    'restriction',
    'objection',
  ];
  const statuses: DSARStatus[] = ['pending', 'in-progress', 'completed', 'rejected'];
  const priorities = ['low', 'normal', 'high', 'urgent'] as const;
  const assignees = ['Alice Johnson', 'Bob Smith', 'Carol Davis', undefined];

  for (let i = 1; i <= 25; i++) {
    const submittedDays = Math.floor(Math.random() * 60); // 0-60 days ago
    const submittedDate = new Date(now - submittedDays * 24 * 60 * 60 * 1000);
    const dueDate = new Date(submittedDate.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days after submission
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    requests.push({
      id: `DSAR-${new Date().getFullYear()}-${i.toString().padStart(4, '0')}`,
      participant_id: `P${i.toString().padStart(5, '0')}`,
      participant_name: i % 3 === 0 ? undefined : `Participant ${i}`,
      request_type: types[Math.floor(Math.random() * types.length)],
      status,
      submitted_date: submittedDate.toISOString(),
      due_date: dueDate.toISOString(),
      completed_date:
        status === 'completed'
          ? new Date(
              submittedDate.getTime() + Math.floor(Math.random() * 25) * 24 * 60 * 60 * 1000
            ).toISOString()
          : undefined,
      assignee: assignees[Math.floor(Math.random() * assignees.length)],
      description: 'GDPR data subject access request',
      priority: priorities[Math.floor(Math.random() * priorities.length)],
      approval_id: status === 'completed' ? `APR-${i.toString().padStart(4, '0')}` : undefined,
    });
  }

  return requests;
}
