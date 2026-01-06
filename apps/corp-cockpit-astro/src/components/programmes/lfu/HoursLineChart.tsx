import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { HoursDataPoint } from './types';
import { LFU_COLORS, GRADIENT_IDS } from './types';

interface HoursLineChartProps {
  data: HoursDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: HoursDataPoint }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="lfu-tooltip">
        <div className="lfu-tooltip-label">{label}</div>
        <div className="lfu-tooltip-value">
          {payload[0].value.toLocaleString()} hours
        </div>
        {payload[0].payload.sessions && (
          <div className="lfu-tooltip-value">
            {payload[0].payload.sessions.toLocaleString()} sessions
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const HoursLineChart: React.FC<HoursLineChartProps> = ({ data }) => {
  return (
    <div className="lfu-chart-card lfu-animate-in">
      <div className="lfu-chart-card-header">
        <div>
          <div className="lfu-chart-card-title">Hours Over Time</div>
          <div className="lfu-chart-card-subtitle">Monthly volunteer hours</div>
        </div>
      </div>
      <div className="lfu-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_IDS.areaFill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={LFU_COLORS.tealPrimary} stopOpacity={0.3} />
                <stop offset="95%" stopColor={LFU_COLORS.tealPrimary} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={LFU_COLORS.slateBorder} />
            <XAxis
              dataKey="month"
              tick={{ fill: LFU_COLORS.slateMuted, fontSize: 12 }}
              axisLine={{ stroke: LFU_COLORS.slateBorder }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: LFU_COLORS.slateMuted, fontSize: 12 }}
              axisLine={{ stroke: LFU_COLORS.slateBorder }}
              tickLine={false}
              width={50}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="hours"
              stroke={LFU_COLORS.tealPrimary}
              strokeWidth={2}
              fill={`url(#${GRADIENT_IDS.areaFill})`}
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HoursLineChart;
