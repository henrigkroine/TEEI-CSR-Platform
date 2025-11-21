/**
 * Service Level Objectives (SLOs) and Error Budget Management
 *
 * Defines SLOs for the TEEI CSR Platform:
 * - API availability SLO (99.9%)
 * - API latency SLO (p95 < 500ms, p99 < 1000ms)
 * - Frontend LCP SLO (p95 < 2.5s)
 * - Error rate SLO (< 0.1%)
 *
 * Implements error budget calculation and burn rate alerting
 *
 * @module observability/slo
 */

export interface SLODefinition {
  name: string;
  description: string;
  target: number; // Target percentage (e.g., 99.9 for 99.9%)
  window: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'rolling_30d';
  metric: 'availability' | 'latency' | 'error_rate' | 'saturation';
  threshold?: number; // For latency/saturation metrics
  unit?: string; // For latency metrics (ms, s)
}

export interface SLOStatus {
  slo: SLODefinition;
  timestamp: string;
  currentValue: number; // Current metric value
  targetValue: number; // SLO target
  compliance: boolean; // Is SLO being met?
  errorBudgetRemaining: number; // Percentage (0-100)
  errorBudgetConsumed: number; // Percentage (0-100)
  burnRate: number; // Rate of error budget consumption
  alertLevel: 'ok' | 'warning' | 'critical';
}

export interface ErrorBudget {
  totalBudget: number; // Total allowed errors in window
  consumedBudget: number; // Errors consumed so far
  remainingBudget: number; // Errors remaining
  remainingPercentage: number; // Percentage remaining (0-100)
  consumedPercentage: number; // Percentage consumed (0-100)
  burnRate: number; // Current burn rate (errors/hour)
  estimatedDepletion?: string; // ISO timestamp when budget will be depleted
}

/**
 * Standard SLO definitions for TEEI CSR Platform
 */
export const PLATFORM_SLOS: Record<string, SLODefinition> = {
  // API Availability SLO - 99.9% uptime (43.2 minutes downtime/month allowed)
  API_AVAILABILITY: {
    name: 'API Availability',
    description: 'API endpoints must be available 99.9% of the time',
    target: 99.9,
    window: 'monthly',
    metric: 'availability',
  },

  // API Latency SLO - p95 < 500ms
  API_LATENCY_P95: {
    name: 'API Latency (p95)',
    description: '95th percentile API response time must be under 500ms',
    target: 95.0, // 95% of requests must be under threshold
    window: 'hourly',
    metric: 'latency',
    threshold: 500, // milliseconds
    unit: 'ms',
  },

  // API Latency SLO - p99 < 1000ms
  API_LATENCY_P99: {
    name: 'API Latency (p99)',
    description: '99th percentile API response time must be under 1000ms',
    target: 99.0,
    window: 'hourly',
    metric: 'latency',
    threshold: 1000,
    unit: 'ms',
  },

  // Frontend LCP SLO - p95 < 2.5s (Core Web Vitals "Good" threshold)
  FRONTEND_LCP_P95: {
    name: 'Frontend LCP (p95)',
    description: '95th percentile Largest Contentful Paint must be under 2.5s',
    target: 95.0,
    window: 'daily',
    metric: 'latency',
    threshold: 2500,
    unit: 'ms',
  },

  // Error Rate SLO - < 0.1%
  ERROR_RATE: {
    name: 'API Error Rate',
    description: 'API error rate (5xx) must be below 0.1%',
    target: 99.9, // 99.9% success rate
    window: 'hourly',
    metric: 'error_rate',
  },

  // Boardroom LCP SLO - p95 < 1.5s (stricter for executive dashboard)
  BOARDROOM_LCP_P95: {
    name: 'Boardroom LCP (p95)',
    description: '95th percentile Boardroom LCP must be under 1.5s',
    target: 95.0,
    window: 'hourly',
    metric: 'latency',
    threshold: 1500,
    unit: 'ms',
  },

  // Export Generation SLO - p95 < 3s
  EXPORT_GENERATION_P95: {
    name: 'Export Generation (p95)',
    description: '95th percentile export generation time must be under 3s',
    target: 95.0,
    window: 'hourly',
    metric: 'latency',
    threshold: 3000,
    unit: 'ms',
  },

  // Database Query SLO - p95 < 100ms
  DATABASE_QUERY_P95: {
    name: 'Database Query (p95)',
    description: '95th percentile database query time must be under 100ms',
    target: 95.0,
    window: 'hourly',
    metric: 'latency',
    threshold: 100,
    unit: 'ms',
  },

  // Connector Health SLO - 99.5% uptime
  CONNECTOR_HEALTH: {
    name: 'Connector Health',
    description: 'External connectors must be healthy 99.5% of the time',
    target: 99.5,
    window: 'daily',
    metric: 'availability',
  },
};

