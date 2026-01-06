import React, { useState, useEffect } from 'react';

/**
 * Funnel Stage
 */
interface FunnelStage {
  name: string;
  count: number;
  percentage: number;
  dropoff: number;
  avgTime: number; // seconds to next stage
}

/**
 * Cohort Retention Data
 */
interface CohortData {
  cohortDate: string;
  cohortSize: number;
  day1: number;
  day7: number;
  day30: number;
  day90: number;
}

/**
 * Funnel & Retention Dashboard Component
 */
export default function FunnelDashboard({ companyId }: { companyId: string }) {
  const [funnelStages, setFunnelStages] = useState<FunnelStage[]>([]);
  const [cohorts, setCohorts] = useState<CohortData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFunnelData();
    loadCohortData();
  }, [companyId, selectedPeriod]);

  async function loadFunnelData() {
    setLoading(true);
    try {
      // Mock data - would call API in production
      const mockStages: FunnelStage[] = [
        {
          name: 'Sign Up',
          count: 1000,
          percentage: 100,
          dropoff: 0,
          avgTime: 0,
        },
        {
          name: 'First Login',
          count: 850,
          percentage: 85,
          dropoff: 15,
          avgTime: 3600, // 1 hour
        },
        {
          name: 'Dashboard Visit',
          count: 720,
          percentage: 72,
          dropoff: 15.3,
          avgTime: 7200, // 2 hours
        },
        {
          name: 'First Filter',
          count: 580,
          percentage: 58,
          dropoff: 19.4,
          avgTime: 10800, // 3 hours
        },
        {
          name: 'First Export',
          count: 420,
          percentage: 42,
          dropoff: 27.6,
          avgTime: 86400, // 1 day
        },
        {
          name: 'Weekly Active',
          count: 320,
          percentage: 32,
          dropoff: 23.8,
          avgTime: 604800, // 7 days
        },
      ];

      setFunnelStages(mockStages);
    } catch (error) {
      console.error('Failed to load funnel data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadCohortData() {
    try {
      // Mock cohort data
      const mockCohorts: CohortData[] = [
        {
          cohortDate: '2024-11-01',
          cohortSize: 100,
          day1: 85,
          day7: 72,
          day30: 58,
          day90: 45,
        },
        {
          cohortDate: '2024-10-01',
          cohortSize: 95,
          day1: 82,
          day7: 69,
          day30: 54,
          day90: 42,
        },
        {
          cohortDate: '2024-09-01',
          cohortSize: 110,
          day1: 88,
          day7: 75,
          day30: 61,
          day90: 48,
        },
        {
          cohortDate: '2024-08-01',
          cohortSize: 105,
          day1: 86,
          day7: 71,
          day30: 56,
          day90: 43,
        },
      ];

      setCohorts(mockCohorts);
    } catch (error) {
      console.error('Failed to load cohort data:', error);
    }
  }

  function formatTime(seconds: number): string {
    if (seconds < 3600) {
      return `${Math.round(seconds / 60)} min`;
    }
    if (seconds < 86400) {
      return `${Math.round(seconds / 3600)} hr`;
    }
    return `${Math.round(seconds / 86400)} days`;
  }

  function getRetentionColor(percentage: number): string {
    if (percentage >= 70) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  }

  if (loading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Funnel & Retention Analytics</h2>
          <p className="mt-1 text-sm text-gray-600">
            Track user journey and engagement metrics
          </p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(period => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 text-sm font-medium rounded-lg transition ${
                selectedPeriod === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Conversion Funnel */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Conversion Funnel</h3>

        <div className="space-y-4">
          {funnelStages.map((stage, index) => (
            <div key={stage.name} className="relative">
              {/* Stage Bar */}
              <div className="flex items-center gap-4">
                <div className="w-32 text-sm font-medium text-gray-900">
                  {stage.name}
                </div>

                <div className="flex-1 relative">
                  {/* Background */}
                  <div className="h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {/* Progress */}
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-between px-4 transition-all"
                      style={{ width: `${stage.percentage}%` }}
                    >
                      <span className="text-white font-semibold">
                        {stage.count.toLocaleString()}
                      </span>
                      <span className="text-white text-sm">
                        {stage.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Dropoff indicator */}
                  {index > 0 && (
                    <div className="absolute -top-6 left-0 text-xs text-red-600">
                      ↓ {stage.dropoff.toFixed(1)}% dropoff
                    </div>
                  )}
                </div>

                {/* Avg Time */}
                {index > 0 && (
                  <div className="w-24 text-sm text-gray-600 text-right">
                    {formatTime(stage.avgTime)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {((funnelStages[funnelStages.length - 1]?.count / funnelStages[0]?.count) * 100).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Overall Conversion</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {funnelStages[0]?.count.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {funnelStages[funnelStages.length - 1]?.count.toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Converted Users</div>
          </div>
        </div>
      </div>

      {/* Cohort Retention Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Cohort Retention Analysis</h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Cohort
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Size
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Day 1
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Day 7
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Day 30
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Day 90
                </th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map(cohort => (
                <tr key={cohort.cohortDate} className="border-b border-gray-100">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {new Date(cohort.cohortDate).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-900">
                    {cohort.cohortSize}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className={`h-8 rounded ${getRetentionColor((cohort.day1 / cohort.cohortSize) * 100)}`}
                        style={{ width: `${(cohort.day1 / cohort.cohortSize) * 100}%` }}
                      />
                      <span className="text-sm font-semibold text-gray-900 w-12">
                        {((cohort.day1 / cohort.cohortSize) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className={`h-8 rounded ${getRetentionColor((cohort.day7 / cohort.cohortSize) * 100)}`}
                        style={{ width: `${(cohort.day7 / cohort.cohortSize) * 100}%` }}
                      />
                      <span className="text-sm font-semibold text-gray-900 w-12">
                        {((cohort.day7 / cohort.cohortSize) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className={`h-8 rounded ${getRetentionColor((cohort.day30 / cohort.cohortSize) * 100)}`}
                        style={{ width: `${(cohort.day30 / cohort.cohortSize) * 100}%` }}
                      />
                      <span className="text-sm font-semibold text-gray-900 w-12">
                        {((cohort.day30 / cohort.cohortSize) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className={`h-8 rounded ${getRetentionColor((cohort.day90 / cohort.cohortSize) * 100)}`}
                        style={{ width: `${(cohort.day90 / cohort.cohortSize) * 100}%` }}
                      />
                      <span className="text-sm font-semibold text-gray-900 w-12">
                        {((cohort.day90 / cohort.cohortSize) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Retention Insights */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">📈 Retention Insights</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 30-day retention has improved by 8% over the last quarter</li>
            <li>• Users who complete onboarding have 2.5x better retention</li>
            <li>• Peak dropoff occurs between Day 1 and Day 7</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
