import React from 'react';
import { EnhancedKPICard } from './EnhancedKPICard';
import { HoursLineChart } from './HoursLineChart';
import { SessionsBarChart } from './SessionsBarChart';
import { MentorActivityDonut } from './MentorActivityDonut';
import { GeographicBarChart } from './GeographicBarChart';
import { ActivityHeatmap } from './ActivityHeatmap';
import { EnhancedLeaderboard } from './EnhancedLeaderboard';
import { mockLFUData } from './mockData';
import './lfu-dashboard.css';

interface LFUDashboardV2Props {
  companyId?: string;
}

export const LFUDashboardV2: React.FC<LFUDashboardV2Props> = ({ companyId }) => {
  // In production, fetch data based on companyId
  // For now, use mock data
  const data = mockLFUData;

  const kpiCards = [
    {
      title: 'Total Volunteer Hours',
      value: data.kpis.totalHours,
      trend: data.kpis.totalHoursTrend,
      sparklineData: data.kpis.totalHoursSparkline,
      icon: <ClockIcon />,
      color: 'teal' as const,
    },
    {
      title: 'Active Mentors',
      value: data.kpis.activeMentors,
      trend: data.kpis.activeMentorsTrend,
      sparklineData: data.kpis.activeMentorsSparkline,
      icon: <UsersIcon />,
      color: 'teal' as const,
    },
    {
      title: 'Students Supported',
      value: data.kpis.studentsSupported,
      trend: data.kpis.studentsSupportedTrend,
      sparklineData: data.kpis.studentsSupportedSparkline,
      icon: <GraduateIcon />,
      color: 'gold' as const,
    },
    {
      title: 'Sessions Completed',
      value: data.kpis.sessionsCompleted,
      trend: data.kpis.sessionsCompletedTrend,
      sparklineData: data.kpis.sessionsCompletedSparkline,
      icon: <CalendarIcon />,
      color: 'teal' as const,
    },
  ];

  return (
    <div className="lfu-dashboard">
      {/* Header */}
      <div style={{ marginBottom: '0.5rem' }}>
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--lfu-slate-text)',
          margin: 0
        }}>
          Language for Ukraine Programme
        </h1>
        <p style={{
          fontSize: '0.875rem',
          color: 'var(--lfu-slate-muted)',
          margin: '0.25rem 0 0'
        }}>
          Volunteer mentoring programme dashboard
        </p>
      </div>

      {/* KPI Cards */}
      <div className="lfu-kpi-grid">
        {kpiCards.map((kpi, index) => (
          <EnhancedKPICard key={index} {...kpi} />
        ))}
      </div>

      {/* Charts Row 1: Hours Over Time + Mentor Activity */}
      <div className="lfu-chart-grid">
        <HoursLineChart data={data.hoursOverTime} />
        <MentorActivityDonut data={data.mentorActivity} />
      </div>

      {/* Charts Row 2: Sessions Per Month + Geographic Distribution */}
      <div className="lfu-chart-grid">
        <SessionsBarChart data={data.sessionsPerMonth} />
        <GeographicBarChart data={data.geographicDistribution} />
      </div>

      {/* Activity Heatmap (Full Width) */}
      <ActivityHeatmap data={data.activityHeatmap} />

      {/* Enhanced Leaderboard (Full Width) */}
      <EnhancedLeaderboard data={data.leaderboard} />
    </div>
  );
};

// Simple SVG Icons
const ClockIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const GraduateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
);

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export default LFUDashboardV2;
