import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { getOptimizedChartConfig } from '../utils/chartOptimizations';
import { applyChartThemeDefaults, generateChartColors } from '../lib/themes/chartColors';

// Tree-shaking: Only register components that are actually used
// This reduces bundle size by excluding unused Chart.js features
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut';

export interface ChartProps {
  type: ChartType;
  data: any;
  options?: ChartOptions<any>;
  className?: string;
  height?: number;
  /** Enable lazy loading (render only when visible) */
  lazy?: boolean;
  /** Environment preset for performance optimization */
  preset?: 'production' | 'development' | 'minimal';
  /** Callback when chart renders (for performance tracking) */
  onRenderComplete?: (renderTime: number) => void;
}

/**
 * Optimized Chart Component
 *
 * Features:
 * - Memoized to prevent unnecessary re-renders
 * - Lazy loading via Intersection Observer
 * - Automatic performance optimization based on data size
 * - Tree-shaken Chart.js imports
 * - Performance tracking for render times
 *
 * Performance optimizations:
 * - React.memo with deep equality check on data
 * - useMemo for options to prevent recalculation
 * - Lazy component rendering for off-screen charts
 * - Optimized Chart.js configuration based on environment
 */
function ChartOptimized({
  type,
  data,
  options,
  className = '',
  height = 300,
  lazy = false,
  preset = 'production',
  onRenderComplete,
}: ChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = React.useState(!lazy);
  const [isDark, setIsDark] = React.useState(false);
  const renderStartTime = React.useRef<number>(0);

  // Detect current theme
  React.useEffect(() => {
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      const currentTheme = htmlElement.getAttribute('data-theme') || htmlElement.classList.contains('dark');
      setIsDark(currentTheme === 'dark' || currentTheme === true);
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    const handleThemeChange = () => checkTheme();
    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  // Track render start time
  React.useLayoutEffect(() => {
    if (isVisible && onRenderComplete) {
      renderStartTime.current = performance.now();
    }
  }, [isVisible, onRenderComplete]);

  // Track render completion
  React.useEffect(() => {
    if (isVisible && onRenderComplete && renderStartTime.current > 0) {
      const renderTime = performance.now() - renderStartTime.current;
      onRenderComplete(renderTime);
      renderStartTime.current = 0;
    }
  }, [isVisible, onRenderComplete, data]);

  // Lazy loading with Intersection Observer
  React.useEffect(() => {
    if (!lazy || isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Load 50px before entering viewport
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isVisible]);

  // Apply theme-aware colors to data
  const themedData = React.useMemo(() => ({
    ...data,
    datasets: data.datasets?.map((dataset: any) => {
      if (!dataset.backgroundColor || !dataset.borderColor) {
        const colors = generateChartColors(
          dataset.data?.length || 1,
          isDark
        );

        return {
          ...dataset,
          backgroundColor: dataset.backgroundColor || colors,
          borderColor: dataset.borderColor || colors,
          borderWidth: dataset.borderWidth || 2,
        };
      }
      return dataset;
    }),
  }), [data, isDark]);

  // Memoize chart options to prevent recalculation on every render
  const chartOptions = React.useMemo(() => {
    // Count data points for optimization decisions
    const dataPointCount = data.datasets?.[0]?.data?.length || 0;

    // Get optimized base configuration
    const optimizedConfig = getOptimizedChartConfig(
      dataPointCount,
      preset,
      options
    );

    // Merge with default responsive settings and apply theme
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      ...optimizedConfig,
    };

    // Apply theme-aware defaults
    return applyChartThemeDefaults(baseOptions, isDark) as ChartOptions<any>;
  }, [data, options, preset, isDark]);

  // Memoize chart component selection
  const ChartComponent = React.useMemo(() => {
    const chartComponents = {
      line: Line,
      bar: Bar,
      pie: Pie,
      doughnut: Doughnut,
    };
    return chartComponents[type];
  }, [type]);

  return (
    <div
      ref={containerRef}
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
      style={{ height }}
    >
      {isVisible ? (
        <ChartComponent data={themedData} options={chartOptions} />
      ) : (
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-400">Loading chart...</div>
        </div>
      )}
    </div>
  );
}

// Export memoized component with custom comparison
// Only re-render if data or options actually changed
export default React.memo(ChartOptimized, (prevProps, nextProps) => {
  // Simple equality check for primitives
  if (
    prevProps.type !== nextProps.type ||
    prevProps.className !== nextProps.className ||
    prevProps.height !== nextProps.height ||
    prevProps.lazy !== nextProps.lazy ||
    prevProps.preset !== nextProps.preset
  ) {
    return false;
  }

  // Deep equality check for data (expensive but necessary)
  // In production, consider using a library like fast-deep-equal
  const dataEqual = JSON.stringify(prevProps.data) === JSON.stringify(nextProps.data);
  const optionsEqual = JSON.stringify(prevProps.options) === JSON.stringify(nextProps.options);

  return dataEqual && optionsEqual;
});
