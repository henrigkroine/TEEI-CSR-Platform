// LFU Dashboard V2 Mock Data

import type {
  LFUDashboardData,
  HoursDataPoint,
  SessionDataPoint,
  MentorActivityData,
  GeographicDataPoint,
  HeatmapDay,
  LeaderboardEntry,
} from './types';
import { LFU_COLORS } from './types';

// Generate sparkline data (7 days)
const generateSparkline = (baseValue: number, variance: number): number[] => {
  return Array.from({ length: 7 }, () =>
    Math.round(baseValue + (Math.random() - 0.5) * variance)
  );
};

// Generate 52 weeks of heatmap data
const generateHeatmapData = (): HeatmapDay[][] => {
  const weeks: HeatmapDay[][] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 364); // Go back ~52 weeks

  for (let week = 0; week < 52; week++) {
    const weekData: HeatmapDay[] = [];
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + week * 7 + day);

      // Generate random session count with weekend bias (lower activity)
      const isWeekend = day === 0 || day === 6;
      const baseSessions = isWeekend ? 2 : 8;
      const sessions = Math.max(0, Math.round(baseSessions + (Math.random() - 0.3) * 10));

      // Determine level based on sessions
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (sessions > 10) level = 4;
      else if (sessions > 5) level = 3;
      else if (sessions > 2) level = 2;
      else if (sessions > 0) level = 1;

      weekData.push({
        date: currentDate.toISOString().split('T')[0],
        sessions,
        level,
      });
    }
    weeks.push(weekData);
  }

  return weeks;
};

// Monthly hours data
const hoursOverTime: HoursDataPoint[] = [
  { month: 'Jan', hours: 420, sessions: 580 },
  { month: 'Feb', hours: 485, sessions: 620 },
  { month: 'Mar', hours: 510, sessions: 685 },
  { month: 'Apr', hours: 475, sessions: 640 },
  { month: 'May', hours: 520, sessions: 710 },
  { month: 'Jun', hours: 445, sessions: 590 },
  { month: 'Jul', hours: 380, sessions: 495 },
  { month: 'Aug', hours: 355, sessions: 450 },
  { month: 'Sep', hours: 490, sessions: 660 },
  { month: 'Oct', hours: 545, sessions: 745 },
  { month: 'Nov', hours: 580, sessions: 780 },
  { month: 'Dec', hours: 580, sessions: 850 },
];

// Sessions per month
const sessionsPerMonth: SessionDataPoint[] = hoursOverTime.map((h) => ({
  month: h.month,
  sessions: h.sessions!,
}));

// Mentor activity distribution
const mentorActivity: MentorActivityData[] = [
  { name: 'High Activity (10+ sessions)', value: 45, color: LFU_COLORS.tealPrimary },
  { name: 'Medium Activity (5-9)', value: 68, color: LFU_COLORS.tealLight },
  { name: 'Low Activity (1-4)', value: 52, color: LFU_COLORS.teal100 },
  { name: 'Inactive (0)', value: 29, color: LFU_COLORS.slateBorder },
];

// Geographic distribution
const geographicDistribution: GeographicDataPoint[] = [
  { region: 'Kyiv Oblast', participants: 185 },
  { region: 'Lviv Oblast', participants: 142 },
  { region: 'Dnipro Oblast', participants: 98 },
  { region: 'Odesa Oblast', participants: 87 },
  { region: 'Kharkiv Oblast', participants: 72 },
  { region: 'Zaporizhzhia Oblast', participants: 54 },
  { region: 'Other Regions', participants: 142 },
].sort((a, b) => b.participants - a.participants);

// Leaderboard
const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: 'Ashley Moore', role: 'Senior Mentor', hours: 282, sessions: 320 },
  { rank: 2, name: 'Renee Rudd', role: 'Lead Instructor', hours: 209, sessions: 243 },
  { rank: 3, name: 'Melanie Piddocke', role: 'Volunteer Mentor', hours: 187, sessions: 198 },
  { rank: 4, name: 'James Wilson', role: 'Language Coach', hours: 156, sessions: 175 },
  { rank: 5, name: 'Sarah Chen', role: 'Senior Mentor', hours: 142, sessions: 158 },
  { rank: 6, name: 'Michael Brown', role: 'Volunteer Mentor', hours: 128, sessions: 142 },
  { rank: 7, name: 'Emma Davis', role: 'Language Coach', hours: 115, sessions: 126 },
  { rank: 8, name: 'David Kim', role: 'Volunteer Mentor', hours: 98, sessions: 108 },
  { rank: 9, name: 'Lisa Anderson', role: 'Volunteer Mentor', hours: 85, sessions: 92 },
  { rank: 10, name: 'Robert Taylor', role: 'Volunteer Mentor', hours: 72, sessions: 78 },
];

// Full dashboard data
export const mockLFUData: LFUDashboardData = {
  kpis: {
    totalHours: 5785,
    totalHoursTrend: { direction: 'up', percentage: 12.5 },
    totalHoursSparkline: generateSparkline(825, 150),
    activeMentors: 194,
    activeMentorsTrend: { direction: 'up', percentage: 8.2 },
    activeMentorsSparkline: generateSparkline(28, 8),
    studentsSupported: 580,
    studentsSupportedTrend: { direction: 'up', percentage: 15.3 },
    studentsSupportedSparkline: generateSparkline(83, 20),
    sessionsCompleted: 7805,
    sessionsCompletedTrend: { direction: 'up', percentage: 9.8 },
    sessionsCompletedSparkline: generateSparkline(1115, 200),
  },
  hoursOverTime,
  sessionsPerMonth,
  mentorActivity,
  geographicDistribution,
  activityHeatmap: generateHeatmapData(),
  leaderboard,
};

// Export individual data for flexible usage
export { hoursOverTime, sessionsPerMonth, mentorActivity, geographicDistribution, leaderboard };
