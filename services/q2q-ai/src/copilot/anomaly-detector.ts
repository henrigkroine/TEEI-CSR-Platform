/**
 * Insights Copilot - Anomaly Detection
 *
 * Detects anomalies in benchmarks and forecasts
 */

export interface AnomalyDetectionInput {
  metric: string;
  timeseries: Array<{ timestamp: string; value: number }>;
  benchmarks?: Array<{ cohort: string; value: number }>;
  forecasts?: Array<{ timestamp: string; predicted: number; confidence: number }>;
}

export interface Anomaly {
  type: 'spike' | 'drop' | 'trend_change' | 'benchmark_deviation' | 'forecast_miss';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  metric: string;
  actualValue: number;
  expectedValue: number;
  deviation: number;
  deviationPercent: number;
  description: string;
  confidence: number;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  summary: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  insights: string[];
}

/**
 * Anomaly Detector
 */
export class AnomalyDetector {
  /**
   * Detect anomalies in time series data
   */
  detect(input: AnomalyDetectionInput): AnomalyDetectionResult {
    const anomalies: Anomaly[] = [];

    // Detect spikes and drops
    anomalies.push(...this.detectSpikesDrops(input.timeseries, input.metric));

    // Detect trend changes
    anomalies.push(...this.detectTrendChanges(input.timeseries, input.metric));

    // Detect benchmark deviations
    if (input.benchmarks) {
      anomalies.push(...this.detectBenchmarkDeviations(input.timeseries, input.benchmarks, input.metric));
    }

    // Detect forecast misses
    if (input.forecasts) {
      anomalies.push(...this.detectForecastMisses(input.timeseries, input.forecasts, input.metric));
    }

    // Sort by severity and confidence
    anomalies.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity] || b.confidence - a.confidence;
    });

    // Generate insights
    const insights = this.generateInsights(anomalies);

    return {
      anomalies,
      summary: {
        total: anomalies.length,
        bySeverity: this.groupBySeverity(anomalies),
        byType: this.groupByType(anomalies)
      },
      insights
    };
  }

  /**
   * Detect spikes and drops using Z-score
   */
  private detectSpikesDrops(
    data: Array<{ timestamp: string; value: number }>,
    metric: string
  ): Anomaly[] {
    if (data.length < 3) return [];

    const anomalies: Anomaly[] = [];
    const values = data.map(d => d.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
    );

    for (let i = 0; i < data.length; i++) {
      const zScore = Math.abs((data[i].value - mean) / stdDev);

      if (zScore > 3) {
        const type = data[i].value > mean ? 'spike' : 'drop';
        const severity = zScore > 5 ? 'critical' : zScore > 4 ? 'high' : 'medium';

        anomalies.push({
          type,
          severity,
          timestamp: data[i].timestamp,
          metric,
          actualValue: data[i].value,
          expectedValue: mean,
          deviation: data[i].value - mean,
          deviationPercent: ((data[i].value - mean) / mean) * 100,
          description: `${type === 'spike' ? 'Significant spike' : 'Significant drop'} detected in ${metric}`,
          confidence: Math.min(zScore / 5, 1.0)
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect trend changes
   */
  private detectTrendChanges(
    data: Array<{ timestamp: string; value: number }>,
    metric: string
  ): Anomaly[] {
    if (data.length < 10) return [];

    const anomalies: Anomaly[] = [];
    const windowSize = Math.floor(data.length / 2);

    // Split into two windows
    const firstHalf = data.slice(0, windowSize);
    const secondHalf = data.slice(windowSize);

    const trend1 = this.calculateTrend(firstHalf.map(d => d.value));
    const trend2 = this.calculateTrend(secondHalf.map(d => d.value));

    // Check if trend reversed
    if ((trend1 > 0 && trend2 < 0) || (trend1 < 0 && trend2 > 0)) {
      const severity = Math.abs(trend2 - trend1) > 0.5 ? 'high' : 'medium';

      anomalies.push({
        type: 'trend_change',
        severity,
        timestamp: secondHalf[0].timestamp,
        metric,
        actualValue: trend2,
        expectedValue: trend1,
        deviation: trend2 - trend1,
        deviationPercent: ((trend2 - trend1) / Math.abs(trend1)) * 100,
        description: `Trend reversal detected in ${metric}`,
        confidence: 0.8
      });
    }

    return anomalies;
  }

  /**
   * Detect benchmark deviations
   */
  private detectBenchmarkDeviations(
    data: Array<{ timestamp: string; value: number }>,
    benchmarks: Array<{ cohort: string; value: number }>,
    metric: string
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const latestValue = data[data.length - 1].value;
    const avgBenchmark = benchmarks.reduce((sum, b) => sum + b.value, 0) / benchmarks.length;

    const deviation = Math.abs(latestValue - avgBenchmark);
    const deviationPercent = (deviation / avgBenchmark) * 100;

    if (deviationPercent > 50) {
      const severity = deviationPercent > 100 ? 'critical' : deviationPercent > 75 ? 'high' : 'medium';

      anomalies.push({
        type: 'benchmark_deviation',
        severity,
        timestamp: data[data.length - 1].timestamp,
        metric,
        actualValue: latestValue,
        expectedValue: avgBenchmark,
        deviation: latestValue - avgBenchmark,
        deviationPercent,
        description: `${metric} significantly deviates from industry benchmark`,
        confidence: 0.9
      });
    }

    return anomalies;
  }

  /**
   * Detect forecast misses
   */
  private detectForecastMisses(
    data: Array<{ timestamp: string; value: number }>,
    forecasts: Array<{ timestamp: string; predicted: number; confidence: number }>,
    metric: string
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const forecast of forecasts) {
      const actual = data.find(d => d.timestamp === forecast.timestamp);
      if (actual) {
        const deviation = Math.abs(actual.value - forecast.predicted);
        const deviationPercent = (deviation / forecast.predicted) * 100;

        if (deviationPercent > 30) {
          const severity = deviationPercent > 50 ? 'high' : 'medium';

          anomalies.push({
            type: 'forecast_miss',
            severity,
            timestamp: actual.timestamp,
            metric,
            actualValue: actual.value,
            expectedValue: forecast.predicted,
            deviation: actual.value - forecast.predicted,
            deviationPercent,
            description: `Actual ${metric} significantly differs from forecast`,
            confidence: forecast.confidence
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Calculate linear trend
   */
  private calculateTrend(values: number[]): number {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  /**
   * Group anomalies by severity
   */
  private groupBySeverity(anomalies: Anomaly[]): Record<string, number> {
    return anomalies.reduce((acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Group anomalies by type
   */
  private groupByType(anomalies: Anomaly[]): Record<string, number> {
    return anomalies.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Generate insights from anomalies
   */
  private generateInsights(anomalies: Anomaly[]): string[] {
    const insights: string[] = [];

    if (anomalies.length === 0) {
      insights.push('No significant anomalies detected. Metrics are within expected ranges.');
      return insights;
    }

    const critical = anomalies.filter(a => a.severity === 'critical').length;
    if (critical > 0) {
      insights.push(`⚠️ ${critical} critical anomal${critical > 1 ? 'ies' : 'y'} detected requiring immediate attention.`);
    }

    const spikes = anomalies.filter(a => a.type === 'spike').length;
    if (spikes > 0) {
      insights.push(`📈 ${spikes} unexpected spike${spikes > 1 ? 's' : ''} detected in metrics.`);
    }

    const drops = anomalies.filter(a => a.type === 'drop').length;
    if (drops > 0) {
      insights.push(`📉 ${drops} unexpected drop${drops > 1 ? 's' : ''} detected in metrics.`);
    }

    const trendChanges = anomalies.filter(a => a.type === 'trend_change').length;
    if (trendChanges > 0) {
      insights.push(`🔄 ${trendChanges} trend reversal${trendChanges > 1 ? 's' : ''} identified.`);
    }

    return insights;
  }
}
