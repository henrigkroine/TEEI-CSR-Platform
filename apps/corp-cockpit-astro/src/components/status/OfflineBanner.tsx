/**
 * Offline Status Banner Component
 *
 * Displays a notification banner when the application is offline or
 * when SSE connection is disconnected. Shows last sync timestamp and
 * provides manual reconnection option.
 *
 * Features:
 * - Slide-in animation from top
 * - Shows offline/disconnected state
 * - Displays last sync time
 * - Manual reconnect button
 * - Auto-dismisses when back online
 *
 * @module OfflineBanner
 */

import { useEffect, useState } from 'react';
import { formatCacheAge } from '../../lib/boardroom/offlineCache';

export interface OfflineBannerProps {
  /** Whether the app is offline (navigator.onLine === false) */
  isOffline?: boolean;
  /** Whether SSE connection is disconnected */
  isSSEDisconnected?: boolean;
  /** Timestamp of last successful sync */
  lastSyncTime?: number;
  /** Callback for manual reconnect attempt */
  onReconnect?: () => void;
  /** Custom class name for styling */
  className?: string;
}

export function OfflineBanner({
  isOffline = false,
  isSSEDisconnected = false,
  lastSyncTime,
  onReconnect,
  className = '',
}: OfflineBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus(true);
      setIsVisible(false);
    };

    const handleOffline = () => {
      setNetworkStatus(false);
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update visibility based on props
  useEffect(() => {
    const shouldShow = isOffline || isSSEDisconnected || !networkStatus;
    setIsVisible(shouldShow);
  }, [isOffline, isSSEDisconnected, networkStatus]);

  // Handle reconnect button click
  const handleReconnect = async () => {
    setIsReconnecting(true);

    try {
      if (onReconnect) {
        await onReconnect();
      } else {
        // Default: reload page
        window.location.reload();
      }
    } catch (error) {
      console.error('[OfflineBanner] Reconnect failed:', error);
    } finally {
      setTimeout(() => {
        setIsReconnecting(false);
      }, 2000);
    }
  };

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  // Determine message based on state
  let message = 'You are offline.';
  let iconEmoji = '📡';
  let bgColor = 'bg-yellow-50 dark:bg-yellow-900/20';
  let borderColor = 'border-yellow-200 dark:border-yellow-700';
  let textColor = 'text-yellow-900 dark:text-yellow-100';
  let buttonColor = 'bg-yellow-600 hover:bg-yellow-700 text-white';

  if (!networkStatus) {
    message = 'No internet connection.';
    iconEmoji = '🔌';
    bgColor = 'bg-red-50 dark:bg-red-900/20';
    borderColor = 'border-red-200 dark:border-red-700';
    textColor = 'text-red-900 dark:text-red-100';
    buttonColor = 'bg-red-600 hover:bg-red-700 text-white';
  } else if (isSSEDisconnected) {
    message = 'Real-time updates disconnected.';
    iconEmoji = '⚠️';
  }

  // Format last sync time
  const lastSyncText = lastSyncTime
    ? `Viewing last synced data from ${formatCacheAge(Date.now() - lastSyncTime)}`
    : 'Viewing cached data';

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${className}`}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      style={{
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      <div
        className={`${bgColor} ${borderColor} border-b shadow-lg`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Icon and Message */}
            <div className="flex items-center gap-3 flex-1">
              <span
                className="text-2xl"
                role="img"
                aria-label="Status icon"
              >
                {iconEmoji}
              </span>
              <div className="flex-1">
                <p className={`font-semibold ${textColor} text-sm sm:text-base`}>
                  {message}
                </p>
                <p className={`${textColor} opacity-80 text-xs sm:text-sm mt-1`}>
                  {lastSyncText}
                </p>
              </div>
            </div>

            {/* Reconnect Button */}
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className={`
                ${buttonColor}
                px-4 py-2 rounded-lg font-medium text-sm
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500
              `}
              aria-label="Reconnect to server"
            >
              {isReconnecting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Reconnecting...
                </span>
              ) : (
                'Reconnect'
              )}
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsVisible(false)}
              className={`
                ${textColor} opacity-60 hover:opacity-100
                p-1 rounded transition-opacity
                focus:outline-none focus:ring-2 focus:ring-offset-2
              `}
              aria-label="Dismiss notification"
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
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Hook for managing offline banner state
 */
export function useOfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [lastSyncTime, setLastSyncTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const updateLastSyncTime = (timestamp: number) => {
    setLastSyncTime(timestamp);
  };

  return {
    isOffline,
    lastSyncTime,
    updateLastSyncTime,
  };
}
