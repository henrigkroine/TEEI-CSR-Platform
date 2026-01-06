/**
 * Prometheus Metrics for SLOs and Error Budgets
 *
 * Exports SLO status and error budget metrics to Prometheus
 * Enables Grafana dashboards and alerting rules
 *
 * @module observability/slo-metrics
 */
import { Registry } from 'prom-client';
import { SLOManager, SLOStatus } from './slo.js';
/**
 * SLO Metrics Registry
 */
export declare class SLOMetrics {
    private readonly registry;
    private readonly sloComplianceGauge;
    private readonly sloCurrentValueGauge;
    private readonly sloTargetValueGauge;
    private readonly errorBudgetRemainingGauge;
    private readonly errorBudgetConsumedGauge;
    private readonly errorBudgetBurnRateGauge;
    private readonly sloViolationsCounter;
    private readonly errorBudgetConsumptionHistogram;
    constructor(registry?: Registry);
    /**
     * Update metrics from SLO status
     */
    updateFromSLOStatus(status: SLOStatus): void;
    /**
     * Update all metrics from SLO manager
     */
    updateFromSLOManager(sloManager: SLOManager): void;
    /**
     * Get Prometheus metrics as text
     */
    getMetrics(): Promise<string>;
    /**
     * Get metrics registry
     */
    getRegistry(): Registry;
    /**
     * Reset all metrics
     */
    reset(): void;
}
/**
 * Get or create global SLO metrics instance
 */
export declare function getSLOMetrics(registry?: Registry): SLOMetrics;
/**
 * Fastify plugin to expose SLO metrics endpoint
 */
export declare function registerSLOMetricsEndpoint(fastify: any, sloManager: SLOManager, sloMetrics?: SLOMetrics): void;
/**
 * Create Prometheus alerting rules for SLOs
 *
 * Returns YAML configuration for Prometheus alert rules
 */
export declare function generatePrometheusAlertRules(): string;
//# sourceMappingURL=slo-metrics.d.ts.map