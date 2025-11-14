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
  ArcElement,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export type ChartType = 'line' | 'bar' | 'pie' | 'doughnut';

export interface ChartProps {
  type: ChartType;
  data: any;
  options?: ChartOptions<any>;
  className?: string;
  height?: number;
}

export default function Chart({ type, data, options, className = '', height = 300 }: ChartProps) {
  const defaultOptions: ChartOptions<any> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    ...options,
  };

  const chartComponents = {
    line: Line,
    bar: Bar,
    pie: Pie,
    doughnut: Doughnut,
  };

  const ChartComponent = chartComponents[type];

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}
      style={{ height }}
      role="img"
      aria-label={`${type} chart visualization`}
    >
      <ChartComponent data={data} options={defaultOptions} />
    </div>
  );
}
