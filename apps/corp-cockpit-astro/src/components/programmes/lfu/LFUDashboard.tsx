import React from 'react';
import { KPICard } from './KPICard';
import { MentorLeaderboard } from './MentorLeaderboard';
import { CSVImporter } from './CSVImporter';

interface LFUDashboardProps {
  companyId?: string;
}

export const LFUDashboard: React.FC<LFUDashboardProps> = ({ companyId }) => {
  // Hardcoded data as per requirements
  const kpis = [
    { title: 'Total Volunteer Hours', value: '5,785', icon: '🕐' },
    { title: 'Active Mentors', value: '194', icon: '👥' },
    { title: 'Students Supported', value: '580', icon: '🎓' },
    { title: 'Sessions Completed', value: '7,805', icon: '📅' },
  ];

  const topMentors = [
    { name: 'Ashley Moore', hours: 282, sessions: 320 },
    { name: 'Renee Rudd', hours: 209, sessions: 243 },
    { name: 'Melanie Piddocke', hours: 70, sessions: 36 },
  ];

  const handleExport = () => {
      alert(`Exporting report for company: ${companyId} (Demo mode)`);
  };

  return (
    <div className="space-y-8">
      {/* KPI Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, index) => (
          <KPICard key={index} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* Leaderboard Section - Takes up 2 columns */}
        <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center">
                 <h2 className="text-xl font-bold text-slate-800">Programme Performance</h2>
                 <button
                    onClick={handleExport}
                    className="btn btn-primary"
                 >
                    <span>Download Report</span>
                 </button>
            </div>
            <MentorLeaderboard mentors={topMentors} />
        </div>

        {/* Importer Section - Takes up 1 column */}
        <div className="space-y-6">
            <h2 className="text-xl font-heading font-semibold text-text-primary">Actions</h2>
            <CSVImporter />
        </div>
      </div>
    </div>
  );
};
