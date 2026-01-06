/**
 * Export Actions Component
 * Provides buttons for exporting pack as JSON or PDF
 */

import type { RegulatoryPack } from '@teei/shared-types';

interface Props {
  pack: RegulatoryPack;
  onExportJSON: () => void;
  onExportPDF: () => void;
}

export function ExportActions({ pack, onExportJSON, onExportPDF }: Props) {
  const isReady = pack.status === 'ready';

  return (
    <div className="export-actions">
      <h3>Export Pack</h3>
      <p className="export-description">
        Download your regulatory compliance pack in PDF or JSON format.
      </p>

      <div className="export-buttons">
        <button
          onClick={onExportPDF}
          disabled={!isReady}
          className="export-button pdf-button"
          aria-label="Export as PDF"
        >
          <div className="button-icon">
            <PDFIcon />
          </div>
          <div className="button-content">
            <strong>PDF Report</strong>
            <span>Formatted annex with TOC and footnotes</span>
          </div>
        </button>

        <button
          onClick={onExportJSON}
          disabled={!isReady}
          className="export-button json-button"
          aria-label="Export as JSON"
        >
          <div className="button-icon">
            <JSONIcon />
          </div>
          <div className="button-content">
            <strong>JSON Data</strong>
            <span>Machine-readable format for integration</span>
          </div>
        </button>
      </div>

      {!isReady && (
        <div className="export-note">
          <span className="note-icon">ℹ️</span>
          <span>Pack must be ready before exporting</span>
        </div>
      )}

      <div className="export-info">
        <h4>What's included:</h4>
        <ul>
          <li>✓ All selected framework disclosures ({pack.frameworks.join(', ')})</li>
          <li>✓ Evidence citations and lineage</li>
          <li>✓ Completeness scores and status</li>
          <li>✓ Data gaps and recommendations</li>
          <li>✓ Metadata and version information</li>
        </ul>
      </div>

      <style jsx>{`
        .export-actions {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 25px;
          margin-top: 20px;
        }

        .export-actions h3 {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 10px;
        }

        .export-description {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 20px;
        }

        .export-buttons {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
          margin-bottom: 20px;
        }

        .export-button {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 18px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }

        .export-button:hover:not(:disabled) {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
        }

        .export-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .pdf-button .button-icon {
          background: #fef2f2;
          color: #dc2626;
        }

        .json-button .button-icon {
          background: #eff6ff;
          color: #2563eb;
        }

        .button-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .button-content strong {
          font-size: 15px;
          color: #1f2937;
        }

        .button-content span {
          font-size: 13px;
          color: #6b7280;
        }

        .export-note {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 6px;
          font-size: 13px;
          color: #92400e;
          margin-bottom: 20px;
        }

        .note-icon {
          font-size: 18px;
        }

        .export-info {
          padding: 20px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .export-info h4 {
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }

        .export-info ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .export-info li {
          font-size: 13px;
          color: #4b5563;
          padding: 6px 0;
        }
      `}</style>
    </div>
  );
}

function PDFIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );
}

function JSONIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6"></polyline>
      <polyline points="8 6 2 12 8 18"></polyline>
    </svg>
  );
}
