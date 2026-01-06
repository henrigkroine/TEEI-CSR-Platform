/**
 * SharedDashboard Component
 *
 * Read-only dashboard for shared links
 * Supports boardroom mode with auto-refresh and large typography
 */

import { useState, useEffect } from 'react';
import type { FC } from 'react';

interface SharedDashboardProps {
  companyId: string;
  filterConfig: Record<string, any>;
  boardroomMode: boolean;
  lang: string;
}

interface DashboardData {
  metrics: {
    sroi: number;
    vis: number;
    participants: number;
    integration_score: number;
  };
  programs: Array<{
    name: string;
    completion_rate: number;
    count: number;
  }>;
  lastUpdated: string;
}

export const SharedDashboard: FC<SharedDashboardProps> = ({
  companyId,
  filterConfig,
  boardroomMode,
  lang,
}) => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard data based on filter config
      // This is a mock implementation - replace with actual API calls
      const mockData: DashboardData = {
        metrics: {
          sroi: 3.2,
          vis: 85,
          participants: 247,
          integration_score: 0.78,
        },
        programs: [
          { name: 'Buddy Program', completion_rate: 89, count: 142 },
          { name: 'Language Connect', completion_rate: 72, count: 67 },
          { name: 'Upskilling', completion_rate: 81, count: 38 },
        ],
        lastUpdated: new Date().toISOString(),
      };

      setData(mockData);
      setLastRefresh(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh in boardroom mode every 60 seconds
    if (boardroomMode) {
      const interval = setInterval(() => {
        fetchDashboardData();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [companyId, boardroomMode]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
      </div>
    );
  }

  return (
    <div className={`${boardroomMode ? 'p-12' : 'p-6'} max-w-7xl mx-auto`}>
      {/* Header */}
      <div className={`mb-${boardroomMode ? '12' : '8'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1
              className={`font-bold ${
                boardroomMode
                  ? 'text-6xl lg:text-8xl text-white'
                  : 'text-3xl text-gray-900 dark:text-gray-100'
              }`}
            >
              CSR Dashboard
            </h1>
            {!boardroomMode && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Read-only shared view
              </p>
            )}
          </div>

          {boardroomMode && (
            <div className="text-right">
              <div className="text-2xl text-gray-400">Live Dashboard</div>
              <div className="text-lg text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div
        className={`grid gap-${boardroomMode ? '8' : '6'} ${
          boardroomMode ? 'lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-4'
        } mb-${boardroomMode ? '12' : '8'}`}
      >
        <MetricCard
          label="SROI"
          value={`${data.metrics.sroi}x`}
          boardroomMode={boardroomMode}
        />
        <MetricCard
          label="VIS Score"
          value={data.metrics.vis.toString()}
          boardroomMode={boardroomMode}
        />
        <MetricCard
          label="Active Participants"
          value={data.metrics.participants.toString()}
          boardroomMode={boardroomMode}
        />
        <MetricCard
          label="Integration Score"
          value={(data.metrics.integration_score * 100).toFixed(0) + '%'}
          boardroomMode={boardroomMode}
        />
      </div>

      {/* Programs Overview */}
      <div
        className={`${
          boardroomMode
            ? 'bg-gray-900 border-2 border-gray-700'
            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        } rounded-lg p-${boardroomMode ? '8' : '6'}`}
      >
        <h2
          className={`font-semibold mb-${boardroomMode ? '8' : '4'} ${
            boardroomMode
              ? 'text-5xl text-white'
              : 'text-xl text-gray-900 dark:text-gray-100'
          }`}
        >
          Program Overview
        </h2>
        <div className={`space-y-${boardroomMode ? '6' : '4'}`}>
          {data.programs.map((program, index) => (
            <div key={index}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div
                    className={`font-medium ${
                      boardroomMode
                        ? 'text-3xl text-white'
                        : 'text-base text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {program.name}
                  </div>
                  <div
                    className={`${
                      boardroomMode
                        ? 'text-xl text-gray-400'
                        : 'text-sm text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {program.completion_rate}% completion rate
                  </div>
                </div>
                <div
                  className={`font-bold ${
                    boardroomMode
                      ? 'text-6xl text-blue-400'
                      : 'text-2xl text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {program.count}
                </div>
              </div>
              {index < data.programs.length - 1 && (
                <div
                  className={`${
                    boardroomMode ? 'h-1 bg-gray-700' : 'h-px bg-gray-200 dark:bg-gray-700'
                  } mt-${boardroomMode ? '6' : '4'}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      {!boardroomMode && (
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>This is a read-only shared view. Data is refreshed from the source system.</p>
          <p className="mt-1">Last updated: {new Date(data.lastUpdated).toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

// MetricCard sub-component
interface MetricCardProps {
  label: string;
  value: string;
  boardroomMode: boolean;
}

const MetricCard: FC<MetricCardProps> = ({ label, value, boardroomMode }) => {
  return (
    <div
      className={`${
        boardroomMode
          ? 'bg-gray-900 border-2 border-gray-700 p-8'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6'
      } rounded-lg`}
    >
      <div
        className={`${
          boardroomMode
            ? 'text-2xl text-gray-400'
            : 'text-sm text-gray-600 dark:text-gray-400'
        } mb-${boardroomMode ? '4' : '2'}`}
      >
        {label}
      </div>
      <div
        className={`metric-value font-bold ${
          boardroomMode
            ? 'text-7xl lg:text-9xl text-white'
            : 'text-3xl text-gray-900 dark:text-gray-100'
        }`}
      >
        {value}
      </div>
    </div>
  );
};

export default SharedDashboard;
