/**
 * ExportBenchmarks Component
 *
 * Provides export functionality for benchmark data in CSV and PDF formats
 */

import { useState } from 'react';

interface Props {
  companyId: string;
  lang: string;
}

type ExportFormat = 'csv' | 'pdf';

export default function ExportBenchmarks({ companyId, lang }: Props) {
  const [isExporting, setIsExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport(format: ExportFormat) {
    setIsExporting(true);
    setError(null);
    setShowMenu(false);

    try {
      // Get current filters from window state (set by BenchmarkFilters component)
      const filters = (window as any).currentBenchmarkFilters || {};

      // Build query params
      const params = new URLSearchParams({
        format,
        lang,
        ...filters,
      });

      const baseUrl = import.meta.env.PUBLIC_REPORTING_API_URL || '';
      const url = `${baseUrl}/api/companies/${companyId}/benchmarks/export?${params.toString()}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Get filename from Content-Disposition header or create default
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="?(.+)"?/i);
      const filename =
        filenameMatch?.[1] ||
        `benchmarks-${companyId}-${new Date().toISOString().split('T')[0]}.${format}`;

      // Download file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      // Show success message briefly
      const successMsg = document.createElement('div');
      successMsg.className = 'export-success-toast';
      successMsg.textContent = `${format.toUpperCase()} export completed!`;
      document.body.appendChild(successMsg);
      setTimeout(() => {
        successMsg.remove();
      }, 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="export-benchmarks">
      <button
        className="export-btn"
        onClick={() => setShowMenu(!showMenu)}
        disabled={isExporting}
        aria-haspopup="menu"
        aria-expanded={showMenu}
      >
        {isExporting ? (
          <>
            <span className="spinner-small"></span>
            Exporting...
          </>
        ) : (
          <>
            <span className="icon">⬇</span>
            Export
          </>
        )}
      </button>

      {showMenu && !isExporting && (
        <div className="export-menu" role="menu">
          <button
            className="menu-item"
            onClick={() => handleExport('csv')}
            role="menuitem"
          >
            <span className="format-icon">📊</span>
            <div className="menu-item-text">
              <div className="format-name">Export as CSV</div>
              <div className="format-desc">Spreadsheet format for data analysis</div>
            </div>
          </button>

          <button
            className="menu-item"
            onClick={() => handleExport('pdf')}
            role="menuitem"
          >
            <span className="format-icon">📄</span>
            <div className="menu-item-text">
              <div className="format-name">Export as PDF</div>
              <div className="format-desc">Formatted report with charts</div>
            </div>
          </button>
        </div>
      )}

      {error && (
        <div className="export-error" role="alert">
          {error}
        </div>
      )}

      <style>{`
        .export-benchmarks {
          position: relative;
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1rem;
          background: #3b82f6;
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .export-btn:hover:not(:disabled) {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .export-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .export-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .export-btn .icon {
          font-size: 1rem;
        }

        .spinner-small {
          display: inline-block;
          width: 1rem;
          height: 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .export-menu {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
          min-width: 280px;
          z-index: 1000;
          animation: slideDown 0.2s ease;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .menu-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          width: 100%;
          padding: 0.875rem 1rem;
          border: none;
          background: white;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid #f3f4f6;
        }

        .menu-item:last-child {
          border-bottom: none;
        }

        .menu-item:hover {
          background: #f9fafb;
        }

        .menu-item:focus {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
          z-index: 1;
        }

        .format-icon {
          font-size: 1.5rem;
          line-height: 1;
        }

        .menu-item-text {
          flex: 1;
        }

        .format-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.125rem;
        }

        .format-desc {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .export-error {
          position: absolute;
          top: calc(100% + 0.5rem);
          right: 0;
          background: #fee2e2;
          color: #991b1b;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          border: 1px solid #fca5a5;
          font-size: 0.875rem;
          white-space: nowrap;
          z-index: 1000;
          animation: slideDown 0.2s ease;
        }

        /* Global toast style */
        :global(.export-success-toast) {
          position: fixed;
          bottom: 2rem;
          right: 2rem;
          background: #10b981;
          color: white;
          padding: 1rem 1.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          font-size: 0.875rem;
          font-weight: 500;
          z-index: 9999;
          animation: slideUp 0.3s ease;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(1rem);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 640px) {
          .export-menu {
            right: auto;
            left: 0;
            min-width: 100%;
          }

          :global(.export-success-toast) {
            left: 1rem;
            right: 1rem;
            bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
