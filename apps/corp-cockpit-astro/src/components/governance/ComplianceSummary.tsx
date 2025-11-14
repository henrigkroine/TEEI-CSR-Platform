/**
 * Compliance Summary Widget
 *
 * At-a-glance compliance dashboard widget showing:
 * - Consent compliance percentage
 * - Pending DSARs with deadline tracking
 * - Retention alerts
 * - Export audit summary
 * Links to full governance page.
 *
 * @module components/governance/ComplianceSummary
 */

import React, { useState, useEffect } from 'react';

interface ComplianceSummaryProps {
  companyId: string;
  lang: string;
}

interface ComplianceMetrics {
  consent_compliance: {
    percentage: number;
    total_participants: number;
    compliant_count: number;
  };
  pending_dsars: {
    total: number;
    due_soon: number; // Due in next 7 days
    overdue: number;
  };
  retention_alerts: {
    total_records: number;
    deletion_count: number;
    days_until_next: number;
  };
  export_audit: {
    total_exports_30d: number;
    failed_exports: number;
    total_size: number;
  };
  overall_status: 'compliant' | 'warning' | 'critical';
}

export default function ComplianceSummary({ companyId, lang }: ComplianceSummaryProps) {
  const [metrics, setMetrics] = useState<ComplianceMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchComplianceMetrics();
  }, [companyId]);

  async function fetchComplianceMetrics() {
    try {
      // TODO: GET /governance/summary?companyId=X
      // For now, use mock data
      const mockMetrics = getMockComplianceMetrics();
      setMetrics(mockMetrics);
    } catch (error) {
      console.error('Failed to fetch compliance metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="compliance-summary loading">
        <div className="widget-header">
          <h3>Compliance Summary</h3>
        </div>
        <div className="loading-message">Loading compliance metrics...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="compliance-summary error">
        <div className="widget-header">
          <h3>Compliance Summary</h3>
        </div>
        <div className="error-message">Failed to load compliance data</div>
      </div>
    );
  }

  return (
    <div className={`compliance-summary status-${metrics.overall_status}`}>
      <div className="widget-header">
        <h3>Data Governance & Compliance</h3>
        <span className={`status-indicator ${metrics.overall_status}`}>
          {metrics.overall_status === 'compliant' && '✓ Compliant'}
          {metrics.overall_status === 'warning' && '⚠ Needs Attention'}
          {metrics.overall_status === 'critical' && '✗ Critical'}
        </span>
      </div>

      <div className="metrics-grid">
        {/* Consent Compliance */}
        <div className="metric-card consent">
          <div className="metric-icon">📝</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.consent_compliance.percentage}%</div>
            <div className="metric-label">Consent Compliance</div>
            <div className="metric-detail">
              {metrics.consent_compliance.compliant_count.toLocaleString()} /{' '}
              {metrics.consent_compliance.total_participants.toLocaleString()} participants
            </div>
          </div>
        </div>

        {/* Pending DSARs */}
        <div className="metric-card dsar">
          <div className="metric-icon">📋</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.pending_dsars.total}</div>
            <div className="metric-label">Pending DSARs</div>
            <div className="metric-detail">
              {metrics.pending_dsars.due_soon > 0 && (
                <span className="warning">{metrics.pending_dsars.due_soon} due in 7 days</span>
              )}
              {metrics.pending_dsars.overdue > 0 && (
                <span className="critical">{metrics.pending_dsars.overdue} overdue</span>
              )}
              {metrics.pending_dsars.due_soon === 0 && metrics.pending_dsars.overdue === 0 && (
                <span className="success">All on track</span>
              )}
            </div>
          </div>
        </div>

        {/* Retention Alerts */}
        <div className="metric-card retention">
          <div className="metric-icon">🗑️</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.retention_alerts.total_records.toLocaleString()}</div>
            <div className="metric-label">Records Near Deletion</div>
            <div className="metric-detail">
              {metrics.retention_alerts.days_until_next <= 7 ? (
                <span className="warning">
                  Next deletion in {metrics.retention_alerts.days_until_next} days
                </span>
              ) : (
                <span>{metrics.retention_alerts.deletion_count} scheduled deletions</span>
              )}
            </div>
          </div>
        </div>

        {/* Export Audit */}
        <div className="metric-card export">
          <div className="metric-icon">📊</div>
          <div className="metric-content">
            <div className="metric-value">{metrics.export_audit.total_exports_30d}</div>
            <div className="metric-label">Exports (Last 30 Days)</div>
            <div className="metric-detail">
              {metrics.export_audit.failed_exports > 0 ? (
                <span className="warning">{metrics.export_audit.failed_exports} failed</span>
              ) : (
                <span className="success">All successful</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="widget-footer">
        <a href={`/${lang}/cockpit/${companyId}/governance`} className="view-details-link">
          View Full Governance Dashboard →
        </a>
      </div>

      {/* Alerts */}
      {(metrics.pending_dsars.overdue > 0 || metrics.overall_status === 'critical') && (
        <div className="alert-banner critical">
          <span className="alert-icon">⚠️</span>
          <span className="alert-text">
            {metrics.pending_dsars.overdue > 0 && (
              <>URGENT: {metrics.pending_dsars.overdue} DSAR request(s) overdue. </>
            )}
            Immediate action required.
          </span>
        </div>
      )}

      <style jsx>{`
        .compliance-summary {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          transition: all 0.2s;
        }

        .compliance-summary.status-compliant {
          border-color: #22c55e;
        }

        .compliance-summary.status-warning {
          border-color: #f59e0b;
        }

        .compliance-summary.status-critical {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .compliance-summary:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .widget-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 2px solid #e5e7eb;
        }

        .widget-header h3 {
          margin: 0;
          font-size: 1.125rem;
          color: #111827;
        }

        .status-indicator {
          padding: 6px 12px;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-indicator.compliant {
          background: #d1fae5;
          color: #065f46;
        }

        .status-indicator.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .status-indicator.critical {
          background: #fee2e2;
          color: #991b1b;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 16px;
        }

        .metric-card {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: all 0.2s;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .metric-icon {
          font-size: 2rem;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .metric-card.consent .metric-icon {
          background: #dbeafe;
        }

        .metric-card.dsar .metric-icon {
          background: #fef3c7;
        }

        .metric-card.retention .metric-icon {
          background: #fee2e2;
        }

        .metric-card.export .metric-icon {
          background: #d1fae5;
        }

        .metric-content {
          flex: 1;
          min-width: 0;
        }

        .metric-value {
          font-size: 1.75rem;
          font-weight: 700;
          color: #111827;
          line-height: 1;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }

        .metric-detail {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .metric-detail .success {
          color: #059669;
          font-weight: 600;
        }

        .metric-detail .warning {
          color: #d97706;
          font-weight: 600;
        }

        .metric-detail .critical {
          color: #dc2626;
          font-weight: 700;
        }

        .widget-footer {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .view-details-link {
          color: #3b82f6;
          text-decoration: none;
          font-size: 0.9375rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: all 0.2s;
        }

        .view-details-link:hover {
          color: #2563eb;
          text-decoration: underline;
        }

        .alert-banner {
          margin-top: 16px;
          padding: 12px 16px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: pulse 2s ease-in-out infinite;
        }

        .alert-banner.critical {
          background: #fee2e2;
          border: 2px solid #ef4444;
        }

        .alert-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .alert-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: #991b1b;
          flex: 1;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }

        .loading,
        .error {
          background: white;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
        }

        .loading-message,
        .error-message {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
          font-size: 0.9375rem;
        }

        .error-message {
          color: #ef4444;
        }

        @media (max-width: 768px) {
          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .metric-card {
            flex-direction: column;
            text-align: center;
          }

          .metric-icon {
            width: 64px;
            height: 64px;
            font-size: 2.5rem;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Mock data function (replace with real API call to Worker 2)
 * GET /governance/summary?companyId=X
 */
function getMockComplianceMetrics(): ComplianceMetrics {
  return {
    consent_compliance: {
      percentage: 98,
      total_participants: 1250,
      compliant_count: 1225,
    },
    pending_dsars: {
      total: 5,
      due_soon: 3,
      overdue: 0,
    },
    retention_alerts: {
      total_records: 120000,
      deletion_count: 4,
      days_until_next: 3,
    },
    export_audit: {
      total_exports_30d: 12,
      failed_exports: 0,
      total_size: 25600000, // ~25 MB
    },
    overall_status: 'compliant',
  };
}
