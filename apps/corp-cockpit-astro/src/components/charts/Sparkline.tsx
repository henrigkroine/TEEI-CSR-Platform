/**
 * Sparkline — Compact inline chart for KPI cards
 *
 * Minimal, elegant micro-visualization for trends.
 */

import React, { useMemo, useId } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  YAxis,
} from 'recharts';
import { chartColors, chartAnimation } from '../../lib/chartTheme';

export interface SparklineProps {
  data: number[];
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | string;
  trend?: 'up' | 'down' | 'neutral';
  height?: number;
  width?: number | string;
  showArea?: boolean;
  animate?: boolean;
  className?: string;
}

const colorMap = {
  primary: chartColors.primary,
  accent: chartColors.accent,
  success: chartColors.success,
  warning: chartColors.warning,
  error: chartColors.error,
};

export default function Sparkline({
  data,
  color = 'primary',
  trend,
  height = 32,
  width = '100%',
  showArea = true,
  animate = true,
  className = '',
}: SparklineProps) {
  // Determine color based on trend if not explicitly set
  const lineColor = useMemo(() => {
    if (color in colorMap) {
      return colorMap[color as keyof typeof colorMap];
    }
    if (color.startsWith('#')) {
      return color;
    }
    // Auto-color based on trend
    if (trend === 'up') return chartColors.success;
    if (trend === 'down') return chartColors.error;
    return chartColors.primary;
  }, [color, trend]);

  // Convert array to chart data format
  const chartData = useMemo(() => {
    return data.map((value, index) => ({ value, index }));
  }, [data]);

  // Calculate Y domain with padding
  const [minY, maxY] = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const padding = (max - min) * 0.1 || 1;
    return [min - padding, max + padding];
  }, [data]);

  // Generate stable gradient ID using useId to prevent hydration mismatches
  const id = useId();
  const gradientId = `sparkline-gradient-${id.replace(/:/g, '-')}`;

  return (
    <div
      className={`sparkline ${className}`}
      style={{ width, height }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          <YAxis domain={[minY, maxY]} hide />

          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={1.5}
            fill={showArea ? `url(#${gradientId})` : 'none'}
            dot={false}
            activeDot={false}
            animationDuration={animate ? chartAnimation.durationFast : 0}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * SVG-only sparkline (for when you don't need Recharts overhead)
 */
export function SparklineSVG({
  data,
  color = 'primary',
  trend,
  height = 32,
  width = 80,
  showArea = true,
  className = '',
}: Omit<SparklineProps, 'animate'> & { width?: number }) {
  // Generate stable gradient ID using useId to prevent hydration mismatches
  const id = useId();
  const gradientId = `sparkline-svg-${id.replace(/:/g, '-')}`;

  const lineColor = useMemo(() => {
    if (color in colorMap) {
      return colorMap[color as keyof typeof colorMap];
    }
    if (color.startsWith('#')) {
      return color;
    }
    if (trend === 'up') return chartColors.success;
    if (trend === 'down') return chartColors.error;
    return chartColors.primary;
  }, [color, trend]);

  // Calculate path
  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) return { linePath: '', areaPath: '' };

    const padding = 2;
    const w = typeof width === 'number' ? width : 80;
    const h = height;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((value - min) / range) * (h - padding * 2);
      return { x, y };
    });

    // Create smooth bezier curve
    let linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpX = (prev.x + curr.x) / 2;
      linePath += ` C ${cpX} ${prev.y}, ${cpX} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    // Area fill path
    const areaPath = showArea
      ? `${linePath} L ${points[points.length - 1].x} ${h - padding} L ${points[0].x} ${h - padding} Z`
      : '';

    return { linePath, areaPath };
  }, [data, width, height, showArea]);

  return (
    <svg
      className={`sparkline-svg ${className}`}
      width={width}
      height={height}
      viewBox={`0 0 ${typeof width === 'number' ? width : 80} ${height}`}
      preserveAspectRatio="none"
    >
      {showArea && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}

      {showArea && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
        />
      )}

      <path
        d={linePath}
        fill="none"
        stroke={lineColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}



