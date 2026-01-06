/**
 * Audit Mode Toggle Component
 *
 * Enables audit mode for reports:
 * - Freezes UI interactions (read-only)
 * - Shows evidence IDs on hover for all metrics/claims
 * - Displays lineage chain visual indicators
 * - Disables edit/export buttons
 *
 * @module components/reports/AuditModeToggle
 */

import React, { useState, useEffect, createContext, useContext } from 'react';

/**
 * Audit Mode Context
 */
interface AuditModeContextType {
  isAuditMode: boolean;
  enableAuditMode: () => void;
  disableAuditMode: () => void;
  toggleAuditMode: () => void;
  showEvidenceOverlay: (evidenceId: string, position: { x: number; y: number }) => void;
  hideEvidenceOverlay: () => void;
}

const AuditModeContext = createContext<AuditModeContextType | undefined>(undefined);

/**
 * Hook to use audit mode context
 */
export function useAuditMode() {
  const context = useContext(AuditModeContext);
  if (!context) {
    throw new Error('useAuditMode must be used within AuditModeProvider');
  }
  return context;
}

/**
 * Audit Mode Provider Component
 */
export function AuditModeProvider({ children }: { children: React.ReactNode }) {
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [evidenceOverlay, setEvidenceOverlay] = useState<{
    id: string;
    x: number;
    y: number;
  } | null>(null);

  const enableAuditMode = () => {
    setIsAuditMode(true);
    document.body.classList.add('audit-mode');
  };

  const disableAuditMode = () => {
    setIsAuditMode(false);
    document.body.classList.remove('audit-mode');
    setEvidenceOverlay(null);
  };

  const toggleAuditMode = () => {
    if (isAuditMode) {
      disableAuditMode();
    } else {
      enableAuditMode();
    }
  };

  const showEvidenceOverlay = (evidenceId: string, position: { x: number; y: number }) => {
    if (isAuditMode) {
      setEvidenceOverlay({ id: evidenceId, x: position.x, y: position.y });
    }
  };

  const hideEvidenceOverlay = () => {
    setEvidenceOverlay(null);
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      document.body.classList.remove('audit-mode');
    };
  }, []);

  return (
    <AuditModeContext.Provider
      value={{
        isAuditMode,
        enableAuditMode,
        disableAuditMode,
        toggleAuditMode,
        showEvidenceOverlay,
        hideEvidenceOverlay,
      }}
    >
      {children}
      {isAuditMode && evidenceOverlay && (
        <EvidenceTooltip
          evidenceId={evidenceOverlay.id}
          x={evidenceOverlay.x}
          y={evidenceOverlay.y}
        />
      )}
      {isAuditMode && <AuditModeOverlay />}
    </AuditModeContext.Provider>
  );
}

/**
 * Audit Mode Toggle Button
 */
interface AuditModeToggleProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  variant?: 'button' | 'switch';
}

