/**
 * Prometheus Metrics for SLOs and Error Budgets
 *
 * Exports SLO status and error budget metrics to Prometheus
 * Enables Grafana dashboards and alerting rules
 *
 * @module observability/slo-metrics
 */
import { Gauge, Counter, Histogram, Registry } from 'prom-client';
/**
 * SLO Metrics Registry
 */
export class SLOMetrics {
    registry;
    // Gauges for current SLO status
    sloComplianceGauge;
    sloCurrentValueGauge;
    sloTargetValueGauge;
    // Gauges for error budgets
    errorBudgetRemainingGauge;
    errorBudgetConsumedGauge;
    errorBudgetBurnRateGauge;
    // Counter for SLO violations
    sloViolationsCounter;
    // Histogram for error budget consumption rate
    errorBudgetConsumptionHistogram;
    constructor(registry) {
        this.registry = registry || new Registry();
        // SLO compliance (0 = not compliant, 1 = compliant)
        this.sloComplianceGauge = new Gauge({
            name: 'teei_slo_compliance',
            help: 'Whether the SLO is currently being met (1 = yes, 0 = no)',
            labelNames: ['slo_name', 'slo_type', 'slo_window'],
            registers: [this.registry],
        });
        // Current metric value
        this.sloCurrentValueGauge = new Gauge({
            name: 'teei_slo_current_value',
            help: 'Current value of the SLO metric',
            labelNames: ['slo_name', 'slo_type', 'slo_window', 'unit'],
            registers: [this.registry],
        });
        // Target metric value
        this.sloTargetValueGauge = new Gauge({
            name: 'teei_slo_target_value',
            help: 'Target value for the SLO',
            labelNames: ['slo_name', 'slo_type', 'slo_window', 'unit'],
            registers: [this.registry],
        });
        // Error budget remaining (percentage)
        this.errorBudgetRemainingGauge = new Gauge({
            name: 'teei_error_budget_remaining_percent',
            help: 'Percentage of error budget remaining',
            labelNames: ['slo_name', 'slo_window'],
            registers: [this.registry],
        });
        // Error budget consumed (percentage)
        this.errorBudgetConsumedGauge = new Gauge({
            name: 'teei_error_budget_consumed_percent',
            help: 'Percentage of error budget consumed',
            labelNames: ['slo_name', 'slo_window'],
            registers: [this.registry],
        });
        // Error budget burn rate (errors/hour)
        this.errorBudgetBurnRateGauge = new Gauge({
            name: 'teei_error_budget_burn_rate',
            help: 'Current error budget burn rate (errors per hour)',
            labelNames: ['slo_name', 'slo_window'],
            registers: [this.registry],
        });
        // SLO violations counter
        this.sloViolationsCounter = new Counter({
            name: 'teei_slo_violations_total',
            help: 'Total number of SLO violations',
            labelNames: ['slo_name', 'slo_type', 'slo_window', 'severity'],
            registers: [this.registry],
        });
        // Error budget consumption histogram
        this.errorBudgetConsumptionHistogram = new Histogram({
            name: 'teei_error_budget_consumption_rate',
            help: 'Distribution of error budget consumption rates',
            labelNames: ['slo_name', 'slo_window'],
            buckets: [0.1, 0.25, 0.5, 0.75, 1.0, 2.0, 5.0, 10.0],
            registers: [this.registry],
        });
    }
    /**
     * Update metrics from SLO status
     */
    updateFromSLOStatus(status) {
        const labels = {
            slo_name: status.slo.name,
            slo_type: status.slo.metric,
            slo_window: status.slo.window,
            unit: status.slo.unit || 'percent',
        };
        // Update compliance gauge
        this.sloComplianceGauge.set({ slo_name: labels.slo_name, slo_type: labels.slo_type, slo_window: labels.slo_window }, status.compliance ? 1 : 0);
        // Update current value gauge
        this.sloCurrentValueGauge.set(labels, status.currentValue);
        // Update target value gauge
        this.sloTargetValueGauge.set(labels, status.targetValue);
        // Update error budget gauges
        this.errorBudgetRemainingGauge.set({ slo_name: labels.slo_name, slo_window: labels.slo_window }, status.errorBudgetRemaining);
        this.errorBudgetConsumedGauge.set({ slo_name: labels.slo_name, slo_window: labels.slo_window }, status.errorBudgetConsumed);
        this.errorBudgetBurnRateGauge.set({ slo_name: labels.slo_name, slo_window: labels.slo_window }, status.burnRate);
        // Record consumption rate in histogram
        this.errorBudgetConsumptionHistogram.observe({ slo_name: labels.slo_name, slo_window: labels.slo_window }, status.burnRate);
        // Increment violation counter if not compliant
        if (!status.compliance) {
            this.sloViolationsCounter.inc({
                slo_name: labels.slo_name,
                slo_type: labels.slo_type,
                slo_window: labels.slo_window,
                severity: status.alertLevel,
            });
        }
    }
    /**
     * Update all metrics from SLO manager
     */
    updateFromSLOManager(sloManager) {
        const statuses = sloManager.getAllSLOStatuses();
        statuses.forEach((status) => this.updateFromSLOStatus(status));
    }
    /**
     * Get Prometheus metrics as text
     */
    async getMetrics() {
        return this.registry.metrics();
    }
    /**
     * Get metrics registry
     */
    getRegistry() {
        return this.registry;
    }
    /**
     * Reset all metrics
     */
    reset() {
        this.registry.resetMetrics();
    }
}
/**
 * Global SLO metrics instance
 */
