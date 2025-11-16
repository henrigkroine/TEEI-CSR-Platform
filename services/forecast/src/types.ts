/**
 * Time series data point
 */
export interface TimeSeriesDataPoint {
  date: string; // ISO date string
  value: number;
}

/**
 * Forecast prediction with confidence bands
 */
export interface ForecastPrediction {
  date: string;
  value: number;
}

/**
 * Confidence bands for predictions
 */
export interface ConfidenceBands {
  lower80: number[];
  upper80: number[];
  lower95: number[];
  upper95: number[];
}

/**
 * Model performance metrics
 */
export interface PerformanceMetrics {
  mae: number;  // Mean Absolute Error
  rmse: number; // Root Mean Squared Error
  mape: number; // Mean Absolute Percentage Error
}

/**
 * Decomposed time series components
 */
export interface TimeSeriesComponents {
  level: number[];
  trend?: number[];
  seasonal?: number[];
}

/**
 * Complete forecast result
 */
export interface ForecastResult {
  predictions: ForecastPrediction[];
  confidenceBands: ConfidenceBands;
  components?: TimeSeriesComponents;
  metrics: PerformanceMetrics;
}

/**
 * ETS model configuration
 */
export interface ETSConfig {
  method: 'simple' | 'holt' | 'holt-winters';
  seasonalPeriod?: number; // e.g., 12 for monthly data
  alpha?: number; // 0-1, level smoothing parameter
  beta?: number;  // 0-1, trend smoothing parameter
  gamma?: number; // 0-1, seasonal smoothing parameter
  seasonal?: 'additive' | 'multiplicative';
}

/**
 * Prophet model configuration
 */
export interface ProphetConfig {
  growth: 'linear' | 'logistic';
  changepoints?: string[]; // Dates where trend changes
  seasonality: {
    yearly?: boolean;
    quarterly?: boolean;
    monthly?: boolean;
  };
  holidays?: { name: string; date: string }[];
}

/**
 * Back-testing configuration
 */
export interface BacktestConfig {
  trainMonths: number; // e.g., 24 months for training
  testMonths: number;  // e.g., 6 months for testing
  stride: number;      // Move forward by N months each fold
}

/**
 * Single back-test fold result
 */
export interface BacktestFold {
  trainPeriod: { start: string; end: string };
  testPeriod: { start: string; end: string };
  predictions: {
    date: string;
    actual: number;
    predicted: number;
  }[];
  mae: number;
  rmse: number;
  mape: number;
}

/**
 * Complete back-test result
 */
export interface BacktestResult {
  folds: BacktestFold[];
  avgMetrics: PerformanceMetrics;
  modelComparison?: {
    modelName: string;
    avgMAE: number;
    avgRMSE: number;
  }[];
}

/**
 * Scenario forecast
 */
export interface ScenarioForecast {
  scenarios: {
    optimistic: ForecastPrediction[];
    realistic: ForecastPrediction[];
    pessimistic: ForecastPrediction[];
  };
  assumptions: {
    optimistic: string;
    realistic: string;
    pessimistic: string;
  };
}

/**
 * Forecast function type
 */
export type ForecastFunction = (
  data: TimeSeriesDataPoint[],
  horizonMonths: number,
  config?: any
) => Promise<ForecastResult>;
