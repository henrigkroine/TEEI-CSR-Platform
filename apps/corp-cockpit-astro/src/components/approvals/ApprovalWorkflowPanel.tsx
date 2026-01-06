/**
 * Approval Workflow Panel
 *
 * Complete approval workflow UI with:
 * - Status indicator
 * - Action buttons
 * - Comment thread
 * - Version history
 * - Audit trail
 *
 * @module components/approvals/ApprovalWorkflowPanel
 */

import { useState, useEffect } from 'react';

interface ApprovalWorkflowPanelProps {
  companyId: string;
  reportId: string;
  userRole: string;
}

type ApprovalStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'changes_requested'
  | 'review_approved'
  | 'approved'
  | 'locked'
  | 'rejected';

type ApprovalAction =
  | 'submit'
  | 'withdraw'
  | 'start_review'
  | 'request_changes'
  | 'approve_review'
  | 'approve_final'
  | 'reject'
  | 'lock'
  | 'unlock'
  | 'comment';

interface ApprovalState {
  status: ApprovalStatus;
  current_version: number;
  locked_at: string | null;
  locked_by: string | null;
  next_actions: ApprovalAction[];
  watermark: any | null;
}

interface ApprovalEvent {
  id: string;
  timestamp: string;
  user_name: string;
  user_role: string;
  action: string;
  from_status?: string;
  to_status: string;
  comment?: string;
}

interface Comment {
  id: string;
  user_name: string;
  user_role: string;
  comment: string;
  created_at: string;
  resolved: boolean;
  parent_id?: string;
}

interface Version {
  version: number;
  created_at: string;
  created_by_name: string;
  file_url: string;
  file_size: number;
  changes_summary?: string;
  approval_status: string;
}

