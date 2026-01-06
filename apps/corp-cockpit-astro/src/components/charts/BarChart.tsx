/**
 * BarChart — Premium bar chart for categorical comparisons
 * 
 * Supports vertical/horizontal, stacked, and grouped layouts.
 */

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
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
  getStatusColor,
} from '../../lib/chartTheme';

export interface BarChartDataPoint {
  [key: string]: string | number;
}

export interface BarChartSeries {
  dataKey: string;
  name?: string;
  color?: string;
  stackId?: string;
}

export interface ReferenceLineConfig {
  y?: number;
  x?: string | number;
  label?: string;
  color?: string;
}

export interface BarChartProps {
  data: BarChartDataPoint[];
  xDataKey: string;
  series: BarChartSeries[];
  referenceLines?: ReferenceLineConfig[];
  layout?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  colorByValue?: boolean; // Use status colors based on value
  animate?: boolean;
  formatXAxis?: (value: string | number) => string;
  formatYAxis?: (value: number) => string;
  formatTooltip?: (value: number, name: string) => string;
  height?: number;
  barRadius?: number | [number, number, number, number];
}

export default function BarChart({
  data,
  xDataKey,
  series,
  referenceLines = [],
  layout = 'horizontal',
  showGrid = true,
  showLegend = true,
  stacked = false,
  colorByValue = false,
  animate = true,
  formatXAxis,
  formatYAxis,
  formatTooltip,
  height = 300,
  barRadius = chartSpacing.barRadius,
}: BarChartProps) {
  const isVertical = layout === 'vertical';

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
                borderRadius: 2,
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

  const margin = isVertical 
    ? { ...chartSpacing.margin, left: 100 }
    : chartSpacing.margin;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        layout={isVertical ? 'vertical' : 'horizontal'}
        margin={margin}
        barGap={chartSpacing.barGap}
        barCategoryGap={chartSpacing.barCategoryGap}
      >
        {/* Grid */}
        {showGrid && (
          <CartesianGrid 
            strokeDasharray={gridConfig.strokeDasharray}
            stroke={gridConfig.stroke}
            horizontal={isVertical ? false : true}
            vertical={isVertical ? true : false}
          />
        )}

        {/* Axes */}
        {isVertical ? (
          <>
            <XAxis
              type="number"
              {...xAxisConfig}
              tickFormatter={formatYAxis || ((v) => formatChartValue(Number(v), { compact: true }))}
            />
            <YAxis
              type="category"
              dataKey={xDataKey}
              {...yAxisConfig}
              width={90}
              tickFormatter={formatXAxis}
            />
          </>
        ) : (
          <>
            <XAxis
              dataKey={xDataKey}
              {...xAxisConfig}
              tickFormatter={formatXAxis}
            />
            <YAxis
              {...yAxisConfig}
              tickFormatter={formatYAxis || ((v) => formatChartValue(v, { compact: true }))}
            />
          </>
        )}

        {/* Tooltip */}
        <Tooltip content={<CustomTooltip />} />

        {/* Legend */}
        {showLegend && series.length > 1 && (
          <Legend
            wrapperStyle={{ paddingTop: 16 }}
            iconType="rect"
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
            x={line.x}
            stroke={line.color || referenceLineStyle.stroke}
            strokeDasharray={referenceLineStyle.strokeDasharray}
            strokeWidth={referenceLineStyle.strokeWidth}
            opacity={referenceLineStyle.opacity}
            label={line.label ? {
              value: line.label,
              position: isVertical ? 'top' : 'right',
              ...referenceLabelStyle,
            } : undefined}
          />
        ))}

        {/* Bar series */}
        {series.map((s, i) => {
          const color = s.color || getSeriesColor(i);
          return (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name || s.dataKey}
              fill={color}
              radius={barRadius}
              stackId={stacked ? (s.stackId || 'stack') : undefined}
              animationDuration={animate ? chartAnimation.duration : 0}
              animationEasing="ease-out"
            >
              {/* Dynamic coloring by value */}
              {colorByValue && data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={getStatusColor(entry[s.dataKey] as number)}
                />
              ))}
            </Bar>
          );
        })}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}