/**
 * Calculate error budget for a given SLO
 */
export function calculateErrorBudget(
  slo: SLODefinition,
  totalEvents: number,
  goodEvents: number,
  windowHours: number = 24
): ErrorBudget {
  // Calculate allowed failures based on SLO target
  const allowedFailureRate = (100 - slo.target) / 100;
  const totalBudget = Math.floor(totalEvents * allowedFailureRate);

  // Calculate actual failures
  const badEvents = totalEvents - goodEvents;
  const consumedBudget = Math.min(badEvents, totalBudget);
  const remainingBudget = Math.max(0, totalBudget - consumedBudget);

  // Calculate percentages
  const consumedPercentage = totalBudget > 0 ? (consumedBudget / totalBudget) * 100 : 0;
  const remainingPercentage = 100 - consumedPercentage;

  // Calculate burn rate (errors per hour)
  const burnRate = badEvents / windowHours;

  // Estimate when budget will be depleted (if burn rate continues)
  let estimatedDepletion: string | undefined;
  if (burnRate > 0 && remainingBudget > 0) {
    const hoursUntilDepletion = remainingBudget / burnRate;
    const depletionDate = new Date(Date.now() + hoursUntilDepletion * 3600 * 1000);
    estimatedDepletion = depletionDate.toISOString();
  }

  return {
    totalBudget,
    consumedBudget,
    remainingBudget,
    remainingPercentage,
    consumedPercentage,
    burnRate,
    estimatedDepletion,
  };
}

/**
 * Evaluate SLO status
 */
export function evaluateSLO(
  slo: SLODefinition,
  currentMetric: number,
  errorBudget: ErrorBudget
): SLOStatus {
  // Determine if SLO is being met
  let compliance: boolean;
  let currentValue: number;
  let targetValue: number;

  if (slo.metric === 'availability' || slo.metric === 'error_rate') {
    // For availability/error rate, compare percentage
    currentValue = currentMetric;
    targetValue = slo.target;
    compliance = currentValue >= targetValue;
  } else if (slo.metric === 'latency' && slo.threshold) {
    // For latency, check if below threshold
    currentValue = currentMetric;
    targetValue = slo.threshold;
    compliance = currentValue <= targetValue;
  } else {
    currentValue = currentMetric;
    targetValue = slo.target;
    compliance = currentValue >= targetValue;
  }

  // Determine alert level based on error budget and compliance
  let alertLevel: 'ok' | 'warning' | 'critical';

  if (!compliance || errorBudget.remainingPercentage <= 0) {
    alertLevel = 'critical';
  } else if (errorBudget.remainingPercentage <= 25) {
    alertLevel = 'warning';
  } else {
    alertLevel = 'ok';
  }

  return {
    slo,
    timestamp: new Date().toISOString(),
    currentValue,
    targetValue,
    compliance,
    errorBudgetRemaining: errorBudget.remainingPercentage,
    errorBudgetConsumed: errorBudget.consumedPercentage,
    burnRate: errorBudget.burnRate,
    alertLevel,
  };
}

/**
 * Calculate burn rate alert thresholds
 *
 * Uses multi-window multi-burn-rate alerting as recommended by Google SRE
 *
 * Fast burn (1 hour window): Alert if consuming 14.4x normal rate
 * Slow burn (6 hour window): Alert if consuming 6x normal rate
 */
