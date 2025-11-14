/**
 * Email Service
 *
 * Handles email delivery for scheduled reports using Nodemailer
 * Features:
 * - SMTP configuration
 * - Email templates
 * - Attachment handling
 * - Retry logic
 * - Error tracking
 */

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { EmailOptions, EmailAttachment } from '../types/schedules.js';
import { config } from '../config.js';

class EmailService {
  private transporter: Transporter | null = null;
  private readonly maxRetries: number;

  constructor() {
    this.maxRetries = config.email.maxRetries;
    this.initializeTransporter();
  }

  /**
   * Initialize SMTP transporter
   */
  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: {
          user: config.email.smtp.auth.user,
          pass: config.email.smtp.auth.pass,
        },
        // Additional options for better deliverability
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
      });

      console.log('[EmailService] Transporter initialized');
    } catch (error) {
      console.error('[EmailService] Failed to initialize transporter:', error);
      throw error;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    if (!this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('[EmailService] SMTP connection verified');
      return true;
    } catch (error) {
      console.error('[EmailService] SMTP verification failed:', error);
      return false;
    }
  }

  /**
   * Send email with retry logic
   */
  async sendEmail(options: EmailOptions, attempt = 1): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      const mailOptions = {
        from: `${config.email.from.name} <${config.email.from.address}>`,
        to: options.to.join(', '),
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments?.map((att) => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
        })),
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EmailService] Email sent successfully: ${info.messageId}`);
    } catch (error) {
      console.error(`[EmailService] Failed to send email (attempt ${attempt}):`, error);

      // Retry logic with exponential backoff
      if (attempt < this.maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`[EmailService] Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.sendEmail(options, attempt + 1);
      }

      throw new Error(
        `Failed to send email after ${this.maxRetries} attempts: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  /**
   * Send scheduled report email
   */
  async sendScheduledReport(
    recipients: string[],
    scheduleName: string,
    reportTitle: string,
    reportFile: Buffer,
    reportFormat: string,
    customSubject?: string,
    customBody?: string
  ): Promise<void> {
    const subject =
      customSubject ||
      `Scheduled Report: ${reportTitle} - ${new Date().toLocaleDateString()}`;

    const html = customBody
      ? this.customBodyToHtml(customBody)
      : this.generateScheduledReportHtml(scheduleName, reportTitle);

    const text = customBody || this.generateScheduledReportText(scheduleName, reportTitle);

    const attachment: EmailAttachment = {
      filename: `${reportTitle.replace(/\s+/g, '_')}.${reportFormat}`,
      content: reportFile,
      contentType: this.getContentType(reportFormat),
    };

    await this.sendEmail({
      to: recipients,
      subject,
      html,
      text,
      attachments: [attachment],
    });
  }

  /**
   * Send failure notification email
   */
  async sendFailureNotification(
    recipients: string[],
    scheduleName: string,
    errorMessage: string,
    attemptNumber: number
  ): Promise<void> {
    const subject = `Report Generation Failed: ${scheduleName}`;

    const html = this.generateFailureNotificationHtml(
      scheduleName,
      errorMessage,
      attemptNumber
    );

    const text = this.generateFailureNotificationText(
      scheduleName,
      errorMessage,
      attemptNumber
    );

    await this.sendEmail({
      to: recipients,
      subject,
      html,
      text,
    });
  }

  /**
   * Send schedule confirmation email
   */
  async sendScheduleConfirmation(
    recipients: string[],
    scheduleName: string,
    cronExpression: string,
    nextRun: Date
  ): Promise<void> {
    const subject = `Schedule Created: ${scheduleName}`;

    const html = this.generateScheduleConfirmationHtml(
      scheduleName,
      cronExpression,
      nextRun
    );

    const text = this.generateScheduleConfirmationText(
      scheduleName,
      cronExpression,
      nextRun
    );

    await this.sendEmail({
      to: recipients,
      subject,
      html,
      text,
    });
  }

  /**
   * Generate HTML for scheduled report email
   */
  private generateScheduledReportHtml(scheduleName: string, reportTitle: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scheduled Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .report-info {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #667eea;
    }
    .footer {
      text-align: center;
      color: #6c757d;
      font-size: 0.875rem;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: #667eea;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Scheduled Report Ready</h1>
  </div>
  <div class="content">
    <p>Hello,</p>
    <p>Your scheduled report has been successfully generated and is attached to this email.</p>

    <div class="report-info">
      <h3 style="margin-top: 0;">Report Details</h3>
      <p><strong>Schedule:</strong> ${scheduleName}</p>
      <p><strong>Report:</strong> ${reportTitle}</p>
      <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <p>The report is attached to this email. If you have any questions or need assistance, please contact your administrator.</p>
  </div>
  <div class="footer">
    <p>This is an automated email from TEEI CSR Platform.</p>
    <p>You are receiving this because you are subscribed to: ${scheduleName}</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for scheduled report email
   */
  private generateScheduledReportText(scheduleName: string, reportTitle: string): string {
    return `
Scheduled Report Ready

Hello,

Your scheduled report has been successfully generated and is attached to this email.

Report Details:
- Schedule: ${scheduleName}
- Report: ${reportTitle}
- Generated: ${new Date().toLocaleString()}

The report is attached to this email. If you have any questions or need assistance, please contact your administrator.

---
This is an automated email from TEEI CSR Platform.
You are receiving this because you are subscribed to: ${scheduleName}
    `.trim();
  }

  /**
   * Generate HTML for failure notification
   */
  private generateFailureNotificationHtml(
    scheduleName: string,
    errorMessage: string,
    attemptNumber: number
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Report Generation Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #dc3545;
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .error-box {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 20px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6c757d;
      font-size: 0.875rem;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Report Generation Failed</h1>
  </div>
  <div class="content">
    <p>Hello,</p>
    <p>We encountered an issue generating your scheduled report.</p>

    <div class="error-box">
      <h3 style="margin-top: 0;">Error Details</h3>
      <p><strong>Schedule:</strong> ${scheduleName}</p>
      <p><strong>Attempt:</strong> ${attemptNumber} of 3</p>
      <p><strong>Error:</strong> ${errorMessage}</p>
      <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>

    ${
      attemptNumber < 3
        ? '<p>The system will automatically retry this operation. You will receive another notification if the issue persists.</p>'
        : '<p>After 3 failed attempts, the schedule has been paused. Please check your configuration and contact support if needed.</p>'
    }
  </div>
  <div class="footer">
    <p>This is an automated notification from TEEI CSR Platform.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for failure notification
   */
  private generateFailureNotificationText(
    scheduleName: string,
    errorMessage: string,
    attemptNumber: number
  ): string {
    return `
Report Generation Failed

Hello,

We encountered an issue generating your scheduled report.

Error Details:
- Schedule: ${scheduleName}
- Attempt: ${attemptNumber} of 3
- Error: ${errorMessage}
- Time: ${new Date().toLocaleString()}

${
  attemptNumber < 3
    ? 'The system will automatically retry this operation. You will receive another notification if the issue persists.'
    : 'After 3 failed attempts, the schedule has been paused. Please check your configuration and contact support if needed.'
}

---
This is an automated notification from TEEI CSR Platform.
    `.trim();
  }

  /**
   * Generate HTML for schedule confirmation
   */
  private generateScheduleConfirmationHtml(
    scheduleName: string,
    cronExpression: string,
    nextRun: Date
  ): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Schedule Created</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #28a745;
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .content {
      background: #f8f9fa;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .schedule-info {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #28a745;
    }
    .footer {
      text-align: center;
      color: #6c757d;
      font-size: 0.875rem;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #dee2e6;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Schedule Created Successfully</h1>
  </div>
  <div class="content">
    <p>Hello,</p>
    <p>Your scheduled report has been created and will run automatically according to the schedule below.</p>

    <div class="schedule-info">
      <h3 style="margin-top: 0;">Schedule Details</h3>
      <p><strong>Name:</strong> ${scheduleName}</p>
      <p><strong>Frequency:</strong> ${cronExpression}</p>
      <p><strong>Next Run:</strong> ${nextRun.toLocaleString()}</p>
    </div>

    <p>You will receive the generated reports at this email address when they are ready. You can manage this schedule from your dashboard.</p>
  </div>
  <div class="footer">
    <p>This is an automated confirmation from TEEI CSR Platform.</p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generate plain text for schedule confirmation
   */
  private generateScheduleConfirmationText(
    scheduleName: string,
    cronExpression: string,
    nextRun: Date
  ): string {
    return `
Schedule Created Successfully

Hello,

Your scheduled report has been created and will run automatically according to the schedule below.

Schedule Details:
- Name: ${scheduleName}
- Frequency: ${cronExpression}
- Next Run: ${nextRun.toLocaleString()}

You will receive the generated reports at this email address when they are ready. You can manage this schedule from your dashboard.

---
This is an automated confirmation from TEEI CSR Platform.
    `.trim();
  }

  /**
   * Convert custom body text to basic HTML
   */
  private customBodyToHtml(text: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
  </style>
</head>
<body>
  ${text.split('\n').map((line) => `<p>${line}</p>`).join('\n')}
</body>
</html>
    `;
  }

  /**
   * Get MIME content type for report format
   */
  private getContentType(format: string): string {
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      html: 'text/html',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    return types[format] || 'application/octet-stream';
  }

  /**
   * Close transporter connection
   */
  close(): void {
    if (this.transporter) {
      this.transporter.close();
      console.log('[EmailService] Transporter closed');
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
