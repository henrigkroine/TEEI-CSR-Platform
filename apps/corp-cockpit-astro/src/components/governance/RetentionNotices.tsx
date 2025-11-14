/**
 * Retention Notices Component
 *
 * Displays records near TTL (Time To Live) limits with days until deletion.
 * Shows record type, count, timeline chart, and archive options.
 *
 * @module components/governance/RetentionNotices
 */

import React, { useState, useEffect } from 'react';

interface RetentionNoticesProps {
  companyId: string;
}

type RecordType =
  | 'session_data'
  | 'feedback'
  | 'evidence_snippets'
  | 'draft_reports'
  | 'analytics_data'
  | 'temporary_files';

interface RetentionNotice {
  id: string;
  record_type: RecordType;
  record_count: number;
  days_until_deletion: number;
  deletion_date: string;
  total_size: number;
  oldest_record_date: string;
  can_archive: boolean;
  policy_id: string;
}

export default function RetentionNotices({ companyId }: RetentionNoticesProps) {
  const [notices, setNotices] = useState<RetentionNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWarningsOnly, setShowWarningsOnly] = useState(true);

  useEffect(() => {
    fetchRetentionNotices();
  }, [companyId]);

  async function fetchRetentionNotices() {
    try {
      // TODO: GET /governance/retention/notices?companyId=X
      // For now, use mock data
      const mockNotices = getMockRetentionNotices(companyId);
      setNotices(mockNotices);
    } catch (error) {
      console.error('Failed to fetch retention notices:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive(noticeId: string) {
    if (
      !confirm(
        'Are you sure you want to extend retention for these records? This will archive them for an additional retention period.'
      )
    ) {
      return;
    }

    try {
      // TODO: POST /governance/retention/archive
      console.log('Archiving notice:', noticeId);
      alert('Records have been archived and retention period extended.');
      fetchRetentionNotices();
    } catch (error) {
      console.error('Failed to archive records:', error);
      alert('Failed to archive records. Please try again.');
    }
  }

  // Filter notices
  let filteredNotices = showWarningsOnly
    ? notices.filter((n) => n.days_until_deletion <= 30)
    : notices;

  // Sort by days until deletion (urgent first)
  filteredNotices = [...filteredNotices].sort(
    (a, b) => a.days_until_deletion - b.days_until_deletion
  );

  // Calculate total records to be deleted
  const totalRecordsNearDeletion = filteredNotices.reduce(
    (sum, notice) => sum + notice.record_count,
    0
  );

  if (loading) {
    return <div className="retention-notices loading">Loading retention notices...</div>;
  }

  return (
    <div className="retention-notices">
      {/* Warning Banner */}
      {totalRecordsNearDeletion > 0 && (
        <div className="warning-banner">
          <span className="banner-icon">⚠️</span>
          <div className="banner-content">
            <strong>Deletion Alert:</strong> {totalRecordsNearDeletion.toLocaleString()} records
            will be deleted in the next 30 days as per retention policies.
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="controls-bar">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={showWarningsOnly}
            onChange={(e) => setShowWarningsOnly(e.target.checked)}
          />
          <span>Show records due for deletion in next 30 days only</span>
        </label>

        <div className="summary-text">
          Showing {filteredNotices.length} of {notices.length} retention notices
        </div>
      </div>

      {/* Notices List */}
      {filteredNotices.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✅</div>
          <h4>All Clear!</h4>
          <p>
            {showWarningsOnly
              ? 'No records are scheduled for deletion in the next 30 days.'
              : 'No retention notices at this time.'}
          </p>
        </div>
      ) : (
        <div className="notices-list">
          {filteredNotices.map((notice) => {
            const urgency = getUrgency(notice.days_until_deletion);

            return (
              <div key={notice.id} className={`notice-card urgency-${urgency}`}>
                <div className="card-header">
                  <div className="notice-info">
                    <h4>{formatRecordType(notice.record_type)}</h4>
                    <p className="notice-meta">
                      {notice.record_count.toLocaleString()} records •{' '}
                      {formatFileSize(notice.total_size)}
                    </p>
                  </div>
                  <div className={`countdown-badge urgency-${urgency}`}>
                    <div className="countdown-number">{notice.days_until_deletion}</div>
                    <div className="countdown-label">days until deletion</div>
                  </div>
                </div>

                <div className="card-body">
                  <div className="notice-details">
                    <div className="detail-item">
                      <span className="detail-label">Deletion Date:</span>
                      <span className="detail-value">
                        {new Date(notice.deletion_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Oldest Record:</span>
                      <span className="detail-value">
                        {new Date(notice.oldest_record_date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="detail-item">
                      <span className="detail-label">Retention Policy:</span>
                      <span className="detail-value">
                        <a
                          href={`#policy-${notice.policy_id}`}
                          className="policy-link"
                          title="View retention policy"
                        >
                          {notice.policy_id}
                        </a>
                      </span>
                    </div>
                  </div>

                  {/* Timeline Bar */}
                  <div className="timeline-bar">
                    <div className="timeline-label">Time until deletion:</div>
                    <div className="timeline-track">
                      <div
                        className={`timeline-fill urgency-${urgency}`}
                        style={{
                          width: `${Math.max(5, Math.min(100, (30 - notice.days_until_deletion) / 30 * 100))}%`,
                        }}
                      ></div>
                    </div>
                    <div className="timeline-marks">
                      <span>Now</span>
                      <span>30 days</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="notice-actions">
                    {notice.can_archive && (
                      <button
                        className="btn-archive"
                        onClick={() => handleArchive(notice.id)}
                        title="Extend retention period"
                      >
                        Archive & Extend Retention
                      </button>
                    )}
                    <a href="#export" className="btn-export" title="Export before deletion">
                      Export Records
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Retention Policy Documentation Link */}
      <div className="policy-info-box">
        <h4>About Data Retention</h4>
        <p>
          Records are automatically deleted based on retention policies to comply with data
          minimization principles (GDPR Art. 5). You can export records before deletion or
          archive them if there's a legitimate business need to extend retention.
        </p>
        <a href="#retention-policies" className="policy-docs-link">
          View Full Retention Policy Documentation →
        </a>
      </div>

      <style jsx>{`
        .retention-notices {
          background: white;
        }

        .loading {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
        }

        /* Warning Banner */
        .warning-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          background: #fef3c7;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .banner-icon {
          font-size: 2rem;
          flex-shrink: 0;
        }

        .banner-content {
          flex: 1;
          font-size: 0.9375rem;
          color: #78350f;
        }

        .banner-content strong {
          color: #92400e;
          font-weight: 700;
        }

        /* Controls */
        .controls-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #f9fafb;
          border-radius: 8px;
          margin-bottom: 24px;
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

        .summary-text {
          font-size: 0.875rem;
          color: #6b7280;
        }

        /* Notices List */
        .notices-list {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .notice-card {
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .notice-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .notice-card.urgency-critical {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .notice-card.urgency-warning {
          border-color: #f59e0b;
          background: #fffbeb;
        }

        .notice-card.urgency-info {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          background: rgba(255, 255, 255, 0.5);
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }

        .notice-info h4 {
          margin: 0 0 6px 0;
          font-size: 1.125rem;
          color: #111827;
        }

        .notice-meta {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .countdown-badge {
          text-align: center;
          padding: 12px;
          border-radius: 8px;
          min-width: 120px;
        }

        .countdown-badge.urgency-critical {
          background: #fee2e2;
          border: 2px solid #ef4444;
        }

        .countdown-badge.urgency-warning {
          background: #fef3c7;
          border: 2px solid #f59e0b;
        }

        .countdown-badge.urgency-info {
          background: #dbeafe;
          border: 2px solid #3b82f6;
        }

        .countdown-number {
          font-size: 2rem;
          font-weight: 700;
          color: #111827;
          line-height: 1;
        }

        .countdown-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 4px;
        }

        .card-body {
          padding: 20px;
        }

        .notice-details {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .detail-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .detail-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-value {
          font-size: 0.9375rem;
          color: #111827;
        }

        .policy-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
        }

        .policy-link:hover {
          text-decoration: underline;
        }

        /* Timeline */
        .timeline-bar {
          margin: 20px 0;
        }

        .timeline-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          margin-bottom: 8px;
        }

        .timeline-track {
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }

        .timeline-fill {
          height: 100%;
          transition: width 0.3s;
          border-radius: 12px;
        }

        .timeline-fill.urgency-critical {
          background: linear-gradient(90deg, #ef4444, #dc2626);
        }

        .timeline-fill.urgency-warning {
          background: linear-gradient(90deg, #f59e0b, #d97706);
        }

        .timeline-fill.urgency-info {
          background: linear-gradient(90deg, #3b82f6, #2563eb);
        }

        .timeline-marks {
          display: flex;
          justify-content: space-between;
          margin-top: 6px;
          font-size: 0.75rem;
          color: #9ca3af;
        }

        /* Actions */
        .notice-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .btn-archive,
        .btn-export {
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

        .btn-archive {
          background: #3b82f6;
          color: white;
        }

        .btn-archive:hover {
          background: #2563eb;
        }

        .btn-export {
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-export:hover {
          background: #e5e7eb;
        }

        /* Policy Info Box */
        .policy-info-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-top: 24px;
        }

        .policy-info-box h4 {
          margin: 0 0 12px 0;
          font-size: 1rem;
          color: #111827;
        }

        .policy-info-box p {
          margin: 0 0 16px 0;
          color: #6b7280;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .policy-docs-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 600;
          font-size: 0.9375rem;
        }

        .policy-docs-link:hover {
          text-decoration: underline;
        }

        /* Empty State */
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
          .controls-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 12px;
          }

          .card-header {
            flex-direction: column;
            gap: 16px;
          }

          .countdown-badge {
            width: 100%;
          }

          .notice-details {
            grid-template-columns: 1fr;
          }

          .notice-actions {
            flex-direction: column;
          }

          .btn-archive,
          .btn-export {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function formatRecordType(type: RecordType): string {
  const labels: Record<RecordType, string> = {
    session_data: 'Session Data & Cookies',
    feedback: 'User Feedback & Comments',
    evidence_snippets: 'Evidence Snippets',
    draft_reports: 'Draft Reports (Inactive)',
    analytics_data: 'Analytics Data',
    temporary_files: 'Temporary Files & Caches',
  };
  return labels[type];
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getUrgency(daysUntilDeletion: number): 'critical' | 'warning' | 'info' {
  if (daysUntilDeletion <= 7) return 'critical';
  if (daysUntilDeletion <= 14) return 'warning';
  return 'info';
}

/**
 * Mock data function (replace with real API call to Worker 2)
 * GET /governance/retention/notices?companyId=X
 */
function getMockRetentionNotices(companyId: string): RetentionNotice[] {
  const now = Date.now();

  return [
    {
      id: 'retention-001',
      record_type: 'session_data',
      record_count: 12450,
      days_until_deletion: 3,
      deletion_date: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(),
      total_size: 2048000, // ~2 MB
      oldest_record_date: new Date(now - 95 * 24 * 60 * 60 * 1000).toISOString(),
      can_archive: false,
      policy_id: 'POL-SESSION-001',
    },
    {
      id: 'retention-002',
      record_type: 'analytics_data',
      record_count: 567890,
      days_until_deletion: 7,
      deletion_date: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_size: 12345678, // ~12 MB
      oldest_record_date: new Date(now - 410 * 24 * 60 * 60 * 1000).toISOString(),
      can_archive: true,
      policy_id: 'POL-ANALYTICS-002',
    },
    {
      id: 'retention-003',
      record_type: 'draft_reports',
      record_count: 89,
      days_until_deletion: 14,
      deletion_date: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
      total_size: 45678900, // ~45 MB
      oldest_record_date: new Date(now - 2600 * 24 * 60 * 60 * 1000).toISOString(),
      can_archive: true,
      policy_id: 'POL-REPORTS-003',
    },
    {
      id: 'retention-004',
      record_type: 'temporary_files',
      record_count: 3200,
      days_until_deletion: 1,
      deletion_date: new Date(now + 1 * 24 * 60 * 60 * 1000).toISOString(),
      total_size: 5242880, // ~5 MB
      oldest_record_date: new Date(now - 32 * 24 * 60 * 60 * 1000).toISOString(),
      can_archive: false,
      policy_id: 'POL-TEMP-004',
    },
    {
      id: 'retention-005',
      record_type: 'feedback',
      record_count: 1234,
      days_until_deletion: 21,
      deletion_date: new Date(now + 21 * 24 * 60 * 60 * 1000).toISOString(),
      total_size: 890000, // ~890 KB
      oldest_record_date: new Date(now - 2200 * 24 * 60 * 60 * 1000).toISOString(),
      can_archive: true,
      policy_id: 'POL-FEEDBACK-005',
    },
    {
      id: 'retention-006',
      record_type: 'evidence_snippets',
      record_count: 456,
      days_until_deletion: 45,
      deletion_date: new Date(now + 45 * 24 * 60 * 60 * 1000).toISOString(),
      total_size: 8900000, // ~8.9 MB
      oldest_record_date: new Date(now - 2500 * 24 * 60 * 60 * 1000).toISOString(),
      can_archive: true,
      policy_id: 'POL-EVIDENCE-006',
    },
  ];
}
