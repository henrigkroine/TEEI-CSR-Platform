#!/usr/bin/env ts-node
/**
 * Carbon-Aware Scheduling Simulation
 *
 * Simulates 1 month of batch job scheduling comparing:
 * - Baseline: Random scheduling (no carbon optimization)
 * - Carbon-Aware: Intelligent scheduling based on grid carbon intensity
 *
 * Measures:
 * - Total CO2 emissions (gCO2e)
 * - Average job delay
 * - Carbon savings percentage
 * - GDPR residency compliance
 *
 * @module scripts/finops/carbon-aware-simulation
 * @author carbon-scheduler (Worker 1 Team 2 - GreenOps)
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * AWS Region enum
 */
enum AWSRegion {
  US_EAST_1 = 'us-east-1',
  US_WEST_2 = 'us-west-2',
  EU_CENTRAL_1 = 'eu-central-1',
}

/**
 * Workload classification
 */
enum WorkloadClass {
  URGENT = 'urgent',
  STANDARD = 'standard',
  DEFERRABLE = 'deferrable',
}

/**
 * Carbon intensity data point (hourly)
 */
interface CarbonIntensityPoint {
  timestamp: Date;
  region: AWSRegion;
  gCO2_per_kWh: number;
  renewablePercent: number;
}

/**
 * Batch job
 */
interface BatchJob {
  id: string;
  workloadClass: WorkloadClass;
  energyKWh: number; // Energy consumption per job
  createdAt: Date;
  tenantRegionRestriction?: AWSRegion[]; // GDPR restrictions
}

/**
 * Scheduling decision
 */
interface SchedulingDecision {
  job: BatchJob;
  scheduledAt: Date;
  region: AWSRegion;
  carbonIntensity: number;
  emissionsGCO2: number;
  delayMinutes: number;
  gdprCompliant: boolean;
}

/**
 * Simulation results
 */
interface SimulationResults {
  strategy: string;
  totalJobs: number;
  totalEmissionsGCO2e: number;
  totalEmissionsKgCO2e: number;
  averageDelayMinutes: number;
  maxDelayMinutes: number;
  gdprViolations: number;
  totalEnergyKWh: number;
  averageCarbonIntensity: number;
}

/**
 * Historical carbon intensity data (approximated from real grid data)
 */
class CarbonDataGenerator {
  /**
   * Generate hourly carbon intensity data for a region over 30 days
   */
  public static generateMonthlyData(region: AWSRegion): CarbonIntensityPoint[] {
    const data: CarbonIntensityPoint[] = [];
    const startDate = new Date('2025-10-01T00:00:00Z');
    const hoursInMonth = 30 * 24; // 30 days

    for (let hour = 0; hour < hoursInMonth; hour++) {
      const timestamp = new Date(startDate.getTime() + hour * 60 * 60 * 1000);
      const hourOfDay = timestamp.getUTCHours();

      // Generate realistic carbon intensity patterns
      let baseIntensity: number;
      let baseRenewable: number;

      switch (region) {
        case AWSRegion.US_EAST_1:
          // Virginia - coal/gas heavy, some solar midday
          baseIntensity = 450;
          baseRenewable = 12;
          // Solar peak 11am-3pm UTC
          if (hourOfDay >= 11 && hourOfDay <= 15) {
            baseIntensity -= 80; // Solar reduces carbon
            baseRenewable += 20;
          }
          // Night time - more coal
          if (hourOfDay >= 0 && hourOfDay <= 5) {
            baseIntensity += 50;
            baseRenewable -= 5;
          }
          break;

        case AWSRegion.US_WEST_2:
          // Oregon - high hydro, good solar/wind
          baseIntensity = 280;
          baseRenewable = 65;
          // Hydro peak in evening
          if (hourOfDay >= 18 && hourOfDay <= 22) {
            baseIntensity -= 60;
            baseRenewable += 15;
          }
          // Solar peak midday
          if (hourOfDay >= 11 && hourOfDay <= 15) {
            baseIntensity -= 40;
            baseRenewable += 10;
          }
          break;

        case AWSRegion.EU_CENTRAL_1:
          // Frankfurt - mixed, good renewables
          baseIntensity = 320;
          baseRenewable = 42;
          // Wind peak morning/evening
          if (hourOfDay >= 6 && hourOfDay <= 9) {
            baseIntensity -= 70;
            baseRenewable += 18;
          }
          if (hourOfDay >= 18 && hourOfDay <= 21) {
            baseIntensity -= 60;
            baseRenewable += 15;
          }
          // Solar peak midday
          if (hourOfDay >= 11 && hourOfDay <= 14) {
            baseIntensity -= 50;
            baseRenewable += 12;
          }
          break;

        default:
          baseIntensity = 400;
          baseRenewable = 20;
      }

      // Add some random variation (±10%)
      const variation = (Math.random() - 0.5) * 0.2;
      const gCO2_per_kWh = Math.max(50, baseIntensity * (1 + variation));
      const renewablePercent = Math.min(
        95,
        Math.max(5, baseRenewable * (1 + variation))
      );

      data.push({
        timestamp,
        region,
        gCO2_per_kWh: Math.round(gCO2_per_kWh * 100) / 100,
        renewablePercent: Math.round(renewablePercent * 100) / 100,
      });
    }

    return data;
  }