export default function AuditModeToggle({
  position = 'top-right',
  size = 'medium',
  showLabel = true,
  variant = 'button',
}: AuditModeToggleProps) {
  const { isAuditMode, toggleAuditMode } = useAuditMode();

  if (variant === 'switch') {
    return (
      <div
        className={`audit-toggle-switch ${position !== 'inline' ? `fixed ${position}` : ''} ${size}`}
      >
        <label className="switch-container">
          <input
            type="checkbox"
            checked={isAuditMode}
            onChange={toggleAuditMode}
            aria-label="Toggle audit mode"
            role="switch"
            aria-checked={isAuditMode}
          />
          <span className="switch-slider" />
          {showLabel && <span className="switch-label">Audit Mode</span>}
        </label>

        <style jsx>{`
          .audit-toggle-switch {
            z-index: 1000;
          }

          .audit-toggle-switch.fixed {
            position: fixed;
            padding: 12px;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .audit-toggle-switch.top-right {
            top: 80px;
            right: 24px;
          }

          .audit-toggle-switch.top-left {
            top: 80px;
            left: 24px;
          }

          .audit-toggle-switch.bottom-right {
            bottom: 24px;
            right: 24px;
          }

          .audit-toggle-switch.bottom-left {
            bottom: 24px;
            left: 24px;
          }

          .switch-container {
            display: flex;
            align-items: center;
            gap: 12px;
            cursor: pointer;
          }

          .switch-container input {
            display: none;
          }

          .switch-slider {
            position: relative;
            width: 44px;
            height: 24px;
            background: #d1d5db;
            border-radius: 12px;
            transition: background 0.3s;
          }

          .switch-container input:checked + .switch-slider {
            background: #2563eb;
          }

          .switch-slider::before {
            content: '';
            position: absolute;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            top: 2px;
            left: 2px;
            transition: transform 0.3s;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          .switch-container input:checked + .switch-slider::before {
            transform: translateX(20px);
          }

          .switch-label {
            font-size: 0.875rem;
            font-weight: 600;
            color: #111827;
          }

          .audit-toggle-switch.small .switch-slider {
            width: 36px;
            height: 20px;
          }

          .audit-toggle-switch.small .switch-slider::before {
            width: 16px;
            height: 16px;
          }

          .audit-toggle-switch.small .switch-container input:checked + .switch-slider::before {
            transform: translateX(16px);
          }

          .audit-toggle-switch.large .switch-slider {
            width: 52px;
            height: 28px;
          }

          .audit-toggle-switch.large .switch-slider::before {
            width: 24px;
            height: 24px;
          }

          .audit-toggle-switch.large .switch-container input:checked + .switch-slider::before {
            transform: translateX(24px);
          }
        `}</style>
      </div>
    );
  }

  return (
    <button
      className={`audit-toggle-btn ${position !== 'inline' ? `fixed ${position}` : ''} ${size} ${
        isAuditMode ? 'active' : ''
      }`}
      onClick={toggleAuditMode}
      aria-label={isAuditMode ? 'Disable audit mode' : 'Enable audit mode'}
      aria-pressed={isAuditMode}
      role="button"
    >
      <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
        <path
          fillRule="evenodd"
          d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
      {showLabel && <span className="btn-label">Audit Mode</span>}
      {isAuditMode && <span className="active-indicator" aria-hidden="true" />}

      <style jsx>{`
        .audit-toggle-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: white;
          border: 2px solid #d1d5db;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          z-index: 1000;
        }

        .audit-toggle-btn.fixed {
          position: fixed;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .audit-toggle-btn.top-right {
          top: 80px;
          right: 24px;
        }

        .audit-toggle-btn.top-left {
          top: 80px;
          left: 24px;
        }

        .audit-toggle-btn.bottom-right {
          bottom: 24px;
          right: 24px;
        }

        .audit-toggle-btn.bottom-left {
          bottom: 24px;
          left: 24px;
        }

        .audit-toggle-btn:hover {
          background: #f9fafb;
          border-color: #2563eb;
          color: #2563eb;
        }

        .audit-toggle-btn.active {
          background: #2563eb;
          border-color: #2563eb;
          color: white;
          box-shadow: 0 4px 16px rgba(37, 99, 235, 0.3);
        }

        .audit-toggle-btn .icon {
          width: 20px;
          height: 20px;
        }

        .audit-toggle-btn.small {
          padding: 6px 12px;
          font-size: 0.75rem;
        }

        .audit-toggle-btn.small .icon {
          width: 16px;
          height: 16px;
        }

        .audit-toggle-btn.large {
          padding: 14px 20px;
          font-size: 1rem;
        }

        .audit-toggle-btn.large .icon {
          width: 24px;
          height: 24px;
        }

        .active-indicator {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </button>
  );
}

/**
 * Evidence Tooltip (shows on hover in audit mode)
 */
function EvidenceTooltip({ evidenceId, x, y }: { evidenceId: string; x: number; y: number }) {
  const [evidenceData, setEvidenceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch evidence details
    // TODO: Replace with actual API call
    setTimeout(() => {
      setEvidenceData({
        id: evidenceId,
        type: 'survey_response',
        source: 'Q2 2024 Employee Survey',
        timestamp: '2024-06-15T10:30:00Z',
        confidence: 0.92,
        lineage: ['survey_raw', 'data_clean', 'aggregated', 'reported'],
      });
      setLoading(false);
    }, 200);
  }, [evidenceId]);

  return (
    <div
      className="evidence-tooltip"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      role="tooltip"
    >
      {loading ? (
        <div className="loading">Loading evidence...</div>
      ) : (
        <>
          <div className="tooltip-header">
            <strong>Evidence ID:</strong> {evidenceData.id}
          </div>
          <div className="tooltip-content">
            <div className="evidence-field">
              <span className="field-label">Type:</span> {evidenceData.type}
            </div>
            <div className="evidence-field">
              <span className="field-label">Source:</span> {evidenceData.source}
            </div>
            <div className="evidence-field">
              <span className="field-label">Confidence:</span>{' '}
              {(evidenceData.confidence * 100).toFixed(0)}%
            </div>
            <div className="evidence-field">
              <span className="field-label">Lineage:</span>
              <div className="lineage-chain">
                {evidenceData.lineage.map((step: string, index: number) => (
                  <React.Fragment key={step}>
                    <span className="lineage-step">{step}</span>
                    {index < evidenceData.lineage.length - 1 && (
                      <span className="lineage-arrow">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .evidence-tooltip {
          position: fixed;
          z-index: 10000;
          background: white;
          border: 2px solid #2563eb;
          border-radius: 8px;
          padding: 12px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          max-width: 400px;
          pointer-events: none;
          transform: translate(-50%, -100%) translateY(-8px);
        }

        .loading {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .tooltip-header {
          margin-bottom: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 0.875rem;
        }

        .tooltip-header strong {
          color: #2563eb;
        }

        .tooltip-content {
          font-size: 0.875rem;
        }

        .evidence-field {
          margin-bottom: 6px;
        }

        .field-label {
          font-weight: 600;
          color: #6b7280;
        }

        .lineage-chain {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
        }

        .lineage-step {
          padding: 2px 6px;
          background: #e5e7eb;
          border-radius: 4px;
          color: #374151;
        }

        .lineage-arrow {
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
}

/**
 * Audit Mode Overlay (visual indicator)
 */
function AuditModeOverlay() {
  return (
    <div className="audit-mode-overlay" aria-live="polite" role="status">
      <div className="overlay-banner">
        <svg className="icon" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        <span>
          <strong>Audit Mode Active</strong> — UI is read-only. Hover over metrics to see evidence.
        </span>
      </div>

      <style jsx>{`
        .audit-mode-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 999;
          pointer-events: none;
        }

        .overlay-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 24px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          font-size: 0.875rem;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
          animation: slideDown 0.3s ease;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .overlay-banner .icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .overlay-banner strong {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}

/**
 * Auditable Metric Component
 *
 * Wrap any metric/claim with this to make it auditable
 */
export function AuditableMetric({
  children,
  evidenceId,
  evidenceIds,
}: {
  children: React.ReactNode;
  evidenceId?: string;
  evidenceIds?: string[];
}) {
  const { isAuditMode, showEvidenceOverlay, hideEvidenceOverlay } = useAuditMode();
  const ids = evidenceIds || (evidenceId ? [evidenceId] : []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (isAuditMode && ids.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      showEvidenceOverlay(ids[0], {
        x: rect.left + rect.width / 2,
        y: rect.top,
      });
    }
  };

  return (
    <span
      className={`auditable-metric ${isAuditMode ? 'audit-active' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={hideEvidenceOverlay}
      data-evidence-ids={ids.join(',')}
      role={isAuditMode ? 'button' : undefined}
      tabIndex={isAuditMode ? 0 : undefined}
    >
      {children}
      {isAuditMode && ids.length > 0 && (
        <span className="evidence-badge" aria-label={`${ids.length} evidence item(s)`}>
          {ids.length}
        </span>
      )}

      <style jsx>{`
        .auditable-metric {
          position: relative;
          display: inline-block;
        }

        .auditable-metric.audit-active {
          cursor: help;
          padding: 2px 4px;
          margin: -2px -4px;
          border-radius: 4px;
          transition: background 0.2s;
        }

        .auditable-metric.audit-active:hover {
          background: #dbeafe;
        }

        .evidence-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
          margin-left: 4px;
          background: #2563eb;
          color: white;
          font-size: 0.625rem;
          font-weight: 700;
          border-radius: 50%;
          vertical-align: super;
        }
      `}</style>
    </span>
  );
}

// Global styles for audit mode
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    body.audit-mode {
      user-select: none;
    }

    body.audit-mode button:not([aria-label*="audit"]),
    body.audit-mode input:not([type="checkbox"]),
    body.audit-mode textarea,
    body.audit-mode select {
      opacity: 0.5;
      pointer-events: none;
      cursor: not-allowed;
    }

    body.audit-mode [data-export-button],
    body.audit-mode [data-edit-button] {
      opacity: 0.3;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}
