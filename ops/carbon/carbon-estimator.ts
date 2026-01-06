/**
 * Carbon Footprint Estimator
 * Converts power usage to CO2e emissions
 * Agent: carbon-estimator, reduction-playbook-author
 */

export interface PowerUsageMetric {
  timestamp: Date;
  service: string;
  region: string;
  resourceType: string;  // compute, storage, network
  powerWatts: number;
  durationHours: number;
}

export interface CarbonEmission {
  timestamp: Date;
  service: string;
  region: string;
  resourceType: string;
  energyKWh: number;
  co2eGrams: number;
  carbonIntensity: number;  // gCO2e/kWh for the region
}

export interface CarbonReport {
  totalCO2eKg: number;
  breakdown: {
    service: string;
    co2eKg: number;
    percentage: number;
  }[];
  byRegion: {
    region: string;
    co2eKg: number;
    carbonIntensity: number;
  }[];
  recommendations: string[];
  reductionPotential: number;  // kg CO2e
}

/**
 * Carbon intensity factors (gCO2e/kWh) by cloud region
 * Source: Cloud Carbon Footprint, Electricity Maps
 */
const CARBON_INTENSITY: Record<string, number> = {
  // AWS Regions
  'us-east-1': 415,      // Virginia (US East, mixed grid)
  'us-west-2': 291,      // Oregon (US West, hydro-heavy)
  'eu-west-1': 283,      // Ireland (EU West, wind-heavy)
  'eu-central-1': 338,   // Frankfurt (EU Central)
  'ap-southeast-1': 498, // Singapore (high carbon)
  'ap-northeast-1': 518, // Tokyo (coal-dependent)

  // Azure Regions
  'eastus': 415,
  'westus2': 291,
  'northeurope': 283,
  'westeurope': 338,

  // GCP Regions
  'us-central1': 394,
  'us-west1': 291,
  'europe-west1': 283,
  'asia-southeast1': 498,

  // Default (global average)
  'default': 475
};

/**
 * Resource power consumption estimates (Watts)
 * Based on typical cloud instance types
 */
const POWER_CONSUMPTION: Record<string, { idle: number; active: number }> = {
  // Compute (per vCPU)
  'compute_vcpu': { idle: 5, active: 15 },

  // Storage (per TB)
  'storage_ssd_tb': { idle: 3, active: 8 },
  'storage_hdd_tb': { idle: 2, active: 5 },

  // Network (per 10 Gbps)
  'network_10gbps': { idle: 10, active: 30 },

  // Database (per node)
  'database_node': { idle: 20, active: 50 }
};

export class CarbonEstimator {
  private emissions: CarbonEmission[] = [];

  /**
   * Estimate carbon emissions from power usage
   */
  estimateFromPowerUsage(metrics: PowerUsageMetric[]): CarbonEmission[] {
    console.info(`[Carbon] Estimating emissions from ${metrics.length} power usage metrics...`);

    const emissions: CarbonEmission[] = [];

    for (const metric of metrics) {
      // Calculate energy consumption (kWh)
      const energyKWh = (metric.powerWatts * metric.durationHours) / 1000;

      // Get carbon intensity for region
      const carbonIntensity = this.getCarbonIntensity(metric.region);

      // Calculate CO2e emissions (grams)
      const co2eGrams = energyKWh * carbonIntensity;

      emissions.push({
        timestamp: metric.timestamp,
        service: metric.service,
        region: metric.region,
        resourceType: metric.resourceType,
        energyKWh,
        co2eGrams,
        carbonIntensity
      });
    }

    this.emissions.push(...emissions);

    console.info(`[Carbon] Estimated ${emissions.length} emission records`);

    return emissions;
  }

