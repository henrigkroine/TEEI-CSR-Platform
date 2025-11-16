/**
 * Auto-Cycle Logic for Boardroom Mode
 *
 * Manages automatic rotation through dashboard widgets/views
 * with configurable intervals, pause/resume controls, and memory leak prevention.
 *
 * Features:
 * - Configurable cycle interval (default 30s)
 * - Pause/resume functionality
 * - Manual navigation (next/prev)
 * - Automatic cleanup to prevent memory leaks
 * - Event callbacks for state changes
 *
 * @module autoCycle
 */

export interface AutoCycleOptions {
  /** Number of items to cycle through */
  itemCount: number;
  /** Cycle interval in milliseconds (default: 30000 = 30s) */
  interval?: number;
  /** Initial index (default: 0) */
  initialIndex?: number;
  /** Auto-start cycling (default: true) */
  autoStart?: boolean;
  /** Callback when index changes */
  onCycleChange?: (index: number) => void;
  /** Callback when pause state changes */
  onPauseChange?: (isPaused: boolean) => void;
}

export interface AutoCycleController {
  /** Current active index */
  getCurrentIndex: () => number;
  /** Move to next item */
  next: () => void;
  /** Move to previous item */
  previous: () => void;
  /** Jump to specific index */
  goTo: (index: number) => void;
  /** Pause auto-cycling */
  pause: () => void;
  /** Resume auto-cycling */
  resume: () => void;
  /** Toggle pause state */
  togglePause: () => void;
  /** Check if paused */
  isPaused: () => boolean;
  /** Start auto-cycling (if not already started) */
  start: () => void;
  /** Stop auto-cycling and cleanup */
  stop: () => void;
  /** Destroy controller and cleanup all resources */
  destroy: () => void;
  /** Update interval dynamically */
  setInterval: (newInterval: number) => void;
}

/**
 * Create auto-cycle controller for managing widget rotation
 */