  /**
   * Get carbon intensity at a specific time and region
   */
  public static getIntensityAt(
    data: CarbonIntensityPoint[],
    timestamp: Date,
    region: AWSRegion
  ): CarbonIntensityPoint | null {
    return (
      data.find(
        (point) =>
          point.region === region &&
          Math.abs(point.timestamp.getTime() - timestamp.getTime()) < 60 * 60 * 1000
      ) || null
    );
  }
}

/**
 * Batch job generator
 */
class JobGenerator {
  /**
   * Generate 1000 batch jobs over 30 days
   */
  public static generateJobs(count: number): BatchJob[] {
    const jobs: BatchJob[] = [];
    const startDate = new Date('2025-10-01T00:00:00Z');
    const endDate = new Date('2025-10-31T00:00:00Z');
    const timeRange = endDate.getTime() - startDate.getTime();

    for (let i = 0; i < count; i++) {
      // Random timestamp within month
      const createdAt = new Date(startDate.getTime() + Math.random() * timeRange);

      // Workload class distribution: 10% urgent, 40% standard, 50% deferrable
      const rand = Math.random();
      let workloadClass: WorkloadClass;
      let energyKWh: number;

      if (rand < 0.1) {
        workloadClass = WorkloadClass.URGENT;
        energyKWh = 0.1; // Lightweight
      } else if (rand < 0.5) {
        workloadClass = WorkloadClass.STANDARD;
        energyKWh = 0.3; // Medium
      } else {
        workloadClass = WorkloadClass.DEFERRABLE;
        energyKWh = 0.5; // Heavy (ML/analytics)
      }

      // 30% of jobs have EU GDPR restrictions
      let tenantRegionRestriction: AWSRegion[] | undefined;
      if (Math.random() < 0.3) {
        tenantRegionRestriction = [AWSRegion.EU_CENTRAL_1];
      }

      jobs.push({
        id: `job-${i.toString().padStart(4, '0')}`,
        workloadClass,
        energyKWh,
        createdAt,
        tenantRegionRestriction,
      });
    }

    return jobs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
}

/**
 * Baseline scheduler - random region selection
 */
class BaselineScheduler {
  private carbonData: Map<AWSRegion, CarbonIntensityPoint[]>;

  constructor(carbonData: Map<AWSRegion, CarbonIntensityPoint[]>) {
    this.carbonData = carbonData;
  }

  /**
   * Schedule job immediately in a random compliant region
   */
  public schedule(job: BatchJob): SchedulingDecision {
    // Determine eligible regions
    let eligibleRegions: AWSRegion[];
    if (job.tenantRegionRestriction) {
      eligibleRegions = job.tenantRegionRestriction;
    } else {
      eligibleRegions = [
        AWSRegion.US_EAST_1,
        AWSRegion.US_WEST_2,
        AWSRegion.EU_CENTRAL_1,
      ];
    }

    // Pick random region
    const region = eligibleRegions[Math.floor(Math.random() * eligibleRegions.length)] as AWSRegion;

    // Schedule immediately
    const scheduledAt = job.createdAt;

    // Get carbon intensity at scheduled time
    const regionData = this.carbonData.get(region);
    if (!regionData) {
      throw new Error(`Carbon data not found for region ${region}`);
    }

    const intensityData = CarbonDataGenerator.getIntensityAt(
      regionData,
      scheduledAt,
      region
    );

    const carbonIntensity = intensityData?.gCO2_per_kWh || 400;
    const emissionsGCO2 = job.energyKWh * carbonIntensity;

    return {
      job,
      scheduledAt,
      region,
      carbonIntensity,
      emissionsGCO2,
      delayMinutes: 0,
      gdprCompliant: job.tenantRegionRestriction
        ? job.tenantRegionRestriction.includes(region)
        : true,
    };
  }
}

/**
 * Carbon-aware scheduler - optimizes for low carbon intensity
 */
class CarbonAwareScheduler {
  private carbonData: Map<AWSRegion, CarbonIntensityPoint[]>;

