/**
 * VIS Batch Recalculation Job
 *
 * Scheduled job to recalculate all VIS scores with fresh decay calculations
 * and update percentile rankings.
 *
 * Recommended schedule: Nightly at 2 AM (low traffic period)
 *
 * @module batch-job
 */

import { Pool } from 'pg';
import { VISCalculator, VISConfig, DEFAULT_VIS_CONFIG } from './vis-calculator.js';
import cron from 'node-cron';

/**
 * Batch job configuration
 */
export interface BatchJobConfig {
  /** Database connection string */
  databaseUrl: string;
  /** VIS calculation configuration */
  visConfig?: VISConfig;
  /** Cron schedule (default: 2 AM daily) */
  cronSchedule?: string;
  /** Run immediately on start (default: false) */
  runOnStart?: boolean;
  /** Enable detailed logging (default: true) */
  verbose?: boolean;
}

/**
 * Batch job result
 */
export interface BatchJobResult {
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  usersProcessed: number;
  errors: string[];
}

/**
 * VIS Batch Job runner
 */
export class VISBatchJob {
  private pool: Pool;
  private calculator: VISCalculator;
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;
  private lastRun: BatchJobResult | null = null;

  constructor(private config: BatchJobConfig) {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
    });

    const visConfig = config.visConfig || DEFAULT_VIS_CONFIG;
    this.calculator = new VISCalculator(this.pool, visConfig);
  }

  /**
   * Run the batch recalculation job once
   */
  async runOnce(): Promise<BatchJobResult> {
    const startTime = new Date();
    const errors: string[] = [];
    let usersProcessed = 0;

    if (this.isRunning) {
      throw new Error('Batch job is already running');
    }

    this.isRunning = true;

    try {
      this.log('Starting VIS batch recalculation...');

      // Recalculate all VIS scores
      const result = await this.calculator.recalculateAll();
      usersProcessed = result.processed;

      this.log(`Processed ${usersProcessed} users in ${result.duration}ms`);

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const batchResult: BatchJobResult = {
        success: true,
        startTime,
        endTime,
        duration,
        usersProcessed,
        errors,
      };

      this.lastRun = batchResult;
      return batchResult;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      this.log(`Error during batch recalculation: ${errorMessage}`, 'error');

      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      const batchResult: BatchJobResult = {
        success: false,
        startTime,
        endTime,
        duration,
        usersProcessed,
        errors,
      };

      this.lastRun = batchResult;
      return batchResult;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the scheduled cron job
   */
  start(): void {
    if (this.cronJob) {
      throw new Error('Batch job is already scheduled');
    }

    const schedule = this.config.cronSchedule || '0 2 * * *'; // 2 AM daily

    this.log(`Scheduling VIS batch job with cron: ${schedule}`);

    this.cronJob = cron.schedule(schedule, async () => {
      try {
        await this.runOnce();
      } catch (error) {
        this.log(`Scheduled job failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      }
    });

    // Run immediately if configured
    if (this.config.runOnStart) {
      this.log('Running batch job immediately (runOnStart=true)');
      this.runOnce().catch((error) => {
        this.log(`Initial run failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
      });
    }

    this.log('VIS batch job started');
  }

  /**
   * Stop the scheduled cron job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.log('VIS batch job stopped');
    }
  }

  /**
   * Get the last batch job result
   */
  getLastRun(): BatchJobResult | null {
    return this.lastRun;
  }

  /**
   * Check if the job is currently running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Close database connections and stop job
   */
  async close(): Promise<void> {
    this.stop();
    await this.pool.end();
    this.log('VIS batch job closed');
  }

  /**
   * Log a message
   */
  private log(message: string, level: 'info' | 'error' = 'info'): void {
    if (this.config.verbose !== false) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] [VIS Batch Job] ${message}`;

      if (level === 'error') {
        console.error(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }
}

/**
 * Create and start a VIS batch job
 */
export function createBatchJob(config: BatchJobConfig): VISBatchJob {
  const job = new VISBatchJob(config);
  job.start();
  return job;
}

// Main entry point (if run directly)
if (import.meta.url === `file://${process.argv[1]}`) {
  const config: BatchJobConfig = {
    databaseUrl: process.env.DATABASE_URL || '',
    cronSchedule: process.env.VIS_CRON_SCHEDULE || '0 2 * * *', // 2 AM daily
    runOnStart: process.env.VIS_RUN_ON_START === 'true',
    verbose: process.env.VIS_VERBOSE !== 'false',
    visConfig: {
      lambda: parseFloat(process.env.VIS_LAMBDA || '0.01'),
      enableDecay: process.env.VIS_ENABLE_DECAY !== 'false',
    },
  };

  console.log('Starting VIS Batch Job...');
  console.log('Configuration:', {
    cronSchedule: config.cronSchedule,
    runOnStart: config.runOnStart,
    visLambda: config.visConfig?.lambda,
    visEnableDecay: config.visConfig?.enableDecay,
  });

  const job = createBatchJob(config);

  // Graceful shutdown
  const closeGracefully = async (signal: string) => {
    console.log(`Received signal ${signal}, closing gracefully`);
    await job.close();
    process.exit(0);
  };

  process.on('SIGINT', () => closeGracefully('SIGINT'));
  process.on('SIGTERM', () => closeGracefully('SIGTERM'));
}
