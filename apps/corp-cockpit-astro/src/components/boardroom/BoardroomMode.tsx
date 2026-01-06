/**
 * Boardroom Mode Component
 *
 * Full-screen display mode optimized for executive presentations
 * on large displays (TVs, projectors, boardroom screens).
 *
 * Features:
 * - Full-screen layout (hides navigation, sidebars)
 * - Large typography (1.5x scale)
 * - Auto-refresh metrics every 60 seconds
 * - Metric rotation for multiple dashboards
 * - Keyboard navigation (Esc to exit)
 * - Responsive to large displays
 *
 * @module BoardroomMode
 */

import { useEffect, useState, useCallback, ReactNode } from 'react';

export interface BoardroomModeProps {
  /** Whether boardroom mode is enabled */
  enabled?: boolean;
  /** Callback when mode is toggled */
  onToggle?: (enabled: boolean) => void;
  /** Auto-refresh interval in milliseconds (default: 60000 = 60s) */
  refreshInterval?: number;
  /** Callback for refresh trigger */
  onRefresh?: () => void;
  /** Array of dashboard views to cycle through */
  dashboards?: ReactNode[];
  /** Cycle interval in milliseconds (default: 30000 = 30s) */
  cycleInterval?: number;
  /** Enable metric cycling (default: false) */
  enableCycling?: boolean;
  /** Children to render in boardroom mode */
  children?: ReactNode;
  /** Custom class name */
  className?: string;
}

