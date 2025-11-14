/**
 * React Memoization Utilities
 *
 * Performance optimization utilities for expensive React components:
 * - Deep comparison for complex props
 * - Memoized selectors for derived data
 * - Debounced updates for real-time data
 *
 * @module memoization
 */

import React from 'react';
import type { DependencyList } from 'react';

/**
 * Deep equality check for objects and arrays
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;

  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Memoization comparison function for complex props
 */
export function arePropsEqual<P extends object>(
  prevProps: Readonly<P>,
  nextProps: Readonly<P>
): boolean {
  return deepEqual(prevProps, nextProps);
}

/**
 * Memoize expensive component with custom comparison
 *
 * @example
 * const MemoizedWidget = memoize(ExpensiveWidget, (prev, next) => {
 *   return prev.data === next.data && prev.config === next.config;
 * });
 */
export function memoize<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): React.MemoExoticComponent<React.ComponentType<P>> {
  return React.memo(Component, areEqual || arePropsEqual);
}

/**
 * Memoized selector hook for derived data
 *
 * @example
 * const filteredData = useMemoizedSelector(
 *   rawData,
 *   (data) => data.filter(item => item.active),
 *   [rawData]
 * );
 */
export function useMemoizedSelector<T, R>(
  data: T,
  selector: (data: T) => R,
  deps: DependencyList
): R {
  return React.useMemo(() => selector(data), deps);
}

/**
 * Debounced value hook for real-time updates
 *
 * @example
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttled callback hook for rate-limiting updates
 *
 * @example
 * const throttledUpdate = useThrottle(updateFn, 1000);
 */
export function useThrottle<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRan = React.useRef(Date.now());

  return React.useCallback(
    ((...args: any[]) => {
      const now = Date.now();
      if (now - lastRan.current >= delay) {
        callback(...args);
        lastRan.current = now;
      }
    }) as T,
    [callback, delay]
  );
}

/**
 * Stable reference hook (prevents re-renders when value deeply equal)
 *
 * @example
 * const stableConfig = useStableReference(config);
 */
export function useStableReference<T>(value: T): T {
  const ref = React.useRef<T>(value);

  if (!deepEqual(ref.current, value)) {
    ref.current = value;
  }

  return ref.current;
}

/**
 * Lazy initialization hook for expensive computations
 *
 * @example
 * const expensiveData = useLazyInit(() => computeExpensiveData(props));
 */
export function useLazyInit<T>(initializer: () => T): T {
  const [value] = React.useState<T>(initializer);
  return value;
}

/**
 * Memoized callback with stable identity
 *
 * @example
 * const handleClick = useStableCallback(() => {
 *   doSomething(props.value);
 * });
 */
export function useStableCallback<T extends (...args: any[]) => any>(
  callback: T
): T {
  const ref = React.useRef<T>(callback);

  React.useEffect(() => {
    ref.current = callback;
  });

  return React.useCallback(((...args: any[]) => {
    return ref.current(...args);
  }) as T, []);
}

/**
 * Batched state updates hook (reduces re-renders)
 *
 * @example
 * const [state, batchUpdate] = useBatchedState({ count: 0, name: '' });
 * batchUpdate({ count: 1, name: 'John' }); // Single re-render
 */
export function useBatchedState<T extends object>(
  initialState: T
): [T, (updates: Partial<T>) => void] {
  const [state, setState] = React.useState<T>(initialState);

  const batchUpdate = React.useCallback((updates: Partial<T>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  return [state, batchUpdate];
}

/**
 * Memoized data transformation pipeline
 *
 * @example
 * const transformedData = usePipeline(
 *   rawData,
 *   [
 *     (data) => data.filter(item => item.active),
 *     (data) => data.sort((a, b) => a.date - b.date),
 *     (data) => data.slice(0, 10),
 *   ]
 * );
 */
export function usePipeline<T>(
  data: T,
  transformers: Array<(data: any) => any>
): any {
  return React.useMemo(() => {
    return transformers.reduce((acc, transformer) => transformer(acc), data);
  }, [data, transformers]);
}

/**
 * Conditional render hook (skip render if condition not met)
 *
 * @example
 * const ShouldRender = useConditionalRender(props.visible);
 * if (!ShouldRender) return null;
 */
export function useConditionalRender(condition: boolean): boolean {
  const [shouldRender, setShouldRender] = React.useState(condition);

  React.useEffect(() => {
    if (condition && !shouldRender) {
      setShouldRender(true);
    }
  }, [condition, shouldRender]);

  return shouldRender;
}

/**
 * Virtual scroll hook for large lists
 *
 * @example
 * const { visibleItems, containerRef } = useVirtualScroll(
 *   items,
 *   { itemHeight: 50, containerHeight: 500 }
 * );
 */
export function useVirtualScroll<T>(
  items: T[],
  options: { itemHeight: number; containerHeight: number }
) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const { itemHeight, containerHeight } = options;

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.ceil((scrollTop + containerHeight) / itemHeight);

  const visibleItems = React.useMemo(() => {
    return items.slice(
      Math.max(0, visibleStart - 5), // Overscan for smooth scrolling
      Math.min(items.length, visibleEnd + 5)
    );
  }, [items, visibleStart, visibleEnd]);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollTop(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  return {
    visibleItems,
    containerRef,
    offsetY: visibleStart * itemHeight,
    totalHeight: items.length * itemHeight,
  };
}
