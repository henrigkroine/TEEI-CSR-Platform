import { useState } from 'react';
import type { ReactNode } from 'react';
import ConfidenceBands from './ConfidenceBands';
import ScenarioComparison from './ScenarioComparison';
import BacktestResults from './BacktestResults';
import ForecastSettings from './ForecastSettings';
import LoadingSpinner from '../LoadingSpinner';

export interface ForecastCardProps {
  companyId: string;
  initialMetric?: 'sroi_ratio' | 'vis_score' | 'volunteer_hours';
  locale?: string;
}

export interface ForecastResult {
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
  scenarios: {
    optimistic: { date: string; value: number }[];
    realistic: { date: string; value: number }[];
    pessimistic: { date: string; value: number }[];
  };
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
  metric: {
    name: string;
    unit: string;
  };
}

type MetricType = 'sroi_ratio' | 'vis_score' | 'volunteer_hours';
type ModelType = 'ets' | 'prophet' | 'ensemble';
type TabType = 'forecast' | 'scenarios' | 'accuracy';

const METRIC_OPTIONS: { value: MetricType; label: string }[] = [
  { value: 'sroi_ratio', label: 'SROI Ratio' },
  { value: 'vis_score', label: 'VIS Score' },
  { value: 'volunteer_hours', label: 'Volunteer Hours' },
];

const MODEL_OPTIONS: { value: ModelType; label: string }[] = [
  { value: 'ets', label: 'ETS' },
  { value: 'prophet', label: 'Prophet' },
  { value: 'ensemble', label: 'Ensemble' },
];

export default function ForecastCard({
  companyId,
  initialMetric = 'sroi_ratio',
  locale = 'en',
}: ForecastCardProps) {
  const [selectedMetric, setSelectedMetric] = useState<MetricType>(initialMetric);
  const [selectedModel, setSelectedModel] = useState<ModelType>('ensemble');
  const [horizon, setHorizon] = useState<number>(6);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [forecastResult, setForecastResult] = useState<ForecastResult | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('forecast');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateForecast = async () => {
    setLoading(true);
    setProgress(0);
    setError(null);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 300);

      const response = await fetch(
        `/api/forecasts/generate?companyId=${companyId}&metric=${selectedMetric}&model=${selectedModel}&horizon=${horizon}`
      );

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error('Failed to generate forecast');
      }

      const data = await response.json();
      setForecastResult(data);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate forecast');
      console.error('Forecast generation error:', err);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProgress(0);
      }, 500);
    }
  };

  const getSummaryStats = () => {
    if (!forecastResult) return null;

    const lastHistorical =
      forecastResult.historical[forecastResult.historical.length - 1]?.value || 0;
    const lastForecast =
      forecastResult.forecast.predictions[forecastResult.forecast.predictions.length - 1]?.value ||
      0;
    const growthRate = ((lastForecast - lastHistorical) / lastHistorical) * 100;

    return {
      estimate: lastForecast.toFixed(2),
      growth: growthRate.toFixed(1),
      mae: forecastResult.backtest.avgMetrics.mae.toFixed(2),
    };
  };

  const stats = getSummaryStats();
  const metricLabel = METRIC_OPTIONS.find((m) => m.value === selectedMetric)?.label || '';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Forecast Builder</h2>
        <button
          onClick={() => setSettingsOpen(true)}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
          aria-label="Open advanced settings"
        >
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          Advanced Settings
        </button>
      </div>

      {/* Controls */}
      <div className="space-y-4 mb-6">
        {/* Metric Selector */}
        <div>
          <label
            htmlFor="metric-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Metric
          </label>
          <select
            id="metric-select"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricType)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {METRIC_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Horizon Slider */}
        <div>
          <label
            htmlFor="horizon-slider"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
          >
            Forecast Horizon: <span className="font-bold">{horizon} months</span>
          </label>
          <input
            id="horizon-slider"
            type="range"
            min="1"
            max="12"
            value={horizon}
            onChange={(e) => setHorizon(parseInt(e.target.value, 10))}
            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
            aria-label={`Forecast horizon: ${horizon} months`}
          />
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
            <span>1 month</span>
            <span>12 months</span>
          </div>
        </div>

        {/* Model Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Model
          </label>
          <div className="flex space-x-2" role="radiogroup" aria-label="Select forecasting model">
            {MODEL_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedModel(option.value)}
                className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  selectedModel === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                role="radio"
                aria-checked={selectedModel === option.value}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerateForecast}
          disabled={loading}
          className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors flex items-center justify-center"
        >
          {loading ? (
            <>
              <LoadingSpinner />
              <span className="ml-2">Generating Forecast... {progress}%</span>
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
              Generate Forecast
            </>
          )}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div
          className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
          role="alert"
        >
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Results */}
      {forecastResult && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4">
              <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-1">
                {horizon}-Month Estimate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.estimate}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{metricLabel}</p>
            </div>

            <div
              className={`rounded-lg p-4 ${
                parseFloat(stats?.growth || '0') >= 0
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}
            >
              <p
                className={`text-sm font-medium mb-1 ${
                  parseFloat(stats?.growth || '0') >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                Expected Growth
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats?.growth}%
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">vs current</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                Mean Absolute Error
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.mae}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Model accuracy</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
            <nav className="flex -mb-px space-x-8" aria-label="Forecast views">
              {[
                { id: 'forecast' as TabType, label: 'Forecast' },
                { id: 'scenarios' as TabType, label: 'Scenarios' },
                { id: 'accuracy' as TabType, label: 'Accuracy' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div role="tabpanel">
            {activeTab === 'forecast' && (
              <ConfidenceBands
                historical={forecastResult.historical}
                forecast={forecastResult.forecast}
                metric={forecastResult.metric}
              />
            )}
            {activeTab === 'scenarios' && (
              <ScenarioComparison
                scenarios={forecastResult.scenarios}
                assumptions={{
                  optimistic: 'Upper 80% confidence bound (favorable conditions)',
                  realistic: 'Median forecast (expected conditions)',
                  pessimistic: 'Lower 80% confidence bound (challenging conditions)',
                }}
                metric={forecastResult.metric}
              />
            )}
            {activeTab === 'accuracy' && <BacktestResults backtest={forecastResult.backtest} />}
          </div>
        </>
      )}

      {/* Settings Modal */}
      <ForecastSettings
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        companyId={companyId}
        metric={selectedMetric}
      />
    </div>
  );
}
