/**
 * Boardroom View Component
 *
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
 *
 * @module BoardroomView
 */

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
import { CreateDeckButton } from './CreateDeckButton';

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
            >
              Exit (Esc)
            </button>
          </div>
        </div>
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

      {/* Create Deck Button */}
      <CreateDeckButton companyId={companyId} lang={lang} />

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
        }
      `}</style>
    </div>
  );
}
