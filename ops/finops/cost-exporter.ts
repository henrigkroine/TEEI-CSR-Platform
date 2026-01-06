/**
 * FinOps Cost Exporter
 * Tracks cloud costs per tenant, feature, and service
 * Agent: finops-exporter, cost-anomaly-detector, cost-reporter
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

export interface CostMetric {
  timestamp: Date;
  tenant: string;
  service: string;
  feature?: string;
  region: string;
  cost: number;
  currency: string;
  resourceType: string;  // compute, storage, network, database
  tags: Record<string, string>;
}

export interface CostAllocation {
  tenant: string;
  totalCost: number;
  breakdown: {
    service: string;
    cost: number;
    percentage: number;
  }[];
  forecast: number;
  anomalyDetected: boolean;
}

export interface CostAnomaly {
  timestamp: Date;
  tenant: string;
  service: string;
  actualCost: number;
  expectedCost: number;
  deviation: number;  // percentage
  severity: 'warning' | 'critical';
}

/**
 * Cost Exporter - Ingests cost data from cloud providers
 */
export class CostExporter {
  private metrics: CostMetric[] = [];
  private allocations: Map<string, CostAllocation> = new Map();

  /**
   * Ingest cost data from AWS Cost Explorer
   */
  async ingestAWSCosts(startDate: Date, endDate: Date): Promise<void> {
    console.info('[FinOps] Ingesting AWS costs...');

    // In production, use AWS Cost Explorer API:
    // const costExplorer = new AWS.CostExplorer();
    // const response = await costExplorer.getCostAndUsage({...}).promise();

    // Simulated data for demonstration
    const mockCosts = this.generateMockAWSCosts(startDate, endDate);

    for (const cost of mockCosts) {
      this.metrics.push(cost);
    }

    console.info(`[FinOps] Ingested ${mockCosts.length} AWS cost records`);
  }

  /**
   * Ingest cost data from Azure Cost Management
   */
  async ingestAzureCosts(startDate: Date, endDate: Date): Promise<void> {
    console.info('[FinOps] Ingesting Azure costs...');

    // In production, use Azure Cost Management API
    // const credential = new DefaultAzureCredential();
    // const client = new CostManagementClient(credential);

    const mockCosts = this.generateMockAzureCosts(startDate, endDate);

    for (const cost of mockCosts) {
      this.metrics.push(cost);
    }

    console.info(`[FinOps] Ingested ${mockCosts.length} Azure cost records`);
  }

  /**
   * Ingest cost data from GCP Billing
   */
  async ingestGCPCosts(startDate: Date, endDate: Date): Promise<void> {
    console.info('[FinOps] Ingesting GCP costs...');

    // In production, use BigQuery to query GCP billing export
    // const bigquery = new BigQuery();
    // const query = `SELECT * FROM billing_export.gcp_billing_export WHERE ...`;

    const mockCosts = this.generateMockGCPCosts(startDate, endDate);

    for (const cost of mockCosts) {
      this.metrics.push(cost);
    }

    console.info(`[FinOps] Ingested ${mockCosts.length} GCP cost records`);
  }

  /**
   * Calculate cost allocation per tenant
   */
  calculateTenantAllocations(): Map<string, CostAllocation> {
    console.info('[FinOps] Calculating tenant cost allocations...');

    const tenantCosts = new Map<string, Map<string, number>>();

    // Aggregate costs by tenant and service
    for (const metric of this.metrics) {
      if (!tenantCosts.has(metric.tenant)) {
        tenantCosts.set(metric.tenant, new Map());
      }

      const serviceCosts = tenantCosts.get(metric.tenant)!;
      const currentCost = serviceCosts.get(metric.service) || 0;
      serviceCosts.set(metric.service, currentCost + metric.cost);
    }

    // Calculate allocations
    for (const [tenant, serviceCosts] of tenantCosts.entries()) {
      const totalCost = Array.from(serviceCosts.values()).reduce((sum, cost) => sum + cost, 0);

      const breakdown = Array.from(serviceCosts.entries()).map(([service, cost]) => ({
        service,
        cost,
        percentage: (cost / totalCost) * 100
      })).sort((a, b) => b.cost - a.cost);

      // Simple linear forecast (actual implementation would use time-series analysis)
      const forecast = totalCost * 1.05; // 5% growth assumption

      // Check for anomalies
      const anomalyDetected = this.detectAnomalies(tenant, totalCost, forecast);

      this.allocations.set(tenant, {
        tenant,
        totalCost,
        breakdown,
        forecast,
        anomalyDetected
      });
    }

    console.info(`[FinOps] Calculated allocations for ${this.allocations.size} tenants`);

    return this.allocations;
  }

