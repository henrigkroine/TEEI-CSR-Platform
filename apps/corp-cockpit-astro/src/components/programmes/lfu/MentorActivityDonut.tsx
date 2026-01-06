import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { MentorActivityData } from './types';
import { LFU_COLORS } from './types';

interface MentorActivityDonutProps {
  data: MentorActivityData[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: MentorActivityData }>;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="lfu-tooltip">
        <div className="lfu-tooltip-label">{data.name}</div>
        <div className="lfu-tooltip-value">{data.value} mentors</div>
      </div>
    );
  }
  return null;
};

export const MentorActivityDonut: React.FC<MentorActivityDonutProps> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="lfu-chart-card lfu-animate-in">
      <div className="lfu-chart-card-header">
        <div>
          <div className="lfu-chart-card-title">Mentor Activity</div>
          <div className="lfu-chart-card-subtitle">Distribution by activity level</div>
        </div>
      </div>
      <div className="lfu-chart-container" style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              animationDuration={1000}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="lfu-donut-center">
          <div className="lfu-donut-center-value">{total}</div>
          <div className="lfu-donut-center-label">Total Mentors</div>
        </div>
      </div>
      <div className="lfu-legend">
        {data.map((item, index) => (
          <div key={index} className="lfu-legend-item">
            <div className="lfu-legend-dot" style={{ backgroundColor: item.color }} />
            <span>{item.name.split(' (')[0]}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MentorActivityDonut;
