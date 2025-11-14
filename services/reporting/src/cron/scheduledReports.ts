/**
 * Scheduled Reports Service
 *
 * Manages automated report generation using node-cron
 * Features:
 * - Cron-based scheduling
 * - Retry logic with exponential backoff
 * - Email delivery
 * - Execution tracking
 * - Error handling
 */

import cron from 'node-cron';
import { pool } from '../db/connection.js';
import { emailService } from '../utils/emailService.js';
import type {
  ReportSchedule,
  ScheduleExecution,
  ScheduleExecutionStatus,
  ScheduleExecutionResult,
} from '../types/schedules.js';
import type { Report } from '../types/reports.js';
import { MAX_RETRY_ATTEMPTS, getRetryDelay } from '../types/schedules.js';

interface CronTask {
  scheduleId: string;
  task: cron.ScheduledTask;
}

class ScheduledReportsService {
  private activeTasks: Map<string, CronTask> = new Map();
  private isInitialized = false;

  /**
   * Initialize the scheduling service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[ScheduledReports] Already initialized');
      return;
    }

    console.log('[ScheduledReports] Initializing scheduling service...');

    try {
      // Load all active schedules from database
      const schedules = await this.getActiveSchedules();
      console.log(`[ScheduledReports] Found ${schedules.length} active schedules`);

      // Register cron jobs for each schedule
      for (const schedule of schedules) {
        await this.registerSchedule(schedule);
      }

      this.isInitialized = true;
      console.log('[ScheduledReports] Initialization complete');
    } catch (error) {
      console.error('[ScheduledReports] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register a new schedule
   */
  async registerSchedule(schedule: ReportSchedule): Promise<void> {
    // Unregister existing task if present
    this.unregisterSchedule(schedule.id);

    try {
      // Validate cron expression
      if (!cron.validate(schedule.cron_expression)) {
        throw new Error(`Invalid cron expression: ${schedule.cron_expression}`);
      }

      // Create cron task
      const task = cron.schedule(
        schedule.cron_expression,
        async () => {
          await this.executeSchedule(schedule);
        },
        {
          timezone: schedule.timezone,
          scheduled: true,
        }
      );

      this.activeTasks.set(schedule.id, { scheduleId: schedule.id, task });

      // Update next run time
      await this.updateNextRunTime(schedule.id);

      console.log(
        `[ScheduledReports] Registered schedule: ${schedule.schedule_name} (${schedule.id})`
      );
    } catch (error) {
      console.error(`[ScheduledReports] Failed to register schedule ${schedule.id}:`, error);
      throw error;
    }
  }

  /**
   * Unregister a schedule
   */
  unregisterSchedule(scheduleId: string): void {
    const existing = this.activeTasks.get(scheduleId);
    if (existing) {
      existing.task.stop();
      this.activeTasks.delete(scheduleId);
      console.log(`[ScheduledReports] Unregistered schedule: ${scheduleId}`);
    }
  }

