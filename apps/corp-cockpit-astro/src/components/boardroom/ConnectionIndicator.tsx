/**
 * Connection Indicator Component
 *
 * Displays real-time SSE connection status with visual and accessible indicators.
 * Shows connection state with icons and labels, suitable for large displays.
 *
 * @module ConnectionIndicator
 */

import { ConnectionState } from '../../utils/sseClient';

export interface ConnectionIndicatorProps {
  /** Current connection state */
  state: ConnectionState;
  /** Current retry attempt (0 if connected) */
  retryAttempt?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Custom className */
  className?: string;
}

const STATE_CONFIG = {
  connected: {
    icon: '🟢',
    label: 'LIVE',
    color: 'bg-green-600',
    textColor: 'text-white',
    pulse: true,
  },
  reconnecting: {
    icon: '🟡',
    label: 'RECONNECTING',
    color: 'bg-yellow-600',
    textColor: 'text-white',
    pulse: true,
  },
  disconnected: {
    icon: '🔴',
    label: 'OFFLINE',
    color: 'bg-red-600',
    textColor: 'text-white',
    pulse: false,
  },
  error: {
    icon: '🔴',
    label: 'ERROR',
    color: 'bg-red-600',
    textColor: 'text-white',
    pulse: false,
  },
  failed: {
    icon: '🔴',
    label: 'FAILED',
    color: 'bg-red-600',
    textColor: 'text-white',
    pulse: false,
  },
};

export function ConnectionIndicator({
  state,
  retryAttempt = 0,
  maxRetries = 10,
  className = '',
}: ConnectionIndicatorProps) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.disconnected;

  return (
    <div
      className={`
        inline-flex items-center gap-3 px-4 py-2 rounded-lg
        ${config.color} ${config.textColor}
        font-semibold text-lg transition-all
        ${className}
      `}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Status Icon */}
      <span
        className={`text-2xl ${config.pulse ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>

      {/* Status Label */}
      <span className="font-medium">
        {config.label}
        {state === 'reconnecting' && (
          <span className="ml-2 text-sm opacity-90">
            {retryAttempt}/{maxRetries}
          </span>
        )}
      </span>

      {/* Screen Reader Announcement */}
      <span className="sr-only">
        {state === 'connected' && 'Live connection active'}
        {state === 'reconnecting' &&
          `Reconnecting, attempt ${retryAttempt} of ${maxRetries}`}
        {state === 'disconnected' && 'Connection lost. Showing cached data'}
        {state === 'error' && 'Connection error. Showing cached data'}
        {state === 'failed' &&
          'Connection failed. Showing cached data. Manual reconnect required'}
      </span>
    </div>
  );
}

/**
 * Compact version for integration into smaller spaces
 */
export function ConnectionIndicatorCompact({
  state,
  retryAttempt = 0,
  maxRetries = 10,
  className = '',
}: ConnectionIndicatorProps) {
  const config = STATE_CONFIG[state] || STATE_CONFIG.disconnected;

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-1 rounded
        ${config.color} ${config.textColor}
        text-sm font-medium transition-all
        ${className}
      `}
      role="status"
      aria-live="polite"
    >
      <span
        className={`text-lg ${config.pulse ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      >
        {config.icon}
      </span>
      <span>{config.label}</span>
      {state === 'reconnecting' && (
        <span className="text-xs opacity-75">
          {retryAttempt}/{maxRetries}
        </span>
      )}
      <span className="sr-only">
        {state === 'connected' && 'Live connection active'}
        {state === 'reconnecting' &&
          `Reconnecting, attempt ${retryAttempt} of ${maxRetries}`}
        {state === 'disconnected' && 'Connection lost'}
        {state === 'error' && 'Connection error'}
        {state === 'failed' && 'Connection failed'}
      </span>
    </div>
  );
}
