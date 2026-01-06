import { Queue, QueueScheduler, Worker, Job } from 'bullmq';
import { createServiceLogger } from '@teei/shared-utils';
import { getDb } from '@teei/shared-schema';
import { sql } from 'drizzle-orm';
import { generateICS } from './ics-generator.js';
import { sendEmail } from '../providers/sendgrid.js';
import { renderBoardPackEmail } from '../templates/board-pack-email.js';
import { watermarkPDF } from '../lib/watermark.js';

const logger = createServiceLogger('notifications:board-pack-scheduler');

/**
 * Board pack schedule configuration
 */
export interface BoardPackSchedule {
  id: string;
  companyId: string;
  tenantId: string;
  name: string;
  description?: string;
  schedule: string; // cron expression
  timezone: string;
  recipients: string[]; // email addresses
  includeReports: string[]; // report types: 'quarterly', 'annual', 'investor', 'impact'
  includeICS: boolean;
  includeWatermark: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  enabled: boolean;
}

/**
 * Board pack job payload
 */
export interface BoardPackJob {
  scheduleId: string;
  companyId: string;
  tenantId: string;
  recipients: string[];
  includeReports: string[];
  includeICS: boolean;
  includeWatermark: boolean;
  executionTime: Date;
  timezone: string;
}

/**
 * Execution history record
 */
export interface ExecutionHistory {
  id: string;
  scheduleId: string;
  executionTime: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  errorMessage?: string;
  duration?: number; // milliseconds
  createdAt: Date;
}

/**
 * Board pack scheduler queue and worker
 */
let boardPackQueue: Queue<BoardPackJob> | null = null;
let boardPackWorker: Worker<BoardPackJob> | null = null;
let queueScheduler: QueueScheduler | null = null;

/**
 * Initialize board pack scheduler
 */
export function initializeBoardPackScheduler(): void {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const redisHost = new URL(redisUrl).hostname;
  const redisPort = parseInt(new URL(redisUrl).port || '6379');

  // Create queue scheduler for delayed jobs
  queueScheduler = new QueueScheduler('board-pack-scheduler', {
    connection: {
      host: redisHost,
      port: redisPort,
    },
  });

  // Create queue
  boardPackQueue = new Queue<BoardPackJob>('board-pack-scheduler', {
    connection: {
      host: redisHost,
      port: redisPort,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000, // 2s, 4s, 8s
      },
      removeOnComplete: 1000, // keep last 1000 completed jobs
      removeOnFail: 5000, // keep last 5000 failed jobs
    },
  });

  // Create worker
  boardPackWorker = new Worker<BoardPackJob>(
    'board-pack-scheduler',
    async (job: Job<BoardPackJob>) => {
      return await processBoardPackJob(job);
    },
    {
      connection: {
        host: redisHost,
        port: redisPort,
      },
      concurrency: 5, // process up to 5 jobs concurrently
    }
  );

  // Event listeners
  boardPackWorker.on('completed', (job: Job<BoardPackJob>) => {
    logger.info('Board pack job completed', {
      jobId: job.id,
      scheduleId: job.data.scheduleId,
      companyId: job.data.companyId,
    });
  });

  boardPackWorker.on('failed', (job: Job<BoardPackJob> | undefined, err: Error) => {
    logger.error('Board pack job failed', {
      jobId: job?.id,
      scheduleId: job?.data?.scheduleId,
      error: err.message,
    });
  });

  logger.info('Board pack scheduler initialized', {
    redisHost,
    redisPort,
  });
}

/**
 * Process board pack job
 */
async function processBoardPackJob(job: Job<BoardPackJob>): Promise<void> {
  const startTime = Date.now();
  const { scheduleId, companyId, tenantId, recipients, includeReports, includeICS, includeWatermark, timezone } = job.data;

  logger.info('Processing board pack job', {
    jobId: job.id,
    scheduleId,
    companyId,
    recipientCount: recipients.length,
  });

  const db = getDb();
  let deliveredCount = 0;
  let failedCount = 0;
  let errorMessage: string | undefined;

  try {
    // Update execution history to processing
    await db.execute(sql`
      UPDATE board_pack_execution_history
      SET status = 'processing'
      WHERE id = ${job.id}
    `);

    // Generate reports (mock for now - would call reporting service)
    const reports = await generateBoardPackReports(companyId, includeReports, includeWatermark);

    // Generate ICS invite if requested
    let icsAttachment: { content: string; filename: string; type: string } | undefined;
    if (includeICS) {
      const icsContent = generateICS({
        summary: `Board Pack Review - ${companyId}`,
        description: `Quarterly board pack review meeting`,
        start: new Date(job.data.executionTime),
        duration: 60, // 60 minutes
        location: 'Virtual',
        organizer: {
          name: 'Corporate Cockpit',
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@teei.io',
        },
        attendees: recipients.map(email => ({ email })),
      });

      icsAttachment = {
        content: Buffer.from(icsContent).toString('base64'),
        filename: 'board-pack-review.ics',
        type: 'text/calendar',
      };
    }

    // Send emails to recipients
    for (const recipient of recipients) {
      try {
        const emailHtml = renderBoardPackEmail({
          companyId,
          tenantId,
          reports,
          recipient,
          executionTime: job.data.executionTime,
          timezone,
        });

        const attachments = [
          ...reports.map(report => ({
            content: report.content,
            filename: report.filename,
            type: report.type,
          })),
        ];

        if (icsAttachment) {
          attachments.push(icsAttachment);
        }

        await sendEmail({
          to: recipient,
          subject: `Board Pack - ${new Date(job.data.executionTime).toLocaleDateString()}`,
          html: emailHtml,
          attachments,
          // Track opens/clicks
          trackingSettings: {
            clickTracking: { enable: true },
            openTracking: { enable: true },
          },
        });

        deliveredCount++;
        logger.info('Board pack email sent', { recipient, jobId: job.id });
      } catch (err: any) {
        failedCount++;
        logger.error('Failed to send board pack email', {
          recipient,
          error: err.message,
        });
      }
    }

    // Update execution history
    const duration = Date.now() - startTime;
    await db.execute(sql`
      UPDATE board_pack_execution_history
      SET
        status = 'completed',
        delivered_count = ${deliveredCount},
        failed_count = ${failedCount},
        duration = ${duration}
      WHERE id = ${job.id}
    `);

    logger.info('Board pack job completed successfully', {
      jobId: job.id,
      scheduleId,
      deliveredCount,
      failedCount,
      duration,
    });
  } catch (err: any) {
    errorMessage = err.message;
    const duration = Date.now() - startTime;

    // Update execution history
    await db.execute(sql`
      UPDATE board_pack_execution_history
      SET
        status = 'failed',
        error_message = ${errorMessage},
        delivered_count = ${deliveredCount},
        failed_count = ${failedCount},
        duration = ${duration}
      WHERE id = ${job.id}
    `);

    throw err;
  }
}

