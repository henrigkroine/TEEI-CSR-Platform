#!/usr/bin/env ts-node
/**
 * CO2e Calculator - Workload Emissions Calculator
 * Worker: Phase J GreenOps - carbon-coeff-modeler
 * Date: 2025-11-16
 *
 * Purpose:
 *   - Calculates carbon emissions for service workloads
 *   - Uses regional grid carbon intensity data
 *   - Stores results in workload_emissions table
 *
 * Usage:
 *   ts-node co2e-calculator.ts --service q2q-ai --region us-east-1 --requests 100000
 *   ts-node co2e-calculator.ts --report --period last-24h
 */

import { Pool, PoolClient } from 'pg';
import { parseArgs } from 'node:util';

// =============================================================================
// TYPES
// =============================================================================

interface ServiceEnergyProfile {
  name: string;
  wh_per_request: number;  // Watt-hours per request
  description: string;
  confidence: 'measured' | 'estimated' | 'industry_avg';
}

interface GridIntensity {
  region: string;
  timestamp: Date;
  gCO2_per_kWh: number;
  avg_gCO2_per_kWh: number;
  min_gCO2_per_kWh: number;
  max_gCO2_per_kWh: number;
}

interface EmissionCalculation {
  service_name: string;
  region: string;
  period_start: Date;
  period_end: Date;
  request_count: number;
  total_kWh: number;
  avg_kWh_per_request: number;
  total_gCO2e: number;
  gCO2e_per_1k_requests: number;
  avg_grid_gCO2_per_kWh: number;
  min_grid_gCO2_per_kWh: number;
  max_grid_gCO2_per_kWh: number;
  calculation_method: string;
  assumptions: Record<string, any>;
}

// =============================================================================
// SERVICE ENERGY PROFILES
// =============================================================================

const SERVICE_PROFILES: Record<string, ServiceEnergyProfile> = {
  'q2q-ai': {
    name: 'Q2Q-AI (LLM Inference)',
    wh_per_request: 0.5,  // 500 milliwatt-hours per request
    description: 'LLM inference workload with GPT-4 or similar model',
    confidence: 'estimated'
  },
  'reporting': {
    name: 'Reporting Service',
    wh_per_request: 0.1,  // 100 milliwatt-hours per request
    description: 'Data aggregation and report generation',
    confidence: 'estimated'
  },
  'api-gateway': {
    name: 'API Gateway',
    wh_per_request: 0.01,  // 10 milliwatt-hours per request
    description: 'Lightweight request routing and authentication',
    confidence: 'estimated'
  },
  'data-sync': {
    name: 'Data Synchronization',
    wh_per_request: 0.05,  // 50 milliwatt-hours per request
    description: 'Database sync operations',
    confidence: 'estimated'
  },
  'notification': {
    name: 'Notification Service',
    wh_per_request: 0.02,  // 20 milliwatt-hours per request
    description: 'Email/SMS notification delivery',
    confidence: 'estimated'
  }
};

// =============================================================================
// DATABASE CONFIGURATION
// =============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function log(message: string): void {
  console.log(`[CO2e-Calculator] ${new Date().toISOString()} - ${message}`);
}

function error(message: string): void {
  console.error(`[CO2e-Calculator] ${new Date().toISOString()} - ERROR: ${message}`);
}

// =============================================================================
// DATABASE QUERIES
// =============================================================================

async function getGridIntensity(
  client: PoolClient,
  region: string,
  periodStart: Date,
  periodEnd: Date
): Promise<GridIntensity | null> {
  const query = `
    SELECT
      region,
      AVG(gCO2_per_kWh) as avg_gCO2_per_kWh,
      MIN(gCO2_per_kWh) as min_gCO2_per_kWh,
      MAX(gCO2_per_kWh) as max_gCO2_per_kWh,
      MAX(timestamp) as timestamp
    FROM co2e_emissions
    WHERE region = $1
      AND timestamp >= $2
      AND timestamp <= $3
    GROUP BY region
  `;

  const result = await client.query(query, [region, periodStart, periodEnd]);

  if (result.rows.length === 0) {
    error(`No grid intensity data found for region ${region} in specified period`);
    return null;
  }

  return {
    region: result.rows[0].region,
    timestamp: result.rows[0].timestamp,
    gCO2_per_kWh: parseFloat(result.rows[0].avg_gCO2_per_kWh),
    avg_gCO2_per_kWh: parseFloat(result.rows[0].avg_gCO2_per_kWh),
    min_gCO2_per_kWh: parseFloat(result.rows[0].min_gCO2_per_kWh),
    max_gCO2_per_kWh: parseFloat(result.rows[0].max_gCO2_per_kWh),
  };
}

