/**
 * Offline Indicator Component
 *
 * Features:
 * - Network status indicator (online/offline)
 * - Last updated timestamp display
 * - Reconnection status and progress
 * - Sync status for pending events
 * - Real-time updates
 */

import { useState, useEffect } from 'react';
import { getPendingEvents, getOfflineMetrics } from '../../utils/offlineStorage';
import type { OfflineMetrics } from '../../utils/offlineStorage';

interface OfflineIndicatorProps {
  className?: string;
  companyId?: string;
  showDetails?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

export default function OfflineIndicator({
  className = '',
  companyId,
  showDetails = false,
  position = 'top-right',
}: OfflineIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [metrics, setMetrics] = useState<OfflineMetrics | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    // Update online status
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(true);
      // Simulate reconnection process
      setTimeout(() => {
        setIsReconnecting(false);
        syncPendingEvents();
      }, 2000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load initial metrics
    loadMetrics();

    // Update metrics periodically
    const metricsInterval = setInterval(loadMetrics, 30000); // Every 30 seconds

    // Update last updated timestamp
    const timestampInterval = setInterval(() => {
      if (lastUpdated) {
        setLastUpdated(lastUpdated); // Trigger re-render
      }
    }, 60000); // Every minute

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(metricsInterval);
      clearInterval(timestampInterval);
    };
  }, [lastUpdated]);

  const loadMetrics = async () => {
    try {
      const offlineMetrics = await getOfflineMetrics();
      setMetrics(offlineMetrics);

      if (offlineMetrics.lastSync) {
        setLastUpdated(offlineMetrics.lastSync);
      }
    } catch (error) {
      console.error('[OfflineIndicator] Failed to load metrics:', error);
    }
  };

  const syncPendingEvents = async () => {
    try {
      const pending = await getPendingEvents(companyId);
      if (pending.length > 0) {
        console.log('[OfflineIndicator] Syncing pending events:', pending.length);
        // Trigger sync event
        window.dispatchEvent(
          new CustomEvent('sync-pending-events', { detail: pending })
        );
      }
      // Update last sync time
      setLastUpdated(Date.now());
      await loadMetrics();
    } catch (error) {
      console.error('[OfflineIndicator] Failed to sync events:', error);
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return 'just now';
    } else if (minutes < 60) {
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (hours < 24) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getStatusColor = () => {
    if (isReconnecting) return '#f59e0b'; // Orange
    return isOnline ? '#22c55e' : '#ef4444'; // Green or Red
  };

  const getStatusText = () => {
    if (isReconnecting) return 'Reconnecting...';
    return isOnline ? 'Online' : 'Offline';
  };

  return (
    <div className={`offline-indicator ${position} ${className}`}>
      <div
        className="status-badge"
        onClick={() => setShowPanel(!showPanel)}
        title={getStatusText()}
      >
        <div
          className="status-dot"
          style={{ backgroundColor: getStatusColor() }}
        />
        {showDetails && (
          <span className="status-text">{getStatusText()}</span>
        )}
        {!isOnline && lastUpdated && (
          <span className="last-updated">
            Last updated: {formatTimestamp(lastUpdated)}
          </span>
        )}
      </div>

      {showPanel && (
        <div className="status-panel">
          <div className="panel-header">
            <h4>Connection Status</h4>
            <button onClick={() => setShowPanel(false)} className="close-button">
              ✕
            </button>
          </div>

          <div className="panel-content">
            <div className="status-row">
              <span className="status-label">Status:</span>
              <span className="status-value" style={{ color: getStatusColor() }}>
                {getStatusText()}
              </span>
            </div>

            {lastUpdated && (
              <div className="status-row">
                <span className="status-label">Last updated:</span>
                <span className="status-value">
                  {formatTimestamp(lastUpdated)}
                </span>
              </div>
            )}

            {metrics && (
              <>
                <div className="status-row">
                  <span className="status-label">Pending events:</span>
                  <span className="status-value">
                    {metrics.pendingEvents}
                    {metrics.pendingEvents > 0 && !isOnline && (
                      <span className="warning-badge">Will sync when online</span>
                    )}
                  </span>
                </div>

                <div className="status-row">
                  <span className="status-label">Cached dashboards:</span>
                  <span className="status-value">{metrics.cachedDashboards}</span>
                </div>

                <div className="status-row">
                  <span className="status-label">Storage used:</span>
                  <span className="status-value">
                    {formatBytes(metrics.storageSize)}
                  </span>
                </div>
              </>
            )}

            {!isOnline && (
              <div className="offline-notice">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                </svg>
                <span>You're working offline. Changes will sync when reconnected.</span>
              </div>
            )}

            {isReconnecting && (
              <div className="reconnecting-notice">
                <div className="spinner" />
                <span>Syncing pending changes...</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .offline-indicator {
          position: fixed;
          z-index: 999;
        }

        .offline-indicator.top-left {
          top: 80px;
          left: 20px;
        }

        .offline-indicator.top-right {
          top: 80px;
          right: 20px;
        }

        .offline-indicator.bottom-left {
          bottom: 20px;
          left: 20px;
        }

        .offline-indicator.bottom-right {
          bottom: 20px;
          right: 20px;
        }

        .status-badge {
          background: white;
          border-radius: 20px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          cursor: pointer;
          transition: box-shadow 0.2s;
        }

        .status-badge:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .status-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .status-text {
          font-size: 14px;
          font-weight: 500;
          color: #1a202c;
        }

        .last-updated {
          font-size: 12px;
          color: #4a5568;
          border-left: 1px solid #e2e8f0;
          padding-left: 8px;
          margin-left: 4px;
        }

        .status-panel {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          width: 320px;
          max-width: calc(100vw - 40px);
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .panel-header {
          padding: 16px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .panel-header h4 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1a202c;
        }

        .close-button {
          background: transparent;
          border: none;
          font-size: 18px;
          color: #4a5568;
          cursor: pointer;
          padding: 4px;
          line-height: 1;
        }

        .close-button:hover {
          color: #1a202c;
        }

        .panel-content {
          padding: 16px;
        }

        .status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          font-size: 14px;
        }

        .status-label {
          color: #4a5568;
          font-weight: 500;
        }

        .status-value {
          color: #1a202c;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .warning-badge {
          background: #fef3c7;
          color: #92400e;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 500;
        }

        .offline-notice {
          margin-top: 16px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 8px;
          display: flex;
          gap: 8px;
          font-size: 13px;
          color: #92400e;
          line-height: 1.4;
        }

        .offline-notice svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .reconnecting-notice {
          margin-top: 16px;
          padding: 12px;
          background: #dbeafe;
          border-radius: 8px;
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 13px;
          color: #1e40af;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #1e40af;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 768px) {
          .offline-indicator {
            top: 10px !important;
            right: 10px !important;
            left: auto !important;
            bottom: auto !important;
          }

          .status-badge {
            padding: 6px 12px;
          }

          .status-text {
            display: none;
          }

          .last-updated {
            font-size: 11px;
          }

          .status-panel {
            right: auto;
            left: 0;
            width: 280px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Compact version for header/nav integration
 */
export function OfflineIndicatorCompact({ className = '' }: { className?: string }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div className={`offline-indicator-compact ${className}`}>
      <div className="offline-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
        </svg>
        <span>Offline</span>
      </div>

      <style jsx>{`
        .offline-indicator-compact {
          display: inline-flex;
        }

        .offline-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #fef3c7;
          color: #92400e;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}
