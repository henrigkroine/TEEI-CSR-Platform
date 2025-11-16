/**
 * Presenter Controls - Phase H3-A
 *
 * Control panel for boardroom presentation mode.
 * Provides navigation, evidence toggle, and export functions.
 */

import { useState } from 'react';

interface PresenterControlsProps {
  currentView: 'dashboard' | 'trends' | 'sroi' | 'vis';
  onViewChange: (view: 'dashboard' | 'trends' | 'sroi' | 'vis') => void;
  onToggleEvidence: () => void;
  showEvidence: boolean;
  canExport?: boolean;
  companyId: string;
}

export function PresenterControls({
  currentView,
  onViewChange,
  onToggleEvidence,
  showEvidence,
  canExport = false,
  companyId,
}: PresenterControlsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const views = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '📊' },
    { id: 'trends' as const, label: 'Trends', icon: '📈' },
    { id: 'sroi' as const, label: 'SROI', icon: '💰' },
    { id: 'vis' as const, label: 'VIS', icon: '⭐' },
  ];

  const handleExportPDF = async () => {
    setIsExporting(true);

    try {
      const response = await fetch(`/api/cockpit/${companyId}/export-boardroom-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          view: currentView,
          includeEvidence: showEvidence,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `boardroom-${currentView}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        console.error('PDF export failed:', await response.text());
        alert('Failed to export PDF. Please try again.');
      }
    } catch (error) {
      console.error('PDF export error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="presenter-controls">
      {/* View Navigation */}
      <div className="view-nav">
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={`view-button ${currentView === view.id ? 'active' : ''}`}
            aria-label={`Switch to ${view.label} view`}
            aria-current={currentView === view.id ? 'page' : undefined}
          >
            <span className="view-icon" aria-hidden="true">{view.icon}</span>
            <span className="view-label">{view.label}</span>
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        {/* Evidence Overlay Toggle */}
        <button
          onClick={onToggleEvidence}
          className={`action-button ${showEvidence ? 'active' : ''}`}
          aria-label={showEvidence ? 'Hide Evidence' : 'Show Evidence'}
          aria-pressed={showEvidence}
          title="Toggle evidence overlay (E)"
        >
          <svg
            className="button-icon"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="button-label">Evidence</span>
        </button>

        {/* Export PDF */}
        {canExport && (
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="action-button export-button"
            aria-label="Export as PDF"
            title="Export current view as PDF"
          >
            {isExporting ? (
              <>
                <div className="button-spinner" />
                <span className="button-label">Exporting...</span>
              </>
            ) : (
              <>
                <svg
                  className="button-icon"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="button-label">Export PDF</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="shortcuts-hint">
        <span className="shortcut-item">← → Navigate</span>
        <span className="shortcut-divider">•</span>
        <span className="shortcut-item">E Evidence</span>
        <span className="shortcut-divider">•</span>
        <span className="shortcut-item">R Refresh</span>
        <span className="shortcut-divider">•</span>
        <span className="shortcut-item">Esc Exit</span>
      </div>

      <style>{`
        .presenter-controls {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 24px;
          padding: 16px 24px;
          background: rgba(17, 24, 39, 0.95);
          backdrop-filter: blur(12px);
          border-radius: 16px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: 50;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .view-nav {
          display: flex;
          gap: 8px;
        }

        .view-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .view-button:hover {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateY(-2px);
        }

        .view-button:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .view-button.active {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .view-icon {
          font-size: 18px;
          line-height: 1;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          padding-left: 24px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
        }

        .action-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid transparent;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .action-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          transform: translateY(-2px);
        }

        .action-button:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }

        .action-button.active {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
          border-color: #10b981;
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .button-icon {
          width: 18px;
          height: 18px;
        }

        .button-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .shortcuts-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-left: 24px;
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        .shortcut-item {
          font-family: 'Courier New', monospace;
        }

        .shortcut-divider {
          color: rgba(255, 255, 255, 0.3);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1024px) {
          .presenter-controls {
            flex-direction: column;
            gap: 16px;
            bottom: 16px;
            padding: 12px 16px;
          }

          .action-buttons,
          .shortcuts-hint {
            padding-left: 0;
            border-left: none;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 12px;
          }

          .shortcuts-hint {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
