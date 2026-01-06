/**
 * Completeness Preview Component
 * Shows pack summary with status chips and completeness metrics
 */

import type { RegulatoryPack } from '@teei/shared-types';

interface Props {
  pack: RegulatoryPack;
}

export function CompletenessPreview({ pack }: Props) {
  const { summary } = pack;

  const getStatusColor = (status: string) => {
    const colors = {
      ready: '#10b981',
      generating: '#f59e0b',
      draft: '#6b7280',
      failed: '#ef4444',
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      ready: 'Ready',
      generating: 'Generating',
      draft: 'Draft',
      failed: 'Failed',
    };
    return labels[status as keyof typeof labels] || status;
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="completeness-preview">
      <div className="preview-header">
        <h3>Pack Preview</h3>
        <span
          className="status-chip"
          style={{ backgroundColor: getStatusColor(pack.status) }}
        >
          {getStatusLabel(pack.status)}
        </span>
      </div>

      <div className="completeness-bar-container">
        <div className="completeness-label">
          <span>Overall Completeness</span>
          <strong>{formatPercentage(summary.overallCompleteness)}</strong>
        </div>
        <div className="completeness-bar">
          <div
            className="completeness-fill"
            style={{ width: formatPercentage(summary.overallCompleteness) }}
          />
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-value">{summary.totalDisclosures}</div>
          <div className="metric-label">Total Disclosures</div>
        </div>
        <div className="metric-card success">
          <div className="metric-value">{summary.completedDisclosures}</div>
          <div className="metric-label">Completed</div>
        </div>
        <div className="metric-card warning">
          <div className="metric-value">{summary.partialDisclosures}</div>
          <div className="metric-label">Partial</div>
        </div>
        <div className="metric-card danger">
          <div className="metric-value">{summary.missingDisclosures}</div>
          <div className="metric-label">Missing</div>
        </div>
      </div>

      <div className="framework-breakdown">
        <h4>By Framework</h4>
        {summary.byFramework.map((fw) => (
          <div key={fw.framework} className="framework-row">
            <div className="framework-info">
              <strong className="framework-name">{fw.framework}</strong>
              <span className="disclosure-count">
                {fw.disclosureCount} disclosures
              </span>
            </div>
            <div className="framework-completeness">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: formatPercentage(fw.completeness) }}
                />
              </div>
              <span className="percentage">{formatPercentage(fw.completeness)}</span>
            </div>
          </div>
        ))}
      </div>

      {summary.criticalGaps > 0 && (
        <div className="critical-gaps-alert">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <strong>Critical Gaps: {summary.criticalGaps}</strong>
            <p>Some mandatory disclosures are missing data</p>
          </div>
        </div>
      )}

      <div className="pack-metadata">
        <div className="metadata-row">
          <span className="metadata-label">Period:</span>
          <span className="metadata-value">
            {new Date(pack.period.start).toLocaleDateString()} –{' '}
            {new Date(pack.period.end).toLocaleDateString()}
          </span>
        </div>
        <div className="metadata-row">
          <span className="metadata-label">Evidence Count:</span>
          <span className="metadata-value">{pack.metadata.evidenceCount}</span>
        </div>
        <div className="metadata-row">
          <span className="metadata-label">Generated:</span>
          <span className="metadata-value">
            {new Date(pack.metadata.generatedAt).toLocaleString()}
          </span>
        </div>
      </div>

      <style jsx>{`
        .completeness-preview {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 25px;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 25px;
        }

        .preview-header h3 {
          font-size: 20px;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .status-chip {
          padding: 6px 12px;
          border-radius: 12px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .completeness-bar-container {
          margin-bottom: 25px;
        }

        .completeness-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 14px;
          color: #374151;
        }

        .completeness-label strong {
          color: #1f2937;
          font-size: 16px;
        }

        .completeness-bar {
          height: 24px;
          background: #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
        }

        .completeness-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          transition: width 0.3s ease;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 25px;
        }

        .metric-card {
          padding: 15px;
          border-radius: 6px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
        }

        .metric-card.success {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }

        .metric-card.warning {
          background: #fffbeb;
          border-color: #fde68a;
        }

        .metric-card.danger {
          background: #fef2f2;
          border-color: #fecaca;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: 12px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .framework-breakdown {
          margin-bottom: 25px;
        }

        .framework-breakdown h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 15px;
        }

        .framework-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .framework-row:last-child {
          border-bottom: none;
        }

        .framework-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .framework-name {
          font-size: 14px;
          color: #1f2937;
        }

        .disclosure-count {
          font-size: 12px;
          color: #9ca3af;
        }

        .framework-completeness {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 150px;
        }

        .progress-bar {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
          transition: width 0.3s ease;
        }

        .percentage {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          min-width: 45px;
          text-align: right;
        }

        .critical-gaps-alert {
          display: flex;
          gap: 12px;
          padding: 15px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 6px;
          margin-bottom: 25px;
        }

        .alert-icon {
          font-size: 24px;
        }

        .alert-content {
          flex: 1;
        }

        .alert-content strong {
          display: block;
          color: #991b1b;
          margin-bottom: 4px;
        }

        .alert-content p {
          font-size: 13px;
          color: #991b1b;
          margin: 0;
        }

        .pack-metadata {
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .metadata-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 13px;
        }

        .metadata-label {
          color: #6b7280;
        }

        .metadata-value {
          color: #1f2937;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
