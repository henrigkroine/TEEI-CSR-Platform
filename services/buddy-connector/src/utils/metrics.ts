import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('buddy-connector:metrics');

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary',
}

/**
 * Metric interface
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: Date;
}

/**
 * Metrics collector
 */
class MetricsCollector {
  private metrics: Map<string, Metric> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();

  /**
   * Increment a counter metric
   */
  incrementCounter(
    name: string,
    value: number = 1,
    labels?: Record<string, string>
  ): void {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    const newValue = current + value;

    this.counters.set(key, newValue);

    this.recordMetric({
      name,
      type: MetricType.COUNTER,
      value: newValue,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * Set a gauge metric
   */
  setGauge(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const key = this.getMetricKey(name, labels);

    this.gauges.set(key, value);

    this.recordMetric({
      name,
      type: MetricType.GAUGE,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * Record a histogram observation
   */
  recordHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>
  ): void {
    const key = this.getMetricKey(name, labels);
    const values = this.histograms.get(key) || [];

    values.push(value);
    this.histograms.set(key, values);

    this.recordMetric({
      name,
      type: MetricType.HISTOGRAM,
      value,
      labels,
      timestamp: new Date(),
    });
  }

  /**
   * Get current value of a counter
   */
  getCounter(name: string, labels?: Record<string, string>): number {
    const key = this.getMetricKey(name, labels);
    return this.counters.get(key) || 0;
  }

  /**
   * Get current value of a gauge
   */
  getGauge(name: string, labels?: Record<string, string>): number | undefined {
    const key = this.getMetricKey(name, labels);
    return this.gauges.get(key);
  }

  /**
   * Get histogram statistics
   */
  getHistogramStats(
    name: string,
    labels?: Record<string, string>
  ): {
    count: number;
    sum: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const key = this.getMetricKey(name, labels);
    const values = this.histograms.get(key);

    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      sum: values.reduce((a, b) => a + b, 0),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: this.percentile(sorted, 0.5),
      p95: this.percentile(sorted, 0.95),
      p99: this.percentile(sorted, 0.99),
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    logger.info('Metrics reset');
  }

  /**
   * Record a metric
   */
  private recordMetric(metric: Metric): void {
    const key = this.getMetricKey(metric.name, metric.labels);
    this.metrics.set(key, metric);
  }

  /**
   * Get metric key with labels
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) {
      return name;
    }

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');

    return `${name}{${labelStr}}`;
  }

  /**
   * Calculate percentile
   */
  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[Math.max(0, index)];
  }
}

/**
 * Global metrics collector instance
 */
export const metrics = new MetricsCollector();

/**
 * Webhook-specific metrics
 */
export const webhookMetrics = {
  /**
   * Record webhook received
   */
  received(eventType: string): void {
    metrics.incrementCounter('webhook_received_total', 1, { event_type: eventType });
  },

  /**
   * Record webhook processed successfully
   */
  processed(eventType: string, durationMs: number): void {
    metrics.incrementCounter('webhook_processed_total', 1, { event_type: eventType });
    metrics.recordHistogram('webhook_processing_duration_ms', durationMs, { event_type: eventType });
  },

  /**
   * Record webhook failed
   */
  failed(eventType: string, errorCategory: string): void {
    metrics.incrementCounter('webhook_failed_total', 1, {
      event_type: eventType,
      error_category: errorCategory,
    });
  },

  /**
   * Record webhook retried
   */
  retried(eventType: string, attemptNumber: number): void {
    metrics.incrementCounter('webhook_retried_total', 1, { event_type: eventType });
    metrics.setGauge('webhook_retry_attempt', attemptNumber, { event_type: eventType });
  },

  /**
   * Record webhook sent to DLQ
   */
  deadLettered(eventType: string): void {
    metrics.incrementCounter('webhook_dead_lettered_total', 1, { event_type: eventType });
  },

  /**
   * Record circuit breaker state change
   */
  circuitBreakerStateChange(circuitName: string, state: string): void {
    metrics.setGauge('circuit_breaker_state', state === 'open' ? 1 : 0, {
      circuit: circuitName,
    });
    metrics.incrementCounter('circuit_breaker_state_changes_total', 1, {
      circuit: circuitName,
      state,
    });
  },

  /**
   * Record rate limit hit
   */
  rateLimitHit(limiterName: string): void {
    metrics.incrementCounter('rate_limit_hits_total', 1, { limiter: limiterName });
  },

  /**
   * Record bulkhead queue size
   */
  bulkheadQueueSize(bulkheadName: string, queueSize: number): void {
    metrics.setGauge('bulkhead_queue_size', queueSize, { bulkhead: bulkheadName });
  },

  /**
   * Record bulkhead active count
   */
  bulkheadActiveCount(bulkheadName: string, activeCount: number): void {
    metrics.setGauge('bulkhead_active_count', activeCount, { bulkhead: bulkheadName });
  },

  /**
   * Record bulkhead rejected
   */
  bulkheadRejected(bulkheadName: string): void {
    metrics.incrementCounter('bulkhead_rejected_total', 1, { bulkhead: bulkheadName });
  },
};

/**
 * Get webhook metrics summary
 */
export function getWebhookMetricsSummary(): {
  received: number;
  processed: number;
  failed: number;
  retried: number;
  deadLettered: number;
  processingDuration: ReturnType<typeof metrics.getHistogramStats>;
  successRate: number;
} {
  const received = metrics.getCounter('webhook_received_total') || 0;
  const processed = metrics.getCounter('webhook_processed_total') || 0;
  const failed = metrics.getCounter('webhook_failed_total') || 0;
  const retried = metrics.getCounter('webhook_retried_total') || 0;
  const deadLettered = metrics.getCounter('webhook_dead_lettered_total') || 0;
  const processingDuration = metrics.getHistogramStats('webhook_processing_duration_ms');

  const successRate = received > 0 ? processed / received : 0;

  return {
    received,
    processed,
    failed,
    retried,
    deadLettered,
    processingDuration,
    successRate,
  };
}

/**
 * Performance tracking decorator
 */
export function trackPerformance(metricName: string, labels?: Record<string, string>) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const start = Date.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = Date.now() - start;

        metrics.recordHistogram(metricName, duration, labels);

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        metrics.recordHistogram(metricName, duration, {
          ...labels,
          error: 'true',
        });

        throw error;
      }
    };

    return descriptor;
  };
}
