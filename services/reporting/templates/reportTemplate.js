/**
 * Report HTML Template Generator
 *
 * Generates professional HTML templates for PDF rendering
 * Supports multiple report types with consistent styling
 *
 * @module reportTemplate
 */
/**
 * Generate complete HTML for report PDF
 */
export async function generateReportHTML(report, options = {}) {
    const theme = options.theme || {};
    const primaryColor = theme.primaryColor || '#6366f1';
    const secondaryColor = theme.secondaryColor || '#8b5cf6';
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.metadata?.companyName || 'CSR Impact Report'}</title>
  <style>
    ${generateCSS(primaryColor, secondaryColor)}
  </style>
</head>
<body>
  ${generateCoverPage(report, options)}
  ${options.includeTableOfContents !== false ? generateTableOfContents(report) : ''}
  ${generateSections(report, options)}
  ${options.includeCitations !== false ? generateCitationsSection(report) : ''}
</body>
</html>
  `.trim();
}
/**
 * Generate CSS for PDF styling
 */
function generateCSS(primaryColor, secondaryColor) {
    return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 20mm 15mm;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #1f2937;
    }

    h1 {
      font-size: 28pt;
      font-weight: 700;
      color: ${primaryColor};
      margin-bottom: 16pt;
      line-height: 1.2;
    }

    h2 {
      font-size: 20pt;
      font-weight: 600;
      color: ${primaryColor};
      margin-top: 24pt;
      margin-bottom: 12pt;
      border-bottom: 2pt solid ${primaryColor};
      padding-bottom: 4pt;
      page-break-after: avoid;
    }

    h3 {
      font-size: 16pt;
      font-weight: 600;
      color: ${secondaryColor};
      margin-top: 16pt;
      margin-bottom: 8pt;
      page-break-after: avoid;
    }

    p {
      margin-bottom: 10pt;
      text-align: justify;
    }

    .cover-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      page-break-after: always;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      color: white;
      padding: 40pt;
    }

    .cover-page h1 {
      color: white;
      font-size: 36pt;
      margin-bottom: 24pt;
    }

    .cover-page .subtitle {
      font-size: 18pt;
      margin-bottom: 12pt;
      opacity: 0.9;
    }

    .cover-page .period {
      font-size: 14pt;
      opacity: 0.8;
    }

    .cover-page .logo {
      max-width: 200pt;
      max-height: 80pt;
      margin-bottom: 32pt;
      filter: brightness(0) invert(1);
    }

    .toc {
      page-break-after: always;
      margin-top: 20pt;
    }

    .toc h2 {
      color: ${primaryColor};
      font-size: 24pt;
      margin-bottom: 16pt;
    }

    .toc-item {
      display: flex;
      justify-content: space-between;
      padding: 6pt 0;
      border-bottom: 1pt dotted #e5e7eb;
    }

    .toc-item:last-child {
      border-bottom: none;
    }

    .section {
      margin-bottom: 24pt;
      page-break-inside: avoid;
    }

    .executive-summary {
      background: #f9fafb;
      border-left: 4pt solid ${primaryColor};
      padding: 16pt;
      margin: 16pt 0;
      page-break-inside: avoid;
    }

    .metric-card {
      display: inline-block;
      width: 48%;
      margin: 1%;
      padding: 12pt;
      background: white;
      border: 1pt solid #e5e7eb;
      border-radius: 4pt;
      page-break-inside: avoid;
    }

    .metric-label {
      font-size: 9pt;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5pt;
      margin-bottom: 4pt;
    }

    .metric-value {
      font-size: 24pt;
      font-weight: 700;
      color: ${primaryColor};
    }

    .chart-container {
      margin: 16pt 0;
      text-align: center;
      page-break-inside: avoid;
    }

    .chart-container img {
      max-width: 100%;
      height: auto;
    }

    .chart-caption {
      font-size: 9pt;
      color: #6b7280;
      margin-top: 8pt;
      font-style: italic;
    }

    .citation {
      color: ${primaryColor};
      font-weight: 600;
      text-decoration: none;
    }

    .citations-section {
      page-break-before: always;
      margin-top: 20pt;
    }

    .citation-item {
      margin-bottom: 12pt;
      padding-left: 20pt;
      text-indent: -20pt;
    }

    .citation-number {
      color: ${primaryColor};
      font-weight: 600;
    }

    .evidence-snippet {
      background: #f9fafb;
      padding: 8pt;
      margin: 8pt 0;
      border-left: 3pt solid #e5e7eb;
      font-size: 10pt;
      font-style: italic;
      page-break-inside: avoid;
    }

    .confidence-badge {
      display: inline-block;
      padding: 2pt 6pt;
      border-radius: 3pt;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
    }

    .confidence-high {
      background: #d1fae5;
      color: #065f46;
    }

    .confidence-medium {
      background: #fef3c7;
      color: #92400e;
    }

    .confidence-low {
      background: #fee2e2;
      color: #991b1b;
    }

    blockquote {
      border-left: 3pt solid ${primaryColor};
      padding-left: 12pt;
      margin: 12pt 0;
      font-style: italic;
      color: #4b5563;
    }

    ul, ol {
      margin-left: 20pt;
      margin-bottom: 10pt;
    }

    li {
      margin-bottom: 4pt;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12pt 0;
      page-break-inside: avoid;
    }

    th, td {
      padding: 8pt;
      text-align: left;
      border-bottom: 1pt solid #e5e7eb;
    }

    th {
      background: ${primaryColor};
      color: white;
      font-weight: 600;
    }

    .page-break {
      page-break-after: always;
    }

    @media print {
      body {
        background: white;
      }

      .no-print {
        display: none;
      }
    }
  `;
}
/**
 * Generate cover page
 */
