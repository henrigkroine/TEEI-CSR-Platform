/**
 * DSAR Status Component
 *
 * Displays Data Subject Access Request (DSAR) status and history.
 * Shows pending, in-progress, and completed requests with downloadable results.
 *
 * @module components/governance/DSARStatus
 */

import React, { useState, useEffect } from 'react';

interface DSARStatusProps {
  companyId: string;
  userId: string;
}

type DSARRequestStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'expired';

type DSARRequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'portability'
  | 'restriction'
  | 'objection';

interface DSARRequest {
  id: string;
  type: DSARRequestType;
  status: DSARRequestStatus;
  submitted_at: string;
  updated_at: string;
  completed_at?: string;
  expires_at?: string;
  description: string;
  result_url?: string;
  result_size?: number;
  processing_notes?: string;
  estimated_completion?: string;
}

export default function DSARStatus({ companyId, userId }: DSARStatusProps) {
  const [requests, setRequests] = useState<DSARRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<DSARRequestStatus | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchDSARRequests();

    // Auto-refresh every 30 seconds if enabled
    let intervalId: NodeJS.Timeout;
    if (autoRefresh) {
      intervalId = setInterval(fetchDSARRequests, 30000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [companyId, userId, autoRefresh]);

  async function fetchDSARRequests() {
    try {
      // TODO: Fetch from Worker-1 DSAR API
      // For now, use mock data
      const mockRequests = getMockDSARRequests(userId);
      setRequests(mockRequests);
    } catch (error) {
      console.error('Failed to fetch DSAR requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitNewRequest() {
    const requestType = prompt(
      'Enter request type:\n' +
        '1 = Access (export my data)\n' +
        '2 = Rectification (correct my data)\n' +
        '3 = Erasure (delete my data)\n' +
        '4 = Portability (transfer my data)\n' +
        '5 = Restriction (limit processing)\n' +
        '6 = Objection (object to processing)'
    );

    if (!requestType) return;

    const typeMap: Record<string, DSARRequestType> = {
      '1': 'access',
      '2': 'rectification',
      '3': 'erasure',
      '4': 'portability',
      '5': 'restriction',
      '6': 'objection',
    };

    const type = typeMap[requestType];
    if (!type) {
      alert('Invalid request type');
      return;
    }

    try {
      // TODO: POST to Worker-1 DSAR API
      console.log('Submitting DSAR request:', { user_id: userId, type });
      alert(`${type.toUpperCase()} request submitted. You will receive an email confirmation.`);
      fetchDSARRequests();
    } catch (error) {
      console.error('Failed to submit DSAR request:', error);
      alert('Failed to submit request. Please try again.');
    }
  }

  const filteredRequests =
    filter === 'all' ? requests : requests.filter((req) => req.status === filter);

  if (loading) {
    return <div className="dsar-status loading">Loading DSAR requests...</div>;
  }

  return (
    <div className="dsar-status">
      {/* Header */}
      <div className="dsar-header">
        <div>
          <h3>Data Subject Access Requests</h3>
          <p className="subtitle">
            View the status of your GDPR data requests. Requests are typically completed within 30
            days.
          </p>
        </div>
        <button className="btn-primary" onClick={handleSubmitNewRequest}>
          + New Request
        </button>
      </div>

      {/* GDPR Info */}
      <div className="gdpr-info">
        <strong>Your Rights Under GDPR</strong>
        <p>
          You have the right to access, rectify, erase, port, restrict, or object to the processing
          of your personal data. All requests are processed securely and responded to within the
          legal timeframe (30 days). For urgent requests, please contact{' '}
          <a href="mailto:privacy@teei.platform">privacy@teei.platform</a>.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Filter by status:</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
            <option value="all">All Requests ({requests.length})</option>
            <option value="pending">
              Pending ({requests.filter((r) => r.status === 'pending').length})
            </option>
            <option value="in_progress">
              In Progress ({requests.filter((r) => r.status === 'in_progress').length})
            </option>
            <option value="completed">
              Completed ({requests.filter((r) => r.status === 'completed').length})
            </option>
            <option value="failed">
              Failed ({requests.filter((r) => r.status === 'failed').length})
            </option>
          </select>
        </div>

        <label className="auto-refresh">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
          />
          <span>Auto-refresh (30s)</span>
        </label>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h4>No requests found</h4>
          <p>
            {filter === 'all'
              ? 'You have not submitted any DSAR requests yet.'
              : `No requests with status "${filter}".`}
          </p>
          <button className="btn-secondary" onClick={handleSubmitNewRequest}>
            Submit Your First Request
          </button>
        </div>
      ) : (
        <div className="requests-list">
          {filteredRequests.map((request) => (
            <div key={request.id} className={`request-card status-${request.status}`}>
              <div className="card-header">
                <div className="request-info">
                  <div className="request-title">
                    <span className="request-type">{getRequestTypeLabel(request.type)}</span>
                    <span className={`status-badge ${request.status}`}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  <p className="request-description">{request.description}</p>
                </div>

                <div className="request-actions">
                  {request.status === 'completed' && request.result_url && (
                    <a
                      href={request.result_url}
                      download
                      className="btn-download"
                      title="Download result"
                    >
                      Download ({formatFileSize(request.result_size || 0)})
                    </a>
                  )}
                </div>
              </div>

              <div className="card-body">
                <div className="timeline">
                  <div className="timeline-item">
                    <span className="timeline-label">Submitted:</span>
                    <span className="timeline-value">
                      {new Date(request.submitted_at).toLocaleString()}
                    </span>
                  </div>

                  <div className="timeline-item">
                    <span className="timeline-label">Last Updated:</span>
                    <span className="timeline-value">
                      {new Date(request.updated_at).toLocaleString()}
                    </span>
                  </div>

                  {request.completed_at && (
                    <div className="timeline-item">
                      <span className="timeline-label">Completed:</span>
                      <span className="timeline-value">
                        {new Date(request.completed_at).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {request.estimated_completion && request.status !== 'completed' && (
                    <div className="timeline-item">
                      <span className="timeline-label">Est. Completion:</span>
                      <span className="timeline-value">
                        {new Date(request.estimated_completion).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {request.expires_at && request.status === 'completed' && (
                    <div className="timeline-item">
                      <span className="timeline-label">Download Expires:</span>
                      <span className="timeline-value expires">
                        {new Date(request.expires_at).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                {request.processing_notes && (
                  <div className="processing-notes">
                    <strong>Notes:</strong> {request.processing_notes}
                  </div>
                )}

                {request.status === 'in_progress' && (
                  <div className="progress-indicator">
                    <div className="progress-bar">
                      <div className="progress-fill"></div>
                    </div>
                    <span className="progress-text">Processing your request...</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .dsar-status {
          background: white;
        }

        .dsar-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .dsar-header h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          color: #111827;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        .gdpr-info {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          border-left: 4px solid #2563eb;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .gdpr-info strong {
          display: block;
          margin-bottom: 8px;
          color: #1e40af;
          font-size: 0.9375rem;
        }

        .gdpr-info p {
          margin: 0;
          color: #1e3a8a;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .gdpr-info a {
          color: #2563eb;
          text-decoration: underline;
        }

        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f9fafb;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .filter-group {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .filter-group label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
        }

        .filter-group select {
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .auto-refresh {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #6b7280;
          cursor: pointer;
        }

        .auto-refresh input {
          cursor: pointer;
        }

        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .request-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .request-card:hover {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .request-card.status-completed {
          border-left: 4px solid #22c55e;
        }

        .request-card.status-in_progress {
          border-left: 4px solid #3b82f6;
        }

        .request-card.status-pending {
          border-left: 4px solid #f59e0b;
        }

        .request-card.status-failed {
          border-left: 4px solid #ef4444;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .request-info {
          flex: 1;
        }

        .request-title {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
        }

        .request-type {
          font-size: 1.125rem;
          font-weight: 700;
          color: #111827;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }

        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }

        .status-badge.in_progress {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.completed {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.failed {
          background: #fee2e2;
          color: #991b1b;
        }

        .status-badge.expired {
          background: #e5e7eb;
          color: #374151;
        }

        .request-description {
          margin: 0;
          color: #6b7280;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .card-body {
          padding: 20px;
        }

        .timeline {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .timeline-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .timeline-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .timeline-value {
          font-size: 0.875rem;
          color: #111827;
          font-family: 'Courier New', monospace;
        }

        .timeline-value.expires {
          color: #dc2626;
          font-weight: 600;
        }

        .processing-notes {
          padding: 12px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          margin-top: 16px;
          font-size: 0.875rem;
        }

        .processing-notes strong {
          color: #92400e;
        }

        .progress-indicator {
          margin-top: 16px;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          width: 60%;
          background: linear-gradient(90deg, #3b82f6, #2563eb);
          animation: progress 2s ease-in-out infinite;
        }

        @keyframes progress {
          0% {
            width: 30%;
          }
          50% {
            width: 70%;
          }
          100% {
            width: 30%;
          }
        }

        .progress-text {
          font-size: 0.875rem;
          color: #6b7280;
          font-style: italic;
        }

        .btn-primary,
        .btn-secondary,
        .btn-download {
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
          text-decoration: none;
          display: inline-block;
        }

        .btn-primary {
          background: #2563eb;
          color: white;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .btn-secondary {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #e5e7eb;
        }

        .btn-download {
          background: #22c55e;
          color: white;
        }

        .btn-download:hover {
          background: #16a34a;
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
          margin: 0 0 24px 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .dsar-header {
            flex-direction: column;
            gap: 16px;
          }

          .btn-primary {
            width: 100%;
          }

          .filter-bar {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }

          .filter-group {
            flex-direction: column;
            align-items: stretch;
          }

          .filter-group select {
            width: 100%;
          }

          .card-header {
            flex-direction: column;
            gap: 16px;
          }

          .timeline {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function getRequestTypeLabel(type: DSARRequestType): string {
  const labels: Record<DSARRequestType, string> = {
    access: 'Data Access Request',
    rectification: 'Data Rectification',
    erasure: 'Data Erasure (Right to be Forgotten)',
    portability: 'Data Portability',
    restriction: 'Processing Restriction',
    objection: 'Processing Objection',
  };
  return labels[type];
}

function getStatusLabel(status: DSARRequestStatus): string {
  const labels: Record<DSARRequestStatus, string> = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    failed: 'Failed',
    expired: 'Expired',
  };
  return labels[status];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Mock data function (replace with real API call to Worker-1)
 */
function getMockDSARRequests(userId: string): DSARRequest[] {
  const now = Date.now();
  return [
    {
      id: 'dsar-001',
      type: 'access',
      status: 'completed',
      submitted_at: new Date(now - 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days ago
      updated_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      completed_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(),
      expires_at: new Date(now + 20 * 24 * 60 * 60 * 1000).toISOString(), // 20 days from now
      description: 'Request to export all personal data associated with your account.',
      result_url: '/api/dsar/dsar-001/download',
      result_size: 2457600, // 2.4 MB
      processing_notes: 'Data export completed successfully. Download expires in 30 days.',
    },
    {
      id: 'dsar-002',
      type: 'rectification',
      status: 'in_progress',
      submitted_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
      updated_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      estimated_completion: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      description:
        'Request to correct inaccurate personal data in your profile and related records.',
      processing_notes:
        'Reviewing requested changes. You will be notified when corrections are complete.',
    },
    {
      id: 'dsar-003',
      type: 'portability',
      status: 'pending',
      submitted_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      updated_at: new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString(),
      estimated_completion: new Date(now + 29 * 24 * 60 * 60 * 1000).toISOString(), // 29 days from now
      description: 'Request to transfer your data to another service provider in machine-readable format.',
      processing_notes: 'Request received and queued for processing.',
    },
  ];
}