  /**
   * Detect cost anomalies
   */
  private detectAnomalies(tenant: string, actualCost: number, expectedCost: number): boolean {
    const deviation = ((actualCost - expectedCost) / expectedCost) * 100;

    // Anomaly thresholds
    const warningThreshold = 20; // 20% deviation
    const criticalThreshold = 50; // 50% deviation

    if (Math.abs(deviation) > criticalThreshold) {
      console.warn(`[FinOps] CRITICAL anomaly for ${tenant}: ${deviation.toFixed(1)}% deviation`);
      return true;
    }

    if (Math.abs(deviation) > warningThreshold) {
      console.warn(`[FinOps] Warning anomaly for ${tenant}: ${deviation.toFixed(1)}% deviation`);
      return true;
    }

    return false;
  }

  /**
   * Get anomalies
   */
  getAnomalies(): CostAnomaly[] {
    const anomalies: CostAnomaly[] = [];

    for (const [tenant, allocation] of this.allocations.entries()) {
      if (allocation.anomalyDetected) {
        const deviation = ((allocation.totalCost - allocation.forecast) / allocation.forecast) * 100;

        anomalies.push({
          timestamp: new Date(),
          tenant,
          service: 'all',
          actualCost: allocation.totalCost,
          expectedCost: allocation.forecast,
          deviation,
          severity: Math.abs(deviation) > 50 ? 'critical' : 'warning'
        });
      }
    }

    return anomalies;
  }

  /**
   * Export metrics to Prometheus
   */
  async exportToPrometheus(): Promise<void> {
    console.info('[FinOps] Exporting metrics to Prometheus...');

    // Generate Prometheus metrics
    const metrics = this.generatePrometheusMetrics();

    // Write to text file for Prometheus text file collector
    const metricsPath = '/var/lib/prometheus/textfile_collector/finops_costs.prom';
    fs.mkdirSync(path.dirname(metricsPath), { recursive: true });
    fs.writeFileSync(metricsPath, metrics);

    console.info(`[FinOps] Exported ${this.metrics.length} metrics to Prometheus`);
  }

  /**
   * Generate Prometheus metrics format
   */
  private generatePrometheusMetrics(): string {
    let output = '# HELP teei_cost_usd Cloud cost in USD\n';
    output += '# TYPE teei_cost_usd gauge\n';

    for (const metric of this.metrics) {
      const labels = [
        `tenant="${metric.tenant}"`,
        `service="${metric.service}"`,
        `region="${metric.region}"`,
        `resource_type="${metric.resourceType}"`
      ];

      if (metric.feature) {
        labels.push(`feature="${metric.feature}"`);
      }

      output += `teei_cost_usd{${labels.join(',')}} ${metric.cost}\n`;
    }

    // Add allocation metrics
    output += '\n# HELP teei_tenant_total_cost_usd Total tenant cost in USD\n';
    output += '# TYPE teei_tenant_total_cost_usd gauge\n';

    for (const [tenant, allocation] of this.allocations.entries()) {
      output += `teei_tenant_total_cost_usd{tenant="${tenant}"} ${allocation.totalCost}\n`;
    }

    // Add forecast metrics
    output += '\n# HELP teei_tenant_forecast_cost_usd Forecasted tenant cost in USD\n';
    output += '# TYPE teei_tenant_forecast_cost_usd gauge\n';

    for (const [tenant, allocation] of this.allocations.entries()) {
      output += `teei_tenant_forecast_cost_usd{tenant="${tenant}"} ${allocation.forecast}\n`;
    }

    return output;
  }

