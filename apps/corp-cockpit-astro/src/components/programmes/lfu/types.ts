// LFU Dashboard V2 Types

export interface TrendData {
  direction: 'up' | 'down' | 'neutral';
  percentage: number;
}

export interface EnhancedKPICardProps {
  title: string;
  value: string | number;
  trend: TrendData;
  sparklineData: number[];
  icon: React.ReactNode;
  color: 'teal' | 'gold';
}

export interface HoursDataPoint {
  month: string;
  hours: number;
  sessions?: number;
}

export interface SessionDataPoint {
  month: string;
  sessions: number;
}

export interface MentorActivityData {
  name: string;
  value: number;
  color: string;
}

export interface GeographicDataPoint {
  region: string;
  participants: number;
}

export interface HeatmapDay {
  date: string;
  sessions: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  role?: string;
  hours: number;
  sessions: number;
  avatar?: string;
}

export interface LFUDashboardData {
  kpis: {
    totalHours: number;
    totalHoursTrend: TrendData;
    totalHoursSparkline: number[];
    activeMentors: number;
    activeMentorsTrend: TrendData;
    activeMentorsSparkline: number[];
    studentsSupported: number;
    studentsSupportedTrend: TrendData;
    studentsSupportedSparkline: number[];
    sessionsCompleted: number;
    sessionsCompletedTrend: TrendData;
    sessionsCompletedSparkline: number[];
  };
  hoursOverTime: HoursDataPoint[];
  sessionsPerMonth: SessionDataPoint[];
  mentorActivity: MentorActivityData[];
  geographicDistribution: GeographicDataPoint[];
  activityHeatmap: HeatmapDay[][];
  leaderboard: LeaderboardEntry[];
}

// Color constants for charts
export const LFU_COLORS = {
  tealPrimary: '#0D9488',
  tealLight: '#5EEAD4',
  tealDark: '#0F766E',
  teal100: '#99F6E4',
  teal400: '#14B8A6',
  goldAccent: '#F59E0B',
  goldLight: '#FCD34D',
  slateBg: '#F8FAFC',
  slateBorder: '#E2E8F0',
  slateText: '#334155',
  slateMuted: '#64748B',
} as const;

// Chart gradient IDs
export const GRADIENT_IDS = {
  areaFill: 'lfu-area-gradient',
  barFill: 'lfu-bar-gradient',
} as const;
