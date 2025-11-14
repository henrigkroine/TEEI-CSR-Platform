/**
 * Schedule Routes
 *
 * Endpoints for managing report schedules
 */

import type { FastifyInstance } from 'fastify';
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getExecutionHistory,
  triggerExecution,
} from '../controllers/schedules.js';

export async function scheduleRoutes(fastify: FastifyInstance) {
  /**
   * List schedules for company
   */
  fastify.get('/companies/:id/schedules', {
    schema: {
      description: 'List report schedules for a company',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          active: { type: 'boolean', description: 'Filter by active status' },
        },
      },
      response: {
        200: {
          description: 'List of schedules',
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  schedule_name: { type: 'string' },
                  template_id: { type: 'string' },
                  cron_expression: { type: 'string' },
                  is_active: { type: 'boolean' },
                  next_run_at: { type: 'string', format: 'date-time' },
                  total_executions: { type: 'number' },
                  successful_executions: { type: 'number' },
                  failed_executions: { type: 'number' },
                },
              },
            },
            total: { type: 'number' },
          },
        },
      },
    },
    handler: listSchedules,
  });

  /**
   * Get schedule details
   */
  fastify.get('/companies/:id/schedules/:scheduleId', {
    schema: {
      description: 'Get schedule details',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id', 'scheduleId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          scheduleId: { type: 'string', description: 'Schedule ID' },
        },
      },
      response: {
        200: {
          description: 'Schedule details',
          type: 'object',
        },
        404: {
          description: 'Schedule not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: getSchedule,
  });

  /**
   * Create new schedule
   */
  fastify.post('/companies/:id/schedules', {
    schema: {
      description: 'Create new report schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
        },
      },
      body: {
        type: 'object',
        required: [
          'schedule_name',
          'template_id',
          'cron_expression',
          'format',
          'parameters',
          'recipients',
          'email_subject',
        ],
        properties: {
          schedule_name: { type: 'string', minLength: 1, maxLength: 500 },
          description: { type: 'string' },
          template_id: {
            type: 'string',
            enum: ['executive-summary', 'detailed-impact', 'stakeholder-briefing', 'csrd-compliance'],
          },
          cron_expression: {
            type: 'string',
            description: 'Cron expression (e.g., "0 9 1 * *" for monthly at 9am)',
          },
          timezone: { type: 'string', default: 'UTC' },
          format: {
            type: 'string',
            enum: ['pdf', 'html', 'csv', 'xlsx'],
          },
          parameters: {
            type: 'object',
            required: ['period', 'sections'],
            properties: {
              period: { type: 'string' },
              sections: { type: 'array', items: { type: 'string' } },
              include_charts: { type: 'boolean' },
              include_evidence: { type: 'boolean' },
              include_lineage: { type: 'boolean' },
            },
          },
          recipients: {
            type: 'array',
            items: { type: 'string', format: 'email' },
            minItems: 1,
            description: 'Email addresses to receive the report',
          },
          email_subject: { type: 'string', minLength: 1, maxLength: 500 },
          email_body: { type: 'string' },
          include_attachment: { type: 'boolean', default: true },
          is_active: { type: 'boolean', default: true },
        },
      },
      response: {
        201: {
          description: 'Schedule created',
          type: 'object',
          properties: {
            schedule_id: { type: 'string' },
            message: { type: 'string' },
            next_run_at: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          description: 'Validation error',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: createSchedule,
  });

  /**
   * Update schedule
   */
  fastify.put('/companies/:id/schedules/:scheduleId', {
    schema: {
      description: 'Update report schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id', 'scheduleId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          scheduleId: { type: 'string', description: 'Schedule ID' },
        },
      },
      body: {
        type: 'object',
        properties: {
          schedule_name: { type: 'string' },
          description: { type: 'string' },
          cron_expression: { type: 'string' },
          timezone: { type: 'string' },
          format: { type: 'string', enum: ['pdf', 'html', 'csv', 'xlsx'] },
          parameters: { type: 'object' },
          recipients: { type: 'array', items: { type: 'string', format: 'email' } },
          email_subject: { type: 'string' },
          email_body: { type: 'string' },
          include_attachment: { type: 'boolean' },
          is_active: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Schedule updated',
          type: 'object',
          properties: {
            message: { type: 'string' },
            schedule: { type: 'object' },
          },
        },
        404: {
          description: 'Schedule not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: updateSchedule,
  });

  /**
   * Delete schedule
   */
  fastify.delete('/companies/:id/schedules/:scheduleId', {
    schema: {
      description: 'Delete report schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id', 'scheduleId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          scheduleId: { type: 'string', description: 'Schedule ID' },
        },
      },
      response: {
        200: {
          description: 'Schedule deleted',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
        404: {
          description: 'Schedule not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: deleteSchedule,
  });

  /**
   * Get execution history
   */
  fastify.get('/companies/:id/schedules/:scheduleId/executions', {
    schema: {
      description: 'Get execution history for a schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id', 'scheduleId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          scheduleId: { type: 'string', description: 'Schedule ID' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          offset: { type: 'integer', minimum: 0, default: 0 },
        },
      },
      response: {
        200: {
          description: 'Execution history',
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  status: { type: 'string' },
                  started_at: { type: 'string', format: 'date-time' },
                  completed_at: { type: 'string', format: 'date-time' },
                  duration_seconds: { type: 'number' },
                  error_message: { type: 'string' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'number' },
                limit: { type: 'number' },
                offset: { type: 'number' },
                has_more: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
    handler: getExecutionHistory,
  });

  /**
   * Trigger manual execution
   */
  fastify.post('/companies/:id/schedules/:scheduleId/execute', {
    schema: {
      description: 'Trigger manual execution of a schedule',
      tags: ['Schedules'],
      params: {
        type: 'object',
        required: ['id', 'scheduleId'],
        properties: {
          id: { type: 'string', description: 'Company ID' },
          scheduleId: { type: 'string', description: 'Schedule ID' },
        },
      },
      response: {
        200: {
          description: 'Execution triggered',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            schedule_id: { type: 'string' },
          },
        },
      },
    },
    handler: triggerExecution,
  });
}
