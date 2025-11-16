import { useMemo } from 'react';
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
import { useEffect, useState } from 'react';
import { applyChartThemeDefaults, generateChartColors } from '../lib/themes/chartColors';

// Register Chart.js components
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
}

export default function Chart({ type, data, options, className = '', height = 300 }: ChartProps) {
  const [isDark, setIsDark] = useState(false);

  // Detect current theme
  useEffect(() => {
    const checkTheme = () => {
      const htmlElement = document.documentElement;
      const currentTheme = htmlElement.getAttribute('data-theme') || htmlElement.classList.contains('dark');
      setIsDark(currentTheme === 'dark' || currentTheme === true);
    };

    // Check initial theme
    checkTheme();

    // Listen for theme changes
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    // Listen for custom theme change events
    const handleThemeChange = () => checkTheme();
    window.addEventListener('theme-changed', handleThemeChange);

    return () => {
      observer.disconnect();
      window.removeEventListener('theme-changed', handleThemeChange);
    };
  }, []);

  // Apply theme-aware colors to data if not already set
  const themedData = {
    ...data,
    datasets: data.datasets?.map((dataset: any, index: number) => {
      // If dataset already has colors, use them; otherwise apply theme colors
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
  };

  // Apply theme-aware defaults to options
  const themedOptions = applyChartThemeDefaults(
    {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom' as const,
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      ...options,
    },
    isDark
  );

  const chartComponents = {
    line: Line,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut,
  };

  const ChartComponent = chartComponents[type];

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
      style={{ height }}
      role="img"
      aria-label={`${type} chart visualization`}
    >
      <ChartComponent data={themedData} options={themedOptions} />
    </div>
  );
}