  /**
   * Estimate carbon from cloud resource usage
   */
  async estimateFromCloudResources(
    service: string,
    region: string,
    resources: {
      vcpus: number;
      storageTB: number;
      networkGbps: number;
      databaseNodes: number;
    },
    durationHours: number,
    utilizationRate: number = 0.5  // 50% average utilization
  ): Promise<CarbonEmission> {
    // Calculate power consumption
    const computePower = resources.vcpus * (
      POWER_CONSUMPTION.compute_vcpu.idle * (1 - utilizationRate) +
      POWER_CONSUMPTION.compute_vcpu.active * utilizationRate
    );

    const storagePower = resources.storageTB * (
      POWER_CONSUMPTION.storage_ssd_tb.idle * (1 - utilizationRate) +
      POWER_CONSUMPTION.storage_ssd_tb.active * utilizationRate
    );

    const networkPower = (resources.networkGbps / 10) * (
      POWER_CONSUMPTION.network_10gbps.idle * (1 - utilizationRate) +
      POWER_CONSUMPTION.network_10gbps.active * utilizationRate
    );

    const databasePower = resources.databaseNodes * (
      POWER_CONSUMPTION.database_node.idle * (1 - utilizationRate) +
      POWER_CONSUMPTION.database_node.active * utilizationRate
    );

    const totalPowerWatts = computePower + storagePower + networkPower + databasePower;

    // Calculate energy and emissions
    const energyKWh = (totalPowerWatts * durationHours) / 1000;
    const carbonIntensity = this.getCarbonIntensity(region);
    const co2eGrams = energyKWh * carbonIntensity;

    const emission: CarbonEmission = {
      timestamp: new Date(),
      service,
      region,
      resourceType: 'mixed',
      energyKWh,
      co2eGrams,
      carbonIntensity
    };

    this.emissions.push(emission);

    return emission;
  }

  /**
   * Generate carbon report
   */
  generateReport(): CarbonReport {
    console.info(`[Carbon] Generating carbon report from ${this.emissions.length} emissions...`);

    // Total CO2e in kg
    const totalCO2eKg = this.emissions.reduce((sum, e) => sum + e.co2eGrams, 0) / 1000;

    // Breakdown by service
    const serviceMap = new Map<string, number>();
    for (const emission of this.emissions) {
      const current = serviceMap.get(emission.service) || 0;
      serviceMap.set(emission.service, current + emission.co2eGrams / 1000);
    }

    const breakdown = Array.from(serviceMap.entries())
      .map(([service, co2eKg]) => ({
        service,
        co2eKg,
        percentage: (co2eKg / totalCO2eKg) * 100
      }))
      .sort((a, b) => b.co2eKg - a.co2eKg);

    // Breakdown by region
    const regionMap = new Map<string, { co2eKg: number; carbonIntensity: number }>();
    for (const emission of this.emissions) {
      const current = regionMap.get(emission.region) || { co2eKg: 0, carbonIntensity: emission.carbonIntensity };
      regionMap.set(emission.region, {
        co2eKg: current.co2eKg + emission.co2eGrams / 1000,
        carbonIntensity: emission.carbonIntensity
      });
    }

    const byRegion = Array.from(regionMap.entries())
      .map(([region, data]) => ({
        region,
        co2eKg: data.co2eKg,
        carbonIntensity: data.carbonIntensity
      }))
      .sort((a, b) => b.co2eKg - a.co2eKg);

    // Generate recommendations
    const recommendations = this.generateRecommendations(byRegion, breakdown);

    // Calculate reduction potential
    const reductionPotential = this.calculateReductionPotential(byRegion);

    return {
      totalCO2eKg,
      breakdown,
      byRegion,
      recommendations,
      reductionPotential
    };
  }

