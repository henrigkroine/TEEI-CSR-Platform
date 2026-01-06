/**
 * Email Service Tests
 *
 * Tests for email delivery functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { emailService } from './emailService';

// Mock nodemailer
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: vi.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: vi.fn().mockResolvedValue(true),
      close: vi.fn(),
    })),
  },
}));

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('verifyConnection', () => {
    it('should verify SMTP connection', async () => {
      const result = await emailService.verifyConnection();
      expect(result).toBe(true);
    });
  });

  describe('sendScheduledReport', () => {
    it('should send report email with attachment', async () => {
      const recipients = ['test@example.com'];
      const scheduleName = 'Test Schedule';
      const reportTitle = 'Q4 2024 Report';
      const reportFile = Buffer.from('test content');
      const reportFormat = 'pdf';

      await expect(
        emailService.sendScheduledReport(
          recipients,
          scheduleName,
          reportTitle,
          reportFile,
          reportFormat
        )
      ).resolves.not.toThrow();
    });

    it('should handle custom subject and body', async () => {
      const recipients = ['test@example.com'];
      const scheduleName = 'Test Schedule';
      const reportTitle = 'Q4 2024 Report';
      const reportFile = Buffer.from('test content');
      const reportFormat = 'pdf';
      const customSubject = 'Custom Subject';
      const customBody = 'Custom body text';

      await expect(
        emailService.sendScheduledReport(
          recipients,
          scheduleName,
          reportTitle,
          reportFile,
          reportFormat,
          customSubject,
          customBody
        )
      ).resolves.not.toThrow();
    });
  });

  describe('sendFailureNotification', () => {
    it('should send failure notification email', async () => {
      const recipients = ['test@example.com'];
      const scheduleName = 'Test Schedule';
      const errorMessage = 'Test error';
      const attemptNumber = 1;

      await expect(
        emailService.sendFailureNotification(
          recipients,
          scheduleName,
          errorMessage,
          attemptNumber
        )
      ).resolves.not.toThrow();
    });
  });

  describe('sendScheduleConfirmation', () => {
    it('should send schedule confirmation email', async () => {
      const recipients = ['test@example.com'];
      const scheduleName = 'Test Schedule';
      const cronExpression = '0 9 1 * *';
      const nextRun = new Date();

      await expect(
        emailService.sendScheduleConfirmation(
          recipients,
          scheduleName,
          cronExpression,
          nextRun
        )
      ).resolves.not.toThrow();
    });
  });
});
