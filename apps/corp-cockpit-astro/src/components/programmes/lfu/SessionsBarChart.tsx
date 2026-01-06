import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { SessionDataPoint } from './types';
import { LFU_COLORS, GRADIENT_IDS } from './types';

interface SessionsBarChartProps {
  data: SessionDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="lfu-tooltip">
        <div className="lfu-tooltip-label">{label}</div>
        <div className="lfu-tooltip-value">
          {payload[0].value.toLocaleString()} sessions
        </div>
      </div>
    );
  }
  return null;
};

export const SessionsBarChart: React.FC<SessionsBarChartProps> = ({ data }) => {
  return (
    <div className="lfu-chart-card lfu-animate-in">
      <div className="lfu-chart-card-header">
        <div>
          <div className="lfu-chart-card-title">Sessions Per Month</div>
          <div className="lfu-chart-card-subtitle">Completed mentoring sessions</div>
        </div>
      </div>
      <div className="lfu-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={GRADIENT_IDS.barFill} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LFU_COLORS.tealLight} stopOpacity={1} />
                <stop offset="100%" stopColor={LFU_COLORS.tealPrimary} stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={LFU_COLORS.slateBorder} vertical={false} />
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
            <Bar
              dataKey="sessions"
              fill={`url(#${GRADIENT_IDS.barFill})`}
              radius={[4, 4, 0, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SessionsBarChart;
