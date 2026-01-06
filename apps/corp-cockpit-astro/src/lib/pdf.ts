/**
 * PDF Export Utility
 * Provides functions to export reports to PDF format
 */

export interface PDFReportData {
  companyName: string;
  companyLogo?: string;
  reportPeriod: string;
  generatedDate: string;
  metrics: {
    participantsCount: number;
    volunteersCount: number;
    sessionsCount: number;
    avgIntegrationScore: number;
    avgLanguageLevel: number;
    avgJobReadiness: number;
  };
  sroi?: {
    ratio: number;
    totalInvestment: number;
    socialValue: number;
  };
  vis?: {
    score: number;
    totalHours: number;
    totalSessions: number;
  };
}

/**
 * Generate HTML for PDF report
 */
function generateReportHTML(data: PDFReportData): string {
  const {
    companyName,
    companyLogo,
    reportPeriod,
    generatedDate,
    metrics,
    sroi,
    vis,
  } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Corporate Cockpit Report - ${companyName}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 12px;
      color: #333;
      line-height: 1.6;
      padding: 40px;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .logo {
      max-width: 200px;
      max-height: 80px;
    }

    .report-info {
      text-align: right;
    }

    h1 {
      font-size: 24px;
      color: #1e293b;
      margin-bottom: 5px;
    }

    h2 {
      font-size: 18px;
      color: #2563eb;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e5e7eb;
    }

    .meta {
      color: #64748b;
      font-size: 11px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }

    .metric-card {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      background: #f8fafc;
    }

    .metric-label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: bold;
      color: #1e293b;
    }

    .summary-section {
      margin-bottom: 30px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px;
      border-bottom: 1px solid #e5e7eb;
    }

    .summary-row:last-child {
      border-bottom: none;
    }

    .summary-label {
      color: #64748b;
    }

    .summary-value {
      font-weight: 600;
      color: #1e293b;
    }

    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
      text-align: center;
      color: #94a3b8;
      font-size: 10px;
    }

    @media print {
      body {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      ${companyLogo ? `<img src="${companyLogo}" alt="${companyName}" class="logo">` : `<h1>${companyName}</h1>`}
    </div>
    <div class="report-info">
      <h1>Corporate Cockpit Report</h1>
      <div class="meta">Period: ${reportPeriod}</div>
      <div class="meta">Generated: ${new Date(generatedDate).toLocaleDateString()}</div>
    </div>
  </div>

  <h2>Key Metrics</h2>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-label">Participants</div>
      <div class="metric-value">${metrics.participantsCount.toLocaleString()}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Volunteers</div>
      <div class="metric-value">${metrics.volunteersCount.toLocaleString()}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Sessions</div>
      <div class="metric-value">${metrics.sessionsCount.toLocaleString()}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg Integration Score</div>
      <div class="metric-value">${metrics.avgIntegrationScore.toFixed(1)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg Language Level</div>
      <div class="metric-value">${metrics.avgLanguageLevel.toFixed(1)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Avg Job Readiness</div>
      <div class="metric-value">${metrics.avgJobReadiness.toFixed(1)}</div>
    </div>
  </div>

  ${sroi ? `
  <h2>Social Return on Investment (SROI)</h2>
  <div class="summary-section">
    <div class="summary-row">
      <span class="summary-label">SROI Ratio</span>
      <span class="summary-value">${sroi.ratio.toFixed(2)}:1</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Total Investment</span>
      <span class="summary-value">$${sroi.totalInvestment.toLocaleString()}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Social Value Created</span>
      <span class="summary-value">$${sroi.socialValue.toLocaleString()}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Economic Benefit</span>
      <span class="summary-value">$${sroi.ratio.toFixed(2)} per $1 invested</span>
    </div>
  </div>
  ` : ''}

  ${vis ? `
  <h2>Volunteer Impact Score (VIS)</h2>
  <div class="summary-section">
    <div class="summary-row">
      <span class="summary-label">Overall VIS Score</span>
      <span class="summary-value">${vis.score.toFixed(1)}/100</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Total Volunteer Hours</span>
      <span class="summary-value">${vis.totalHours.toLocaleString()}</span>
    </div>
    <div class="summary-row">
      <span class="summary-label">Total Sessions</span>
      <span class="summary-value">${vis.totalSessions.toLocaleString()}</span>
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p>This report was generated by Corporate Cockpit Analytics Dashboard</p>
    <p>&copy; ${new Date().getFullYear()} TEEI CSR Platform. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}

/**
 * Export report to PDF using browser's print functionality
 */
export function exportToPDF(data: PDFReportData): void {
  const html = generateReportHTML(data);

  // Create a new window for printing
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    throw new Error('Unable to open print window. Please check your popup blocker.');
  }

  // Write the HTML content
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for content to load, then trigger print
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

/**
 * Fetch metrics and export to PDF
 */
export async function exportMetricsToPDF(
  companyId: string,
  companyName: string,
  period: string = 'current',
  token?: string
): Promise<void> {
  try {
    const baseUrl = import.meta.env.PUBLIC_ANALYTICS_SERVICE_URL || 'http://localhost:3007';

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Fetch company theme for branding
    let companyLogo: string | undefined;
    try {
      const themeResponse = await fetch(
        `${baseUrl}/companies/${companyId}/theme`,
        { headers }
      );
      if (themeResponse.ok) {
        const theme = await themeResponse.json();
        companyLogo = theme.logo_url || undefined;
      }
    } catch (error) {
      console.warn('Failed to fetch company theme, using default branding:', error);
    }

    // Fetch metrics
    const metricsResponse = await fetch(
      `${baseUrl}/metrics/company/${companyId}/period/${period}`,
      { headers }
    );

    if (!metricsResponse.ok) {
      throw new Error(`Failed to fetch metrics: ${metricsResponse.statusText}`);
    }

    const metrics = await metricsResponse.json();

    // Fetch SROI data
    let sroi;
    try {
      const sroiResponse = await fetch(
        `${baseUrl}/metrics/sroi/${companyId}`,
        { headers }
      );
      if (sroiResponse.ok) {
        sroi = await sroiResponse.json();
      }
    } catch (error) {
      console.warn('Failed to fetch SROI data:', error);
    }

    // Fetch VIS data
    let vis;
    try {
      const visResponse = await fetch(
        `${baseUrl}/metrics/vis/${companyId}`,
        { headers }
      );
      if (visResponse.ok) {
        vis = await visResponse.json();
      }
    } catch (error) {
      console.warn('Failed to fetch VIS data:', error);
    }

    // Prepare report data
    const reportData: PDFReportData = {
      companyName,
      companyLogo, // Include tenant logo from theme
      reportPeriod: period,
      generatedDate: new Date().toISOString(),
      metrics: {
        participantsCount: metrics.participantsCount || 0,
        volunteersCount: metrics.volunteersCount || 0,
        sessionsCount: metrics.sessionsCount || 0,
        avgIntegrationScore: metrics.avgIntegrationScore || 0,
        avgLanguageLevel: metrics.avgLanguageLevel || 0,
        avgJobReadiness: metrics.avgJobReadiness || 0,
      },
      sroi: sroi ? {
        ratio: sroi.ratio || 0,
        totalInvestment: sroi.totalInvestment || 0,
        socialValue: sroi.socialValue || 0,
      } : undefined,
      vis: vis ? {
        score: vis.score || 0,
        totalHours: vis.totalHours || 0,
        totalSessions: vis.totalSessions || 0,
      } : undefined,
    };

    exportToPDF(reportData);
  } catch (error) {
    console.error('Failed to export PDF:', error);
    throw error;
  }
}
