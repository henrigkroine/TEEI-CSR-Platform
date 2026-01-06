/**
 * Scheduled Reports Types
 *
 * Types for automated report generation and email delivery
 */

import type { ReportFormat, ReportParameters } from './reports.js';

export interface ReportSchedule {
  id: string;
  company_id: string;
  template_id: string;
  schedule_name: string;
  description?: string;

  // Scheduling
  cron_expression: string;
  timezone: string;

  // Report configuration
  format: ReportFormat;
  parameters: ReportParameters;

  // Email delivery
  recipients: string[];
  email_subject: string;
  email_body?: string;
  include_attachment: boolean;

  // Status
  is_active: boolean;
  last_run_at?: Date;
  next_run_at?: Date;

  // Metadata
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export type ScheduleExecutionStatus =
  | 'pending'
  | 'generating'
  | 'generated'
  | 'emailing'
  | 'completed'
  | 'failed'
  | 'retrying';

export interface ScheduleExecution {
  id: string;
  schedule_id: string;
  report_id?: string;

  // Status
  status: ScheduleExecutionStatus;

  // Retry tracking
  attempt_number: number;
  max_attempts: number;

  // Timing
  started_at: Date;
  completed_at?: Date;
  duration_seconds?: number;

  // Errors
  error_message?: string;
  error_stack?: string;

  // Email
  email_sent_at?: Date;
  email_recipients?: string[];
  email_error?: string;

  // Metadata
  created_at: Date;
  updated_at: Date;
}

export interface CreateScheduleRequest {
  schedule_name: string;
  description?: string;
  template_id: string;
  cron_expression: string;
  timezone?: string;
  format: ReportFormat;
  parameters: ReportParameters;
  recipients: string[];
  email_subject: string;
  email_body?: string;
  include_attachment?: boolean;
  is_active?: boolean;
}

export interface UpdateScheduleRequest {
  schedule_name?: string;
  description?: string;
  cron_expression?: string;
  timezone?: string;
  format?: ReportFormat;
  parameters?: ReportParameters;
  recipients?: string[];
  email_subject?: string;
  email_body?: string;
  include_attachment?: boolean;
  is_active?: boolean;
}

export interface ScheduleOverview extends ReportSchedule {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  last_execution_at?: Date;
  avg_duration_seconds?: number;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailOptions {
  to: string[];
  subject: string;
  html?: string;
  text?: string;
  attachments?: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface ScheduleExecutionResult {
  success: boolean;
  execution_id: string;
  report_id?: string;
  error?: string;
}

/**
 * Cron expression presets for common schedules
 */
export const CRON_PRESETS = {
  DAILY_9AM: '0 9 * * *',
  WEEKLY_MONDAY_9AM: '0 9 * * 1',
  MONTHLY_1ST_9AM: '0 9 1 * *',
  QUARTERLY_1ST_9AM: '0 9 1 */3 *',
  YEARLY_JAN1_9AM: '0 9 1 1 *',
} as const;

/**
 * Common timezone identifiers
 */
export const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Oslo',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney',
] as const;

/**
 * Maximum allowed schedules per company
 */
export const MAX_SCHEDULES_PER_COMPANY = 10;

/**
 * Maximum retry attempts for failed executions
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Retry delay in milliseconds (exponential backoff)
 */
export function getRetryDelay(attemptNumber: number): number {
  // 5 minutes, 15 minutes, 30 minutes
  return Math.min(5 * 60 * 1000 * Math.pow(2, attemptNumber - 1), 30 * 60 * 1000);
}
