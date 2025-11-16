/**
 * Boardroom View Component
 *
<<<<<<< HEAD
 * Full-screen display mode optimized for executive presentations
 * with SSE integration, offline cache support, and auto-cycling.
 *
 * Features:
 * - Full-screen layout (no nav, max viewport usage)
 * - Auto-cycle through dashboard widgets every 30 seconds
 * - Pause/resume controls (spacebar or button)
 * - "Live" indicator with SSE connection status
 * - "Stale data" banner when offline >5 minutes
 * - Exit button (returns to main cockpit)
 * - Keyboard shortcuts (spacebar = pause, Esc = exit)
=======
 * Full-screen dashboard optimized for executive presentations.
 * Integrates SSE for live updates with offline fallback.
 * Features large typography, connection status, and accessibility.
>>>>>>> origin/claude/worker3-phaseE-cockpit-polish-01DEt2S7UMEooTBJBivWKcpD
 *
 * @module BoardroomView
 */

<<<<<<< HEAD
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  createSSEResumeClient,
  type SSEConnectionState,
} from '../../lib/boardroom/sseResume';
import {
  getLastDataset,
  saveLastDataset,
  getCacheStatus,
  formatCacheAge,
  isIndexedDBAvailable,
  type DashboardData,
  type CacheStatus,
} from '../../lib/boardroom/offlineCache';
import {
  createAutoCycleController,
  type AutoCycleController,
} from '../../lib/boardroom/autoCycle';

// Import dashboard widgets
import AtAGlance from '../widgets/AtAGlance';
import SROIPanel from '../widgets/SROIPanel';
import VISPanel from '../widgets/VISPanel';
import Q2QFeed from '../widgets/Q2QFeed';

export interface BoardroomViewProps {
  /** Company identifier */
  companyId: string;
  /** Language locale (en, uk, no) */
  lang: string;
  /** SSE endpoint URL (default: /api/sse/dashboard) */
  sseUrl?: string;
  /** Auto-cycle interval in milliseconds (default: 30000 = 30s) */
  cycleInterval?: number;
  /** Auto-start cycling (default: true) */
  autoStart?: boolean;
  /** Enable offline cache (default: true) */
  enableOfflineCache?: boolean;
  /** Stale data threshold in milliseconds (default: 300000 = 5 minutes) */
  staleThreshold?: number;
}

interface DashboardMetrics {
  sroi?: number;
  vis?: number;
  activeParticipants?: number;
  integrationScore?: number;
  lastUpdated?: number;
  [key: string]: unknown;
}

/**
 * Widget configuration for auto-cycling
 */
const WIDGET_VIEWS = [
  { id: 'overview', name: 'Overview', component: 'AtAGlance' },
  { id: 'sroi', name: 'SROI Analysis', component: 'SROIPanel' },
  { id: 'vis', name: 'VIS Score', component: 'VISPanel' },
  { id: 'q2q', name: 'Recent Activity', component: 'Q2QFeed' },
] as const;

