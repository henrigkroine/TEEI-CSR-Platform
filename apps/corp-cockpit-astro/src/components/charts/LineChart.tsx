/**
 * LineChart — Premium line chart for comparisons and multi-series data
 * 
 * Clean, minimal design with smooth curves and interactive tooltips.
 */

import React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  chartColors,
  chartSpacing,
  chartAnimation,
  tooltipContentStyle,
  tooltipLabelStyle,
  tooltipItemStyle,
  xAxisConfig,
  yAxisConfig,
  gridConfig,
  referenceLineStyle,
  referenceLabelStyle,
  getSeriesColor,
  formatChartValue,
  chartTypography,
} from '../../lib/chartTheme';

export interface LineChartDataPoint {
  [key: string]: string | number;
}

export interface LineChartSeries {
  dataKey: string;
  name?: string;
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
}

export interface ReferenceLineConfig {
  y: number;
  label?: string;
  color?: string;
}

export interface LineChartProps {
  data: LineChartDataPoint[];
  xDataKey: string;
  series: LineChartSeries[];
  referenceLines?: ReferenceLineConfig[];
  showGrid?: boolean;
  showLegend?: boolean;
  showDots?: boolean;
  curved?: boolean;
  animate?: boolean;
  formatXAxis?: (value: string | number) => string;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number, name: string) => string;
  height?: number;
}

export default function LineChart({
  data,
  xDataKey,
  series,
  referenceLines = [],
  showGrid = true,
  showLegend = true,
  showDots = true,
  curved = true,
  animate = true,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  height = 300,
}: LineChartProps) {
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <div style={tooltipContentStyle}>
        <p style={tooltipLabelStyle}>{label}</p>
        {payload.map((entry: any, index: number) => (
          <div 
            key={index} 
            style={{ 
              ...tooltipItemStyle,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span 
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: entry.color,
                flexShrink: 0,
              }}
            />
            <span style={{ color: chartColors.textMuted }}>{entry.name}:</span>
            <span style={{ fontWeight: 600, color: chartColors.text }}>
              {formatTooltip 
                ? formatTooltip(entry.value, entry.name)
                : formatChartValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart
        data={data}
        margin={chartSpacing.margin}
      >
        {/* Grid */}
        {showGrid && (
          <CartesianGrid 
            strokeDasharray={gridConfig.strokeDasharray}
            stroke={gridConfig.stroke}
            vertical={gridConfig.vertical}
          />
        )}

        {/* Axes */}
        <XAxis
          dataKey={xDataKey}
          {...xAxisConfig}
          tickFormatter={formatXAxis}
        />
        <YAxis
          {...yAxisConfig}
          tickFormatter={formatYAxis || ((v) => formatChartValue(v, { compact: true }))}
        />

        {/* Tooltip */}
        <Tooltip content={<CustomTooltip />} />

        {/* Legend */}
        {showLegend && (
          <Legend
            wrapperStyle={{ paddingTop: 16 }}
            iconType="circle"
            iconSize={10}
            formatter={(value) => (
              <span style={{ 
                color: chartColors.text, 
                fontSize: chartTypography.legend.fontSize,
                fontWeight: chartTypography.legend.fontWeight,
              }}>
                {value}
              </span>
            )}
          />
        )}

        {/* Reference lines */}
        {referenceLines.map((line, index) => (
          <ReferenceLine
            key={index}
            y={line.y}
            stroke={line.color || referenceLineStyle.stroke}
            strokeDasharray={referenceLineStyle.strokeDasharray}
            strokeWidth={referenceLineStyle.strokeWidth}
            opacity={referenceLineStyle.opacity}
            label={{
              value: line.label,
              position: 'right',
              ...referenceLabelStyle,
            }}
          />
        ))}

        {/* Line series */}
        {series.map((s, i) => {
          const color = s.color || getSeriesColor(i);
          return (
            <Line
              key={s.dataKey}
              type={curved ? 'monotone' : 'linear'}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              stroke={color}
              strokeWidth={s.strokeWidth || chartSpacing.lineWidth}
              strokeDasharray={s.dashed ? '6 4' : undefined}
              dot={showDots ? {
                r: chartSpacing.dotRadiusSmall,
                fill: color,
                strokeWidth: 2,
                stroke: '#fff',
              } : false}
              activeDot={{
                r: chartSpacing.dotRadiusHover,
                fill: color,
                strokeWidth: 2,
                stroke: '#fff',
              }}
              animationDuration={animate ? chartAnimation.duration : 0}
              animationEasing="ease-out"
            />
          );
        })}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}



