/**
 * Schedules Controller
 *
 * Handles CRUD operations for report schedules
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { pool } from '../db/connection.js';
import { scheduledReportsService } from '../cron/scheduledReports.js';
import { emailService } from '../utils/emailService.js';
import type {
  ReportSchedule,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ScheduleExecution,
  ScheduleOverview,
} from '../types/schedules.js';
import { MAX_SCHEDULES_PER_COMPANY } from '../types/schedules.js';
import cron from 'node-cron';

/**
 * List schedules for a company
 *
 * GET /companies/:id/schedules
 */
export async function listSchedules(
  request: FastifyRequest<{
    Params: { id: string };
    Querystring: { active?: boolean };
  }>,
  reply: FastifyReply
) {
  const { id: companyId } = request.params;
  const { active } = request.query;

  try {
    let query = `
      SELECT
        s.*,
        COUNT(e.id) as total_executions,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as successful_executions,
        COUNT(CASE WHEN e.status = 'failed' THEN 1 END) as failed_executions,
        MAX(e.created_at) as last_execution_at,
        AVG(e.duration_seconds) as avg_duration_seconds
      FROM report_schedules s
      LEFT JOIN schedule_executions e ON s.id = e.schedule_id
      WHERE s.company_id = $1
    `;

    const params: any[] = [companyId];

    if (active !== undefined) {
      query += ` AND s.is_active = $2`;
      params.push(active);
    }

    query += ` GROUP BY s.id ORDER BY s.created_at DESC`;

    const result = await pool.query<ScheduleOverview>(query, params);

    return reply.send({
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'SCHEDULES_FETCH_FAILED',
      message: 'Failed to fetch schedules',
    });
  }
}

/**
 * Get schedule by ID
 *
 * GET /companies/:id/schedules/:scheduleId
 */
export async function getSchedule(
  request: FastifyRequest<{
    Params: { id: string; scheduleId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, scheduleId } = request.params;

  try {
    const result = await pool.query<ScheduleOverview>(
      `
      SELECT
        s.*,
        COUNT(e.id) as total_executions,
        COUNT(CASE WHEN e.status = 'completed' THEN 1 END) as successful_executions,
        COUNT(CASE WHEN e.status = 'failed' THEN 1 END) as failed_executions,
        MAX(e.created_at) as last_execution_at,
        AVG(e.duration_seconds) as avg_duration_seconds
      FROM report_schedules s
      LEFT JOIN schedule_executions e ON s.id = e.schedule_id
      WHERE s.id = $1 AND s.company_id = $2
      GROUP BY s.id
    `,
      [scheduleId, companyId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found',
      });
    }

    return reply.send(result.rows[0]);
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'SCHEDULE_FETCH_FAILED',
      message: 'Failed to fetch schedule',
    });
  }
}

/**
 * Create new schedule
 *
 * POST /companies/:id/schedules
 */