export default function BoardroomView({
  companyId,
  lang,
  sseUrl = '/api/sse/dashboard',
  cycleInterval = 30000,
  autoStart = true,
  enableOfflineCache = true,
  staleThreshold = 5 * 60 * 1000, // 5 minutes
}: BoardroomViewProps) {
  // State management
  const [currentViewIndex, setCurrentViewIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(!autoStart);
  const [connectionState, setConnectionState] = useState<SSEConnectionState>('disconnected');
  const [dashboardData, setDashboardData] = useState<DashboardMetrics | null>(null);
  const [cacheStatus, setCacheStatus] = useState<CacheStatus | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [showControls, setShowControls] = useState(false);

  // Refs for cleanup
  const sseClientRef = useRef<ReturnType<typeof createSSEResumeClient> | null>(null);
  const autoCycleRef = useRef<AutoCycleController | null>(null);
  const staleCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load cached data on mount
   */
  useEffect(() => {
    if (!enableOfflineCache || !isIndexedDBAvailable()) {
      return;
    }

    async function loadCachedData() {
      try {
        const cached = await getLastDataset(companyId);
        if (cached && cached.data) {
          console.log('[BoardroomView] Loaded cached data', {
            age: Date.now() - cached.timestamp,
          });
          setDashboardData(cached.data as DashboardMetrics);
          setLastUpdateTime(cached.timestamp);

          // Get cache status
          const status = await getCacheStatus(companyId);
          setCacheStatus(status);
        }
      } catch (error) {
        console.error('[BoardroomView] Failed to load cached data:', error);
      }
    }

    loadCachedData();
  }, [companyId, enableOfflineCache]);

  /**
   * Initialize SSE connection
   */
  useEffect(() => {
    console.log('[BoardroomView] Initializing SSE connection');

    const client = createSSEResumeClient({
      url: sseUrl,
      companyId,
      channel: 'boardroom',
      onMessage: async (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[BoardroomView] Received SSE update:', data);

          setDashboardData(data);
          setLastUpdateTime(Date.now());
          setIsStale(false);

          // Save to cache
          if (enableOfflineCache && isIndexedDBAvailable()) {
            await saveLastDataset(companyId, data);
            const status = await getCacheStatus(companyId);
            setCacheStatus(status);
          }
        } catch (error) {
          console.error('[BoardroomView] Failed to parse SSE message:', error);
        }
      },
      onConnectionChange: (state: SSEConnectionState) => {
        console.log('[BoardroomView] SSE connection state:', state);
        setConnectionState(state);
      },
      onError: (error: Event) => {
        console.error('[BoardroomView] SSE error:', error);
      },
    });

    sseClientRef.current = client;
    client.connect();

    return () => {
      console.log('[BoardroomView] Disconnecting SSE');
      client.disconnect();
    };
  }, [companyId, sseUrl, enableOfflineCache]);

  /**
   * Initialize auto-cycle controller
   */
  useEffect(() => {
    console.log('[BoardroomView] Initializing auto-cycle controller');

    const controller = createAutoCycleController({
      itemCount: WIDGET_VIEWS.length,
      interval: cycleInterval,
      initialIndex: currentViewIndex,
      autoStart: !isPaused,
      onCycleChange: (index: number) => {
        console.log('[BoardroomView] Cycling to view:', WIDGET_VIEWS[index].name);
        setCurrentViewIndex(index);
      },
      onPauseChange: (paused: boolean) => {
        console.log('[BoardroomView] Auto-cycle paused:', paused);
        setIsPaused(paused);
      },
    });

    autoCycleRef.current = controller;

    return () => {
      console.log('[BoardroomView] Destroying auto-cycle controller');
      controller.destroy();
    };
  }, [cycleInterval]);

  /**
   * Check for stale data
   */
  useEffect(() => {
    function checkStaleData() {
      const age = Date.now() - lastUpdateTime;
      setIsStale(age > staleThreshold);
    }

    // Check immediately
    checkStaleData();

    // Check every 30 seconds
    staleCheckIntervalRef.current = setInterval(checkStaleData, 30000);

    return () => {
      if (staleCheckIntervalRef.current) {
        clearInterval(staleCheckIntervalRef.current);
      }
    };
  }, [lastUpdateTime, staleThreshold]);

  /**
   * Keyboard shortcuts
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      switch (event.key) {
        case ' ':
          event.preventDefault();
          handleTogglePause();
          break;
        case 'Escape':
          event.preventDefault();
          handleExit();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          handlePrevious();
          break;
        case 'ArrowRight':
          event.preventDefault();
          handleNext();
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  /**
   * Handle pause/resume toggle
   */
  const handleTogglePause = useCallback(() => {
    if (autoCycleRef.current) {
      autoCycleRef.current.togglePause();
    }
  }, []);

  /**
   * Handle exit to main cockpit
   */
  const handleExit = useCallback(() => {
    window.location.href = `/${lang}/cockpit/${companyId}`;
  }, [lang, companyId]);

  /**
   * Handle manual navigation
   */
  const handleNext = useCallback(() => {
    if (autoCycleRef.current) {
      autoCycleRef.current.next();
    }
  }, []);

  const handlePrevious = useCallback(() => {
    if (autoCycleRef.current) {
      autoCycleRef.current.previous();
    }
  }, []);

  /**
   * Render current widget
   */
  const renderCurrentWidget = () => {
    const currentView = WIDGET_VIEWS[currentViewIndex];

    switch (currentView.component) {
      case 'AtAGlance':
        return <AtAGlance companyId={companyId} />;
      case 'SROIPanel':
        return <SROIPanel companyId={companyId} />;
      case 'VISPanel':
        return <VISPanel companyId={companyId} />;
      case 'Q2QFeed':
        return <Q2QFeed companyId={companyId} limit={10} />;
      default:
        return <div className="text-2xl">Unknown widget</div>;
    }
  };

  /**
   * Get connection status display
   */
  const getConnectionStatus = () => {
    switch (connectionState) {
      case 'connected':
        return { text: 'Live', color: 'bg-green-500', pulse: true };
      case 'connecting':
      case 'reconnecting':
        return { text: 'Connecting...', color: 'bg-yellow-500', pulse: true };
      case 'disconnected':
        return { text: 'Offline', color: 'bg-gray-500', pulse: false };
      case 'failed':
        return { text: 'Connection Failed', color: 'bg-red-500', pulse: false };
      default:
        return { text: 'Unknown', color: 'bg-gray-500', pulse: false };
    }
  };

  const connectionStatus = getConnectionStatus();
  const currentView = WIDGET_VIEWS[currentViewIndex];

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-900 text-white overflow-auto boardroom-container"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Header */}
      <header
        className={`fixed top-0 left-0 right-0 bg-gray-800/95 backdrop-blur shadow-lg z-10 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="max-w-full px-8 py-4 flex items-center justify-between">
          {/* Branding */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">TEEI Corporate Cockpit</h1>
            <span className="px-3 py-1 bg-blue-600 rounded-full text-sm font-medium">
              Boardroom Mode
            </span>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-6">
            {/* Connection status */}
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${connectionStatus.color} ${
                  connectionStatus.pulse ? 'animate-pulse' : ''
                }`}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-300">{connectionStatus.text}</span>
            </div>

            {/* Last update time */}
            <div className="text-gray-300 text-sm">
              Updated: {new Date(lastUpdateTime).toLocaleTimeString()}
            </div>

            {/* View indicator */}
            <div className="text-gray-300 text-sm">
              {currentView.name} ({currentViewIndex + 1}/{WIDGET_VIEWS.length})
            </div>

            {/* Pause/Resume */}
            <button
              onClick={handleTogglePause}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label={isPaused ? 'Resume auto-cycle' : 'Pause auto-cycle'}
            >
              {isPaused ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Resume
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm8 0a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V4z" />
                  </svg>
                  Pause
                </span>
              )}
            </button>

            {/* Exit button */}
            <button
              onClick={handleExit}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Exit Boardroom Mode"
