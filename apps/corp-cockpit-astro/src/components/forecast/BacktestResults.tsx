import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Scatter, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export interface BacktestResultsProps {
  backtest: {
    folds: {
      trainPeriod: { start: string; end: string };
      testPeriod: { start: string; end: string };
      predictions: { date: string; actual: number; predicted: number }[];
      mae: number;
      rmse: number;
      mape: number;
    }[];
    avgMetrics: {
      mae: number;
      rmse: number;
      mape: number;
    };
  };
}

export default function BacktestResults({ backtest }: BacktestResultsProps) {
  const actualVsPredictedData = useMemo(() => {
    // Combine all predictions from all folds
    const allPredictions = backtest.folds.flatMap((fold) => fold.predictions);

    return {
      labels: allPredictions.map((p) => p.date),
      datasets: [
        {
          label: 'Actual',
          data: allPredictions.map((p) => p.actual),
          borderColor: 'rgb(75, 85, 99)',
          backgroundColor: 'rgba(75, 85, 99, 0.5)',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
        {
          label: 'Predicted',
          data: allPredictions.map((p) => p.predicted),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          pointRadius: 4,
          pointHoverRadius: 6,
          pointStyle: 'triangle',
        },
      ],
    };
  }, [backtest.folds]);

  const residualData = useMemo(() => {
    const allPredictions = backtest.folds.flatMap((fold) => fold.predictions);
    const residuals = allPredictions.map((p) => p.actual - p.predicted);

    return {
      labels: allPredictions.map((p) => p.date),
      datasets: [
        {
          label: 'Residuals',
          data: residuals,
          backgroundColor: residuals.map((r) =>
            r >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
          ),
          borderColor: residuals.map((r) =>
            r >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [backtest.folds]);

  const lineChartOptions: ChartOptions<'scatter'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time Period',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Value',
        },
      },
    },
  };

  const barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            return `Residual: ${value.toFixed(2)}`;
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time Period',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Error (Actual - Predicted)',
        },
      },
    },
  };

  const getAccuracyRating = (mape: number) => {
    if (mape < 10) return { label: 'Excellent', color: 'green' };
    if (mape < 20) return { label: 'Good', color: 'blue' };
    if (mape < 30) return { label: 'Fair', color: 'yellow' };
    return { label: 'Poor', color: 'red' };
  };

  const rating = getAccuracyRating(backtest.avgMetrics.mape);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Forecast Accuracy (Walk-Forward Validation)
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Model performance evaluated using {backtest.folds.length} time-series cross-validation
          folds. Lower error metrics indicate better accuracy.
        </p>
      </div>

      {/* Average Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
            MAE (Mean Absolute Error)
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {backtest.avgMetrics.mae.toFixed(3)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Average absolute difference
          </p>
        </div>

        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
          <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
            RMSE (Root Mean Squared Error)
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {backtest.avgMetrics.rmse.toFixed(3)}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Penalizes large errors
          </p>
        </div>

        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
          <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">
            MAPE (Mean Absolute % Error)
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {backtest.avgMetrics.mape.toFixed(1)}%
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Percentage accuracy</p>
        </div>

        <div
          className={`bg-${rating.color}-50 dark:bg-${rating.color}-900/20 rounded-lg p-4 border-2 border-${rating.color}-300 dark:border-${rating.color}-700`}
        >
          <p
            className={`text-sm font-medium text-${rating.color}-600 dark:text-${rating.color}-400 mb-1`}
          >
            Overall Rating
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{rating.label}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Based on MAPE {backtest.avgMetrics.mape.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Actual vs Predicted Chart */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
          Actual vs. Predicted Values
        </h4>
        <div
          style={{ height: '300px' }}
          role="img"
          aria-label="Actual versus predicted values scatter plot"
        >
          <Scatter data={actualVsPredictedData} options={lineChartOptions} />
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Points closer together indicate better predictions. Triangles (predicted) should align
          with circles (actual).
        </p>
      </div>

      {/* Residual Plot */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
          Residual Plot (Prediction Errors)
        </h4>
        <div
          style={{ height: '250px' }}
          role="img"
          aria-label="Residual plot showing prediction errors"
        >
          <Bar data={residualData} options={barChartOptions} />
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Green bars show under-predictions, red bars show over-predictions. Smaller bars are
          better.
        </p>
      </div>

      {/* Fold Details Table */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
          Cross-Validation Fold Details
        </h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fold
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Training Period
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Test Period
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  MAE
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  RMSE
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  MAPE
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {backtest.folds.map((fold, index) => (
                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {fold.trainPeriod.start} → {fold.trainPeriod.end}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {fold.testPeriod.start} → {fold.testPeriod.end}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {fold.mae.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {fold.rmse.toFixed(3)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                    {fold.mape.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 dark:bg-gray-900">
              <tr>
                <td
                  colSpan={3}
                  className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white"
                >
                  Average Across All Folds
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                  {backtest.avgMetrics.mae.toFixed(3)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                  {backtest.avgMetrics.rmse.toFixed(3)}
                </td>
                <td className="px-4 py-3 text-sm text-right font-bold text-gray-900 dark:text-white">
                  {backtest.avgMetrics.mape.toFixed(1)}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <div className="flex items-start">
          <svg
            className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-2 flex-shrink-0"
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
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Understanding Accuracy Metrics:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>MAE:</strong> Average size of errors (same units as metric)
              </li>
              <li>
                <strong>RMSE:</strong> Like MAE but penalizes large errors more heavily
              </li>
              <li>
                <strong>MAPE:</strong> Error as percentage of actual value (easier to interpret)
              </li>
              <li>
                <strong>Walk-Forward:</strong> Each fold trains on past data and tests on future
                data (realistic time-series validation)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
