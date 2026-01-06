/**
 * Lazy Loading Configuration for Dashboard Widgets
 *
 * Implements code splitting and lazy loading to improve:
 * - Initial page load time
 * - Time to Interactive (TTI)
 * - JavaScript bundle size
 *
 * Performance targets:
 * - Initial bundle < 200KB (gzipped)
 * - Widget load time < 150ms
 * - Lazy load on viewport intersection
 *
 * @module utils/lazyWidgets
 */

import { lazy, ComponentType } from 'react';
import type { ComponentProps } from 'react';

/**
 * Widget loading priority levels
 */
export enum WidgetPriority {
  /** Load immediately (above the fold) */
  CRITICAL = 'critical',
  /** Load when widget enters viewport */
  HIGH = 'high',
  /** Load after user interaction */
  MEDIUM = 'medium',
  /** Load on demand only */
  LOW = 'low',
}

/**
 * Lazy widget configuration
 */
export interface LazyWidgetConfig {
  /** Widget display name */
  name: string;
  /** Loading priority */
  priority: WidgetPriority;
  /** Prefetch on idle */
  prefetch?: boolean;
  /** Chunk name for code splitting */
  chunkName?: string;
  /** Minimum delay before rendering (ms) */
  minDelay?: number;
}

/**
 * Widget component map for lazy loading
 */
export const WIDGET_COMPONENTS = {
  // Critical widgets (above the fold)
  'at-a-glance': {
    name: 'At a Glance',
    priority: WidgetPriority.CRITICAL,
    prefetch: true,
    chunkName: 'at-a-glance',
  },
  'sroi-panel': {
    name: 'SROI Panel',
    priority: WidgetPriority.CRITICAL,
    prefetch: true,
    chunkName: 'sroi-panel',
  },

  // High priority widgets (visible on scroll)
  'vis-panel': {
    name: 'VIS Panel',
    priority: WidgetPriority.HIGH,
    prefetch: true,
    chunkName: 'vis-panel',
  },
  'outcomes-chart': {
    name: 'Outcomes Chart',
    priority: WidgetPriority.HIGH,
    prefetch: true,
    chunkName: 'outcomes-chart',
  },
  'q2q-feed': {
    name: 'Q2Q Feed',
    priority: WidgetPriority.HIGH,
    prefetch: false,
    chunkName: 'q2q-feed',
  },

  // Medium priority widgets (below the fold)
  'volunteer-leaderboard': {
    name: 'Volunteer Leaderboard',
    priority: WidgetPriority.MEDIUM,
    prefetch: false,
    chunkName: 'volunteer-leaderboard',
  },
  'impact-timeline': {
    name: 'Impact Timeline',
    priority: WidgetPriority.MEDIUM,
    prefetch: false,
    chunkName: 'impact-timeline',
  },
  'sdg-mapping': {
    name: 'SDG Mapping',
    priority: WidgetPriority.MEDIUM,
    prefetch: false,
    chunkName: 'sdg-mapping',
  },

  // Low priority widgets (user interaction required)
  'evidence-explorer': {
    name: 'Evidence Explorer',
    priority: WidgetPriority.LOW,
    prefetch: false,
    chunkName: 'evidence-explorer',
  },
  'export-panel': {
    name: 'Export Panel',
    priority: WidgetPriority.LOW,
    prefetch: false,
    chunkName: 'export-panel',
  },
  'settings-panel': {
    name: 'Settings Panel',
    priority: WidgetPriority.LOW,
    prefetch: false,
    chunkName: 'settings-panel',
  },
} as const;

export type WidgetName = keyof typeof WIDGET_COMPONENTS;

/**
 * Lazy load widget component
 */
export function lazyWidget<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  config?: Partial<LazyWidgetConfig>
): ComponentType<ComponentProps<T>> {
  const LazyComponent = lazy(async () => {
    // Add minimum delay to prevent flash of loading state
    const minDelay = config?.minDelay || 0;
    if (minDelay > 0) {
      const [component] = await Promise.all([
        importFn(),
        new Promise((resolve) => setTimeout(resolve, minDelay)),
      ]);
      return component;
    }

    return importFn();
  });

  // Set display name for debugging
  if (config?.name) {
    (LazyComponent as any).displayName = `Lazy(${config.name})`;
  }

  return LazyComponent;
}

/**
 * Lazy loaded widget components
 */