  constructor(carbonData: Map<AWSRegion, CarbonIntensityPoint[]>) {
    this.carbonData = carbonData;
  }

  /**
   * Schedule job in cleanest region within allowed delay window
   */
  public schedule(job: BatchJob): SchedulingDecision {
    // Determine max delay based on workload class
    let maxDelayMinutes: number;
    let carbonThreshold: number;

    switch (job.workloadClass) {
      case WorkloadClass.URGENT:
        maxDelayMinutes = 0;
        carbonThreshold = 999; // No threshold
        break;
      case WorkloadClass.STANDARD:
        maxDelayMinutes = 60;
        carbonThreshold = 400;
        break;
      case WorkloadClass.DEFERRABLE:
        maxDelayMinutes = 720; // 12 hours
        carbonThreshold = 250;
        break;
    }

    // Determine eligible regions
    let eligibleRegions: AWSRegion[];
    if (job.tenantRegionRestriction) {
      eligibleRegions = job.tenantRegionRestriction;
    } else {
      eligibleRegions = [
        AWSRegion.US_EAST_1,
        AWSRegion.US_WEST_2,
        AWSRegion.EU_CENTRAL_1,
      ];
    }

    // Find optimal scheduling window
    let bestSchedule: {
      time: Date;
      region: AWSRegion;
      intensity: number;
    } | null = null;

    const maxDelayMs = maxDelayMinutes * 60 * 1000;
    const searchWindowEnd = new Date(job.createdAt.getTime() + maxDelayMs);

    // Search all eligible regions and time slots
    for (const region of eligibleRegions) {
      const regionData = this.carbonData.get(region);
      if (!regionData) {
        continue;
      }

      for (const dataPoint of regionData) {
        if (
          dataPoint.timestamp >= job.createdAt &&
          dataPoint.timestamp <= searchWindowEnd
        ) {
          if (
            dataPoint.gCO2_per_kWh <= carbonThreshold &&
            (!bestSchedule || dataPoint.gCO2_per_kWh < bestSchedule.intensity)
          ) {
            bestSchedule = {
              time: dataPoint.timestamp,
              region: dataPoint.region,
              intensity: dataPoint.gCO2_per_kWh,
            };
          }
        }
      }
    }

    // If no clean window found, schedule immediately in cleanest eligible region
    if (!bestSchedule) {
      // Find cleanest region right now
      let cleanestRegion = eligibleRegions[0] as AWSRegion;
      let cleanestIntensity = 9999;

      for (const region of eligibleRegions) {
        const regionData = this.carbonData.get(region);
        if (!regionData) {
          continue;
        }

        const intensityData = CarbonDataGenerator.getIntensityAt(
          regionData,
          job.createdAt,
          region
        );
        if (intensityData && intensityData.gCO2_per_kWh < cleanestIntensity) {
          cleanestIntensity = intensityData.gCO2_per_kWh;
          cleanestRegion = region;
        }
      }

      bestSchedule = {
        time: job.createdAt,
        region: cleanestRegion,
        intensity: cleanestIntensity,
      };
    }

    const delayMinutes = Math.round(
      (bestSchedule.time.getTime() - job.createdAt.getTime()) / (60 * 1000)
    );

    const emissionsGCO2 = job.energyKWh * bestSchedule.intensity;

    return {
      job,
      scheduledAt: bestSchedule.time,
      region: bestSchedule.region,
      carbonIntensity: bestSchedule.intensity,
      emissionsGCO2,
      delayMinutes,
      gdprCompliant: job.tenantRegionRestriction
        ? job.tenantRegionRestriction.includes(bestSchedule.region)
        : true,
    };
  }
}

/**
 * Run simulation
 */
class Simulator {
  private carbonData: Map<AWSRegion, CarbonIntensityPoint[]>;
  private jobs: BatchJob[];