/**
 * Generate board pack reports
 */
async function generateBoardPackReports(
  companyId: string,
  reportTypes: string[],
  includeWatermark: boolean
): Promise<Array<{ content: string; filename: string; type: string }>> {
  const reports: Array<{ content: string; filename: string; type: string }> = [];

  // Mock implementation - would call reporting service API
  for (const reportType of reportTypes) {
    // Generate report PDF (mock)
    let pdfContent = Buffer.from(`Mock ${reportType} report for ${companyId}`).toString('base64');

    // Apply watermark if requested
    if (includeWatermark) {
      pdfContent = await watermarkPDF(pdfContent, {
        text: `Generated: ${new Date().toISOString()}`,
        position: 'bottom-right',
        opacity: 0.3,
      });
    }

    reports.push({
      content: pdfContent,
      filename: `${reportType}-report-${new Date().toISOString().split('T')[0]}.pdf`,
      type: 'application/pdf',
    });
  }

  return reports;
}

/**
 * Schedule a new board pack
 */
export async function scheduleBoardPack(schedule: BoardPackSchedule): Promise<string> {
  if (!boardPackQueue) {
    throw new Error('Board pack queue not initialized');
  }

  const db = getDb();

  // Save schedule to database
  const result = await db.execute(sql`
    INSERT INTO board_pack_schedules (
      id, company_id, tenant_id, name, description, schedule, timezone,
      recipients, include_reports, include_ics, include_watermark,
      created_by, enabled
    ) VALUES (
      ${schedule.id}, ${schedule.companyId}, ${schedule.tenantId},
      ${schedule.name}, ${schedule.description}, ${schedule.schedule},
      ${schedule.timezone}, ${JSON.stringify(schedule.recipients)},
      ${JSON.stringify(schedule.includeReports)}, ${schedule.includeICS},
      ${schedule.includeWatermark}, ${schedule.createdBy}, ${schedule.enabled}
    )
    RETURNING id
  `);

  // Add to queue with cron schedule
  await boardPackQueue.add(
    `board-pack-${schedule.id}`,
    {
      scheduleId: schedule.id,
      companyId: schedule.companyId,
      tenantId: schedule.tenantId,
      recipients: schedule.recipients,
      includeReports: schedule.includeReports,
      includeICS: schedule.includeICS,
      includeWatermark: schedule.includeWatermark,
      executionTime: new Date(),
      timezone: schedule.timezone,
    },
    {
      repeat: {
        pattern: schedule.schedule,
        tz: schedule.timezone,
      },
    }
  );

  logger.info('Board pack scheduled', {
    scheduleId: schedule.id,
    companyId: schedule.companyId,
    schedule: schedule.schedule,
  });

  return schedule.id;
}

/**
 * Get execution history for a schedule
 */
export async function getExecutionHistory(
  scheduleId: string,
  limit: number = 50
): Promise<ExecutionHistory[]> {
  const db = getDb();

  const result = await db.execute(sql`
    SELECT *
    FROM board_pack_execution_history
    WHERE schedule_id = ${scheduleId}
    ORDER BY execution_time DESC
    LIMIT ${limit}
  `);

  return result.rows as any;
}

/**
 * Cancel a scheduled board pack
 */
export async function cancelBoardPackSchedule(scheduleId: string): Promise<void> {
  if (!boardPackQueue) {
    throw new Error('Board pack queue not initialized');
  }

  const db = getDb();

  // Disable schedule in database
  await db.execute(sql`
    UPDATE board_pack_schedules
    SET enabled = false
    WHERE id = ${scheduleId}
  `);

  // Remove from queue
  const jobs = await boardPackQueue.getRepeatableJobs();
  const job = jobs.find(j => j.name === `board-pack-${scheduleId}`);
  if (job && job.key) {
    await boardPackQueue.removeRepeatableByKey(job.key);
  }

  logger.info('Board pack schedule cancelled', { scheduleId });
}

/**
 * Cleanup on shutdown
 */
export async function shutdownBoardPackScheduler(): Promise<void> {
  if (boardPackWorker) {
    await boardPackWorker.close();
  }
  if (queueScheduler) {
    await queueScheduler.close();
  }
  if (boardPackQueue) {
    await boardPackQueue.close();
  }
  logger.info('Board pack scheduler shut down');
}