let globalSLOMetrics = null;
/**
 * Get or create global SLO metrics instance
 */
export function getSLOMetrics(registry) {
    if (!globalSLOMetrics) {
        globalSLOMetrics = new SLOMetrics(registry);
    }
    return globalSLOMetrics;
}
/**
 * Fastify plugin to expose SLO metrics endpoint
 */
export function registerSLOMetricsEndpoint(fastify, sloManager, sloMetrics) {
    const metrics = sloMetrics || getSLOMetrics();
    // Metrics endpoint
    fastify.get('/metrics/slo', async (_request, reply) => {
        // Update metrics before exporting
        metrics.updateFromSLOManager(sloManager);
        const metricsText = await metrics.getMetrics();
        reply.type('text/plain; version=0.0.4; charset=utf-8').send(metricsText);
    });
    // JSON endpoint for SLO status
    fastify.get('/api/slo/status', async (_request, reply) => {
        const statuses = sloManager.getAllSLOStatuses();
        const summary = sloManager.getSummary();
        reply.send({
            summary,
            statuses,
            timestamp: new Date().toISOString(),
        });
    });
    // Endpoint for specific SLO
    fastify.get('/api/slo/status/:sloKey', async (request, reply) => {
        const { sloKey } = request.params;
        const status = sloManager.getSLOStatus(sloKey);
        if (!status) {
            reply.code(404).send({ error: 'SLO not found' });
            return;
        }
        reply.send(status);
    });
}
/**
 * Create Prometheus alerting rules for SLOs
 *
 * Returns YAML configuration for Prometheus alert rules
 */
export function generatePrometheusAlertRules() {
    return `
# SLO Alerting Rules for TEEI CSR Platform
# Auto-generated by @teei/observability

groups:
  - name: slo_alerts
    interval: 1m
    rules:
      # Critical: SLO violation
      - alert: SLOViolation
        expr: teei_slo_compliance == 0
        for: 5m
        labels:
          severity: critical
          component: slo
        annotations:
          summary: "SLO {{ $labels.slo_name }} is being violated"
          description: "{{ $labels.slo_name }} ({{ $labels.slo_type }}) has not met its SLO target for 5 minutes. Current compliance: {{ $value }}"

      # Warning: Error budget low
      - alert: ErrorBudgetLow
        expr: teei_error_budget_remaining_percent < 25
        for: 10m
        labels:
          severity: warning
          component: slo
        annotations:
          summary: "Error budget for {{ $labels.slo_name }} is running low"
          description: "{{ $labels.slo_name }} has consumed {{ printf "%.1f" $value }}% of its error budget. Remaining: {{ printf "%.1f" (sub 100 $value) }}%"

      # Critical: Error budget depleted
      - alert: ErrorBudgetDepleted
        expr: teei_error_budget_remaining_percent <= 0
        for: 1m
        labels:
          severity: critical
          component: slo
        annotations:
          summary: "Error budget for {{ $labels.slo_name }} is depleted"
          description: "{{ $labels.slo_name }} has exhausted its error budget. All further errors will violate the SLO."

      # Critical: Fast burn rate (14.4x normal)
      - alert: ErrorBudgetFastBurn
        expr: teei_error_budget_burn_rate > (teei_error_budget_remaining_percent / 100 * 14.4)
        for: 2m
        labels:
          severity: critical
          component: slo
        annotations:
          summary: "{{ $labels.slo_name }} error budget is burning too fast"
          description: "{{ $labels.slo_name }} is consuming error budget at 14.4x the normal rate. At this rate, the budget will be depleted in {{ printf "%.1f" (div $value 14.4) }} hours."

      # Warning: Slow burn rate (3x normal)
      - alert: ErrorBudgetSlowBurn
        expr: teei_error_budget_burn_rate > (teei_error_budget_remaining_percent / 100 * 3.0)
        for: 1h
        labels:
          severity: warning
          component: slo
        annotations:
          summary: "{{ $labels.slo_name }} error budget is burning faster than expected"
          description: "{{ $labels.slo_name }} is consuming error budget at 3x the normal rate. Current burn rate: {{ printf "%.2f" $value }} errors/hour."

      # API Availability SLO specific
      - alert: APIAvailabilitySLOViolation
        expr: teei_slo_compliance{slo_name="API Availability"} == 0
        for: 5m
        labels:
          severity: critical
          component: api
        annotations:
          summary: "API availability SLO violated"
          description: "API availability has fallen below 99.9% for 5 minutes. Immediate investigation required."

      # API Latency SLO specific
      - alert: APILatencySLOViolation
        expr: teei_slo_compliance{slo_name=~"API Latency.*"} == 0
        for: 10m
        labels:
          severity: warning
          component: api
        annotations:
          summary: "API latency SLO violated"
          description: "API {{ $labels.slo_name }} has exceeded its latency threshold for 10 minutes."

      # Frontend LCP SLO specific
      - alert: FrontendLCPSLOViolation
        expr: teei_slo_compliance{slo_name=~".*LCP.*"} == 0
        for: 15m
        labels:
          severity: warning
          component: frontend
        annotations:
          summary: "Frontend LCP SLO violated"
          description: "{{ $labels.slo_name }} has exceeded the target threshold for 15 minutes. User experience may be degraded."
`.trim();
}
//# sourceMappingURL=slo-metrics.js.map