export default function ApprovalWorkflowPanel({
  companyId,
  reportId,
  userRole: _userRole,
}: ApprovalWorkflowPanelProps) {
  const [approvalState, setApprovalState] = useState<ApprovalState | null>(null);
  const [history, setHistory] = useState<ApprovalEvent[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [activeTab, setActiveTab] = useState<'status' | 'comments' | 'history' | 'versions'>(
    'status'
  );
  const [newComment, setNewComment] = useState('');
  const [actionComment, setActionComment] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch approval state
  useEffect(() => {
    fetchApprovalState();
    fetchHistory();
    fetchComments();
    fetchVersions();
  }, [reportId]);

  async function fetchApprovalState() {
    try {
      const response = await fetch(`/api/companies/${companyId}/reports/${reportId}/approval`);
      const data = await response.json();
      setApprovalState(data);
    } catch (error) {
      console.error('Failed to fetch approval state:', error);
    }
  }

  async function fetchHistory() {
    try {
      const response = await fetch(
        `/api/companies/${companyId}/reports/${reportId}/approval/history`
      );
      const data = await response.json();
      setHistory(data.events || []);
    } catch (error) {
      console.error('Failed to fetch approval history:', error);
    }
  }

  async function fetchComments() {
    try {
      const response = await fetch(`/api/companies/${companyId}/reports/${reportId}/comments`);
      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  }

  async function fetchVersions() {
    try {
      const response = await fetch(`/api/companies/${companyId}/reports/${reportId}/versions`);
      const data = await response.json();
      setVersions(data.versions || []);
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  }

  async function performAction(action: ApprovalAction, comment?: string) {
    if (!approvalState) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/companies/${companyId}/reports/${reportId}/approval/actions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, comment }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        // Refresh state
        await fetchApprovalState();
        await fetchHistory();
        setActionComment('');
        alert(result.message);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Failed to perform action:', error);
      alert('Failed to perform action');
    } finally {
      setLoading(false);
    }
  }

  async function addComment() {
    if (!newComment.trim()) return;

    try {
      const response = await fetch(`/api/companies/${companyId}/reports/${reportId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment }),
      });

      if (response.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  }

  async function resolveComment(commentId: string) {
    try {
      const response = await fetch(
        `/api/companies/${companyId}/reports/${reportId}/comments/${commentId}/resolve`,
        { method: 'PATCH' }
      );

      if (response.ok) {
        await fetchComments();
      }
    } catch (error) {
      console.error('Failed to resolve comment:', error);
    }
  }

  if (!approvalState) {
    return <div className="approval-panel loading">Loading approval workflow...</div>;
  }

  return (
    <div className="approval-workflow-panel">
      <div className="panel-header">
        <h3>Approval Workflow</h3>
        <StatusBadge status={approvalState.status} />
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Status & Actions
        </button>
        <button
          className={`tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
          onClick={() => setActiveTab('comments')}
        >
          Comments ({comments.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Audit Trail
        </button>
        <button
          className={`tab-btn ${activeTab === 'versions' ? 'active' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          Versions ({versions.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'status' && (
          <div className="status-tab">
            <div className="status-info">
              <p>
                <strong>Current Status:</strong> {formatStatus(approvalState.status)}
              </p>
              <p>
                <strong>Version:</strong> {approvalState.current_version}
              </p>
              {approvalState.locked_at && (
                <>
                  <p>
                    <strong>Locked:</strong> {new Date(approvalState.locked_at).toLocaleString()}
                  </p>
                  <p>
                    <strong>Locked By:</strong> {approvalState.locked_by}
                  </p>
                </>
              )}
            </div>

            {approvalState.next_actions.length > 0 && (
              <div className="actions-section">
                <h4>Available Actions</h4>
                <p className="help-text">Optional comment (required for some actions):</p>
                <textarea
                  value={actionComment}
                  onChange={(e) => setActionComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                  className="action-comment-input"
                />

                <div className="action-buttons">
                  {approvalState.next_actions.map((action) => (
                    <button
                      key={action}
                      onClick={() => performAction(action, actionComment)}
                      disabled={loading}
                      className={`action-btn action-${action}`}
                    >
                      {formatAction(action)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {approvalState.watermark && (
              <div className="watermark-info">
                <h4>Watermark</h4>
                <p>{approvalState.watermark.text}</p>
                <p className="meta">
                  Position: {approvalState.watermark.position} | Opacity:{' '}
                  {approvalState.watermark.opacity}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'comments' && (
          <div className="comments-tab">
            <div className="add-comment">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
              />
              <button onClick={addComment} disabled={!newComment.trim()}>
                Post Comment
              </button>
            </div>

            <div className="comments-list">
              {comments.length === 0 ? (
                <p className="no-data">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className={`comment ${comment.resolved ? 'resolved' : ''}`}>
                    <div className="comment-header">
                      <strong>{comment.user_name}</strong>
                      <span className="role-badge">{comment.user_role}</span>
                      <span className="timestamp">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="comment-text">{comment.comment}</p>
                    {!comment.resolved && (
                      <button
                        onClick={() => resolveComment(comment.id)}
                        className="btn-resolve"
                      >
                        Mark Resolved
                      </button>
                    )}
                    {comment.resolved && <span className="resolved-badge">✓ Resolved</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-tab">
            {history.length === 0 ? (
              <p className="no-data">No history available</p>
            ) : (
              <div className="timeline">
                {history.map((event) => (
                  <div key={event.id} className="timeline-event">
                    <div className="event-marker" />
                    <div className="event-content">
                      <div className="event-header">
                        <strong>{event.user_name}</strong>
                        <span className="role-badge">{event.user_role}</span>
                        <span className="timestamp">
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="event-action">
                        {formatAction(event.action)}: {event.from_status} → {event.to_status}
                      </p>
                      {event.comment && <p className="event-comment">"{event.comment}"</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="versions-tab">
            {versions.length === 0 ? (
              <p className="no-data">No previous versions</p>
            ) : (
              <div className="versions-list">
                {versions.map((version) => (
                  <div key={version.version} className="version-item">
                    <div className="version-header">
                      <h4>Version {version.version}</h4>
                      <StatusBadge status={version.approval_status as ApprovalStatus} size="small" />
                    </div>
                    <p className="version-meta">
                      Created by <strong>{version.created_by_name}</strong> on{' '}
                      {new Date(version.created_at).toLocaleString()}
                    </p>
                    {version.changes_summary && (
                      <p className="changes-summary">{version.changes_summary}</p>
                    )}
                    <div className="version-actions">
                      <a href={version.file_url} className="btn-download">
                        Download ({formatFileSize(version.file_size)})
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        .approval-workflow-panel {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 24px;
          margin: 24px 0;
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .panel-header h3 {
          margin: 0;
          font-size: 1.25rem;
        }

        .tab-nav {
          display: flex;
          gap: 8px;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .tab-btn {
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-size: 0.9375rem;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #111827;
        }

        .tab-btn.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .status-info {
          background: #f9fafb;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .status-info p {
          margin: 8px 0;
        }

        .actions-section {
          margin-top: 24px;
        }

        .actions-section h4 {
          margin-bottom: 12px;
        }

        .help-text {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 8px;
        }

        .action-comment-input {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-family: inherit;
          font-size: 0.9375rem;
          margin-bottom: 16px;
          resize: vertical;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .action-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-submit,
        .action-start_review,
        .action-approve_review,
        .action-approve_final,
        .action-lock {
          background: #10b981;
          color: white;
        }

        .action-submit:hover,
        .action-approve_review:hover,
        .action-approve_final:hover {
          background: #059669;
        }

        .action-withdraw,
        .action-request_changes,
        .action-reject {
          background: #ef4444;
          color: white;
        }

        .action-withdraw:hover,
        .action-request_changes:hover,
        .action-reject:hover {
          background: #dc2626;
        }

        .action-unlock,
        .action-comment {
          background: #f3f4f6;
          color: #111827;
          border: 1px solid #d1d5db;
        }

        .watermark-info {
          margin-top: 24px;
          padding: 16px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
        }

        .watermark-info h4 {
          margin-top: 0;
        }

        .watermark-info .meta {
          color: #92400e;
          font-size: 0.875rem;
        }

        .add-comment {
          margin-bottom: 24px;
        }

        .add-comment textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-family: inherit;
          font-size: 0.9375rem;
          margin-bottom: 12px;
          resize: vertical;
        }

        .add-comment button {
          padding: 10px 20px;
          background: #2563eb;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
        }

        .add-comment button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .comments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .comment {
          padding: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .comment.resolved {
          opacity: 0.7;
        }

        .comment-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .role-badge {
          background: #e5e7eb;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .timestamp {
          margin-left: auto;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .comment-text {
          margin: 8px 0;
        }

        .btn-resolve {
          padding: 6px 12px;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
        }

        .resolved-badge {
          color: #10b981;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .timeline {
          position: relative;
          padding-left: 32px;
        }

        .timeline::before {
          content: '';
          position: absolute;
          left: 6px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #e5e7eb;
        }

        .timeline-event {
          position: relative;
          margin-bottom: 24px;
        }

        .event-marker {
          position: absolute;
          left: -29px;
          top: 4px;
          width: 14px;
          height: 14px;
          background: #2563eb;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 0 0 2px #e5e7eb;
        }

        .event-content {
          background: #f9fafb;
          padding: 16px;
          border-radius: 6px;
        }

        .event-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .event-action {
          font-weight: 600;
          margin: 8px 0;
        }

        .event-comment {
          color: #6b7280;
          font-style: italic;
        }

        .versions-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .version-item {
          padding: 16px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .version-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .version-header h4 {
          margin: 0;
        }

        .version-meta {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 8px 0;
        }

        .changes-summary {
          margin: 8px 0;
        }

        .version-actions {
          margin-top: 12px;
        }

        .btn-download {
          padding: 8px 16px;
          background: #2563eb;
          color: white;
          border-radius: 6px;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          display: inline-block;
        }

        .no-data {
          color: #6b7280;
          text-align: center;
          padding: 32px;
        }
      `}</style>
    </div>
  );
}

/**
 * Status Badge Component
 */
function StatusBadge({
  status,
  size = 'normal',
}: {
  status: ApprovalStatus;
  size?: 'small' | 'normal';
}) {
  const colors: Record<ApprovalStatus, string> = {
    draft: '#6b7280',
    submitted: '#3b82f6',
    in_review: '#f59e0b',
    changes_requested: '#ef4444',
    review_approved: '#10b981',
    approved: '#10b981',
    locked: '#059669',
    rejected: '#dc2626',
  };

  const labels: Record<ApprovalStatus, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    in_review: 'In Review',
    changes_requested: 'Changes Requested',
    review_approved: 'Review Approved',
    approved: 'Approved',
    locked: 'Locked',
    rejected: 'Rejected',
  };

  return (
    <span
      className={`status-badge status-${status} size-${size}`}
      style={{ backgroundColor: colors[status] }}
    >
      {labels[status]}
      <style>{`
        .status-badge {
          color: white;
          border-radius: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .status-badge.size-normal {
          padding: 6px 12px;
          font-size: 0.875rem;
        }

        .status-badge.size-small {
          padding: 4px 8px;
          font-size: 0.75rem;
        }
      `}</style>
    </span>
  );
}

/**
 * Helper: Format action name
 */
function formatAction(action: string): string {
  const labels: Record<string, string> = {
    create: 'Created',
    submit: 'Submit for Review',
    withdraw: 'Withdraw',
    start_review: 'Start Review',
    request_changes: 'Request Changes',
    approve_review: 'Approve (Reviewer)',
    approve_final: 'Approve (Final)',
    reject: 'Reject',
    lock: 'Lock Report',
    unlock: 'Unlock',
    comment: 'Comment',
    version_created: 'Version Created',
  };
  return labels[action] || action;
}

/**
 * Helper: Format status
 */
function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Helper: Format file size
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
