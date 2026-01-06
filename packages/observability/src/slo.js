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
/**
 * Standard SLO definitions for TEEI CSR Platform
 */
export const PLATFORM_SLOS = {
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
export function calculateErrorBudget(slo, totalEvents, goodEvents, windowHours = 24) {
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
    let estimatedDepletion;
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
export function evaluateSLO(slo, currentMetric, errorBudget) {
    // Determine if SLO is being met
    let compliance;
    let currentValue;
    let targetValue;
    if (slo.metric === 'availability' || slo.metric === 'error_rate') {
        // For availability/error rate, compare percentage
        currentValue = currentMetric;
        targetValue = slo.target;
        compliance = currentValue >= targetValue;
    }
    else if (slo.metric === 'latency' && slo.threshold) {
        // For latency, check if below threshold
        currentValue = currentMetric;
        targetValue = slo.threshold;
        compliance = currentValue <= targetValue;
    }
    else {
        currentValue = currentMetric;
        targetValue = slo.target;
        compliance = currentValue >= targetValue;
    }
    // Determine alert level based on error budget and compliance
    let alertLevel;
    if (!compliance || errorBudget.remainingPercentage <= 0) {
        alertLevel = 'critical';
    }
    else if (errorBudget.remainingPercentage <= 25) {
        alertLevel = 'warning';
    }
    else {
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
export function calculateBurnRateAlerts(slo, errorBudget, windowHours = 24) {
    // Calculate normal burn rate (error budget / window)
    const normalRate = errorBudget.totalBudget / windowHours;
    const alerts = [
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
    slos;
    statuses;
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
    registerSLO(key, slo) {
        this.slos.set(key, slo);
    }
    /**
     * Update SLO status
     */
    updateSLOStatus(key, currentMetric, totalEvents, goodEvents, windowHours = 24) {
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
    getSLOStatus(key) {
        return this.statuses.get(key);
    }
    /**
     * Get all SLO statuses
     */
    getAllSLOStatuses() {
        return Array.from(this.statuses.values());
    }
    /**
     * Get all SLOs
     */
    getAllSLOs() {
        return Array.from(this.slos.values());
    }
    /**
     * Check if any SLOs are in critical state
     */
    hasCriticalSLOs() {
        return Array.from(this.statuses.values()).some((status) => status.alertLevel === 'critical');
    }
    /**
     * Get summary of SLO health
     */
    getSummary() {
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
let globalSLOManager = null;
/**
 * Get or create global SLO manager
 */
export function getSLOManager() {
    if (!globalSLOManager) {
        globalSLOManager = new SLOManager();
    }
    return globalSLOManager;
}
//# sourceMappingURL=slo.js.map