export interface BurnRateAlert {
  window: string;
  threshold: number; // Multiple of normal burn rate
  currentRate: number;
  normalRate: number;
  alert: boolean;
  severity: 'warning' | 'critical';
}

export function calculateBurnRateAlerts(
  slo: SLODefinition,
  errorBudget: ErrorBudget,
  windowHours: number = 24
): BurnRateAlert[] {
  // Calculate normal burn rate (error budget / window)
  const normalRate = errorBudget.totalBudget / windowHours;

  const alerts: BurnRateAlert[] = [
    // Fast burn (1 hour window) - 14.4x rate
    {
      window: '1h',
      threshold: 14.4,
      currentRate: errorBudget.burnRate,
      normalRate,
      alert: errorBudget.burnRate >= normalRate * 14.4,
      severity: 'critical',
    },
    // Medium burn (6 hour window) - 6x rate
    {
      window: '6h',
      threshold: 6.0,
      currentRate: errorBudget.burnRate,
      normalRate,
      alert: errorBudget.burnRate >= normalRate * 6.0,
      severity: 'critical',
    },
    // Slow burn (24 hour window) - 3x rate
    {
      window: '24h',
      threshold: 3.0,
      currentRate: errorBudget.burnRate,
      normalRate,
      alert: errorBudget.burnRate >= normalRate * 3.0,
      severity: 'warning',
    },
  ];

  return alerts;
}

/**
 * SLO Manager - tracks SLO status and error budgets
 */
export class SLOManager {
  private slos: Map<string, SLODefinition>;
  private statuses: Map<string, SLOStatus>;

  constructor() {
    this.slos = new Map();
    this.statuses = new Map();

    // Register default platform SLOs
    Object.entries(PLATFORM_SLOS).forEach(([key, slo]) => {
      this.slos.set(key, slo);
    });
  }

  /**
   * Register a custom SLO
   */
  registerSLO(key: string, slo: SLODefinition): void {
    this.slos.set(key, slo);
  }

  /**
   * Update SLO status
   */
  updateSLOStatus(
    key: string,
    currentMetric: number,
    totalEvents: number,
    goodEvents: number,
    windowHours: number = 24
  ): SLOStatus {
    const slo = this.slos.get(key);
    if (!slo) {
      throw new Error(`SLO not found: ${key}`);
    }

    const errorBudget = calculateErrorBudget(slo, totalEvents, goodEvents, windowHours);
    const status = evaluateSLO(slo, currentMetric, errorBudget);

    this.statuses.set(key, status);

    return status;
  }

  /**
   * Get SLO status
   */
  getSLOStatus(key: string): SLOStatus | undefined {
    return this.statuses.get(key);
  }

  /**
   * Get all SLO statuses
   */
  getAllSLOStatuses(): SLOStatus[] {
    return Array.from(this.statuses.values());
  }

  /**
   * Get all SLOs
   */
  getAllSLOs(): SLODefinition[] {
    return Array.from(this.slos.values());
  }

  /**
   * Check if any SLOs are in critical state
   */
  hasCriticalSLOs(): boolean {
    return Array.from(this.statuses.values()).some(
      (status) => status.alertLevel === 'critical'
    );
  }

  /**
   * Get summary of SLO health
   */
  getSummary(): {
    total: number;
    ok: number;
    warning: number;
    critical: number;
  } {
    const statuses = Array.from(this.statuses.values());

    return {
      total: statuses.length,
      ok: statuses.filter((s) => s.alertLevel === 'ok').length,
      warning: statuses.filter((s) => s.alertLevel === 'warning').length,
      critical: statuses.filter((s) => s.alertLevel === 'critical').length,
    };
  }
}

/**
 * Global SLO manager instance
 */
let globalSLOManager: SLOManager | null = null;

/**
 * Get or create global SLO manager
 */
export function getSLOManager(): SLOManager {
  if (!globalSLOManager) {
    globalSLOManager = new SLOManager();
  }
  return globalSLOManager;
}