  constructor() {
    // Generate carbon intensity data for all regions
    this.carbonData = new Map();
    this.carbonData.set(
      AWSRegion.US_EAST_1,
      CarbonDataGenerator.generateMonthlyData(AWSRegion.US_EAST_1)
    );
    this.carbonData.set(
      AWSRegion.US_WEST_2,
      CarbonDataGenerator.generateMonthlyData(AWSRegion.US_WEST_2)
    );
    this.carbonData.set(
      AWSRegion.EU_CENTRAL_1,
      CarbonDataGenerator.generateMonthlyData(AWSRegion.EU_CENTRAL_1)
    );

    // Generate 1000 batch jobs
    this.jobs = JobGenerator.generateJobs(1000);
  }

  /**
   * Run baseline (random) scheduling simulation
   */
  public runBaseline(): SimulationResults {
    const scheduler = new BaselineScheduler(this.carbonData);
    const decisions: SchedulingDecision[] = this.jobs.map((job) =>
      scheduler.schedule(job)
    );

    return this.calculateResults('Baseline (Random Scheduling)', decisions);
  }

  /**
   * Run carbon-aware scheduling simulation
   */
  public runCarbonAware(): SimulationResults {
    const scheduler = new CarbonAwareScheduler(this.carbonData);
    const decisions: SchedulingDecision[] = this.jobs.map((job) =>
      scheduler.schedule(job)
    );

    return this.calculateResults('Carbon-Aware Scheduling', decisions);
  }

  /**
   * Calculate simulation results
   */
  private calculateResults(
    strategy: string,
    decisions: SchedulingDecision[]
  ): SimulationResults {
    const totalJobs = decisions.length;
    const totalEmissionsGCO2e = decisions.reduce(
      (sum, d) => sum + d.emissionsGCO2,
      0
    );
    const totalEmissionsKgCO2e = totalEmissionsGCO2e / 1000;
    const averageDelayMinutes =
      decisions.reduce((sum, d) => sum + d.delayMinutes, 0) / totalJobs;
    const maxDelayMinutes = Math.max(...decisions.map((d) => d.delayMinutes));
    const gdprViolations = decisions.filter((d) => !d.gdprCompliant).length;
    const totalEnergyKWh = decisions.reduce((sum, d) => sum + d.job.energyKWh, 0);
    const averageCarbonIntensity =
      decisions.reduce((sum, d) => sum + d.carbonIntensity, 0) / totalJobs;

    return {
      strategy,
      totalJobs,
      totalEmissionsGCO2e: Math.round(totalEmissionsGCO2e * 100) / 100,
      totalEmissionsKgCO2e: Math.round(totalEmissionsKgCO2e * 100) / 100,
      averageDelayMinutes: Math.round(averageDelayMinutes * 10) / 10,
      maxDelayMinutes,
      gdprViolations,
      totalEnergyKWh: Math.round(totalEnergyKWh * 100) / 100,
      averageCarbonIntensity: Math.round(averageCarbonIntensity * 100) / 100,
    };
  }

