/**
 * Scheduled Reports Service Tests
 *
 * Tests for cron-based scheduling logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { scheduledReportsService } from './scheduledReports';
import type { ReportSchedule } from '../types/schedules';

// Mock dependencies
vi.mock('node-cron', () => ({
  default: {
    schedule: vi.fn(() => ({
      stop: vi.fn(),
    })),
    validate: vi.fn(() => true),
  },
}));

vi.mock('../db/connection', () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

vi.mock('../utils/emailService', () => ({
  emailService: {
    sendScheduledReport: vi.fn().mockResolvedValue(undefined),
    sendFailureNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('ScheduledReportsService', () => {
  const mockSchedule: ReportSchedule = {
    id: 'test-schedule-1',
    company_id: 'company-1',
    template_id: 'executive-summary',
    schedule_name: 'Test Schedule',
    cron_expression: '0 9 1 * *',
    timezone: 'UTC',
    format: 'pdf',
    parameters: {
      period: 'Q4-2024',
      sections: ['cover', 'at-a-glance', 'sroi'],
      include_charts: true,
      include_evidence: false,
      include_lineage: false,
    },
    recipients: ['test@example.com'],
    email_subject: 'Test Report',
    include_attachment: true,
    is_active: true,
    created_by: 'user-1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerSchedule', () => {
    it('should register a valid schedule', async () => {
      await expect(
        scheduledReportsService.registerSchedule(mockSchedule)
      ).resolves.not.toThrow();
    });
  });

  describe('unregisterSchedule', () => {
    it('should unregister a schedule', () => {
      expect(() => scheduledReportsService.unregisterSchedule(mockSchedule.id)).not.toThrow();
    });
  });

  describe('getStatus', () => {
    it('should return service status', () => {
      const status = scheduledReportsService.getStatus();
      expect(status).toHaveProperty('initialized');
      expect(status).toHaveProperty('activeSchedules');
      expect(status).toHaveProperty('schedules');
    });
  });
});
