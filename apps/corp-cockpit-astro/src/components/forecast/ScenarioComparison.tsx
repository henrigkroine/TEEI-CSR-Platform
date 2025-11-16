import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export interface ScenarioComparisonProps {
  scenarios: {
    optimistic: { date: string; value: number }[];
    realistic: { date: string; value: number }[];
    pessimistic: { date: string; value: number }[];
  };
  assumptions: {
    optimistic: string;
    realistic: string;
    pessimistic: string;
  };
  metric: {
    name: string;
    unit: string;
  };
}

export default function ScenarioComparison({
  scenarios,
  assumptions,
  metric,
}: ScenarioComparisonProps) {
  const [showAssumptions, setShowAssumptions] = useState<
    'optimistic' | 'realistic' | 'pessimistic' | null
  >(null);

  const scenarioStats = useMemo(() => {
    const getGrowth = (data: { date: string; value: number }[]) => {
      if (data.length < 2) return 0;
      const first = data[0].value;
      const last = data[data.length - 1].value;
      return ((last - first) / first) * 100;
    };

    const getFinalValue = (data: { date: string; value: number }[]) => {
      return data[data.length - 1]?.value || 0;
    };

    return {
      optimistic: {
        finalValue: getFinalValue(scenarios.optimistic),
        growth: getGrowth(scenarios.optimistic),
      },
      realistic: {
        finalValue: getFinalValue(scenarios.realistic),
        growth: getGrowth(scenarios.realistic),
      },
      pessimistic: {
        finalValue: getFinalValue(scenarios.pessimistic),
        growth: getGrowth(scenarios.pessimistic),
      },
    };
  }, [scenarios]);

  const miniChartData = (data: { date: string; value: number }[], color: string) => ({
    labels: data.map((d) => d.date),
    datasets: [
      {
        data: data.map((d) => d.value),
        borderColor: color,
        backgroundColor: color,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
      },
    ],
  });

  const miniChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Scenario Comparison
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Compare three forecast scenarios based on different assumptions about future conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Optimistic Scenario */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg p-6 border-2 border-green-200 dark:border-green-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-green-800 dark:text-green-300">Optimistic</h4>
            <button
              onClick={() =>
                setShowAssumptions(showAssumptions === 'optimistic' ? null : 'optimistic')
              }
              className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
              aria-label="Show optimistic scenario assumptions"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-4xl font-bold text-green-900 dark:text-green-100">
              {scenarioStats.optimistic.finalValue.toFixed(2)}
            </p>
            <p className="text-sm text-green-700 dark:text-green-400 mt-1">{metric.unit}</p>
          </div>

          <div style={{ height: '80px' }} className="mb-4">
            <Line
              data={miniChartData(scenarios.optimistic, 'rgb(34, 197, 94)')}
              options={miniChartOptions}
            />
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-lg font-semibold text-green-800 dark:text-green-300">
              +{scenarioStats.optimistic.growth.toFixed(1)}% growth
            </span>
          </div>

          {showAssumptions === 'optimistic' && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-600">
              <p className="text-xs text-gray-700 dark:text-gray-300">{assumptions.optimistic}</p>
            </div>
          )}

          <p className="text-xs text-green-700 dark:text-green-400 mt-2">
            Upper 80% confidence bound
          </p>
        </div>

        {/* Realistic Scenario */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 border-2 border-blue-300 dark:border-blue-600 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-blue-800 dark:text-blue-300">Realistic</h4>
            <button
              onClick={() =>
                setShowAssumptions(showAssumptions === 'realistic' ? null : 'realistic')
              }
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              aria-label="Show realistic scenario assumptions"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-4xl font-bold text-blue-900 dark:text-blue-100">
              {scenarioStats.realistic.finalValue.toFixed(2)}
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">{metric.unit}</p>
          </div>

          <div style={{ height: '80px' }} className="mb-4">
            <Line
              data={miniChartData(scenarios.realistic, 'rgb(59, 130, 246)')}
              options={miniChartOptions}
            />
          </div>

          <div className="flex items-center space-x-2 mb-2">
            {scenarioStats.realistic.growth >= 0 ? (
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            <span className="text-lg font-semibold text-blue-800 dark:text-blue-300">
              {scenarioStats.realistic.growth >= 0 ? '+' : ''}
              {scenarioStats.realistic.growth.toFixed(1)}% growth
            </span>
          </div>

          {showAssumptions === 'realistic' && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-blue-300 dark:border-blue-600">
              <p className="text-xs text-gray-700 dark:text-gray-300">{assumptions.realistic}</p>
            </div>
          )}

          <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">Median forecast</p>
        </div>

        {/* Pessimistic Scenario */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-6 border-2 border-orange-200 dark:border-orange-700">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-bold text-orange-800 dark:text-orange-300">Pessimistic</h4>
            <button
              onClick={() =>
                setShowAssumptions(showAssumptions === 'pessimistic' ? null : 'pessimistic')
              }
              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
              aria-label="Show pessimistic scenario assumptions"
            >
              <svg
                className="w-5 h-5"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <p className="text-4xl font-bold text-orange-900 dark:text-orange-100">
              {scenarioStats.pessimistic.finalValue.toFixed(2)}
            </p>
            <p className="text-sm text-orange-700 dark:text-orange-400 mt-1">{metric.unit}</p>
          </div>

          <div style={{ height: '80px' }} className="mb-4">
            <Line
              data={miniChartData(scenarios.pessimistic, 'rgb(249, 115, 22)')}
              options={miniChartOptions}
            />
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <svg
              className="w-5 h-5 text-orange-600 dark:text-orange-400"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-lg font-semibold text-orange-800 dark:text-orange-300">
              {scenarioStats.pessimistic.growth.toFixed(1)}% decline
            </span>
          </div>

          {showAssumptions === 'pessimistic' && (
            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border border-orange-300 dark:border-orange-600">
              <p className="text-xs text-gray-700 dark:text-gray-300">{assumptions.pessimistic}</p>
            </div>
          )}

          <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
            Lower 80% confidence bound
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-2 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium mb-1">Scenario Planning Guidance:</p>
            <p>
              These scenarios represent different possible futures based on statistical confidence
              intervals. Use them for risk assessment and strategic planning, but remember that
              actual outcomes may fall outside these ranges.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