  /**
   * Execute a scheduled report
   */
  async executeSchedule(schedule: ReportSchedule): Promise<ScheduleExecutionResult> {
    const executionId = await this.createExecution(schedule.id);

    console.log(
      `[ScheduledReports] Executing schedule: ${schedule.schedule_name} (${schedule.id})`
    );

    try {
      // Update execution status
      await this.updateExecutionStatus(executionId, 'generating');

      // Generate the report
      const report = await this.generateReport(schedule);

      // Update execution with report ID
      await this.updateExecution(executionId, {
        report_id: report.id,
        status: 'generated',
      });

      // Send email with attachment if enabled
      if (schedule.include_attachment && report.file_url) {
        await this.updateExecutionStatus(executionId, 'emailing');

        const reportFile = await this.getReportFile(report);

        await emailService.sendScheduledReport(
          schedule.recipients,
          schedule.schedule_name,
          schedule.parameters.period,
          reportFile,
          schedule.format,
          schedule.email_subject,
          schedule.email_body
        );

        await this.updateExecution(executionId, {
          email_sent_at: new Date(),
          email_recipients: schedule.recipients,
        });
      }

      // Mark as completed
      await this.updateExecutionStatus(executionId, 'completed');

      // Update schedule's last run time
      await this.updateScheduleLastRun(schedule.id);

      console.log(
        `[ScheduledReports] Successfully executed schedule: ${schedule.schedule_name}`
      );

      return {
        success: true,
        execution_id: executionId,
        report_id: report.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error(`[ScheduledReports] Execution failed for ${schedule.id}:`, error);

      // Get current execution to check retry count
      const execution = await this.getExecution(executionId);

      if (execution.attempt_number < MAX_RETRY_ATTEMPTS) {
        // Schedule retry
        await this.scheduleRetry(schedule, execution, errorMessage, errorStack);
      } else {
        // Max retries exceeded - mark as failed and notify
        await this.updateExecution(executionId, {
          status: 'failed',
          error_message: errorMessage,
          error_stack: errorStack,
        });

        // Send failure notification
        try {
          await emailService.sendFailureNotification(
            schedule.recipients,
            schedule.schedule_name,
            errorMessage,
            execution.attempt_number
          );
        } catch (emailError) {
          console.error('[ScheduledReports] Failed to send failure notification:', emailError);
        }
      }

      return {
        success: false,
        execution_id: executionId,
        error: errorMessage,
      };
    }
  }

  /**
   * Schedule a retry with exponential backoff
   */
  private async scheduleRetry(
    schedule: ReportSchedule,
    execution: ScheduleExecution,
    errorMessage: string,
    errorStack?: string
  ): Promise<void> {
    const nextAttempt = execution.attempt_number + 1;
    const delay = getRetryDelay(nextAttempt);

    console.log(
      `[ScheduledReports] Scheduling retry ${nextAttempt} for ${schedule.id} in ${delay}ms`
    );

    await this.updateExecution(execution.id, {
      status: 'retrying',
      error_message: errorMessage,
      error_stack: errorStack,
    });

    // Schedule retry
    setTimeout(async () => {
      // Create new execution for retry
      const newExecutionId = await this.createExecution(schedule.id, nextAttempt);

      try {
        await this.executeSchedule(schedule);
      } catch (error) {
        console.error(`[ScheduledReports] Retry ${nextAttempt} failed:`, error);
      }
    }, delay);
  }

  /**
   * Generate report (mock implementation - replace with actual report generation)
   */
  private async generateReport(schedule: ReportSchedule): Promise<Report> {
    // This would integrate with your actual report generation logic
    // For now, create a mock report
    const reportId = `report-${schedule.company_id}-${Date.now()}`;

    const report: Report = {
      id: reportId,
      company_id: schedule.company_id,
      template_id: schedule.template_id,
      title: `${schedule.schedule_name} - ${new Date().toLocaleDateString()}`,
      status: 'ready',
      format: schedule.format,
      parameters: schedule.parameters,
      generated_at: new Date(),
      generated_by: 'scheduled-task',
      file_url: `/api/companies/${schedule.company_id}/reports/${reportId}/download`,
      file_size: 1024 * 512,
      created_at: new Date(),
      updated_at: new Date(),
    };

    // TODO: Call actual report generation service
    // const report = await reportGenerationService.generate({
    //   company_id: schedule.company_id,
    //   template_id: schedule.template_id,
    //   format: schedule.format,
    //   parameters: schedule.parameters,
    // });

    return report;
  }

  /**
   * Get report file content
   */
  private async getReportFile(report: Report): Promise<Buffer> {
    // TODO: Fetch actual report file from storage
    // For now, return mock data
    return Buffer.from(`Mock ${report.format.toUpperCase()} report content for ${report.title}`);
  }

  /**
   * Get active schedules from database
   */
  private async getActiveSchedules(): Promise<ReportSchedule[]> {
    const result = await pool.query<ReportSchedule>(
      `SELECT * FROM report_schedules WHERE is_active = true ORDER BY next_run_at ASC`
    );

    return result.rows.map((row) => ({
      ...row,
      recipients: row.recipients || [],
      parameters: row.parameters as any,
    }));
  }

  /**
   * Create new execution record
   */
  private async createExecution(
    scheduleId: string,
    attemptNumber: number = 1
  ): Promise<string> {
    const result = await pool.query<{ id: string }>(
      `INSERT INTO schedule_executions (
        schedule_id, status, attempt_number, started_at
      ) VALUES ($1, $2, $3, NOW()) RETURNING id`,
      [scheduleId, 'pending', attemptNumber]
    );

    return result.rows[0].id;
  }

  /**
   * Get execution by ID
   */
  private async getExecution(executionId: string): Promise<ScheduleExecution> {
    const result = await pool.query<ScheduleExecution>(
      `SELECT * FROM schedule_executions WHERE id = $1`,
      [executionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Execution not found: ${executionId}`);
    }

    return result.rows[0];
  }

  /**
   * Update execution status
   */
  private async updateExecutionStatus(
    executionId: string,
    status: ScheduleExecutionStatus
  ): Promise<void> {
    await pool.query(
      `UPDATE schedule_executions
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, executionId]
    );
  }

  /**
   * Update execution with additional data
   */
  private async updateExecution(
    executionId: string,
    updates: Partial<ScheduleExecution>
  ): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) return;

