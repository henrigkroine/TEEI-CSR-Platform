import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Title, Tooltip, Legend);

export interface ConfidenceBandsProps {
  historical: { date: string; value: number }[];
  forecast: {
    predictions: { date: string; value: number }[];
    confidenceBands: {
      lower80: number[];
      upper80: number[];
      lower95: number[];
      upper95: number[];
    };
  };
  metric: {
    name: string;
    unit: string;
  };
}

export default function ConfidenceBands({ historical, forecast, metric }: ConfidenceBandsProps) {
  const chartData = useMemo(() => {
    const allDates = [
      ...historical.map((d) => d.date),
      ...forecast.predictions.map((d) => d.date),
    ];

    const historicalValues = historical.map((d) => d.value);
    const forecastValues = forecast.predictions.map((d) => d.value);

    // Pad historical values with nulls for forecast period
    const historicalPadded = [
      ...historicalValues,
      ...new Array(forecast.predictions.length).fill(null),
    ];

    // Pad forecast values with nulls for historical period
    const forecastPadded = [
      ...new Array(historical.length).fill(null),
      ...forecastValues,
    ];

    // 95% confidence band
    const upper95Padded = [
      ...new Array(historical.length).fill(null),
      ...forecast.confidenceBands.upper95,
    ];
    const lower95Padded = [
      ...new Array(historical.length).fill(null),
      ...forecast.confidenceBands.lower95,
    ];

    // 80% confidence band
    const upper80Padded = [
      ...new Array(historical.length).fill(null),
      ...forecast.confidenceBands.upper80,
    ];
    const lower80Padded = [
      ...new Array(historical.length).fill(null),
      ...forecast.confidenceBands.lower80,
    ];

    return {
      labels: allDates,
      datasets: [
        // 95% Confidence Band (lightest)
        {
          label: '95% Confidence',
          data: upper95Padded,
          borderColor: 'transparent',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          fill: '+1',
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 0,
        },
        {
          label: '95% Lower',
          data: lower95Padded,
          borderColor: 'transparent',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 0,
        },
        // 80% Confidence Band (medium)
        {
          label: '80% Confidence',
          data: upper80Padded,
          borderColor: 'transparent',
          backgroundColor: 'rgba(59, 130, 246, 0.3)',
          fill: '+1',
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 0,
        },
        {
          label: '80% Lower',
          data: lower80Padded,
          borderColor: 'transparent',
          backgroundColor: 'rgba(59, 130, 246, 0.3)',
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 0,
          borderWidth: 0,
        },
        // Historical Data (solid line)
        {
          label: 'Historical Data',
          data: historicalPadded,
          borderColor: 'rgb(75, 85, 99)',
          backgroundColor: 'rgb(75, 85, 99)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.1,
        },
        // Forecast (dashed line)
        {
          label: 'Point Forecast',
          data: forecastPadded,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.1,
        },
      ],
    };
  }, [historical, forecast]);

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          filter: (item) => {
            // Hide the "95% Lower" and "80% Lower" from legend (they're just for fill)
            return !item.text.includes('Lower');
          },
          generateLabels: (chart) => {
            const datasets = chart.data.datasets;
            return [
              {
                text: 'Historical Data',
                fillStyle: 'rgb(75, 85, 99)',
                strokeStyle: 'rgb(75, 85, 99)',
                lineWidth: 2,
                hidden: false,
                index: 4,
              },
              {
                text: 'Point Forecast',
                fillStyle: 'rgb(59, 130, 246)',
                strokeStyle: 'rgb(59, 130, 246)',
                lineWidth: 2,
                lineDash: [5, 5],
                hidden: false,
                index: 5,
              },
              {
                text: '80% Confidence',
                fillStyle: 'rgba(59, 130, 246, 0.3)',
                strokeStyle: 'transparent',
                lineWidth: 0,
                hidden: false,
                index: 2,
              },
              {
                text: '95% Confidence',
                fillStyle: 'rgba(59, 130, 246, 0.15)',
                strokeStyle: 'transparent',
                lineWidth: 0,
                hidden: false,
                index: 0,
              },
            ];
          },
        },
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            return context[0].label;
          },
          label: (context) => {
            const datasetLabel = context.dataset.label || '';
            const value = context.parsed.y;

            if (datasetLabel.includes('Lower')) return '';

            if (value === null) return '';

            return `${datasetLabel}: ${value.toFixed(2)} ${metric.unit}`;
          },
          afterBody: (context) => {
            const index = context[0].dataIndex;
            const datasets = context[0].chart.data.datasets;

            // If we're in the forecast period, show confidence ranges
            if (index >= historical.length) {
              const upper95 = datasets[0].data[index] as number | null;
              const lower95 = datasets[1].data[index] as number | null;
              const upper80 = datasets[2].data[index] as number | null;
              const lower80 = datasets[3].data[index] as number | null;

              const lines: string[] = [];
              if (upper80 !== null && lower80 !== null) {
                lines.push(
                  `80% Range: ${lower80.toFixed(2)} - ${upper80.toFixed(2)} ${metric.unit}`
                );
              }
              if (upper95 !== null && lower95 !== null) {
                lines.push(
                  `95% Range: ${lower95.toFixed(2)} - ${upper95.toFixed(2)} ${metric.unit}`
                );
              }
              return lines;
            }
            return [];
          },
        },
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Time Period',
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        grid: {
          display: true,
          drawOnChartArea: true,
        },
      },
      y: {
        title: {
          display: true,
          text: `${metric.name} (${metric.unit})`,
          font: {
            size: 14,
            weight: 'bold',
          },
        },
        beginAtZero: false,
        grid: {
          display: true,
        },
      },
    },
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Forecast with Confidence Bands
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          The chart shows historical data (solid line), point forecast (dashed line), and
          confidence intervals. Shaded areas represent the probability ranges for future values.
        </p>
      </div>

      <div style={{ height: '400px' }} role="img" aria-label="Forecast chart with confidence bands">
        <Line data={chartData} options={options} />
      </div>

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
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
            <p className="font-medium mb-1">Understanding Confidence Bands:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>80% Confidence:</strong> There's an 80% probability the actual value will
                fall within this range
              </li>
              <li>
                <strong>95% Confidence:</strong> There's a 95% probability the actual value will
                fall within this wider range
              </li>
              <li>
                <strong>Point Forecast:</strong> The most likely expected value (median of the
                distribution)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