  /**
   * Export monthly report
   */
  async exportMonthlyReport(month: string, format: 'csv' | 'json' | 'pdf'): Promise<string> {
    console.info(`[FinOps] Generating monthly report for ${month} (${format})...`);

    const reportData = {
      month,
      generatedAt: new Date().toISOString(),
      summary: {
        totalCost: Array.from(this.allocations.values()).reduce((sum, a) => sum + a.totalCost, 0),
        tenantCount: this.allocations.size,
        anomaliesDetected: this.getAnomalies().length
      },
      tenants: Array.from(this.allocations.values()).map(allocation => ({
        tenant: allocation.tenant,
        totalCost: allocation.totalCost,
        forecast: allocation.forecast,
        breakdown: allocation.breakdown,
        anomalyDetected: allocation.anomalyDetected
      })),
      anomalies: this.getAnomalies()
    };

    const outputPath = `/tmp/finops-report-${month}.${format}`;

    switch (format) {
      case 'json':
        fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2));
        break;

      case 'csv':
        const csv = this.convertToCSV(reportData);
        fs.writeFileSync(outputPath, csv);
        break;

      case 'pdf':
        // In production, use a library like pdfkit or puppeteer
        fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2)); // Placeholder
        console.warn('[FinOps] PDF generation not yet implemented');
        break;
    }

    console.info(`[FinOps] Report saved to ${outputPath}`);
    return outputPath;
  }

  /**
   * Convert report data to CSV
   */
  private convertToCSV(reportData: any): string {
    let csv = 'Tenant,Total Cost,Forecast,Anomaly Detected\n';

    for (const tenant of reportData.tenants) {
      csv += `${tenant.tenant},${tenant.totalCost},${tenant.forecast},${tenant.anomalyDetected}\n`;
    }

    csv += '\n\nService Breakdown\n';
    csv += 'Tenant,Service,Cost,Percentage\n';

    for (const tenant of reportData.tenants) {
      for (const service of tenant.breakdown) {
        csv += `${tenant.tenant},${service.service},${service.cost},${service.percentage.toFixed(2)}%\n`;
      }
    }

    return csv;
  }

  // Mock data generators (replace with real API calls in production)

  private generateMockAWSCosts(startDate: Date, endDate: Date): CostMetric[] {
    const metrics: CostMetric[] = [];
    const tenants = ['acme-corp', 'globex', 'initech', 'stark-industries'];
    const services = ['api-gateway', 'reporting', 'corp-cockpit', 'database'];
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1'];
    const resourceTypes = ['compute', 'storage', 'network', 'database'];

    for (const tenant of tenants) {
      for (const service of services) {
        for (const region of regions) {
          const resourceType = service === 'database' ? 'database' : resourceTypes[Math.floor(Math.random() * resourceTypes.length)];

          metrics.push({
            timestamp: new Date(),
            tenant,
            service,
            region,
            cost: Math.random() * 1000,
            currency: 'USD',
            resourceType,
            tags: {
              environment: 'production',
              cloud: 'aws'
            }
          });
        }
      }
    }

    return metrics;
  }

  private generateMockAzureCosts(startDate: Date, endDate: Date): CostMetric[] {
    // Similar to AWS but with Azure-specific resource types
    return this.generateMockAWSCosts(startDate, endDate).map(m => ({
      ...m,
      tags: { ...m.tags, cloud: 'azure' }
    }));
  }

  private generateMockGCPCosts(startDate: Date, endDate: Date): CostMetric[] {
    // Similar to AWS but with GCP-specific resource types
    return this.generateMockAWSCosts(startDate, endDate).map(m => ({
      ...m,
      tags: { ...m.tags, cloud: 'gcp' }
    }));
  }

  /**
   * Get all metrics
   */
  getMetrics(): CostMetric[] {
    return this.metrics;
  }

  /**
   * Get allocation for tenant
   */
  getTenantAllocation(tenant: string): CostAllocation | undefined {
    return this.allocations.get(tenant);
  }
}

/**
 * Singleton instance
 */
let exporterInstance: CostExporter | null = null;

export function getCostExporter(): CostExporter {
  if (!exporterInstance) {
    exporterInstance = new CostExporter();
  }
  return exporterInstance;
}