async function insertWorkloadEmissions(
  client: PoolClient,
  calculation: EmissionCalculation
): Promise<void> {
  const query = `
    INSERT INTO workload_emissions (
      service_name,
      region,
      period_start,
      period_end,
      request_count,
      total_kWh,
      avg_kWh_per_request,
      total_gCO2e,
      gCO2e_per_1k_requests,
      avg_grid_gCO2_per_kWh,
      min_grid_gCO2_per_kWh,
      max_grid_gCO2_per_kWh,
      calculation_method,
      assumptions,
      metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
      jsonb_build_object('calculated_at', NOW())
    )
    ON CONFLICT (service_name, region, period_start, period_end)
    DO UPDATE SET
      request_count = EXCLUDED.request_count,
      total_kWh = EXCLUDED.total_kWh,
      avg_kWh_per_request = EXCLUDED.avg_kWh_per_request,
      total_gCO2e = EXCLUDED.total_gCO2e,
      gCO2e_per_1k_requests = EXCLUDED.gCO2e_per_1k_requests,
      avg_grid_gCO2_per_kWh = EXCLUDED.avg_grid_gCO2_per_kWh,
      min_grid_gCO2_per_kWh = EXCLUDED.min_grid_gCO2_per_kWh,
      max_grid_gCO2_per_kWh = EXCLUDED.max_grid_gCO2_per_kWh,
      calculation_method = EXCLUDED.calculation_method,
      assumptions = EXCLUDED.assumptions,
      updated_at = NOW()
  `;

  await client.query(query, [
    calculation.service_name,
    calculation.region,
    calculation.period_start,
    calculation.period_end,
    calculation.request_count,
    calculation.total_kWh,
    calculation.avg_kWh_per_request,
    calculation.total_gCO2e,
    calculation.gCO2e_per_1k_requests,
    calculation.avg_grid_gCO2_per_kWh,
    calculation.min_grid_gCO2_per_kWh,
    calculation.max_grid_gCO2_per_kWh,
    calculation.calculation_method,
    JSON.stringify(calculation.assumptions),
  ]);
}

// =============================================================================
// CALCULATION LOGIC
// =============================================================================