=======
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
>>>>>>> origin/claude/worker3-phaseE-cockpit-polish-01DEt2S7UMEooTBJBivWKcpD
            >
              Exit (Esc)
            </button>
          </div>
        </div>
<<<<<<< HEAD
      </header>

      {/* Stale data banner */}
      {isStale && (
        <div className="fixed top-20 left-0 right-0 bg-yellow-600/90 backdrop-blur py-3 px-8 z-10">
          <div className="flex items-center justify-center gap-3">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">
              Displaying cached data - Last updated{' '}
              {cacheStatus ? formatCacheAge(cacheStatus.dataAge) : 'recently'}
            </span>
          </div>
        </div>
      )}

      {/* Main content area */}
      <main className="pt-24 pb-20 px-8 min-h-screen" style={{ fontSize: '1.25rem' }}>
        <div className="boardroom-content max-w-7xl mx-auto">
          {renderCurrentWidget()}
        </div>
      </main>

      {/* Navigation controls (bottom) */}
      <footer
        className={`fixed bottom-0 left-0 right-0 bg-gray-800/95 backdrop-blur py-4 px-8 z-10 transition-transform duration-300 ${
          showControls ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-center justify-between">
          {/* Navigation buttons */}
          <div className="flex items-center gap-4">
            <button
              onClick={handlePrevious}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Previous view"
            >
              ← Previous
            </button>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Next view"
            >
              Next →
            </button>
          </div>

          {/* Info */}
          <div className="text-gray-400 text-sm">
            Auto-cycle: {isPaused ? 'Paused' : `Every ${cycleInterval / 1000}s`} | Press
            Spacebar to pause | ESC to exit
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2">
            {WIDGET_VIEWS.map((view, index) => (
              <button
                key={view.id}
                onClick={() => autoCycleRef.current?.goTo(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentViewIndex ? 'bg-blue-500' : 'bg-gray-600'
                }`}
                aria-label={`Go to ${view.name}`}
                title={view.name}
              />
            ))}
          </div>
        </div>
      </footer>

      {/* Global styles for boardroom mode */}
      <style>{`
        /* Scale up typography for large displays */
        .boardroom-content {
          font-size: 1.1rem;
        }

        .boardroom-content h1 {
          font-size: 3rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
        }

        .boardroom-content h2 {
          font-size: 2.25rem;
          font-weight: 600;
          margin-bottom: 1.25rem;
        }

        .boardroom-content h3 {
          font-size: 1.75rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .boardroom-content p {
          font-size: 1.25rem;
          line-height: 1.6;
        }

        /* Scale up metric cards */
        .boardroom-content [class*="metric"],
        .boardroom-content [class*="card"] {
          padding: 2rem;
          font-size: 1.25rem;
        }

        /* Scale up charts */
        .boardroom-content canvas {
          min-height: 400px;
        }

        /* Smooth scrolling */
        .boardroom-container {
          scroll-behavior: smooth;
=======

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
>>>>>>> origin/claude/worker3-phaseE-cockpit-polish-01DEt2S7UMEooTBJBivWKcpD
        }
      `}</style>
    </div>
  );
}