export async function createSchedule(
  request: FastifyRequest<{
    Params: { id: string };
    Body: CreateScheduleRequest;
  }>,
  reply: FastifyReply
) {
  const { id: companyId } = request.params;
  const body = request.body;

  try {
    // Check schedule limit
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM report_schedules WHERE company_id = $1`,
      [companyId]
    );

    if (parseInt(countResult.rows[0].count) >= MAX_SCHEDULES_PER_COMPANY) {
      return reply.status(400).send({
        error: 'SCHEDULE_LIMIT_REACHED',
        message: `Maximum ${MAX_SCHEDULES_PER_COMPANY} schedules per company`,
      });
    }

    // Validate cron expression
    if (!cron.validate(body.cron_expression)) {
      return reply.status(400).send({
        error: 'INVALID_CRON_EXPRESSION',
        message: 'Invalid cron expression',
      });
    }

    // Validate recipients
    if (!body.recipients || body.recipients.length === 0) {
      return reply.status(400).send({
        error: 'INVALID_RECIPIENTS',
        message: 'At least one recipient email is required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = body.recipients.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return reply.status(400).send({
        error: 'INVALID_EMAIL_FORMAT',
        message: `Invalid email addresses: ${invalidEmails.join(', ')}`,
      });
    }

    // Calculate next run time (simplified - use proper cron parser in production)
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 1);

    // Insert schedule
    const result = await pool.query<ReportSchedule>(
      `INSERT INTO report_schedules (
        company_id, template_id, schedule_name, description,
        cron_expression, timezone, format, parameters,
        recipients, email_subject, email_body, include_attachment,
        is_active, next_run_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        companyId,
        body.template_id,
        body.schedule_name,
        body.description || null,
        body.cron_expression,
        body.timezone || 'UTC',
        body.format,
        JSON.stringify(body.parameters),
        body.recipients,
        body.email_subject,
        body.email_body || null,
        body.include_attachment !== false,
        body.is_active !== false,
        nextRun,
        'user-id-placeholder', // TODO: Get from auth
      ]
    );

    const schedule = result.rows[0];

    // Register with cron service
    if (schedule.is_active) {
      await scheduledReportsService.registerSchedule(schedule);
    }

    // Send confirmation email
    try {
      await emailService.sendScheduleConfirmation(
        schedule.recipients,
        schedule.schedule_name,
        schedule.cron_expression,
        schedule.next_run_at!
      );
    } catch (emailError) {
      request.log.error('Failed to send confirmation email:', emailError);
      // Don't fail the request if email fails
    }

    return reply.status(201).send({
      schedule_id: schedule.id,
      message: 'Schedule created successfully',
      next_run_at: schedule.next_run_at,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'SCHEDULE_CREATE_FAILED',
      message: 'Failed to create schedule',
    });
  }
}

/**
 * Update schedule
 *
 * PUT /companies/:id/schedules/:scheduleId
 */
export async function updateSchedule(
  request: FastifyRequest<{
    Params: { id: string; scheduleId: string };
    Body: UpdateScheduleRequest;
  }>,
  reply: FastifyReply
) {
  const { id: companyId, scheduleId } = request.params;
  const body = request.body;

  try {
    // Verify schedule exists and belongs to company
    const checkResult = await pool.query<ReportSchedule>(
      `SELECT * FROM report_schedules WHERE id = $1 AND company_id = $2`,
      [scheduleId, companyId]
    );

    if (checkResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found',
      });
    }

    // Validate cron expression if provided
    if (body.cron_expression && !cron.validate(body.cron_expression)) {
      return reply.status(400).send({
        error: 'INVALID_CRON_EXPRESSION',
        message: 'Invalid cron expression',
      });
    }

    // Validate recipients if provided
    if (body.recipients) {
      if (body.recipients.length === 0) {
        return reply.status(400).send({
          error: 'INVALID_RECIPIENTS',
          message: 'At least one recipient email is required',
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = body.recipients.filter((email) => !emailRegex.test(email));
      if (invalidEmails.length > 0) {
        return reply.status(400).send({
          error: 'INVALID_EMAIL_FORMAT',
          message: `Invalid email addresses: ${invalidEmails.join(', ')}`,
        });
      }
    }

    // Build update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    const updateMap: Record<string, any> = {
      schedule_name: body.schedule_name,
      description: body.description,
      cron_expression: body.cron_expression,
      timezone: body.timezone,
      format: body.format,
      parameters: body.parameters ? JSON.stringify(body.parameters) : undefined,
      recipients: body.recipients,
      email_subject: body.email_subject,
      email_body: body.email_body,
      include_attachment: body.include_attachment,
      is_active: body.is_active,
    };

    Object.entries(updateMap).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      return reply.status(400).send({
        error: 'NO_UPDATES',
        message: 'No fields to update',
      });
    }

    fields.push('updated_at = NOW()');
    values.push(scheduleId, companyId);

    // Update database
    const result = await pool.query<ReportSchedule>(
      `UPDATE report_schedules
       SET ${fields.join(', ')}
       WHERE id = $${paramCount} AND company_id = $${paramCount + 1}
       RETURNING *`,
      values
    );

    const updatedSchedule = result.rows[0];

    // Re-register with cron service
    scheduledReportsService.unregisterSchedule(scheduleId);
    if (updatedSchedule.is_active) {
      await scheduledReportsService.registerSchedule(updatedSchedule);
    }

    return reply.send({
      message: 'Schedule updated successfully',
      schedule: updatedSchedule,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'SCHEDULE_UPDATE_FAILED',
      message: 'Failed to update schedule',
    });
  }
}

