/**
 * Schedule Types (Frontend)
 *
 * Mirrors backend types for scheduled reports
 */

import type { ReportFormat, ReportParameters } from './reports';

export interface ReportSchedule {
  id: string;
  company_id: string;
  template_id: string;
  schedule_name: string;
  description?: string;
  cron_expression: string;
  timezone: string;
  format: ReportFormat;
  parameters: ReportParameters;
  recipients: string[];
  email_subject: string;
  email_body?: string;
  include_attachment: boolean;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  total_executions?: number;
  successful_executions?: number;
  failed_executions?: number;
}

export interface ScheduleExecution {
  id: string;
  schedule_id: string;
  report_id?: string;
  status: 'pending' | 'generating' | 'generated' | 'emailing' | 'completed' | 'failed' | 'retrying';
  attempt_number: number;
  max_attempts: number;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
  email_sent_at?: string;
  email_recipients?: string[];
  created_at: string;
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

export interface UpdateScheduleRequest extends Partial<CreateScheduleRequest> {}
