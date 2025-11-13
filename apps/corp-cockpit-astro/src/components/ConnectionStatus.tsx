/**
 * Connection Status Indicator
 *
 * Visual indicator showing real-time connection status:
 * - Connected (green dot)
 * - Reconnecting (yellow pulsing dot)
 * - Disconnected (red dot)
 * - Polling fallback (yellow dot with info)
 *
 * @module ConnectionStatus
 */

import React, { useState } from 'react';
import type { ConnectionState, SSEError } from '../utils/sseClient';
import type { UseSSEConnectionReturn } from '../hooks/useSSEConnection';

export interface ConnectionStatusProps {
  /** SSE connection state */
  connection: UseSSEConnectionReturn;
  /** Position of the indicator */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** Show detailed tooltip on hover */
  showDetails?: boolean;
}

/**
 * Connection status indicator component
 */
export default function ConnectionStatus({
  connection,
  position = 'top-right',
  showDetails = true,
}: ConnectionStatusProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { state, isPolling, lastEventId, error } = connection;

  // Determine indicator color and label
  const statusConfig = getStatusConfig(state, isPolling, error);

  // Position classes
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${statusConfig.label}`}
    >
      {/* Status indicator dot */}
      <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-3 py-2 shadow-md border border-gray-200 dark:border-gray-700">
        <div
          className={`w-2 h-2 rounded-full ${statusConfig.dotColor} ${
            statusConfig.pulse ? 'animate-pulse' : ''
          }`}
          aria-hidden="true"
        />
        {showDetails && (
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {statusConfig.label}
          </span>
        )}
      </div>

      {/* Detailed tooltip */}
      {showTooltip && showDetails && (
        <div
          className="absolute top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3 text-sm"
          role="tooltip"
        >
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${statusConfig.textColor}`}>
                {statusConfig.label}
              </span>
            </div>

            {isPolling && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Mode:</span>
                <span className="font-medium text-yellow-600 dark:text-yellow-400">
                  Polling Fallback
                </span>
              </div>
            )}

            {lastEventId && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Last Event:</span>
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                  {lastEventId.slice(0, 8)}...
                </span>
              </div>
            )}

            {error && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-red-600 dark:text-red-400 text-xs">
                  {error.message}
                </p>
                {error.retryable && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                    Retrying...
                  </p>
                )}
              </div>
            )}

            {state === 'connected' && !error && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <p className="text-green-600 dark:text-green-400 text-xs">
                  Real-time updates active
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Get status configuration for display
 */
function getStatusConfig(
  state: ConnectionState,
  isPolling: boolean,
  error: SSEError | null
) {
  if (state === 'connected') {
    return {
      label: 'Connected',
      dotColor: 'bg-green-500',
      textColor: 'text-green-600 dark:text-green-400',
      pulse: false,
    };
  }

  if (state === 'connecting' || state === 'reconnecting') {
    return {
      label: state === 'connecting' ? 'Connecting' : 'Reconnecting',
      dotColor: 'bg-yellow-500',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      pulse: true,
    };
  }

  if (state === 'failed') {
    if (isPolling) {
      return {
        label: 'Polling',
        dotColor: 'bg-yellow-500',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        pulse: false,
      };
    }
    return {
      label: 'Failed',
      dotColor: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      pulse: false,
    };
  }

  // Disconnected
  return {
    label: 'Offline',
    dotColor: 'bg-gray-400',
    textColor: 'text-gray-600 dark:text-gray-400',
    pulse: false,
  };
}

/**
 * Compact connection status indicator (dot only)
 */
export function ConnectionStatusCompact({
  connection,
}: {
  connection: UseSSEConnectionReturn;
}) {
  const { state, isPolling, error } = connection;
  const statusConfig = getStatusConfig(state, isPolling, error);

  return (
    <div
      className={`w-2 h-2 rounded-full ${statusConfig.dotColor} ${
        statusConfig.pulse ? 'animate-pulse' : ''
      }`}
      role="status"
      aria-label={`Connection status: ${statusConfig.label}`}
      title={statusConfig.label}
    />
  );
}

/**
 * Connection status badge for headers
 */
export function ConnectionStatusBadge({
  connection,
}: {
  connection: UseSSEConnectionReturn;
}) {
  const { state, isPolling, error } = connection;
  const statusConfig = getStatusConfig(state, isPolling, error);

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-gray-100 dark:bg-gray-800"
      role="status"
      aria-label={`Connection status: ${statusConfig.label}`}
    >
      <div
        className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor} ${
          statusConfig.pulse ? 'animate-pulse' : ''
        }`}
        aria-hidden="true"
      />
      <span className={statusConfig.textColor}>{statusConfig.label}</span>
    </div>
  );
}

/**
 * Connection status banner for important notifications
 */
export function ConnectionStatusBanner({
  connection,
  onDismiss,
}: {
  connection: UseSSEConnectionReturn;
  onDismiss?: () => void;
}) {
  const { state, isPolling, error } = connection;

  // Only show banner for important states
  if (state === 'connected' && !isPolling) {
    return null;
  }

  const statusConfig = getStatusConfig(state, isPolling, error);

  return (
    <div
      className={`w-full py-2 px-4 flex items-center justify-between ${
        state === 'failed' && !isPolling
          ? 'bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800'
      }`}
      role="alert"
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-2 h-2 rounded-full ${statusConfig.dotColor} ${
            statusConfig.pulse ? 'animate-pulse' : ''
          }`}
          aria-hidden="true"
        />
        <span className={`text-sm font-medium ${statusConfig.textColor}`}>
          {getStatusMessage(state, isPolling, error)}
        </span>
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="Dismiss notification"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

/**
 * Get user-friendly status message
 */
function getStatusMessage(
  state: ConnectionState,
  isPolling: boolean,
  error: SSEError | null
): string {
  if (state === 'connecting') {
    return 'Connecting to real-time updates...';
  }

  if (state === 'reconnecting') {
    return 'Connection lost. Attempting to reconnect...';
  }

  if (state === 'failed') {
    if (isPolling) {
      return 'Real-time updates unavailable. Using periodic refresh instead.';
    }
    return error?.message || 'Connection failed. Please refresh the page.';
  }

  if (isPolling) {
    return 'Using periodic refresh for updates.';
  }

  return 'Offline';
}