  /**
   * Generate reduction recommendations
   */
  private generateRecommendations(
    byRegion: { region: string; co2eKg: number; carbonIntensity: number }[],
    breakdown: { service: string; co2eKg: number; percentage: number }[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for high-carbon regions
    const highCarbonRegions = byRegion.filter(r => r.carbonIntensity > 450);
    if (highCarbonRegions.length > 0) {
      recommendations.push(
        `Migrate workloads from high-carbon regions (${highCarbonRegions.map(r => r.region).join(', ')}) to lower-carbon regions like us-west-2 (Oregon) or eu-west-1 (Ireland) to reduce emissions by up to ${this.calculateMigrationReduction(highCarbonRegions)}%.`
      );
    }

    // Check for resource optimization
    if (breakdown.length > 0) {
      const topService = breakdown[0];
      recommendations.push(
        `Optimize ${topService.service} which accounts for ${topService.percentage.toFixed(1)}% of total emissions. Consider right-sizing instances, using spot instances, or implementing auto-scaling.`
      );
    }

    // Time-shifting recommendations
    recommendations.push(
      `Schedule non-critical batch jobs during off-peak hours (10pm-6am) when grid carbon intensity is typically 20-30% lower.`
    );

    // Storage recommendations
    const storageEmissions = breakdown.find(b => b.service.includes('storage'));
    if (storageEmissions && storageEmissions.percentage > 15) {
      recommendations.push(
        `Implement data lifecycle policies to archive or delete unused data. Storage accounts for ${storageEmissions.percentage.toFixed(1)}% of emissions.`
      );
    }

    // General best practices
    recommendations.push(
      `Implement autoscaling to reduce idle resource consumption and save an estimated 15-25% in carbon emissions.`
    );

    return recommendations;
  }

  /**
   * Calculate reduction potential from migrating to lower-carbon regions
   */
  private calculateReductionPotential(
    byRegion: { region: string; co2eKg: number; carbonIntensity: number }[]
  ): number {
    let potential = 0;

    // Find lowest carbon intensity region
    const lowestCarbonIntensity = Math.min(...byRegion.map(r => r.carbonIntensity));

    for (const region of byRegion) {
      if (region.carbonIntensity > lowestCarbonIntensity) {
        // Calculate potential reduction if migrated to lowest-carbon region
        const reductionFactor = (region.carbonIntensity - lowestCarbonIntensity) / region.carbonIntensity;
        potential += region.co2eKg * reductionFactor;
      }
    }

    return potential;
  }

  /**
   * Calculate percentage reduction from migrating high-carbon regions
   */
  private calculateMigrationReduction(
    highCarbonRegions: { region: string; co2eKg: number; carbonIntensity: number }[]
  ): number {
    const targetIntensity = 291; // us-west-2 (Oregon)

    const totalEmissions = highCarbonRegions.reduce((sum, r) => sum + r.co2eKg, 0);
    const avgIntensity = highCarbonRegions.reduce((sum, r) => sum + r.carbonIntensity, 0) / highCarbonRegions.length;

    const reductionPercent = ((avgIntensity - targetIntensity) / avgIntensity) * 100;

    return Math.round(reductionPercent);
  }

  /**
   * Get carbon intensity for region
   */
  private getCarbonIntensity(region: string): number {
    return CARBON_INTENSITY[region] || CARBON_INTENSITY.default;
  }

  /**
   * Export to Prometheus
   */
  exportToPrometheus(): string {
    let output = '# HELP teei_carbon_co2e_grams Carbon emissions in grams CO2e\n';
    output += '# TYPE teei_carbon_co2e_grams gauge\n';

    for (const emission of this.emissions) {
      const labels = [
        `service="${emission.service}"`,
        `region="${emission.region}"`,
        `resource_type="${emission.resourceType}"`
      ];

      output += `teei_carbon_co2e_grams{${labels.join(',')}} ${emission.co2eGrams}\n`;
    }

    output += '\n# HELP teei_carbon_energy_kwh Energy consumption in kWh\n';
    output += '# TYPE teei_carbon_energy_kwh gauge\n';

    for (const emission of this.emissions) {
      const labels = [
        `service="${emission.service}"`,
        `region="${emission.region}"`,
        `resource_type="${emission.resourceType}"`
      ];

      output += `teei_carbon_energy_kwh{${labels.join(',')}} ${emission.energyKWh}\n`;
    }

    output += '\n# HELP teei_carbon_intensity_gco2e_per_kwh Carbon intensity in gCO2e/kWh\n';
    output += '# TYPE teei_carbon_intensity_gco2e_per_kwh gauge\n';

    const regionIntensities = new Set<string>();
    for (const emission of this.emissions) {
      if (!regionIntensities.has(emission.region)) {
        output += `teei_carbon_intensity_gco2e_per_kwh{region="${emission.region}"} ${emission.carbonIntensity}\n`;
        regionIntensities.add(emission.region);
      }
    }

    return output;
  }

  /**
   * Get all emissions
   */
  getEmissions(): CarbonEmission[] {
    return this.emissions;
  }
}

/**
 * Singleton instance
 */
let estimatorInstance: CarbonEstimator | null = null;

export function getCarbonEstimator(): CarbonEstimator {
  if (!estimatorInstance) {
    estimatorInstance = new CarbonEstimator();
  }
  return estimatorInstance;
}