async function calculateEmissions(
  service: string,
  region: string,
  requestCount: number,
  periodStart?: Date,
  periodEnd?: Date
): Promise<EmissionCalculation | null> {
  const client = await pool.connect();

  try {
    // Validate service profile exists
    const profile = SERVICE_PROFILES[service];
    if (!profile) {
      error(`Unknown service: ${service}`);
      error(`Available services: ${Object.keys(SERVICE_PROFILES).join(', ')}`);
      return null;
    }

    // Default to last hour if no period specified
    const end = periodEnd || new Date();
    const start = periodStart || new Date(end.getTime() - 60 * 60 * 1000);

    log(`Calculating emissions for ${service} in ${region}`);
    log(`Period: ${start.toISOString()} to ${end.toISOString()}`);
    log(`Request count: ${requestCount.toLocaleString()}`);

    // Get grid intensity for the period
    const gridIntensity = await getGridIntensity(client, region, start, end);
    if (!gridIntensity) {
      error('Cannot calculate emissions without grid intensity data');
      return null;
    }

    log(`Average grid intensity: ${gridIntensity.avg_gCO2_per_kWh.toFixed(2)} gCO2/kWh`);

    // Calculate energy consumption
    // Formula: requests × Wh_per_request = total Wh → convert to kWh
    const total_Wh = requestCount * profile.wh_per_request;
    const total_kWh = total_Wh / 1000;  // Convert Wh to kWh
    const avg_kWh_per_request = total_kWh / requestCount;

    log(`Total energy: ${total_kWh.toFixed(6)} kWh`);

    // Calculate emissions
    // Formula: kWh × gCO2/kWh = gCO2e
    const total_gCO2e = total_kWh * gridIntensity.avg_gCO2_per_kWh;
    const gCO2e_per_1k_requests = (total_gCO2e / requestCount) * 1000;

    log(`Total emissions: ${total_gCO2e.toFixed(4)} gCO2e`);
    log(`Emissions per 1k requests: ${gCO2e_per_1k_requests.toFixed(4)} gCO2e`);

    // Build calculation result
    const calculation: EmissionCalculation = {
      service_name: service,
      region,
      period_start: start,
      period_end: end,
      request_count: requestCount,
      total_kWh,
      avg_kWh_per_request,
      total_gCO2e,
      gCO2e_per_1k_requests,
      avg_grid_gCO2_per_kWh: gridIntensity.avg_gCO2_per_kWh,
      min_grid_gCO2_per_kWh: gridIntensity.min_gCO2_per_kWh,
      max_grid_gCO2_per_kWh: gridIntensity.max_gCO2_per_kWh,
      calculation_method: 'direct',
      assumptions: {
        wh_per_request: profile.wh_per_request,
        service_profile: profile.name,
        confidence: profile.confidence,
        description: profile.description,
      },
    };

    // Store in database
    await insertWorkloadEmissions(client, calculation);
    log('✓ Emissions calculation stored in database');

    return calculation;
  } finally {
    client.release();
  }
}

// =============================================================================
// REPORTING FUNCTIONS
// =============================================================================

