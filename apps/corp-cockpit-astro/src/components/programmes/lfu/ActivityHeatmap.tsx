import React, { useState } from 'react';
import type { HeatmapDay } from './types';

interface ActivityHeatmapProps {
  data: HeatmapDay[][];
}

interface TooltipState {
  show: boolean;
  x: number;
  y: number;
  date: string;
  sessions: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<TooltipState>({
    show: false,
    x: 0,
    y: 0,
    date: '',
    sessions: 0,
  });

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    day: HeatmapDay
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      show: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
      date: day.date,
      sessions: day.sessions,
    });
  };

  const handleMouseLeave = () => {
    setTooltip((prev) => ({ ...prev, show: false }));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get month labels
  const monthLabels: { month: string; weekIndex: number }[] = [];
  let lastMonth = '';
  data.forEach((week, weekIndex) => {
    if (week[0]) {
      const date = new Date(week[0].date);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      if (month !== lastMonth) {
        monthLabels.push({ month, weekIndex });
        lastMonth = month;
      }
    }
  });

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="lfu-chart-card lfu-full-width-card lfu-animate-in">
      <div className="lfu-chart-card-header">
        <div>
          <div className="lfu-chart-card-title">Activity Heatmap</div>
          <div className="lfu-chart-card-subtitle">Daily session activity over the past year</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {/* Day labels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingTop: '20px' }}>
          {dayLabels.map((day, idx) => (
            <div
              key={idx}
              style={{
                height: '12px',
                fontSize: '10px',
                color: 'var(--lfu-slate-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {idx % 2 === 1 ? day : ''}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {/* Month labels */}
          <div style={{ display: 'flex', height: '16px', marginBottom: '4px' }}>
            {monthLabels.map((label, idx) => (
              <div
                key={idx}
                style={{
                  position: 'absolute',
                  left: `${label.weekIndex * 14 + 30}px`,
                  fontSize: '10px',
                  color: 'var(--lfu-slate-muted)',
                }}
              >
                {label.month}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div className="lfu-heatmap">
            {data.map((week, weekIdx) => (
              <div key={weekIdx} className="lfu-heatmap-week">
                {week.map((day, dayIdx) => (
                  <div
                    key={dayIdx}
                    className={`lfu-heatmap-day level-${day.level}`}
                    onMouseEnter={(e) => handleMouseEnter(e, day)}
                    onMouseLeave={handleMouseLeave}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="lfu-heatmap-legend">
        <span>Less</span>
        <div className="lfu-heatmap-legend-item level-0" style={{ background: 'var(--lfu-slate-border)' }} />
        <div className="lfu-heatmap-legend-item level-1" style={{ background: 'var(--lfu-teal-100)' }} />
        <div className="lfu-heatmap-legend-item level-2" style={{ background: 'var(--lfu-teal-light)' }} />
        <div className="lfu-heatmap-legend-item level-3" style={{ background: 'var(--lfu-teal-400)' }} />
        <div className="lfu-heatmap-legend-item level-4" style={{ background: 'var(--lfu-teal-primary)' }} />
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="lfu-tooltip"
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <div className="lfu-tooltip-label">{formatDate(tooltip.date)}</div>
          <div className="lfu-tooltip-value">{tooltip.sessions} sessions</div>
        </div>
      )}
    </div>
  );
};

export default ActivityHeatmap;
