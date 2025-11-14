/**
 * Dashboard with SSE Real-Time Updates
 *
 * Wrapper component that provides SSE connection to all dashboard widgets
 */

import React, { useState, useCallback } from 'react';
import { useDashboardUpdates } from '../hooks/useSSEConnection';
import ConnectionStatus from './ConnectionStatus';
import { ConnectionStatusBanner } from './ConnectionStatus';

export interface DashboardWithSSEProps {
  companyId: string;
  children?: React.ReactNode;
}

/**
 * Dashboard container with SSE connection management
 */
export default function DashboardWithSSE({
  companyId,
  children,
}: DashboardWithSSEProps) {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showBanner, setShowBanner] = useState(true);

  // Handle dashboard updates from SSE
  const handleUpdate = useCallback((data: unknown) => {
    console.log('[Dashboard] Received real-time update:', data);
    setLastUpdate(new Date());

    // Trigger custom event that widgets can listen to
    window.dispatchEvent(
      new CustomEvent('dashboard-update', {
        detail: data,
      })
    );
  }, []);

  // Connect to SSE for dashboard updates
  const connection = useDashboardUpdates(companyId, handleUpdate);

  return (
    <div className="dashboard-with-sse">
      {/* Connection status banner (only shown when not connected) */}
      {showBanner && (
        <ConnectionStatusBanner
          connection={connection}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {/* Floating connection status indicator */}
      <ConnectionStatus connection={connection} position="top-right" />

      {/* Last update indicator */}
      {lastUpdate && (
        <div className="last-update-indicator">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      )}

      {/* Dashboard content */}
      <div className="dashboard-content">{children}</div>
    </div>
  );
}

/**
 * Hook for widgets to listen to real-time updates
 */
export function useDashboardUpdate(
  handler: (data: unknown) => void
): void {
  React.useEffect(() => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      handler(customEvent.detail);
    };

    window.addEventListener('dashboard-update', handleEvent);

    return () => {
      window.removeEventListener('dashboard-update', handleEvent);
    };
  }, [handler]);
}
