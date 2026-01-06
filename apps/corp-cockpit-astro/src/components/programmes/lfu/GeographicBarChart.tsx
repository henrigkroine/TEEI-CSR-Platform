import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { GeographicDataPoint } from './types';
import { LFU_COLORS } from './types';

interface GeographicBarChartProps {
  data: GeographicDataPoint[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: GeographicDataPoint }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="lfu-tooltip">
        <div className="lfu-tooltip-label">{payload[0].payload.region}</div>
        <div className="lfu-tooltip-value">
          {payload[0].value.toLocaleString()} participants
        </div>
      </div>
    );
  }
  return null;
};

export const GeographicBarChart: React.FC<GeographicBarChartProps> = ({ data }) => {
  return (
    <div className="lfu-chart-card lfu-animate-in">
      <div className="lfu-chart-card-header">
        <div>
          <div className="lfu-chart-card-title">Geographic Distribution</div>
          <div className="lfu-chart-card-subtitle">Students by region</div>
        </div>
      </div>
      <div className="lfu-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
          >
            <XAxis
              type="number"
              tick={{ fill: LFU_COLORS.slateMuted, fontSize: 11 }}
              axisLine={{ stroke: LFU_COLORS.slateBorder }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="region"
              tick={{ fill: LFU_COLORS.slateMuted, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="participants"
              fill={LFU_COLORS.goldAccent}
              radius={[0, 4, 4, 0]}
              animationDuration={1000}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default GeographicBarChart;