export function BoardroomMode({
  enabled = false,
  onToggle,
  refreshInterval = 60000,
  onRefresh,
  dashboards = [],
  cycleInterval = 30000,
  enableCycling = false,
  children,
  className = '',
}: BoardroomModeProps) {
  const [isActive, setIsActive] = useState(enabled);
  const [currentDashboardIndex, setCurrentDashboardIndex] = useState(0);
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());

  // Handle toggle
  const toggleMode = useCallback(() => {
    const newState = !isActive;
    setIsActive(newState);

    if (onToggle) {
      onToggle(newState);
    }

    // Request fullscreen when enabling
    if (newState && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('[BoardroomMode] Fullscreen request failed:', err);
      });
    }

    // Exit fullscreen when disabling
    if (!newState && document.fullscreenElement) {
      document.exitFullscreen().catch((err) => {
        console.warn('[BoardroomMode] Exit fullscreen failed:', err);
      });
    }
  }, [isActive, onToggle]);

  // Handle escape key to exit
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isActive) {
        toggleMode();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, toggleMode]);

  // Handle fullscreen change (user exits via browser controls)
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isActive) {
        setIsActive(false);
        if (onToggle) {
          onToggle(false);
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isActive, onToggle]);

  // Auto-refresh metrics
  useEffect(() => {
    if (!isActive || !onRefresh) {
      return;
    }

    const interval = setInterval(() => {
      console.log('[BoardroomMode] Auto-refreshing metrics');
      onRefresh();
      setLastRefreshTime(Date.now());
    }, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [isActive, onRefresh, refreshInterval]);

  // Cycle through dashboards
  useEffect(() => {
    if (!isActive || !enableCycling || dashboards.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentDashboardIndex((prev) => (prev + 1) % dashboards.length);
    }, cycleInterval);

    return () => {
      clearInterval(interval);
    };
  }, [isActive, enableCycling, dashboards.length, cycleInterval]);

  // Sync enabled prop with internal state
  useEffect(() => {
    setIsActive(enabled);
  }, [enabled]);

  // If not active, render toggle button only
  if (!isActive) {
    return (
      <button
        onClick={toggleMode}
        className={`
          inline-flex items-center gap-2 px-4 py-2 rounded-lg
          bg-blue-600 hover:bg-blue-700 text-white font-medium
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
          ${className}
        `}
        aria-label="Enter Boardroom Mode"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        Enter Boardroom Mode
      </button>
    );
  }

  // Determine content to display
  const content =
    enableCycling && dashboards.length > 0
      ? dashboards[currentDashboardIndex]
      : children;

  // Render full boardroom mode
  return (
    <div
      className={`
        fixed inset-0 z-50 bg-gray-900 text-white overflow-auto
        ${className}
      `}
      style={{
        fontSize: '1.5rem', // 1.5x scale for large displays
      }}
    >
      {/* Header with exit button and status */}
      <header className="fixed top-0 left-0 right-0 bg-gray-800 shadow-lg z-10">
        <div className="max-w-full px-8 py-4 flex items-center justify-between">
          {/* Branding */}
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold">TEEI Corporate Cockpit</h1>
            <span className="px-4 py-2 bg-blue-600 rounded-full text-lg font-medium">
              Boardroom Mode
            </span>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-6">
            {/* Last refresh time */}
            <div className="text-gray-300 text-base">
              Last updated:{' '}
              {new Date(lastRefreshTime).toLocaleTimeString()}
            </div>

            {/* Dashboard indicator (if cycling) */}
            {enableCycling && dashboards.length > 1 && (
              <div className="text-gray-300 text-base">
                Dashboard {currentDashboardIndex + 1} of {dashboards.length}
              </div>
            )}

            {/* Exit button */}
            <button
              onClick={toggleMode}
              className="
                px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg
                font-medium text-lg transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500
              "
              aria-label="Exit Boardroom Mode"
            >
              Exit (Esc)
            </button>
          </div>
        </div>
      </header>

      {/* Main content area */}
      <main
        className="pt-24 pb-8 px-8"
        style={{
          minHeight: '100vh',
        }}
      >
        <div className="boardroom-content">
          {content}
        </div>
      </main>

      {/* Footer with additional info */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-800 py-3 px-8">
        <div className="flex items-center justify-between text-gray-400 text-sm">
          <div>
            Auto-refresh: Every {refreshInterval / 1000}s
          </div>
          <div>
            Press ESC to exit
          </div>
        </div>
      </footer>

      {/* Global styles for boardroom mode */}
      <style>{`
        /* Scale up typography */
        .boardroom-content {
          font-size: 1rem; /* Base size, components will scale up */
        }

        .boardroom-content h1 {
          font-size: 3.5rem;
          font-weight: 700;
          margin-bottom: 2rem;
        }

        .boardroom-content h2 {
          font-size: 2.5rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
        }

        .boardroom-content h3 {
          font-size: 2rem;
          font-weight: 600;
          margin-bottom: 1rem;
        }

        .boardroom-content p {
          font-size: 1.5rem;
          line-height: 1.6;
        }

        /* Scale up metric cards */
        .boardroom-content [class*="metric-card"],
        .boardroom-content [class*="MetricCard"] {
          padding: 2rem;
        }

        .boardroom-content [class*="metric-value"] {
          font-size: 4rem;
          font-weight: 700;
        }

        .boardroom-content [class*="metric-label"] {
          font-size: 1.5rem;
        }

        /* Scale up charts */
        .boardroom-content canvas {
          min-height: 400px;
        }

        /* Hide scrollbars but keep functionality */
        .boardroom-content::-webkit-scrollbar {
          width: 8px;
        }

        .boardroom-content::-webkit-scrollbar-track {
          background: #1f2937;
        }

        .boardroom-content::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}

/**
 * Hook for managing boardroom mode state
 */
export function useBoardroomMode(initialEnabled = false) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Monitor fullscreen state
  useEffect(() => {
    const checkFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', checkFullscreen);

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen);
    };
  }, []);

  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  const disable = useCallback(() => {
    setIsEnabled(false);
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isEnabled) {
      disable();
    } else {
      enable();
    }
  }, [isEnabled, enable, disable]);

  return {
    isEnabled,
    isFullscreen,
    enable,
    disable,
    toggle,
  };
}

/**
 * Boardroom Mode Context Provider (optional)
 */
import { createContext, useContext } from 'react';

interface BoardroomModeContextValue {
  isEnabled: boolean;
  enable: () => void;
  disable: () => void;
  toggle: () => void;
}

const BoardroomModeContext = createContext<BoardroomModeContextValue | null>(null);

export function BoardroomModeProvider({ children }: { children: ReactNode }) {
  const boardroomMode = useBoardroomMode();

  return (
    <BoardroomModeContext.Provider value={boardroomMode}>
      {children}
    </BoardroomModeContext.Provider>
  );
}

export function useBoardroomModeContext() {
  const context = useContext(BoardroomModeContext);

  if (!context) {
    throw new Error('useBoardroomModeContext must be used within BoardroomModeProvider');
  }

  return context;
}
