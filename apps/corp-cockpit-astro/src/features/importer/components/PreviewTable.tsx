import React from 'react';
import type { PreviewResult } from '@teei/shared-types';

interface PreviewTableProps {
  preview: PreviewResult;
}

export function PreviewTable({ preview }: PreviewTableProps) {
  return (
    <div className="preview-table">
      <div className="preview-header">
        <h3>Preview ({preview.rows.length} of {preview.totalRows} rows)</h3>
        <div className="validation-summary">
          <span className="stat valid">{preview.validationSummary.validRows} valid</span>
          <span className="stat error">{preview.validationSummary.errorRows} errors</span>
          <span className="stat warning">{preview.validationSummary.warningRows} warnings</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Status</th>
              <th>Original Data</th>
              <th>Mapped Data</th>
              <th>Issues</th>
            </tr>
          </thead>
          <tbody>
            {preview.rows.map((row) => (
              <tr key={row.rowIndex} className={row.valid ? 'valid' : 'invalid'}>
                <td>{row.rowIndex + 1}</td>
                <td>
                  {row.valid ? (
                    <span className="status-badge valid">✓</span>
                  ) : (
                    <span className="status-badge error">✗</span>
                  )}
                </td>
                <td>
                  <pre>{JSON.stringify(row.originalData, null, 2)}</pre>
                </td>
                <td>
                  <pre>{JSON.stringify(row.mappedData, null, 2)}</pre>
                </td>
                <td>
                  {row.errors.length > 0 && (
                    <ul className="error-list">
                      {row.errors.map((err, i) => (
                        <li key={i} className="error-item">
                          {err.field}: {err.message}
                        </li>
                      ))}
                    </ul>
                  )}
                  {row.warnings.length > 0 && (
                    <ul className="warning-list">
                      {row.warnings.map((warn, i) => (
                        <li key={i} className="warning-item">
                          {warn.field}: {warn.message}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .preview-table {
          background: white;
          border-radius: 0.5rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .preview-header h3 {
          font-weight: 600;
        }

        .validation-summary {
          display: flex;
          gap: 1rem;
        }

        .stat {
          padding: 0.5rem 1rem;
          border-radius: 0.375rem;
          font-weight: 500;
          font-size: 0.875rem;
        }

        .stat.valid {
          background: #d1fae5;
          color: #065f46;
        }

        .stat.error {
          background: #fee2e2;
          color: #991b1b;
        }

        .stat.warning {
          background: #fef3c7;
          color: #92400e;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f9fafb;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #e5e7eb;
        }

        td {
          padding: 0.75rem;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }

        tr.invalid {
          background: #fef2f2;
        }

        .status-badge {
          display: inline-block;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          text-align: center;
          line-height: 24px;
          font-weight: 600;
        }

        .status-badge.valid {
          background: #10b981;
          color: white;
        }

        .status-badge.error {
          background: #ef4444;
          color: white;
        }

        pre {
          background: #f3f4f6;
          padding: 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.75rem;
          overflow-x: auto;
          max-width: 300px;
        }

        .error-list,
        .warning-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .error-item {
          color: #dc2626;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .warning-item {
          color: #d97706;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }
      `}</style>
    </div>
  );
}