    fields.push('updated_at = NOW()');

    if (updates.status === 'completed' || updates.status === 'failed') {
      fields.push('completed_at = NOW()');
      fields.push(
        'duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER'
      );
    }

    values.push(executionId);

    await pool.query(
      `UPDATE schedule_executions SET ${fields.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  }

  /**
   * Update schedule's last run time
   */
  private async updateScheduleLastRun(scheduleId: string): Promise<void> {
    await pool.query(
      `UPDATE report_schedules
       SET last_run_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [scheduleId]
    );

    await this.updateNextRunTime(scheduleId);
  }

  /**
   * Calculate and update next run time
   */
  private async updateNextRunTime(scheduleId: string): Promise<void> {
    const result = await pool.query<ReportSchedule>(
      `SELECT cron_expression, timezone FROM report_schedules WHERE id = $1`,
      [scheduleId]
    );

    if (result.rows.length === 0) return;

    const schedule = result.rows[0];

    // Calculate next run using cron-parser or similar
    // For simplicity, we'll set it to 1 day from now
    // In production, use a proper cron parser
    const nextRun = new Date();
    nextRun.setDate(nextRun.getDate() + 1);

    await pool.query(
      `UPDATE report_schedules SET next_run_at = $1, updated_at = NOW() WHERE id = $2`,
      [nextRun, scheduleId]
    );
  }

  /**
   * Stop all scheduled tasks
   */
  shutdown(): void {
    console.log('[ScheduledReports] Shutting down...');

    for (const [scheduleId, cronTask] of this.activeTasks) {
      cronTask.task.stop();
      console.log(`[ScheduledReports] Stopped schedule: ${scheduleId}`);
    }

    this.activeTasks.clear();
    this.isInitialized = false;

    console.log('[ScheduledReports] Shutdown complete');
  }

  /**
   * Get status of all active schedules
   */
  getStatus(): {
    initialized: boolean;
    activeSchedules: number;
    schedules: Array<{ id: string; name: string }>;
  } {
    const schedules: Array<{ id: string; name: string }> = [];

    for (const [id, task] of this.activeTasks) {
      schedules.push({
        id,
        name: id,
      });
    }

    return {
      initialized: this.isInitialized,
      activeSchedules: this.activeTasks.size,
      schedules,
    };
  }
}

// Export singleton instance
export const scheduledReportsService = new ScheduledReportsService();