function generateCoverPage(report, options) {
    const logoHTML = options.theme?.logo
        ? `<img src="${options.theme.logo}" class="logo" alt="Company Logo" />`
        : '';
    const companyName = report.metadata?.companyName || 'Your Company';
    const reportType = getReportTypeLabel(report.reportType);
    const period = formatPeriod(report.period);
    return `
    <div class="cover-page">
      ${logoHTML}
      <h1>${companyName}</h1>
      <div class="subtitle">${reportType}</div>
      <div class="period">${period}</div>
    </div>
  `;
}
/**
 * Generate table of contents
 */
function generateTableOfContents(report) {
    if (!report.sections || report.sections.length === 0) {
        return '';
    }
    const items = report.sections
        .map((section, index) => {
        return `
        <div class="toc-item">
          <span>${index + 1}. ${section.title}</span>
          <span>${index + 2}</span>
        </div>
      `;
    })
        .join('');
    return `
    <div class="toc">
      <h2>Table of Contents</h2>
      ${items}
    </div>
  `;
}
/**
 * Generate report sections
 */
function generateSections(report, options) {
    if (!report.sections || report.sections.length === 0) {
        return '<p>No content available.</p>';
    }
    return report.sections
        .sort((a, b) => a.order - b.order)
        .map((section) => generateSection(section, options))
        .join('\n');
}
/**
 * Generate individual section
 */
function generateSection(section, options) {
    const sectionClass = section.order === 0 ? 'executive-summary' : 'section';
    // Process narrative to add citation links
    let narrative = section.narrative || '';
    if (options.includeCitations !== false && section.citations) {
        narrative = processCitations(narrative, section.citations);
    }
    // Generate charts if present
    const chartsHTML = section.charts && options.includeCharts && options.chartImages
        ? section.charts.map((chart, index) => {
            const key = `${section.order}-${index}`;
            const chartImage = options.chartImages[key];
            return chartImage ? generateChartHTML(chart, chartImage) : '';
        }).join('')
        : '';
    return `
    <div class="${sectionClass}">
      <h2>${section.title}</h2>
      ${narrative}
      ${chartsHTML}
    </div>
  `;
}
/**
 * Process citations in narrative text
 */
function processCitations(narrative, citations) {
    // Replace [evidence-{id}] with styled citation links
    return narrative.replace(/\[evidence-([^\]]+)\]/g, (match, id) => {
        const citation = citations.find((c) => c.evidenceId === id);
        if (citation) {
            return `<span class="citation" title="${citation.snippet}">[${id}]</span>`;
        }
        return match;
    });
}
/**
 * Generate chart HTML
 */
function generateChartHTML(chart, base64Image) {
    return `
    <div class="chart-container">
      <img src="${base64Image}" alt="${chart.title || 'Chart'}" />
      ${chart.title ? `<div class="chart-caption">${chart.title}</div>` : ''}
    </div>
  `;
}
/**
 * Generate citations section
 */
function generateCitationsSection(report) {
    const allCitations = [];
    // Collect all citations from all sections
    if (report.sections) {
        for (const section of report.sections) {
            if (section.citations && section.citations.length > 0) {
                allCitations.push(...section.citations);
            }
        }
    }
    if (allCitations.length === 0) {
        return '';
    }
    // Remove duplicates
    const uniqueCitations = Array.from(new Map(allCitations.map((c) => [c.evidenceId, c])).values());
    const citationsHTML = uniqueCitations
        .map((citation, index) => {
        const confidenceLevel = citation.confidence >= 0.8 ? 'high' : citation.confidence >= 0.5 ? 'medium' : 'low';
        const confidenceLabel = confidenceLevel === 'high' ? 'High' : confidenceLevel === 'medium' ? 'Medium' : 'Low';
        return `
        <div class="citation-item">
          <span class="citation-number">[${citation.evidenceId}]</span>
          <span class="confidence-badge confidence-${confidenceLevel}">${confidenceLabel} Confidence</span>
          <div class="evidence-snippet">"${citation.snippet}"</div>
          <div style="font-size: 9pt; color: #6b7280;">
            Source: ${citation.sourceType} | Date: ${new Date(citation.dateCollected).toLocaleDateString()}
          </div>
        </div>
      `;
    })
        .join('');
    return `
    <div class="citations-section">
      <h2>Evidence References</h2>
      <p>The following evidence snippets support the claims made in this report. All evidence has been anonymized to protect participant privacy.</p>
      ${citationsHTML}
    </div>
  `;
}
/**
 * Get human-readable report type label
 */
function getReportTypeLabel(type) {
    const labels = {
        quarterly: 'Quarterly CSR Impact Report',
        annual: 'Annual CSR Impact Report',
        board_presentation: 'Board Presentation - CSR Overview',
        csrd: 'CSRD Compliance Report',
    };
    return labels[type] || 'CSR Impact Report';
}
/**
 * Format date period
 */
function formatPeriod(period) {
    if (!period) {
        return '';
    }
    const from = new Date(period.from).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const to = new Date(period.to).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    return `${from} - ${to}`;
}
//# sourceMappingURL=reportTemplate.js.map