export function createAutoCycleController(
  options: AutoCycleOptions
): AutoCycleController {
  const {
    itemCount,
    interval = 30000,
    initialIndex = 0,
    autoStart = true,
    onCycleChange,
    onPauseChange,
  } = options;

  // Validate inputs
  if (itemCount < 1) {
    throw new Error('[AutoCycle] itemCount must be at least 1');
  }

  if (interval < 1000) {
    console.warn('[AutoCycle] Interval less than 1s may cause performance issues');
  }

  // State
  let currentIndex = Math.max(0, Math.min(initialIndex, itemCount - 1));
  let paused = !autoStart;
  let cycleInterval: number | null = null;
  let currentIntervalMs = interval;
  let destroyed = false;

  /**
   * Validate index is within bounds
   */
  function validateIndex(index: number): number {
    return Math.max(0, Math.min(index, itemCount - 1));
  }

  /**
   * Update current index and notify listeners
   */
  function updateIndex(newIndex: number): void {
    if (destroyed) {
      console.warn('[AutoCycle] Controller is destroyed, ignoring update');
      return;
    }

    const validIndex = validateIndex(newIndex);

    if (validIndex !== currentIndex) {
      const prevIndex = currentIndex;
      currentIndex = validIndex;

      console.log(
        `[AutoCycle] Index changed: ${prevIndex} -> ${currentIndex} (of ${itemCount})`
      );

      if (onCycleChange) {
        try {
          onCycleChange(currentIndex);
        } catch (error) {
          console.error('[AutoCycle] Error in onCycleChange callback:', error);
        }
      }
    }
  }

  /**
   * Update pause state and notify listeners
   */
  function updatePauseState(newPaused: boolean): void {
    if (destroyed) {
      console.warn('[AutoCycle] Controller is destroyed, ignoring pause update');
      return;
    }

    if (newPaused !== paused) {
      paused = newPaused;

      console.log(`[AutoCycle] Pause state changed: ${paused ? 'paused' : 'resumed'}`);

      if (onPauseChange) {
        try {
          onPauseChange(paused);
        } catch (error) {
          console.error('[AutoCycle] Error in onPauseChange callback:', error);
        }
      }

      // Manage cycling based on pause state
      if (paused) {
        stopCycling();
      } else {
        startCycling();
      }
    }
  }

  /**
   * Start the auto-cycle interval
   */
  function startCycling(): void {
    if (destroyed) {
      console.warn('[AutoCycle] Controller is destroyed, cannot start');
      return;
    }

    // Clear any existing interval
    stopCycling();

    if (itemCount <= 1) {
      console.log('[AutoCycle] Only 1 item, skipping auto-cycle');
      return;
    }

    console.log(`[AutoCycle] Starting auto-cycle (interval: ${currentIntervalMs}ms)`);

    cycleInterval = setInterval(() => {
      if (!paused && !destroyed) {
        // Move to next index (wrap around)
        const nextIndex = (currentIndex + 1) % itemCount;
        updateIndex(nextIndex);
      }
    }, currentIntervalMs);
  }

  /**
   * Stop the auto-cycle interval
   */
  function stopCycling(): void {
    if (cycleInterval) {
      clearInterval(cycleInterval);
      cycleInterval = null;
      console.log('[AutoCycle] Stopped auto-cycle');
    }
  }

  /**
   * Move to next item
   */
  function next(): void {
    const nextIndex = (currentIndex + 1) % itemCount;
    updateIndex(nextIndex);

    // Reset interval timer to avoid immediate double-cycle
    if (!paused && cycleInterval) {
      stopCycling();
      startCycling();
    }
  }

  /**
   * Move to previous item
   */
  function previous(): void {
    const prevIndex = currentIndex === 0 ? itemCount - 1 : currentIndex - 1;
    updateIndex(prevIndex);

    // Reset interval timer to avoid immediate double-cycle
    if (!paused && cycleInterval) {
      stopCycling();
      startCycling();
    }
  }

  /**
   * Jump to specific index
   */
  function goTo(index: number): void {
    updateIndex(index);

    // Reset interval timer
    if (!paused && cycleInterval) {
      stopCycling();
      startCycling();
    }
  }

  /**
   * Pause auto-cycling
   */
  function pause(): void {
    updatePauseState(true);
  }

  /**
   * Resume auto-cycling
   */
  function resume(): void {
    updatePauseState(false);
  }

  /**
   * Toggle pause state
   */
  function togglePause(): void {
    updatePauseState(!paused);
  }

  /**
   * Check if paused
   */
  function isPausedState(): boolean {
    return paused;
  }

  /**
   * Get current index
   */
  function getCurrentIndex(): number {
    return currentIndex;
  }

  /**
   * Start controller (if not auto-started)
   */
  function start(): void {
    if (destroyed) {
      console.warn('[AutoCycle] Controller is destroyed, cannot start');
      return;
    }

    updatePauseState(false);
  }

  /**
   * Stop controller
   */
  function stop(): void {
    updatePauseState(true);
  }

  /**
   * Destroy controller and cleanup
   */
  function destroy(): void {
    if (destroyed) {
      console.warn('[AutoCycle] Controller already destroyed');
      return;
    }

    console.log('[AutoCycle] Destroying controller');

    stopCycling();
    destroyed = true;

    // Clear callbacks to prevent memory leaks
    // (TypeScript doesn't allow reassigning to const params, so we just stop using them)
  }

  /**
   * Update interval dynamically
   */
  function setInterval(newInterval: number): void {
    if (destroyed) {
      console.warn('[AutoCycle] Controller is destroyed, cannot update interval');
      return;
    }

    if (newInterval < 1000) {
      console.warn('[AutoCycle] Interval less than 1s may cause performance issues');
    }

    currentIntervalMs = newInterval;

    console.log(`[AutoCycle] Updated interval to ${currentIntervalMs}ms`);

    // Restart cycling with new interval if currently active
    if (!paused && cycleInterval) {
      stopCycling();
      startCycling();
    }
  }

  // Auto-start if requested
  if (autoStart) {
    startCycling();
  }

  // Return controller API
  return {
    getCurrentIndex,
    next,
    previous,
    goTo,
    pause,
    resume,
    togglePause,
    isPaused: isPausedState,
    start,
    stop,
    destroy,
    setInterval,
  };
}

/**
 * React hook wrapper for auto-cycle controller
 * (This is a factory function, actual React hook would be in a separate file)
 */
export interface UseAutoCycleOptions extends AutoCycleOptions {
  /** Enable/disable cycling */
  enabled?: boolean;
}

/**
 * Utility: Calculate estimated time remaining until next cycle
 *
 * @param startTime - Timestamp when current cycle started
 * @param interval - Cycle interval in milliseconds
 * @returns Milliseconds remaining until next cycle
 */
export function getTimeRemaining(startTime: number, interval: number): number {
  const elapsed = Date.now() - startTime;
  const remaining = interval - (elapsed % interval);
  return Math.max(0, remaining);
}

/**
 * Utility: Format time remaining for display
 *
 * @param ms - Milliseconds
 * @returns Formatted string (e.g., "15s", "2m 30s")
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Utility: Create progress percentage for cycle visualization
 *
 * @param startTime - Timestamp when current cycle started
 * @param interval - Cycle interval in milliseconds
 * @returns Progress percentage (0-100)
 */
export function getCycleProgress(startTime: number, interval: number): number {
  const elapsed = Date.now() - startTime;
  const progress = (elapsed % interval) / interval;
  return Math.min(100, Math.max(0, progress * 100));
}
