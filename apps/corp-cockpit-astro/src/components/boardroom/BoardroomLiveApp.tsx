/**
 * Boardroom Live App - Phase H3-A
 *
 * Main component for full-screen boardroom presentation mode.
 *
 * Features:
 * - Live SSE updates with automatic polling fallback
 * - Evidence overlay toggle
 * - Offline snapshot capability
 * - Keyboard and remote controls
 * - PDF export with watermarks
 *
 * Acceptance Criteria:
 * - Switch views < 100ms
 * - SSE reconnect < 5s (p95)
 * - Offline snapshot loads < 2.0s
 * - Exported PDF watermarks & citations preserved
 */

import { useState, useEffect, useCallback } from 'react';
import { BoardroomMode } from './BoardroomMode';
import { PresenterControls } from './PresenterControls';
import { EvidenceOverlay } from './EvidenceOverlay';
import { useSSEConnection } from '../../hooks/useSSEConnection';
import { useOfflineSnapshot } from '../../hooks/useOfflineSnapshot';
import { BoardroomMetrics } from './BoardroomMetrics';

interface BoardroomLiveAppProps {
  companyId: string;
  lang: string;
  canExport?: boolean;
}

export default function BoardroomLiveApp({
  companyId,
  lang,
  canExport = false,
}: BoardroomLiveAppProps) {
  // State
  const [isPresenting, setIsPresenting] = useState(false);
  const [showEvidenceOverlay, setShowEvidenceOverlay] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'trends' | 'sroi' | 'vis'>('dashboard');
  const [metricsData, setMetricsData] = useState<any>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // SSE connection with polling fallback
  const {
    state: sseState,
    isConnected: isSSEConnected,
    isPolling,
    lastEventId,
    error: sseError,
    connect: connectSSE,
    disconnect: disconnectSSE,
    subscribe: subscribeToSSE,
  } = useSSEConnection({
    companyId,
    channel: 'cockpit-live',
    autoConnect: isPresenting,
    enablePollingFallback: true,
    pollingInterval: 5000,
    retryOptions: {
      initialDelay: 1000,
      maxDelay: 5000,
      maxRetries: 5,
    },
  });

  // Offline snapshot capability
  const {
    hasSnapshot,
    isLoadingSnapshot,
    snapshotAge,
    saveSnapshot,
    loadSnapshot,
    clearSnapshot,
  } = useOfflineSnapshot({
    companyId,
    key: 'boardroom-live-snapshot',
  });

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      if (isPresenting) {
        connectSSE();
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      // Load offline snapshot if available
      if (hasSnapshot) {
        loadSnapshot().then(data => {
          if (data) {
            setMetricsData(data);
          }
        });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isPresenting, hasSnapshot, connectSSE, loadSnapshot]);

  // Subscribe to SSE messages
  useEffect(() => {
    if (!isPresenting) return;

    const unsubscribe = subscribeToSSE((event) => {
      console.log('[BoardroomLive] SSE message:', event);

      try {
        const data = JSON.parse(event.data);
        setMetricsData(data);

        // Save snapshot for offline use
        saveSnapshot(data);
      } catch (err) {
        console.error('[BoardroomLive] Failed to parse SSE data:', err);
      }
    });

    return unsubscribe;
  }, [isPresenting, subscribeToSSE, saveSnapshot]);

  // Handle presenter mode toggle
  const handleTogglePresenting = useCallback((enabled: boolean) => {
    setIsPresenting(enabled);

    if (enabled) {
      connectSSE();
      // Fetch initial data if not available
      if (!metricsData) {
        fetchInitialData();
      }
    } else {
      disconnectSSE();
    }
  }, [connectSSE, disconnectSSE, metricsData]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    try {
      const response = await fetch(`/api/cockpit/${companyId}/live-metrics`);
      if (response.ok) {
        const data = await response.json();
        setMetricsData(data);
        saveSnapshot(data);
      }
    } catch (err) {
      console.error('[BoardroomLive] Failed to fetch initial data:', err);

      // Try loading from snapshot
      if (hasSnapshot) {
        const snapshotData = await loadSnapshot();
        if (snapshotData) {
          setMetricsData(snapshotData);
        }
      }
    }
  }, [companyId, saveSnapshot, hasSnapshot, loadSnapshot]);

  // Handle data refresh
  const handleRefresh = useCallback(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Handle view changes (< 100ms requirement)
  const handleViewChange = useCallback((view: typeof currentView) => {
    // Performance: measure view switch time
    const startTime = performance.now();
    setCurrentView(view);

    requestAnimationFrame(() => {
      const switchTime = performance.now() - startTime;
      console.log(`[BoardroomLive] View switch time: ${switchTime.toFixed(2)}ms`);

      if (switchTime > 100) {
        console.warn('[BoardroomLive] View switch exceeded 100ms budget');
      }
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    if (!isPresenting) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'PageDown':
          event.preventDefault();
          // Cycle to next view
          const views: typeof currentView[] = ['dashboard', 'trends', 'sroi', 'vis'];
          const currentIndex = views.indexOf(currentView);
          handleViewChange(views[(currentIndex + 1) % views.length]);
          break;

        case 'ArrowLeft':
        case 'PageUp':
          event.preventDefault();
          // Cycle to previous view
          const viewsList: typeof currentView[] = ['dashboard', 'trends', 'sroi', 'vis'];
          const currentIdx = viewsList.indexOf(currentView);
          handleViewChange(viewsList[(currentIdx - 1 + viewsList.length) % viewsList.length]);
          break;

        case 'e':
        case 'E':
          // Toggle evidence overlay
          setShowEvidenceOverlay(prev => !prev);
          break;

        case 'r':
        case 'R':
          // Refresh data
          handleRefresh();
          break;

        case 'Escape':
          // Exit handled by BoardroomMode component
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresenting, currentView, handleViewChange, handleRefresh]);

  // Connection status indicator
  const connectionStatus = isOffline
    ? 'offline'
    : isSSEConnected
    ? 'sse'
    : isPolling
    ? 'polling'
    : 'disconnected';

  return (
    <div className="boardroom-live-wrapper">
      <BoardroomMode
        enabled={isPresenting}
        onToggle={handleTogglePresenting}
        onRefresh={handleRefresh}
        refreshInterval={60000}
      >
        {/* Connection Status Banner */}
        {isPresenting && (
          <div className={`connection-banner connection-${connectionStatus}`}>
            {connectionStatus === 'offline' && (
              <>
                🔌 Offline Mode
                {hasSnapshot && ` - Using snapshot from ${snapshotAge}`}
              </>
            )}
            {connectionStatus === 'polling' && (
              <>
                🔄 Polling Mode - SSE unavailable, using fallback
              </>
            )}
            {connectionStatus === 'sse' && (
              <>
                ✅ Live Updates - Connected via SSE
              </>
            )}
            {connectionStatus === 'disconnected' && (
              <>
                ⚠️ Disconnected - Reconnecting...
              </>
            )}
          </div>
        )}

        {/* Presenter Controls */}
        {isPresenting && (
          <PresenterControls
            currentView={currentView}
            onViewChange={handleViewChange}
            onToggleEvidence={() => setShowEvidenceOverlay(prev => !prev)}
            showEvidence={showEvidenceOverlay}
            canExport={canExport}
            companyId={companyId}
          />
        )}

        {/* Main Content */}
        {metricsData && (
          <BoardroomMetrics
            data={metricsData}
            currentView={currentView}
            showEvidenceOverlay={showEvidenceOverlay}
            lang={lang}
          />
        )}

        {/* Evidence Overlay */}
        {isPresenting && showEvidenceOverlay && (
          <EvidenceOverlay
            data={metricsData}
            currentView={currentView}
            onClose={() => setShowEvidenceOverlay(false)}
          />
        )}

        {/* Loading indicator */}
        {!metricsData && (
          <div className="loading-metrics">
            <div className="spinner-large"></div>
            <p>Loading metrics...</p>
          </div>
        )}
      </BoardroomMode>

      <style>{`
        .boardroom-live-wrapper {
          width: 100%;
          height: 100%;
        }

        .connection-banner {
          position: fixed;
          top: 80px;
          left: 50%;
          transform: translateX(-50%);
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          z-index: 100;
          backdrop-filter: blur(8px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transition: all 0.3s ease;
        }

        .connection-sse {
          background: rgba(16, 185, 129, 0.9);
          color: white;
        }

        .connection-polling {
          background: rgba(251, 191, 36, 0.9);
          color: #111827;
        }

        .connection-offline {
          background: rgba(239, 68, 68, 0.9);
          color: white;
        }

        .connection-disconnected {
          background: rgba(156, 163, 175, 0.9);
          color: white;
        }

        .loading-metrics {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 60vh;
          color: white;
        }

        .spinner-large {
          width: 64px;
          height: 64px;
          border: 6px solid rgba(255, 255, 255, 0.1);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1.5rem;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