export const LazyWidgets = {
  AtAGlance: lazyWidget(
    () => import('../components/widgets/AtAGlance'),
    WIDGET_COMPONENTS['at-a-glance']
  ),

  SROIPanel: lazyWidget(
    () => import('../components/widgets/SROIPanelOptimized'),
    WIDGET_COMPONENTS['sroi-panel']
  ),

  VISPanel: lazyWidget(
    () => import('../components/widgets/VISPanel'),
    WIDGET_COMPONENTS['vis-panel']
  ),

  OutcomesChart: lazyWidget(
    () => import('../components/widgets/OutcomesChart'),
    WIDGET_COMPONENTS['outcomes-chart']
  ),

  Q2QFeed: lazyWidget(
    () => import('../components/widgets/Q2QFeed'),
    WIDGET_COMPONENTS['q2q-feed']
  ),

  VolunteerLeaderboard: lazyWidget(
    () => import('../components/widgets/VolunteerLeaderboard'),
    WIDGET_COMPONENTS['volunteer-leaderboard']
  ),

  ImpactTimeline: lazyWidget(
    () => import('../components/widgets/ImpactTimeline'),
    WIDGET_COMPONENTS['impact-timeline']
  ),

  SDGMapping: lazyWidget(
    () => import('../components/widgets/SDGMapping'),
    WIDGET_COMPONENTS['sdg-mapping']
  ),

  EvidenceExplorer: lazyWidget(
    () => import('../components/evidence/EvidenceExplorer'),
    WIDGET_COMPONENTS['evidence-explorer']
  ),

  ExportPanel: lazyWidget(
    () => import('../components/widgets/ExportButtons'),
    WIDGET_COMPONENTS['export-panel']
  ),

  SettingsPanel: lazyWidget(
    () => import('../components/settings/SettingsPanel'),
    WIDGET_COMPONENTS['settings-panel']
  ),
};

/**
 * Prefetch widget components on idle
 */
export function prefetchWidgets(widgets: WidgetName[]): void {
  if (typeof window === 'undefined') return;

  // Use requestIdleCallback if available, otherwise setTimeout
  const scheduleTask = (window as any).requestIdleCallback || setTimeout;

  scheduleTask(() => {
    widgets.forEach((widgetName) => {
      const config = WIDGET_COMPONENTS[widgetName];
      if (config.prefetch) {
        // Trigger dynamic import to prefetch the chunk
        import(`../components/widgets/${config.chunkName}`).catch((err) => {
          console.warn(`Failed to prefetch widget: ${widgetName}`, err);
        });
      }
    });
  });
}

/**
 * Prefetch all high-priority widgets
 */
export function prefetchHighPriorityWidgets(): void {
  const highPriorityWidgets = Object.entries(WIDGET_COMPONENTS)
    .filter(([_, config]) => config.priority === WidgetPriority.HIGH && config.prefetch)
    .map(([name]) => name as WidgetName);

  prefetchWidgets(highPriorityWidgets);
}

/**
 * Intersection Observer for lazy loading widgets
 */
export interface IntersectionObserverOptions {
  /** Root margin for triggering load */
  rootMargin?: string;
  /** Intersection threshold (0-1) */
  threshold?: number;
  /** Only trigger once */
  triggerOnce?: boolean;
}

/**
 * Hook to lazy load widget on viewport intersection
 */
export function useWidgetIntersection(
  ref: React.RefObject<HTMLElement>,
  options: IntersectionObserverOptions = {}
): boolean {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);

          if (options.triggerOnce) {
            observer.disconnect();
          }
        }
      },
      {
        rootMargin: options.rootMargin || '50px',
        threshold: options.threshold || 0.1,
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [ref, options.rootMargin, options.threshold, options.triggerOnce]);

  return isVisible;
}

/**
 * Widget loading skeleton
 */
export function WidgetSkeleton({
  height = '300px',
  className = '',
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg ${className}`}
      style={{ height }}
      role="status"
      aria-label="Loading widget..."
    >
      <div className="flex flex-col h-full p-6 space-y-4">
        {/* Header skeleton */}
        <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3"></div>

        {/* Content skeleton */}
        <div className="flex-1 space-y-3">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-4/6"></div>
        </div>

        {/* Footer skeleton */}
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
      </div>
    </div>
  );
}

/**
 * Widget error boundary fallback
 */
export function WidgetErrorFallback({
  error,
  widgetName,
}: {
  error: Error;
  widgetName?: string;
}) {
  return (
    <div
      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
      role="alert"
    >
      <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
        Failed to load {widgetName || 'widget'}
      </h3>
      <p className="text-sm text-red-600 dark:text-red-300 mb-4">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Reload page
      </button>
    </div>
  );
}

/**
 * Performance monitoring for lazy loading
 */
export function trackWidgetLoad(widgetName: string, loadTime: number): void {
  if (typeof window === 'undefined') return;

  // Send to analytics
  if ((window as any).gtag) {
    (window as any).gtag('event', 'widget_load', {
      widget_name: widgetName,
      load_time_ms: loadTime,
      event_category: 'performance',
    });
  }

  // Log slow widgets
  if (loadTime > 500) {
    console.warn(`Slow widget load: ${widgetName} took ${loadTime}ms`);
  }

  // Performance mark
  if (performance.mark) {
    performance.mark(`widget-loaded-${widgetName}`);
  }
}

/**
 * Import React for hooks
 */
import * as React from 'react';