/**
 * Delete schedule
 *
 * DELETE /companies/:id/schedules/:scheduleId
 */
export async function deleteSchedule(
  request: FastifyRequest<{
    Params: { id: string; scheduleId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, scheduleId } = request.params;

  try {
    // Verify schedule exists
    const checkResult = await pool.query(
      `SELECT id FROM report_schedules WHERE id = $1 AND company_id = $2`,
      [scheduleId, companyId]
    );

    if (checkResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found',
      });
    }

    // Unregister from cron service
    scheduledReportsService.unregisterSchedule(scheduleId);

    // Delete from database (cascade will delete executions)
    await pool.query(`DELETE FROM report_schedules WHERE id = $1`, [scheduleId]);

    return reply.send({
      success: true,
      message: 'Schedule deleted successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'SCHEDULE_DELETE_FAILED',
      message: 'Failed to delete schedule',
    });
  }
}

/**
 * Get execution history for a schedule
 *
 * GET /companies/:id/schedules/:scheduleId/executions
 */
export async function getExecutionHistory(
  request: FastifyRequest<{
    Params: { id: string; scheduleId: string };
    Querystring: { limit?: number; offset?: number };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, scheduleId } = request.params;
  const { limit = 50, offset = 0 } = request.query;

  try {
    // Verify schedule belongs to company
    const checkResult = await pool.query(
      `SELECT id FROM report_schedules WHERE id = $1 AND company_id = $2`,
      [scheduleId, companyId]
    );

    if (checkResult.rows.length === 0) {
      return reply.status(404).send({
        error: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found',
      });
    }

    // Get executions
    const result = await pool.query<ScheduleExecution>(
      `SELECT * FROM schedule_executions
       WHERE schedule_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [scheduleId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM schedule_executions WHERE schedule_id = $1`,
      [scheduleId]
    );

    return reply.send({
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
        has_more: offset + limit < parseInt(countResult.rows[0].count),
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'EXECUTIONS_FETCH_FAILED',
      message: 'Failed to fetch execution history',
    });
  }
}

/**
 * Trigger manual execution of a schedule
 *
 * POST /companies/:id/schedules/:scheduleId/execute
 */
export async function triggerExecution(
  request: FastifyRequest<{
    Params: { id: string; scheduleId: string };
  }>,
  reply: FastifyReply
) {
  const { id: companyId, scheduleId } = request.params;

  try {
    // Get schedule
    const result = await pool.query<ReportSchedule>(
      `SELECT * FROM report_schedules WHERE id = $1 AND company_id = $2`,
      [scheduleId, companyId]
    );

    if (result.rows.length === 0) {
      return reply.status(404).send({
        error: 'SCHEDULE_NOT_FOUND',
        message: 'Schedule not found',
      });
    }

    const schedule = result.rows[0];

    // Execute asynchronously
    scheduledReportsService.executeSchedule(schedule).catch((error) => {
      request.log.error('Manual execution failed:', error);
    });

    return reply.send({
      success: true,
      message: 'Execution triggered',
      schedule_id: scheduleId,
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      error: 'EXECUTION_TRIGGER_FAILED',
      message: 'Failed to trigger execution',
    });
  }
}