  /**
   * Print comparison report
   */
  public printComparison(baseline: SimulationResults, carbonAware: SimulationResults): void {
    const savingsGCO2 = baseline.totalEmissionsGCO2e - carbonAware.totalEmissionsGCO2e;
    const savingsPercent = (savingsGCO2 / baseline.totalEmissionsGCO2e) * 100;
    const savingsKg = savingsGCO2 / 1000;

    console.log('\n' + '='.repeat(80));
    console.log('CARBON-AWARE SCHEDULING SIMULATION - 30-DAY RESULTS');
    console.log('='.repeat(80));
    console.log();

    console.log('BASELINE (Random Scheduling):');
    console.log('-'.repeat(80));
    console.log(`  Total Jobs:               ${baseline.totalJobs.toLocaleString()}`);
    console.log(`  Total Energy:             ${baseline.totalEnergyKWh.toFixed(2)} kWh`);
    console.log(`  Total Emissions:          ${baseline.totalEmissionsKgCO2e.toFixed(2)} kg CO2e`);
    console.log(`  Avg Carbon Intensity:     ${baseline.averageCarbonIntensity.toFixed(2)} gCO2/kWh`);
    console.log(`  Average Delay:            ${baseline.averageDelayMinutes.toFixed(1)} minutes`);
    console.log(`  Max Delay:                ${baseline.maxDelayMinutes} minutes`);
    console.log(`  GDPR Violations:          ${baseline.gdprViolations}`);
    console.log();

    console.log('CARBON-AWARE (Optimized Scheduling):');
    console.log('-'.repeat(80));
    console.log(`  Total Jobs:               ${carbonAware.totalJobs.toLocaleString()}`);
    console.log(`  Total Energy:             ${carbonAware.totalEnergyKWh.toFixed(2)} kWh`);
    console.log(`  Total Emissions:          ${carbonAware.totalEmissionsKgCO2e.toFixed(2)} kg CO2e`);
    console.log(`  Avg Carbon Intensity:     ${carbonAware.averageCarbonIntensity.toFixed(2)} gCO2/kWh`);
    console.log(`  Average Delay:            ${carbonAware.averageDelayMinutes.toFixed(1)} minutes`);
    console.log(`  Max Delay:                ${carbonAware.maxDelayMinutes} minutes`);
    console.log(`  GDPR Violations:          ${carbonAware.gdprViolations}`);
    console.log();

    console.log('CARBON SAVINGS:');
    console.log('-'.repeat(80));
    console.log(`  Absolute Savings:         ${savingsKg.toFixed(2)} kg CO2e`);
    console.log(`  Percentage Reduction:     ${savingsPercent.toFixed(2)}%`);
    console.log(`  Avg Delay Trade-off:      +${carbonAware.averageDelayMinutes.toFixed(1)} minutes`);
    console.log();

    // Carbon equivalency
    const milesDriven = savingsKg * 2.48; // 1 kg CO2e ≈ 2.48 miles driven
    const treesNeeded = savingsKg / 21; // 1 tree absorbs ~21 kg CO2e/year

    console.log('CARBON EQUIVALENCY:');
    console.log('-'.repeat(80));
    console.log(`  Miles NOT driven:         ${milesDriven.toFixed(1)} miles`);
    console.log(`  Trees for 1 year:         ${treesNeeded.toFixed(2)} trees`);
    console.log();

    // Success criteria
    console.log('SUCCESS CRITERIA:');
    console.log('-'.repeat(80));
    console.log(`  ✅ Target: ≥10% CO2e reduction`);
    console.log(`  ${savingsPercent >= 10 ? '✅' : '❌'} Achieved: ${savingsPercent.toFixed(2)}%`);
    console.log(`  ${carbonAware.gdprViolations === 0 ? '✅' : '❌'} GDPR Compliance: ${carbonAware.gdprViolations === 0 ? 'PASS' : 'FAIL'}`);
    console.log();

    console.log('='.repeat(80));
    console.log();
  }

  /**
   * Export results to JSON file
   */
  public exportResults(
    baseline: SimulationResults,
    carbonAware: SimulationResults,
    outputPath: string
  ): void {
    const savingsGCO2 = baseline.totalEmissionsGCO2e - carbonAware.totalEmissionsGCO2e;
    const savingsPercent = (savingsGCO2 / baseline.totalEmissionsGCO2e) * 100;

    const report = {
      metadata: {
        simulationDate: new Date().toISOString(),
        periodStart: '2025-10-01T00:00:00Z',
        periodEnd: '2025-10-31T00:00:00Z',
        totalDays: 30,
        totalJobs: this.jobs.length,
      },
      baseline,
      carbonAware,
      comparison: {
        absoluteSavingsGCO2e: Math.round(savingsGCO2 * 100) / 100,
        absoluteSavingsKgCO2e: Math.round((savingsGCO2 / 1000) * 100) / 100,
        percentageReduction: Math.round(savingsPercent * 100) / 100,
        averageDelayIncreaseMinutes:
          Math.round(
            (carbonAware.averageDelayMinutes - baseline.averageDelayMinutes) * 10
          ) / 10,
        targetAchieved: savingsPercent >= 10,
        gdprCompliant: carbonAware.gdprViolations === 0,
      },
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`✅ Results exported to: ${outputPath}`);
  }
}

/**
 * Main execution
 */
function main() {
  console.log('Starting Carbon-Aware Scheduling Simulation...\n');

  const simulator = new Simulator();

  console.log('Running baseline simulation...');
  const baselineResults = simulator.runBaseline();

  console.log('Running carbon-aware simulation...');
  const carbonAwareResults = simulator.runCarbonAware();

  // Print comparison
  simulator.printComparison(baselineResults, carbonAwareResults);

  // Export results
  const outputDir = '/home/user/TEEI-CSR-Platform/reports/worker1_phaseJ';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'carbon_scheduling_simulation_results.json');
  simulator.exportResults(baselineResults, carbonAwareResults, outputPath);
}

// Run simulation if executed directly
if (require.main === module) {
  main();
}

export { Simulator, SimulationResults };
