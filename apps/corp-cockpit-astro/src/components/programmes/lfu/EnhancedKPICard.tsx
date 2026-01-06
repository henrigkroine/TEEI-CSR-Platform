import React from 'react';
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import type { EnhancedKPICardProps } from './types';
import { LFU_COLORS } from './types';

export const EnhancedKPICard: React.FC<EnhancedKPICardProps> = ({
  title,
  value,
  trend,
  sparklineData,
  icon,
  color,
}) => {
  // Convert sparkline data to chart format
  const chartData = sparklineData.map((val, index) => ({ value: val, index }));

  const getTrendIcon = () => {
    if (trend.direction === 'up') return '\u2191';
    if (trend.direction === 'down') return '\u2193';
    return '\u2192';
  };

  const trendClass = `lfu-kpi-card-trend ${trend.direction}`;
  const lineColor = color === 'teal' ? LFU_COLORS.tealPrimary : LFU_COLORS.goldAccent;

  return (
    <div className="lfu-kpi-card lfu-animate-in">
      <div className="lfu-kpi-card-header">
        <div className={`lfu-kpi-card-icon ${color}`}>
          {icon}
        </div>
        <div className={trendClass}>
          <span>{getTrendIcon()}</span>
          <span>{trend.percentage}%</span>
        </div>
      </div>

      <div className="lfu-kpi-card-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="lfu-kpi-card-title">{title}</div>

      <div className="lfu-kpi-card-sparkline">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default EnhancedKPICard;
