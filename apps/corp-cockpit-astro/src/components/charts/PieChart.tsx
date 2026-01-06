/**
 * PieChart — Premium pie/donut chart for composition data
 * 
 * Elegant design with smooth animations and interactive segments.
 */

import React, { useState, useCallback } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import {
  chartColors,
  chartAnimation,
  tooltipContentStyle,
  tooltipItemStyle,
  getSeriesColor,
  formatChartValue,
  formatPercent,
  chartTypography,
} from '../../lib/chartTheme';

export interface PieChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export interface PieChartProps {
  data: PieChartDataPoint[];
  donut?: boolean;
  showLegend?: boolean;
  showLabels?: boolean;
  showTooltip?: boolean;
  activeHover?: boolean;
  animate?: boolean;
  formatValue?: (value: number) => string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

// Active shape renderer for hover effect
const renderActiveShape = (props: any) => {
  const {
    cx, cy, innerRadius, outerRadius, startAngle, endAngle,
    fill, payload, percent, value,
  } = props;

  return (
    <g>
      {/* Main sector (expanded) */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#fff"
        strokeWidth={2}
      />
      
      {/* Center label for donut */}
      {innerRadius > 0 && (
        <>
          <text 
            x={cx} 
            y={cy - 8} 
            textAnchor="middle" 
            fill={chartColors.text}
            style={{ 
              fontSize: chartTypography.tooltip.valueSize,
              fontWeight: chartTypography.tooltip.valueWeight,
            }}
          >
            {formatChartValue(value)}
          </text>
          <text 
            x={cx} 
            y={cy + 12} 
            textAnchor="middle" 
            fill={chartColors.textMuted}
            style={{ fontSize: 11 }}
          >
            {payload.name}
          </text>
          <text 
            x={cx} 
            y={cy + 28} 
            textAnchor="middle" 
            fill={chartColors.textMuted}
            style={{ fontSize: 10 }}
          >
            {formatPercent(percent * 100, 1)}
          </text>
        </>
      )}
    </g>
  );
};

export default function PieChart({
  data,
  donut = false,
  showLegend = true,
  showLabels = false,
  showTooltip = true,
  activeHover = true,
  animate = true,
  formatValue,
  height = 300,
  innerRadius: customInnerRadius,
  outerRadius: customOuterRadius,
}: PieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const onPieEnter = useCallback((_: any, index: number) => {
    if (activeHover) {
      setActiveIndex(index);
    }
  }, [activeHover]);

  const onPieLeave = useCallback(() => {
    setActiveIndex(undefined);
  }, []);

  // Calculate radii based on height
  const baseRadius = Math.min(height * 0.35, 120);
  const innerRadius = customInnerRadius ?? (donut ? baseRadius * 0.6 : 0);
  const outerRadius = customOuterRadius ?? baseRadius;

  // Calculate total for percentages
  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    
    const entry = payload[0];
    const percent = (entry.value / total) * 100;

    return (
      <div style={tooltipContentStyle}>
        <div 
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
              backgroundColor: entry.payload.fill,
              flexShrink: 0,
            }}
          />
          <span style={{ color: chartColors.textMuted }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: chartColors.text }}>
            {formatValue ? formatValue(entry.value) : formatChartValue(entry.value)}
          </span>
          <span style={{ color: chartColors.textMuted, fontSize: 11 }}>
            ({formatPercent(percent, 1)})
          </span>
        </div>
      </div>
    );
  };

  // Custom label renderer
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.3;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Hide labels for small segments

    return (
      <text
        x={x}
        y={y}
        fill={chartColors.text}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        style={{ fontSize: 11, fontWeight: 500 }}
      >
        {name} ({formatPercent(percent * 100, 0)})
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          activeIndex={activeIndex}
          activeShape={activeHover ? renderActiveShape : undefined}
          onMouseEnter={onPieEnter}
          onMouseLeave={onPieLeave}
          label={showLabels ? renderLabel : false}
          labelLine={showLabels}
          animationDuration={animate ? chartAnimation.duration : 0}
          animationEasing="ease-out"
        >
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`}
              fill={entry.color || getSeriesColor(index)}
              stroke="#fff"
              strokeWidth={2}
            />
          ))}
        </Pie>

        {/* Tooltip */}
        {showTooltip && <Tooltip content={<CustomTooltip />} />}

        {/* Legend */}
        {showLegend && (
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: 20 }}
            iconType="circle"
            iconSize={10}
            formatter={(value, entry: any) => (
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
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}