async function generateReport(period: string): Promise<void> {
  const client = await pool.connect();

  try {
    let periodStart: Date;
    let periodEnd = new Date();

    switch (period) {
      case 'last-24h':
        periodStart = new Date(periodEnd.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'last-7d':
        periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last-30d':
        periodStart = new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        error(`Unknown period: ${period}`);
        return;
    }

    log('========================================');
    log(`Emissions Report: ${period}`);
    log('========================================');
    log(`Period: ${periodStart.toISOString()} to ${periodEnd.toISOString()}`);
    log('');

    // Query emissions by service
    const query = `
      SELECT
        service_name,
        region,
        SUM(request_count) as total_requests,
        SUM(total_kWh) as total_kWh,
        SUM(total_gCO2e) as total_gCO2e,
        AVG(gCO2e_per_1k_requests) as avg_gCO2e_per_1k,
        AVG(avg_grid_gCO2_per_kWh) as avg_grid_intensity
      FROM workload_emissions
      WHERE period_start >= $1
        AND period_end <= $2
      GROUP BY service_name, region
      ORDER BY total_gCO2e DESC
    `;

    const result = await client.query(query, [periodStart, periodEnd]);

    if (result.rows.length === 0) {
      log('No emissions data found for this period');
      return;
    }

    // Print table header
    console.log('');
    console.log('Service           Region          Requests      Energy (kWh)  Emissions (gCO2e)  gCO2e/1k req');
    console.log('─'.repeat(100));

    let totalRequests = 0;
    let totalKWh = 0;
    let totalCO2e = 0;

    for (const row of result.rows) {
      const requests = parseInt(row.total_requests);
      const kWh = parseFloat(row.total_kWh);
      const gCO2e = parseFloat(row.total_gCO2e);
      const per1k = parseFloat(row.avg_gCO2e_per_1k);

      totalRequests += requests;
      totalKWh += kWh;
      totalCO2e += gCO2e;

      console.log(
        `${row.service_name.padEnd(17)} ${row.region.padEnd(15)} ${requests.toLocaleString().padStart(12)} ${kWh.toFixed(3).padStart(13)} ${gCO2e.toFixed(2).padStart(17)} ${per1k.toFixed(4).padStart(12)}`
      );
    }

    console.log('─'.repeat(100));
    console.log(
      `${'TOTAL'.padEnd(17)} ${' '.padEnd(15)} ${totalRequests.toLocaleString().padStart(12)} ${totalKWh.toFixed(3).padStart(13)} ${totalCO2e.toFixed(2).padStart(17)}`
    );
    console.log('');

    // Carbon equivalent conversions
    const kg_CO2e = totalCO2e / 1000;
    const miles_driven = (kg_CO2e / 0.404);  // kg CO2e per mile driven (average car)
    const trees_absorbed = kg_CO2e / 21;  // kg CO2e absorbed by one tree per year

    log('Carbon Equivalent:');
    log(`  ${kg_CO2e.toFixed(2)} kg CO2e`);
    log(`  ≈ ${miles_driven.toFixed(0)} miles driven by average car`);
    log(`  ≈ ${trees_absorbed.toFixed(1)} trees needed to absorb (1 year)`);
    log('');

  } finally {
    client.release();
  }
}

// =============================================================================
// CLI INTERFACE
// =============================================================================

async function main() {
  const { values } = parseArgs({
    options: {
      service: { type: 'string' },
      region: { type: 'string' },
      requests: { type: 'string' },
      report: { type: 'boolean', default: false },
      period: { type: 'string', default: 'last-24h' },
      list: { type: 'boolean', default: false },
    },
  });

  try {
    // List available services
    if (values.list) {
      console.log('Available services:');
      console.log('');
      for (const [key, profile] of Object.entries(SERVICE_PROFILES)) {
        console.log(`  ${key.padEnd(15)} - ${profile.name}`);
        console.log(`    ${''.padEnd(15)}   ${profile.wh_per_request} Wh/request (${profile.confidence})`);
        console.log(`    ${''.padEnd(15)}   ${profile.description}`);
        console.log('');
      }
      return;
    }

    // Generate report
    if (values.report) {
      await generateReport(values.period as string);
      return;
    }

    // Calculate emissions for specific workload
    if (!values.service || !values.region || !values.requests) {
      error('Missing required arguments: --service, --region, --requests');
      console.log('');
      console.log('Usage:');
      console.log('  Calculate:  ts-node co2e-calculator.ts --service q2q-ai --region us-east-1 --requests 100000');
      console.log('  Report:     ts-node co2e-calculator.ts --report --period last-24h');
      console.log('  List:       ts-node co2e-calculator.ts --list');
      console.log('');
      console.log('Periods: last-24h, last-7d, last-30d');
      process.exit(1);
    }

    const requestCount = parseInt(values.requests as string);
    if (isNaN(requestCount) || requestCount <= 0) {
      error('Invalid request count');
      process.exit(1);
    }

    const result = await calculateEmissions(
      values.service as string,
      values.region as string,
      requestCount
    );

    if (!result) {
      process.exit(1);
    }

    console.log('');
    console.log('========================================');
    console.log('Calculation Summary');
    console.log('========================================');
    console.log(`Service:          ${result.service_name}`);
    console.log(`Region:           ${result.region}`);
    console.log(`Requests:         ${result.request_count.toLocaleString()}`);
    console.log(`Total Energy:     ${result.total_kWh.toFixed(6)} kWh`);
    console.log(`Total Emissions:  ${result.total_gCO2e.toFixed(4)} gCO2e`);
    console.log(`Per 1k Requests:  ${result.gCO2e_per_1k_requests.toFixed(4)} gCO2e`);
    console.log(`Grid Intensity:   ${result.avg_grid_gCO2_per_kWh.toFixed(2)} gCO2/kWh (avg)`);
    console.log('');

  } catch (err) {
    error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((err) => {
    error(`Unhandled error: ${err}`);
    process.exit(1);
  });
}

// Export for use as module
export {
  calculateEmissions,
  generateReport,
  SERVICE_PROFILES,
  type EmissionCalculation,
  type GridIntensity,
  type ServiceEnergyProfile,
};
