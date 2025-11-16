/**
 * DSAR Job Queue Manager
 *
 * BullMQ-based job queue with retry logic, DLQ, and SLA tracking
 */

import { Queue, Worker, QueueEvents, Job } from 'bullmq';
import { Redis } from 'ioredis';
import type { DsarJob, DsarRequestInput, JobPriority } from '../types/index.js';
import { DataRegion, SlaConfig } from '../types/index.js';
import { DsrStatus, DsrRequestType } from '@teei/compliance';
import { RegionalExecutor } from '../lib/regional-executor.js';
import pino from 'pino';

const logger = pino({ name: 'queue-manager' });

/**
 * Queue Manager
 */
export class DsarQueueManager {
  private queue: Queue;
  private worker: Worker;
  private queueEvents: QueueEvents;
  private regionalExecutor: RegionalExecutor;
  private slaConfig: SlaConfig;

  constructor(
    redis: Redis,
    regionalExecutor: RegionalExecutor,
    slaConfig: SlaConfig
  ) {
    this.regionalExecutor = regionalExecutor;
    this.slaConfig = slaConfig;

    // Create queue
    this.queue = new Queue('dsar-jobs', {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 86400 * 30, // Keep for 30 days
          count: 1000,
        },
        removeOnFail: false, // Keep failed jobs for investigation
      },
    });

    // Create worker
    this.worker = new Worker(
      'dsar-jobs',
      async (job: Job<DsarJob>) => {
        return await this.processJob(job);
      },
      {
        connection: redis,
        concurrency: 10,
        limiter: {
          max: 100,
          duration: 60000, // 100 jobs per minute
        },
      }
    );

    // Create queue events
    this.queueEvents = new QueueEvents('dsar-jobs', {
      connection: redis,
    });

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Add job to queue
   */
  async addJob(request: DsarRequestInput): Promise<string> {
    const region = request.region || DataRegion.EU;
    const priority = request.priority || 5;

    // Determine SLA based on request type
    const slaHours =
      request.requestType === DsrRequestType.ERASURE
        ? this.slaConfig.deleteSla
        : this.slaConfig.exportSla;

    const scheduledFor = new Date();
    if (request.requestType === DsrRequestType.ERASURE && !request.metadata?.immediate) {
      // Add grace period for deletions
      scheduledFor.setDate(scheduledFor.getDate() + 30);
    }

    const job = await this.queue.add(
      `dsar-${request.requestType.toLowerCase()}`,
      {
        id: crypto.randomUUID(),
        userId: request.userId,
        requestType: request.requestType,
        requestedBy: request.requestedBy,
        status: DsrStatus.PENDING,
        priority,
        region,
        createdAt: new Date(),
        scheduledFor,
        retryCount: 0,
        maxRetries: 3,
        metadata: request.metadata,
      } as DsarJob,
      {
        priority,
        delay: request.requestType === DsrRequestType.ERASURE ? 30 * 24 * 60 * 60 * 1000 : 0,
        jobId: crypto.randomUUID(),
      }
    );

    logger.info({ jobId: job.id, userId: request.userId, requestType: request.requestType }, 'Job added to queue');

    return job.id!;
  }

  /**
   * Process job
   */
  private async processJob(job: Job<DsarJob>): Promise<any> {
    const startTime = Date.now();
    logger.info({ jobId: job.id, data: job.data }, 'Processing job');

    try {
      // Update status to IN_PROGRESS
      await job.updateProgress(0);
      job.data.status = DsrStatus.IN_PROGRESS;
      job.data.startedAt = new Date();

      let result;

      // Execute based on request type
      switch (job.data.requestType) {
        case DsrRequestType.ACCESS:
        case DsrRequestType.PORTABILITY:
          await job.updateProgress(25);
          result = await this.regionalExecutor.executeExport(job.data);
          await job.updateProgress(100);
          break;

        case DsrRequestType.ERASURE:
          await job.updateProgress(25);
          result = await this.regionalExecutor.executeDelete(job.data);
          await job.updateProgress(100);
          break;

        default:
          throw new Error(`Unsupported request type: ${job.data.requestType}`);
      }

      // Update status to COMPLETED
      job.data.status = DsrStatus.COMPLETED;
      job.data.completedAt = new Date();
      job.data.result = result;

      // Check SLA
      const duration = Date.now() - startTime;
      const slaMs = this.getSlaMs(job.data.requestType);
      const slaCompliant = duration <= slaMs;

      logger.info(
        {
          jobId: job.id,
          userId: job.data.userId,
          duration,
          slaCompliant,
        },
        'Job completed'
      );

      return result;
    } catch (error) {
      logger.error({ jobId: job.id, error }, 'Job failed');

      job.data.status = DsrStatus.FAILED;
      job.data.failedAt = new Date();
      job.data.error = String(error);

      throw error;
    }
  }

  /**
   * Get SLA in milliseconds
   */
  private getSlaMs(requestType: DsrRequestType): number {
    const hours =
      requestType === DsrRequestType.ERASURE
        ? this.slaConfig.deleteSla
        : this.slaConfig.exportSla;

    return hours * 60 * 60 * 1000;
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      jobId: job.id,
      status: job.data.status,
      requestType: job.data.requestType,
      progress: typeof progress === 'number' ? progress : 0,
      createdAt: job.data.createdAt,
      startedAt: job.data.startedAt,
      completedAt: job.data.completedAt,
      failedAt: job.data.failedAt,
      error: job.data.error,
      result: job.data.result,
      state,
    };
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    await job.remove();
    logger.info({ jobId }, 'Job cancelled');
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
      this.queue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      logger.info({ jobId: job.id }, 'Job completed event');
    });

    this.worker.on('failed', (job, err) => {
      logger.error({ jobId: job?.id, error: err }, 'Job failed event');
    });

    this.worker.on('error', (err) => {
      logger.error({ error: err }, 'Worker error');
    });

    this.queueEvents.on('waiting', ({ jobId }) => {
      logger.debug({ jobId }, 'Job waiting');
    });

    this.queueEvents.on('active', ({ jobId }) => {
      logger.debug({ jobId }, 'Job active');
    });
  }

  /**
   * Close queue and worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    await this.queue.close();
    await this.queueEvents.close();
    logger.info('Queue manager closed');
  }
}

/**
 * Create queue manager
 */
export function createQueueManager(
  redis: Redis,
  regionalExecutor: RegionalExecutor,
  slaConfig?: SlaConfig
): DsarQueueManager {
  const defaultSlaConfig: SlaConfig = {
    exportSla: 24,
    deleteSla: 72,
    statusSla: 5,
    consentSla: 2,
  };

  return new DsarQueueManager(redis, regionalExecutor, slaConfig || defaultSlaConfig);
}
