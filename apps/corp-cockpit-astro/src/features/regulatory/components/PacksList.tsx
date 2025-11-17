/**
 * Packs List Component
 * Displays list of previously generated packs
 */

import type { PackListItem } from '@teei/shared-types';

interface Props {
  packs: PackListItem[];
  onLoad: (packId: string) => void;
}

export function PacksList({ packs, onLoad }: Props) {
  if (packs.length === 0) {
    return (
      <div className="empty-state">
        <p>No packs generated yet. Create your first pack to get started.</p>
        <style jsx>{`
          .empty-state {
            padding: 40px;
            text-align: center;
            color: #9ca3af;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(0)}%`;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      ready: '#10b981',
      generating: '#f59e0b',
      draft: '#6b7280',
      failed: '#ef4444',
    };
    return colors[status as keyof typeof colors] || colors.draft;
  };

  return (
    <div className="packs-list">
      <div className="packs-table">
        <div className="table-header">
          <div className="col-frameworks">Frameworks</div>
          <div className="col-period">Period</div>
          <div className="col-completeness">Completeness</div>
          <div className="col-status">Status</div>
          <div className="col-generated">Generated</div>
          <div className="col-actions">Actions</div>
        </div>

        {packs.map((pack) => (
          <div key={pack.id} className="table-row">
            <div className="col-frameworks">
              <div className="frameworks-badges">
                {pack.frameworks.map((fw) => (
                  <span key={fw} className="framework-badge">
                    {fw}
                  </span>
                ))}
              </div>
            </div>

            <div className="col-period">
              <span className="period-text">
                {formatDate(pack.period.start)} – {formatDate(pack.period.end)}
              </span>
            </div>

            <div className="col-completeness">
              <div className="completeness-display">
                <div className="mini-progress">
                  <div
                    className="mini-progress-fill"
                    style={{ width: formatPercentage(pack.completeness) }}
                  />
                </div>
                <span className="completeness-value">
                  {formatPercentage(pack.completeness)}
                </span>
              </div>
            </div>

            <div className="col-status">
              <span
                className="status-dot"
                style={{ backgroundColor: getStatusColor(pack.status) }}
              >
                {pack.status}
              </span>
            </div>

            <div className="col-generated">
              <span className="generated-text">
                {formatDate(pack.generatedAt)}
              </span>
            </div>

            <div className="col-actions">
              <button
                onClick={() => onLoad(pack.id)}
                className="load-button"
                aria-label="Load pack"
              >
                Load
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .packs-list {
          overflow-x: auto;
        }

        .packs-table {
          min-width: 800px;
        }

        .table-header,
        .table-row {
          display: grid;
          grid-template-columns: 200px 180px 140px 100px 120px 80px;
          gap: 15px;
          padding: 12px 15px;
          align-items: center;
        }

        .table-header {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .table-row {
          border-bottom: 1px solid #f3f4f6;
          transition: background 0.2s;
        }

        .table-row:hover {
          background: #f9fafb;
        }

        .frameworks-badges {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .framework-badge {
          display: inline-block;
          padding: 3px 8px;
          background: #eef2ff;
          color: #4f46e5;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .period-text {
          font-size: 13px;
          color: #374151;
        }

        .completeness-display {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .mini-progress {
          flex: 1;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          overflow: hidden;
        }

        .mini-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
          transition: width 0.3s ease;
        }

        .completeness-value {
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          min-width: 40px;
          text-align: right;
        }

        .status-dot {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          color: white;
          text-transform: capitalize;
        }

        .generated-text {
          font-size: 13px;
          color: #6b7280;
        }

        .load-button {
          padding: 6px 16px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 5px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }

        .load-button:hover {
          background: #5568d3;
        }

        @media (max-width: 900px) {
          .table-header,
          .table-row {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .table-header > div:not(:first-child) {
            display: none;
          }

          .table-row > div {
            display: flex;
            justify-content: space-between;
          }

          .table-row > div::before {
            content: attr(class);
            font-weight: 600;
            color: #6b7280;
            text-transform: capitalize;
          }
        }
      `}</style>
    </div>
  );
}
