/**
 * Retention Policies Component
 *
 * Displays data retention policies and schedules. Shows retention periods per data category,
 * upcoming deletions, and compliance requirements.
 *
 * @module components/governance/RetentionPolicies
 */

import React, { useState, useEffect } from 'react';

interface RetentionPoliciesProps {
  companyId: string;
}

interface RetentionPolicy {
  id: string;
  category: string;
  data_type: string;
  description: string;
  retention_period_days: number;
  legal_basis: string;
  compliance_frameworks: string[];
  deletion_method: 'soft_delete' | 'hard_delete' | 'anonymize';
  exceptions: string[];
  last_reviewed: string;
}

interface ScheduledDeletion {
  id: string;
  data_category: string;
  record_count: number;
  total_size: number;
  oldest_record_date: string;
  scheduled_deletion_date: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export default function RetentionPolicies({ companyId }: RetentionPoliciesProps) {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [scheduledDeletions, setScheduledDeletions] = useState<ScheduledDeletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'policies' | 'schedule'>('policies');

  useEffect(() => {
    fetchRetentionData();
  }, [companyId]);

  async function fetchRetentionData() {
    try {
      // TODO: Fetch from Worker-1 retention policy API
      // For now, use mock data
      const mockPolicies = getMockRetentionPolicies();
      const mockDeletions = getMockScheduledDeletions();

      setPolicies(mockPolicies);
      setScheduledDeletions(mockDeletions);
    } catch (error) {
      console.error('Failed to fetch retention data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="retention-policies loading">Loading retention policies...</div>;
  }

  return (
    <div className="retention-policies">
      {/* Header */}
      <div className="policies-header">
        <div>
          <h3>Data Retention Policies</h3>
          <p className="subtitle">
            Compliance-driven data lifecycle management. Automated retention and deletion schedules.
          </p>
        </div>
      </div>

      {/* Compliance Notice */}
      <div className="compliance-notice">
        <strong>Regulatory Compliance</strong>
        <p>
          Our retention policies comply with GDPR, CCPA, SOC 2, and industry-specific regulations.
          Data is retained only as long as necessary for business and legal purposes. After the
          retention period expires, data is automatically deleted or anonymized.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'policies' ? 'active' : ''}`}
          onClick={() => setActiveTab('policies')}
        >
          Retention Policies ({policies.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => setActiveTab('schedule')}
        >
          Deletion Schedule ({scheduledDeletions.filter((d) => d.status === 'pending').length}{' '}
          pending)
        </button>
      </div>

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="policies-list">
          {policies.map((policy) => (
            <div key={policy.id} className="policy-card">
              <div className="card-header">
                <div className="policy-info">
                  <h4>{policy.category}</h4>
                  <p className="data-type">{policy.data_type}</p>
                </div>
                <div className="retention-badge">
                  {formatRetentionPeriod(policy.retention_period_days)}
                </div>
              </div>

              <div className="card-body">
                <p className="description">{policy.description}</p>

                <div className="details-grid">
                  <div className="detail-section">
                    <h5>Legal Basis</h5>
                    <p>{policy.legal_basis}</p>
                  </div>

                  <div className="detail-section">
                    <h5>Compliance Frameworks</h5>
                    <div className="framework-badges">
                      {policy.compliance_frameworks.map((framework, idx) => (
                        <span key={idx} className="framework-badge">
                          {framework}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="detail-section">
                    <h5>Deletion Method</h5>
                    <span className={`method-badge ${policy.deletion_method}`}>
                      {getDeletionMethodLabel(policy.deletion_method)}
                    </span>
                  </div>

                  <div className="detail-section">
                    <h5>Last Reviewed</h5>
                    <p className="review-date">{new Date(policy.last_reviewed).toLocaleDateString()}</p>
                  </div>
                </div>

                {policy.exceptions.length > 0 && (
                  <div className="exceptions">
                    <h5>Exceptions</h5>
                    <ul>
                      {policy.exceptions.map((exception, idx) => (
                        <li key={idx}>{exception}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deletion Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="schedule-list">
          {scheduledDeletions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🗑️</div>
              <h4>No scheduled deletions</h4>
              <p>All data is within retention periods.</p>
            </div>
          ) : (
            <div className="deletions-table-wrapper">
              <table className="deletions-table">
                <thead>
                  <tr>
                    <th>Data Category</th>
                    <th>Record Count</th>
                    <th>Total Size</th>
                    <th>Oldest Record</th>
                    <th>Scheduled Deletion</th>
                    <th>Days Until Deletion</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {scheduledDeletions.map((deletion) => {
                    const daysUntil = Math.ceil(
                      (new Date(deletion.scheduled_deletion_date).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    );
                    return (
                      <tr key={deletion.id} className={`status-${deletion.status}`}>
                        <td className="category-cell">{deletion.data_category}</td>
                        <td className="count-cell">{deletion.record_count.toLocaleString()}</td>
                        <td className="size-cell">{formatFileSize(deletion.total_size)}</td>
                        <td className="date-cell">
                          {new Date(deletion.oldest_record_date).toLocaleDateString()}
                        </td>
                        <td className="date-cell">
                          {new Date(deletion.scheduled_deletion_date).toLocaleDateString()}
                        </td>
                        <td className={`days-cell ${daysUntil <= 7 ? 'urgent' : ''}`}>
                          {daysUntil > 0 ? `${daysUntil} days` : 'Overdue'}
                        </td>
                        <td>
                          <span className={`status-badge ${deletion.status}`}>
                            {deletion.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="schedule-notice">
            <strong>Automated Deletion Process</strong>
            <p>
              Deletions are executed automatically on the scheduled date. You will receive email
              notifications 7 days and 1 day before deletion. Data can be exported before deletion
              if needed for legal hold or archival purposes.
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        .retention-policies {
          background: white;
        }

        .policies-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .policies-header h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          color: #111827;
        }

        .subtitle {
          margin: 0;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        .compliance-notice {
          background: #eff6ff;
          border: 1px solid #3b82f6;
          border-left: 4px solid #2563eb;
          padding: 16px;
          border-radius: 6px;
          margin-bottom: 24px;
        }

        .compliance-notice strong {
          display: block;
          margin-bottom: 8px;
          color: #1e40af;
          font-size: 0.9375rem;
        }

        .compliance-notice p {
          margin: 0;
          color: #1e3a8a;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .tab-nav {
          display: flex;
          gap: 8px;
          border-bottom: 2px solid #e5e7eb;
          margin-bottom: 24px;
        }

        .tab-btn {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 1rem;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.2s;
        }

        .tab-btn:hover {
          color: #111827;
          background: #f9fafb;
        }

        .tab-btn.active {
          color: #2563eb;
          border-bottom-color: #2563eb;
        }

        .policies-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .policy-card {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          overflow: hidden;
          transition: all 0.2s;
        }

        .policy-card:hover {
          border-color: #3b82f6;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 20px;
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
        }

        .policy-info h4 {
          margin: 0 0 4px 0;
          font-size: 1.125rem;
          color: #111827;
        }

        .data-type {
          margin: 0;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .retention-badge {
          padding: 8px 16px;
          background: #dbeafe;
          border: 1px solid #3b82f6;
          border-radius: 6px;
          font-weight: 700;
          color: #1e40af;
          font-size: 0.875rem;
          white-space: nowrap;
        }

        .card-body {
          padding: 20px;
        }

        .description {
          margin: 0 0 20px 0;
          color: #4b5563;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 20px;
        }

        .detail-section h5 {
          margin: 0 0 8px 0;
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .detail-section p {
          margin: 0;
          color: #111827;
          font-size: 0.9375rem;
          line-height: 1.5;
        }

        .framework-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .framework-badge {
          padding: 4px 8px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #92400e;
          text-transform: uppercase;
        }

        .method-badge {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          display: inline-block;
        }

        .method-badge.soft_delete {
          background: #dbeafe;
          color: #1e40af;
        }

        .method-badge.hard_delete {
          background: #fee2e2;
          color: #991b1b;
        }

        .method-badge.anonymize {
          background: #e0e7ff;
          color: #3730a3;
        }

        .review-date {
          font-family: 'Courier New', monospace;
          color: #6b7280;
        }

        .exceptions {
          padding: 16px;
          background: #fef3c7;
          border: 1px solid #fcd34d;
          border-radius: 6px;
          margin-top: 16px;
        }

        .exceptions h5 {
          margin: 0 0 8px 0;
          font-size: 0.875rem;
          font-weight: 700;
          color: #92400e;
        }

        .exceptions ul {
          margin: 0;
          padding-left: 20px;
        }

        .exceptions li {
          color: #78350f;
          font-size: 0.875rem;
          margin-bottom: 4px;
          line-height: 1.5;
        }

        .schedule-list {
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .deletions-table-wrapper {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .deletions-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .deletions-table thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        .deletions-table th {
          padding: 12px;
          text-align: left;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          font-size: 0.75rem;
          letter-spacing: 0.05em;
        }

        .deletions-table td {
          padding: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .deletions-table tbody tr:hover {
          background: #f9fafb;
        }

        .deletions-table tbody tr.status-pending {
          background: #fef3c7;
        }

        .deletions-table tbody tr.status-in_progress {
          background: #dbeafe;
        }

        .deletions-table tbody tr.status-completed {
          background: #f3f4f6;
          opacity: 0.6;
        }

        .category-cell {
          font-weight: 600;
          color: #111827;
        }

        .count-cell {
          font-family: 'Courier New', monospace;
          color: #6b7280;
        }

        .size-cell {
          font-family: 'Courier New', monospace;
          color: #6b7280;
        }

        .date-cell {
          font-family: 'Courier New', monospace;
          color: #6b7280;
          white-space: nowrap;
        }

        .days-cell {
          font-weight: 600;
          color: #6b7280;
          white-space: nowrap;
        }

        .days-cell.urgent {
          color: #dc2626;
          font-weight: 700;
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

        .status-badge.in_progress {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-badge.completed {
          background: #d1fae5;
          color: #065f46;
        }

        .schedule-notice {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          padding: 16px;
          border-radius: 6px;
        }

        .schedule-notice strong {
          display: block;
          margin-bottom: 8px;
          color: #111827;
          font-size: 0.9375rem;
        }

        .schedule-notice p {
          margin: 0;
          color: #6b7280;
          line-height: 1.6;
          font-size: 0.9375rem;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          background: #f9fafb;
          border-radius: 8px;
          border: 2px dashed #e5e7eb;
          margin-bottom: 24px;
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

        .loading {
          padding: 40px;
          text-align: center;
          color: #6b7280;
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .card-header {
            flex-direction: column;
            gap: 12px;
          }

          .retention-badge {
            align-self: flex-start;
          }

          .details-grid {
            grid-template-columns: 1fr;
          }

          .deletions-table {
            font-size: 0.75rem;
          }

          .deletions-table th,
          .deletions-table td {
            padding: 8px;
          }

          .tab-btn {
            padding: 12px 16px;
            font-size: 0.9375rem;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function formatRetentionPeriod(days: number): string {
  if (days === 0) return 'Indefinite';
  if (days < 30) return `${days} days`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  const years = Math.round(days / 365);
  return `${years} ${years === 1 ? 'year' : 'years'}`;
}

function getDeletionMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    soft_delete: 'Soft Delete (Archived)',
    hard_delete: 'Hard Delete (Permanent)',
    anonymize: 'Anonymize (PII Removed)',
  };
  return labels[method] || method;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Mock data functions (replace with real API calls to Worker-1)
 */
function getMockRetentionPolicies(): RetentionPolicy[] {
  return [
    {
      id: 'policy-001',
      category: 'User Account Data',
      data_type: 'Personal Information (Name, Email, Phone)',
      description:
        'User profile data including contact information. Retained for the duration of account activity plus grace period.',
      retention_period_days: 2555, // ~7 years
      legal_basis: 'Legitimate business interest, user consent',
      compliance_frameworks: ['GDPR', 'CCPA', 'SOC 2'],
      deletion_method: 'anonymize',
      exceptions: [
        'Legal hold: Extended retention if subject to litigation',
        'Audit requirements: May be retained longer for compliance audits',
      ],
      last_reviewed: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'policy-002',
      category: 'CSR Reports',
      data_type: 'Generated Reports (PDF, PPTX)',
      description:
        'Corporate Social Responsibility reports generated by users. Retained for historical record and compliance.',
      retention_period_days: 3650, // 10 years
      legal_basis: 'Regulatory requirement (SOX, financial reporting)',
      compliance_frameworks: ['SOC 2', 'ISO 27001', 'SOX'],
      deletion_method: 'soft_delete',
      exceptions: [
        'Approved reports: Locked reports retained indefinitely',
        'Audit trail: Metadata retained even after report deletion',
      ],
      last_reviewed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'policy-003',
      category: 'Evidence & Source Documents',
      data_type: 'Uploaded Evidence Files (CSV, JSON, Images)',
      description:
        'Evidence files uploaded by users to support CSR claims. Retained for audit and verification purposes.',
      retention_period_days: 2555, // ~7 years
      legal_basis: 'Regulatory requirement (audit trail)',
      compliance_frameworks: ['GDPR', 'SOC 2', 'ISO 27001'],
      deletion_method: 'hard_delete',
      exceptions: [
        'Active reports: Evidence linked to approved reports retained longer',
      ],
      last_reviewed: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'policy-004',
      category: 'Audit Logs',
      data_type: 'System Activity Logs (Authentication, Actions, Exports)',
      description:
        'Comprehensive audit trail of all platform activity. Retained for security and compliance monitoring.',
      retention_period_days: 2555, // ~7 years
      legal_basis: 'Regulatory requirement (SOC 2, GDPR accountability)',
      compliance_frameworks: ['SOC 2', 'GDPR', 'ISO 27001', 'PCI DSS'],
      deletion_method: 'hard_delete',
      exceptions: [
        'Security incidents: Logs related to security events retained longer',
        'Immutable storage: Logs stored in tamper-evident format',
      ],
      last_reviewed: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'policy-005',
      category: 'Session & Authentication Data',
      data_type: 'Session Tokens, Cookies, IP Addresses',
      description:
        'Temporary session data for user authentication. Automatically deleted after session expiry.',
      retention_period_days: 90,
      legal_basis: 'Legitimate business interest (security)',
      compliance_frameworks: ['GDPR', 'CCPA'],
      deletion_method: 'hard_delete',
      exceptions: [],
      last_reviewed: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'policy-006',
      category: 'Analytics & Usage Data',
      data_type: 'Page Views, Feature Usage, Performance Metrics',
      description:
        'Aggregated analytics data for platform improvement. Individual user tracking limited to 13 months.',
      retention_period_days: 395, // ~13 months (GDPR guideline)
      legal_basis: 'User consent (analytics cookies)',
      compliance_frameworks: ['GDPR', 'CCPA'],
      deletion_method: 'anonymize',
      exceptions: [
        'Aggregated data: Summary statistics retained indefinitely (no PII)',
      ],
      last_reviewed: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

function getMockScheduledDeletions(): ScheduledDeletion[] {
  const now = Date.now();
  return [
    {
      id: 'deletion-001',
      data_category: 'Expired Session Tokens',
      record_count: 12450,
      total_size: 2048000, // ~2 MB
      oldest_record_date: new Date(now - 95 * 24 * 60 * 60 * 1000).toISOString(), // 95 days old
      scheduled_deletion_date: new Date(now + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      status: 'pending',
    },
    {
      id: 'deletion-002',
      data_category: 'Draft Reports (Inactive >7 years)',
      record_count: 89,
      total_size: 45678900, // ~45 MB
      oldest_record_date: new Date(now - 2600 * 24 * 60 * 60 * 1000).toISOString(), // ~7.1 years old
      scheduled_deletion_date: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      status: 'pending',
    },
    {
      id: 'deletion-003',
      data_category: 'Analytics Data (>13 months)',
      record_count: 567890,
      total_size: 12345678, // ~12 MB
      oldest_record_date: new Date(now - 410 * 24 * 60 * 60 * 1000).toISOString(), // ~13.5 months old
      scheduled_deletion_date: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      status: 'pending',
    },
    {
      id: 'deletion-004',
      data_category: 'Inactive User Accounts',
      record_count: 23,
      total_size: 890000, // ~890 KB
      oldest_record_date: new Date(now - 2600 * 24 * 60 * 60 * 1000).toISOString(), // ~7.1 years old
      scheduled_deletion_date: new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      status: 'pending',
    },
  ];
}
