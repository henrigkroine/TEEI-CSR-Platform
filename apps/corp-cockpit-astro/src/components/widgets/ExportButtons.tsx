import { useState } from 'react';

interface Props {
  companyId: string;
  period?: string;
}

export default function ExportButtons({ companyId, period }: Props) {
  const [exporting, setExporting] = useState(false);

  async function handleExport(format: 'csv' | 'json') {
    setExporting(true);
    try {
      const url = `http://localhost:3001/export/csrd?format=${format}${period ? `&period=${period}` : ''}`;
      const response = await fetch(url);

      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `csrd_export_${period || 'all-time'}.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        alert('Export failed. Please try again.');
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="widget export-buttons">
      <h2>📥 Export Data</h2>
      <p className="subtitle">CSRD Compliance Reports</p>

      <div className="export-options">
        <button
          onClick={() => handleExport('csv')}
          disabled={exporting}
          className="export-btn csv"
        >
          <span className="icon">📊</span>
          <div>
            <div className="btn-title">Export CSV</div>
            <div className="btn-desc">Spreadsheet format</div>
          </div>
        </button>

        <button
          onClick={() => handleExport('json')}
          disabled={exporting}
          className="export-btn json"
        >
          <span className="icon">💾</span>
          <div>
            <div className="btn-title">Export JSON</div>
            <div className="btn-desc">API-ready format</div>
          </div>
        </button>
      </div>

      <div className="export-info">
        <p><strong>Includes:</strong></p>
        <ul>
          <li>Volunteer hours and participation</li>
          <li>Outcome metrics (integration, language, job readiness)</li>
          <li>SROI calculations</li>
          <li>VIS leaderboard</li>
        </ul>
      </div>

      <style>{`
        .export-buttons {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .export-buttons h2 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .subtitle {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 24px;
        }

        .export-options {
          display: grid;
          gap: 16px;
          margin-bottom: 24px;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .export-btn:hover:not(:disabled) {
          border-color: #0066cc;
          transform: translateY(-2px);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .export-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .export-btn .icon {
          font-size: 2rem;
        }

        .btn-title {
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .btn-desc {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .export-info {
          padding: 16px;
          background: #f9fafb;
          border-radius: 6px;
          font-size: 0.875rem;
        }

        .export-info p {
          margin-bottom: 8px;
          color: #374151;
        }

        .export-info ul {
          margin: 0;
          padding-left: 20px;
        }

        .export-info li {
          color: #6b7280;
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
