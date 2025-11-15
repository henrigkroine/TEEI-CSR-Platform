/**
 * Boardroom View Component
 *
 * Full-screen dashboard optimized for executive presentations.
 * Integrates SSE for live updates with offline fallback.
 * Features large typography, connection status, and accessibility.
 *
 * @module BoardroomView
 */

import { useEffect, useState, useCallback } from 'react';
import { useSSE } from '../../hooks/useSSE';
import {
  useSnapshotManager,
  formatRelativeTime,
} from '../../hooks/useSnapshotManager';
import { ConnectionIndicator } from './ConnectionIndicator';
import KPICard from '../KPICard';

export interface BoardroomViewProps {
  /** Company ID for scoping */
  companyId: string;
  /** SSE endpoint URL */
  sseUrl?: string;
  /** Auto-refresh interval in seconds */
  autoRefreshInterval?: number;
  /** Stale data timeout in seconds */
  staleTimeout?: number;
  /** Callback when exit button clicked */
  onExit?: () => void;
  /** Custom title */
  title?: string;
}

export function BoardroomView({
  companyId,
  sseUrl = '/api/sse/metrics',
  autoRefreshInterval = 30,
  staleTimeout = 5 * 60, // 5 minutes
  onExit,
  title = 'TEEI Corporate Cockpit - Boardroom Mode',
}: BoardroomViewProps) {
  // SSE connection
  const sse = useSSE({
    url: sseUrl,
    companyId,
    autoConnect: true,
    maxReconnectAttempts: 10,
    baseDelay: 2000,
    maxDelay: 32000,
  });

  // Offline snapshot management
  const snapshot = useSnapshotManager(companyId, staleTimeout * 1000);

  // State
  const [refreshTimer, setRefreshTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // Update snapshot when new data arrives
  useEffect(() => {
    if (sse.data) {
      snapshot.updateSnapshot(sse.data);
    }
  }, [sse.data, snapshot]);

  // Auto-refresh on interval
  useEffect(() => {
    if (sse.isConnected && autoRefreshInterval > 0) {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }

      const timer = setInterval(() => {
        sse.reconnect();
      }, autoRefreshInterval * 1000);

      setRefreshTimer(timer);

      return () => {
        clearInterval(timer);
      };
    }

    return () => {
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [sse.isConnected, autoRefreshInterval, sse]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Escape to exit
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      }

      // B to toggle boardroom (optional)
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        handleExit();
      }

      // R to manual refresh
      if (e.key === 'r' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        sse.reconnect();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [sse, onExit]);

  const handleExit = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
    if (onExit) {
      onExit();
    }
  }, [onExit]);

  // Determine display data
  const displayData = snapshot.data || sse.data;
  const lastUpdateTime = snapshot.timestamp;
  const isStale = snapshot.isStale;

  return (
    <div
      className="boardroom-container"
      role="main"
      aria-label="Boardroom mode dashboard"
    >
      {/* Header with Status Bar */}
      <header className="boardroom-header">
        <div className="boardroom-header-content">
          {/* Left: Title */}
          <div className="boardroom-title-section">
            <h1 className="boardroom-title">{title}</h1>
            <span className="boardroom-badge">LIVE DISPLAY</span>
          </div>

          {/* Center: Connection Status and Last Update */}
          <div className="boardroom-status-section" role="status">
            <ConnectionIndicator
              state={sse.state}
              retryAttempt={sse.retryAttempt}
              maxRetries={sse.maxRetries}
              className="boardroom-status"
            />
            <div className="boardroom-last-updated">
              Last updated:{' '}
              <time dateTime={new Date(lastUpdateTime).toISOString()}>
                {formatRelativeTime(lastUpdateTime)}
              </time>
            </div>
          </div>

          {/* Right: Exit Button */}
          <div className="boardroom-controls">
            <button
              onClick={handleExit}
              className="boardroom-exit-button"
              aria-label="Exit boardroom mode (press Escape)"
              title="Press Escape to exit"
            >
              Exit (Esc)
            </button>
          </div>
        </div>

        {/* Stale Data Banner */}
        {isStale && (
          <div
            role="alert"
            className="boardroom-stale-banner"
            aria-live="assertive"
          >
            <span className="stale-icon">⚠️</span>
            <span className="stale-message">
              STALE DATA - No live updates for {snapshot.secondsSinceUpdate}
              seconds
            </span>
            {sse.state === 'connected' && (
              <button
                onClick={() => sse.reconnect()}
                className="stale-action"
                aria-label="Resume live updates"
              >
                Resume Live Updates
              </button>
            )}
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="boardroom-main">
        {displayData ? (
          <div className="boardroom-content">
            {/* KPI Grid */}
            {displayData.kpis && (
              <section
                className="boardroom-kpi-grid"
                aria-label="Key performance indicators"
              >
                {Object.entries(displayData.kpis).map(([key, value]: [string, any]) => (
                  <div key={key} className="boardroom-kpi-card-wrapper">
                    <KPICard
                      title={key.replace(/_/g, ' ').toUpperCase()}
                      value={typeof value === 'object' ? value.value : value}
                      subtitle={
                        typeof value === 'object'
                          ? value.subtitle
                          : undefined
                      }
                      trend={
                        typeof value === 'object' ? value.trend : undefined
                      }
                      className="boardroom-kpi-card"
                    />
                  </div>
                ))}
              </section>
            )}

            {/* Summary Section */}
            {displayData.summary && (
              <section
                className="boardroom-summary"
                aria-label="Dashboard summary"
              >
                <h2 className="boardroom-summary-title">Summary</h2>
                <p className="boardroom-summary-text">
                  {displayData.summary}
                </p>
              </section>
            )}

            {/* Charts Section */}
            {displayData.charts && (
              <section
                className="boardroom-charts"
                aria-label="Dashboard charts"
              >
                <h2 className="boardroom-charts-title">Trends</h2>
                <div className="boardroom-charts-grid">
                  {displayData.charts.map((chart: any, idx: number) => (
                    <div
                      key={idx}
                      className="boardroom-chart-container"
                      role="img"
                      aria-label={chart.title}
                    >
                      <h3 className="boardroom-chart-title">{chart.title}</h3>
                      <div className="boardroom-chart-placeholder">
                        {/* Chart would be rendered here */}
                        <p>Chart: {chart.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div
            className="boardroom-no-data"
            role="status"
            aria-live="polite"
          >
            <p>Loading metrics...</p>
            {sse.error && (
              <p className="boardroom-error">
                Error: {sse.error.message}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="boardroom-footer">
        <div className="boardroom-footer-content">
          <span>Auto-refresh: Every {autoRefreshInterval}s</span>
          <span>•</span>
          <span>Press ESC to exit or Ctrl+B to toggle</span>
          <span>•</span>
          <span>Ctrl+R to manually refresh</span>
        </div>
      </footer>

      {/* Styles */}
      <style>{`
        .boardroom-container {
          position: fixed;
          inset: 0;
          z-50;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
          color: white;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        /* Header Styles */
        .boardroom-header {
          background: rgba(15, 23, 42, 0.95);
          border-bottom: 2px solid rgba(100, 116, 139, 0.3);
          padding: 0;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .boardroom-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 2rem;
          gap: 2rem;
        }

        .boardroom-title-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-shrink: 0;
        }

        .boardroom-title {
          font-size: 2rem;
          font-weight: 700;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .boardroom-badge {
          background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3);
        }

        .boardroom-status-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          flex: 1;
          justify-content: center;
        }

        .boardroom-status {
          font-size: 1.125rem !important;
          padding: 0.75rem 1.25rem !important;
        }

        .boardroom-last-updated {
          font-size: 1.125rem;
          color: rgba(226, 232, 240, 0.8);
          font-weight: 500;
          white-space: nowrap;
        }

        .boardroom-controls {
          display: flex;
          gap: 1rem;
          flex-shrink: 0;
        }

        .boardroom-exit-button {
          background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 0.5rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
        }

        .boardroom-exit-button:hover {
          background: linear-gradient(135deg, #b91c1c 0%, #7f1d1d 100%);
          box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5);
          transform: translateY(-2px);
        }

        .boardroom-exit-button:active {
          transform: translateY(0);
        }

        .boardroom-exit-button:focus-visible {
          outline: 2px solid #fbbf24;
          outline-offset: 2px;
        }

        /* Stale Data Banner */
        .boardroom-stale-banner {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 1.25rem 2rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 1.25rem;
          font-weight: 600;
          border-top: 2px solid rgba(245, 158, 11, 0.5);
        }

        .stale-icon {
          font-size: 1.75rem;
          animation: pulse 2s infinite;
        }

        .stale-message {
          flex: 1;
        }

        .stale-action {
          background: rgba(255, 255, 255, 0.25);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 0.625rem 1.25rem;
          border-radius: 0.375rem;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .stale-action:hover {
          background: rgba(255, 255, 255, 0.35);
          border-color: rgba(255, 255, 255, 0.7);
        }

        .stale-action:focus-visible {
          outline: 2px solid white;
          outline-offset: 2px;
        }

        /* Main Content */
        .boardroom-main {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
        }

        .boardroom-content {
          display: flex;
          flex-direction: column;
          gap: 3rem;
        }

        /* KPI Grid */
        .boardroom-kpi-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
          gap: 2rem;
          width: 100%;
        }

        .boardroom-kpi-card-wrapper {
          width: 100%;
        }

        .boardroom-kpi-card {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%) !important;
          border: 1px solid rgba(148, 163, 184, 0.2) !important;
          border-radius: 1rem !important;
          padding: 2rem !important;
          min-height: 200px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .boardroom-kpi-card:hover {
          border-color: rgba(148, 163, 184, 0.4) !important;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
          transform: translateY(-2px);
        }

        .boardroom-kpi-card p {
          color: rgba(226, 232, 240, 0.8) !important;
        }

        /* Override KPI Card styles for large display */
        .boardroom-kpi-card p:first-child {
          font-size: 1.125rem !important;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem !important;
        }

        .boardroom-kpi-card p:nth-child(2) {
          font-size: 3.5rem !important;
          font-weight: 800 !important;
          color: white !important;
          margin-bottom: 1rem !important;
          line-height: 1;
        }

        /* Summary Section */
        .boardroom-summary {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        }

        .boardroom-summary-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: white;
        }

        .boardroom-summary-text {
          font-size: 1.5rem;
          line-height: 1.6;
          color: rgba(226, 232, 240, 0.9);
        }

        /* Charts Section */
        .boardroom-charts {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .boardroom-charts-title {
          font-size: 2rem;
          font-weight: 700;
          color: white;
          margin: 0;
        }

        .boardroom-charts-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
        }

        .boardroom-chart-container {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 1rem;
          padding: 2rem;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
          min-height: 300px;
        }

        .boardroom-chart-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          color: white;
        }

        .boardroom-chart-placeholder {
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(148, 163, 184, 0.1);
          border-radius: 0.5rem;
          color: rgba(226, 232, 240, 0.6);
          font-size: 1rem;
        }

        /* No Data State */
        .boardroom-no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          color: rgba(226, 232, 240, 0.6);
          text-align: center;
          font-size: 1.5rem;
        }

        .boardroom-error {
          color: #fca5a5;
          margin-top: 1rem;
          font-size: 1rem;
        }

        /* Footer */
        .boardroom-footer {
          background: rgba(15, 23, 42, 0.95);
          border-top: 1px solid rgba(100, 116, 139, 0.3);
          padding: 1rem 2rem;
          text-align: center;
          font-size: 0.875rem;
          color: rgba(226, 232, 240, 0.7);
        }

        .boardroom-footer-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        /* Scrollbar Styling */
        .boardroom-main::-webkit-scrollbar {
          width: 12px;
        }

        .boardroom-main::-webkit-scrollbar-track {
          background: rgba(30, 41, 59, 0.5);
        }

        .boardroom-main::-webkit-scrollbar-thumb {
          background: rgba(100, 116, 139, 0.5);
          border-radius: 6px;
        }

        .boardroom-main::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }

        /* Animations */
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }

        /* Screen Reader Only */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }

        /* High Contrast Mode Support */
        @media (prefers-contrast: more) {
          .boardroom-kpi-card {
            border-width: 2px !important;
          }

          .boardroom-exit-button {
            border: 2px solid white;
          }

          .stale-action {
            border-width: 2px;
          }
        }

        /* Reduced Motion Support */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }

          .stale-icon {
            animation: none;
          }
        }

        /* Mobile/Tablet Responsiveness */
        @media (max-width: 1200px) {
          .boardroom-header-content {
            flex-wrap: wrap;
            padding: 1rem;
          }

          .boardroom-title {
            font-size: 1.5rem;
          }

          .boardroom-kpi-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }

          .boardroom-kpi-card p:nth-child(2) {
            font-size: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}
