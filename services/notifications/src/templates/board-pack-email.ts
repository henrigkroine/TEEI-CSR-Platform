/**
 * Board pack email template renderer
 */

export interface BoardPackEmailData {
  companyId: string;
  tenantId: string;
  recipient: string;
  executionTime: Date;
  timezone: string;
  reports: Array<{
    filename: string;
    type: string;
  }>;
}

/**
 * Render board pack email HTML
 */
export function renderBoardPackEmail(data: BoardPackEmailData): string {
  const { companyId, recipient, executionTime, timezone, reports } = data;

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(executionTime);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Board Pack - ${formattedDate}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      border-bottom: 3px solid #0066cc;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      color: #0066cc;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-top: 10px;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 10px;
      color: #333;
    }
    .report-list {
      list-style: none;
      padding: 0;
      margin: 15px 0;
    }
    .report-item {
      background-color: #f8f9fa;
      border-left: 4px solid #0066cc;
      padding: 12px 15px;
      margin-bottom: 10px;
      border-radius: 4px;
    }
    .report-name {
      font-weight: 600;
      color: #333;
    }
    .report-type {
      color: #666;
      font-size: 13px;
      margin-top: 3px;
    }
    .cta-button {
      display: inline-block;
      background-color: #0066cc;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 30px;
      border-radius: 6px;
      font-weight: 600;
      margin-top: 10px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      font-size: 13px;
      color: #666;
    }
    .watermark {
      background-color: #fffbea;
      border: 1px solid #ffc107;
      border-radius: 4px;
      padding: 10px 15px;
      margin-top: 20px;
      font-size: 12px;
      color: #856404;
    }
    .icon {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-right: 6px;
      vertical-align: middle;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Board Pack Delivery</h1>
      <div class="meta">
        <strong>Company:</strong> ${escapeHtml(companyId)}<br>
        <strong>Generated:</strong> ${formattedDate}<br>
        <strong>Recipient:</strong> ${escapeHtml(recipient)}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Executive Summary</div>
      <p>
        Your scheduled board pack has been generated and is ready for review.
        This package includes comprehensive reports on financial performance,
        impact metrics, and strategic initiatives.
      </p>
      <p>
        <strong>Action Required:</strong> Please review the attached materials
        prior to the upcoming board meeting.
      </p>
    </div>

    <div class="section">
      <div class="section-title">Included Reports</div>
      <ul class="report-list">
        ${reports.map(report => `
          <li class="report-item">
            <div class="report-name">📄 ${formatReportName(report.filename)}</div>
            <div class="report-type">Format: ${report.type}</div>
          </li>
        `).join('')}
      </ul>
    </div>

    <div class="section">
      <div class="section-title">Calendar Invite</div>
      <p>
        A calendar invite for the board review meeting is attached as
        <strong>board-pack-review.ics</strong>. Add this to your calendar
        to receive reminders.
      </p>
    </div>

    <div class="section">
      <a href="https://cockpit.teei.io/${companyId}/dashboard" class="cta-button">
        View Interactive Dashboard
      </a>
    </div>

    <div class="watermark">
      <strong>⚠️ Confidential:</strong> This email and its attachments contain
      confidential information. All documents include watermarks with generation
      timestamps and lineage references for audit compliance.
    </div>

    <div class="footer">
      <p>
        This is an automated delivery from TEEI Corporate Cockpit.<br>
        For questions, please contact your system administrator.
      </p>
      <p style="font-size: 11px; color: #999;">
        Lineage ID: ${generateLineageId()}<br>
        Generation Time: ${new Date().toISOString()}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Format report filename to human-readable name
 */
function formatReportName(filename: string): string {
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Generate unique lineage ID for audit trail
 */
function generateLineageId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`.toUpperCase();
}
