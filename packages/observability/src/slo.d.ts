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
    target: number;
    window: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'rolling_30d';
    metric: 'availability' | 'latency' | 'error_rate' | 'saturation';
    threshold?: number;
    unit?: string;
}
export interface SLOStatus {
    slo: SLODefinition;
    timestamp: string;
    currentValue: number;
    targetValue: number;
    compliance: boolean;
    errorBudgetRemaining: number;
    errorBudgetConsumed: number;
    burnRate: number;
    alertLevel: 'ok' | 'warning' | 'critical';
}
export interface ErrorBudget {
    totalBudget: number;
    consumedBudget: number;
    remainingBudget: number;
    remainingPercentage: number;
    consumedPercentage: number;
    burnRate: number;
    estimatedDepletion?: string;
}
/**
 * Standard SLO definitions for TEEI CSR Platform
 */
export declare const PLATFORM_SLOS: Record<string, SLODefinition>;
/**
 * Calculate error budget for a given SLO
 */
export declare function calculateErrorBudget(slo: SLODefinition, totalEvents: number, goodEvents: number, windowHours?: number): ErrorBudget;
/**
 * Evaluate SLO status
 */
export declare function evaluateSLO(slo: SLODefinition, currentMetric: number, errorBudget: ErrorBudget): SLOStatus;
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
    threshold: number;
    currentRate: number;
    normalRate: number;
    alert: boolean;
    severity: 'warning' | 'critical';
}
export declare function calculateBurnRateAlerts(slo: SLODefinition, errorBudget: ErrorBudget, windowHours?: number): BurnRateAlert[];
/**
 * SLO Manager - tracks SLO status and error budgets
 */
export declare class SLOManager {
    private slos;
    private statuses;
    constructor();
    /**
     * Register a custom SLO
     */
    registerSLO(key: string, slo: SLODefinition): void;
    /**
     * Update SLO status
     */
    updateSLOStatus(key: string, currentMetric: number, totalEvents: number, goodEvents: number, windowHours?: number): SLOStatus;
    /**
     * Get SLO status
     */
    getSLOStatus(key: string): SLOStatus | undefined;
    /**
     * Get all SLO statuses
     */
    getAllSLOStatuses(): SLOStatus[];
    /**
     * Get all SLOs
     */
    getAllSLOs(): SLODefinition[];
    /**
     * Check if any SLOs are in critical state
     */
    hasCriticalSLOs(): boolean;
    /**
     * Get summary of SLO health
     */
    getSummary(): {
        total: number;
        ok: number;
        warning: number;
        critical: number;
    };
}
/**
 * Get or create global SLO manager
 */
export declare function getSLOManager(): SLOManager;
//# sourceMappingURL=slo.d.ts.map