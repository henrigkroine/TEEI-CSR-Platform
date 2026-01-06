/**
 * PDF Watermarking & Stamping Utility
 *
 * Enhanced PDF watermarking with:
 * - Watermark overlay (company name, period, evidence hash)
 * - ID stamping footer (Report ID, timestamp, page numbers)
 * - Approver signature block
 * - Confidentiality notice
 * - Server-side rendering with Playwright/Puppeteer
 *
 * @module utils/pdfWatermark
 */
import crypto from 'crypto';
/**
 * Generate SHA-256 hash of evidence set
 *
 * @param evidenceIds - Array of evidence IDs
 * @returns SHA-256 hash in hex format
 */
export function generateEvidenceHash(evidenceIds) {
    const sorted = [...evidenceIds].sort();
    const combined = sorted.join('|');
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
}
/**
 * Generate Report ID
 *
 * @param companyId - Company identifier
 * @param period - Reporting period
 * @returns Report ID in format: RPT-{company}-{period}-{timestamp}
 */
export function generateReportId(companyId, period) {
    const timestamp = Date.now().toString(36);
    const sanitizedCompany = companyId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const sanitizedPeriod = period.replace(/[^a-zA-Z0-9]/g, '');
    return `RPT-${sanitizedCompany}-${sanitizedPeriod}-${timestamp}`;
}
/**
 * Create ID stamp HTML for PDF footer
 *
 * @param config - ID stamp configuration
 * @returns HTML string for footer
 */
export function createIDStampHTML(config) {
    const { reportId, generatedAt, evidenceHash, pageNumber, totalPages } = config;
    const generatedDate = generatedAt.toISOString().split('T')[0];
    const generatedTime = generatedAt.toISOString().split('T')[1].substring(0, 8);
    return `
    <div style="
      width: 100%;
      padding: 8px 15mm;
      font-family: 'Courier New', monospace;
      font-size: 9px;
      color: #666;
      background: #f8f9fa;
      border-top: 1px solid #dee2e6;
      display: flex;
      justify-content: space-between;
      align-items: center;
    ">
      <div style="flex: 1; text-align: left;">
        <strong>Report ID:</strong> ${reportId}
      </div>
      <div style="flex: 1; text-align: center;">
        <strong>Generated:</strong> ${generatedDate} ${generatedTime} UTC
      </div>
      <div style="flex: 1; text-align: right;">
        <strong>Page ${pageNumber} of ${totalPages}</strong>
      </div>
    </div>
    <div style="
      padding: 4px 15mm;
      font-family: 'Courier New', monospace;
      font-size: 8px;
      color: #999;
      background: #f8f9fa;
      text-align: center;
    ">
      Evidence Hash: ${evidenceHash.toUpperCase()} | Verification: teei-platform.com/verify/${reportId}
    </div>
  `;
}
/**
 * Create watermark overlay HTML
 *
 * @param config - Watermark configuration
 * @returns HTML string for watermark
 */
export function createWatermarkHTML(config) {
    if (!config.enabled || !config.text) {
        return '';
    }
    const { text, position, opacity, font_size, color } = config;
    const styles = getWatermarkStyles(position, opacity, font_size, color);
    return `
    <div style="${styles}">
      ${escapeHTML(text)}
    </div>
  `;
}
/**
 * Get CSS styles for watermark based on position
 */
function getWatermarkStyles(position, opacity, fontSize, color) {
    const baseStyles = `
    position: absolute;
    font-family: Arial, sans-serif;
    font-size: ${fontSize}px;
    color: ${color};
    opacity: ${opacity};
    font-weight: bold;
    text-transform: uppercase;
    pointer-events: none;
    user-select: none;
  `;
    switch (position) {
        case 'header':
            return `${baseStyles}
        top: 10mm;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
      `;
        case 'footer':
            return `${baseStyles}
        bottom: 10mm;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
      `;
        case 'diagonal':
            return `${baseStyles}
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-45deg);
        font-size: ${fontSize * 2}px;
        white-space: nowrap;
      `;
        case 'corner':
            return `${baseStyles}
        bottom: 10mm;
        right: 10mm;
        text-align: right;
      `;
        default:
            return baseStyles;
    }
}
/**
 * Create signature block HTML
 *
 * @param config - Signature block configuration
 * @returns HTML string for signature
 */
export function createSignatureBlockHTML(config) {
    const { approverName, approverTitle, approvedAt, digitalSignature } = config;
    const approvedDate = approvedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    return `
    <div style="
      margin-top: 40px;
      padding: 24px;
      border: 2px solid #3b82f6;
      border-radius: 8px;
      background: #f0f9ff;
      page-break-inside: avoid;
    ">
      <div style="
        font-size: 16px;
        font-weight: 700;
        color: #1e40af;
        margin-bottom: 16px;
        border-bottom: 2px solid #3b82f6;
        padding-bottom: 8px;
      ">
        Approved Report
      </div>

      <div style="margin-bottom: 12px;">
        <div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">
          <strong>Approved By:</strong>
        </div>
        <div style="font-size: 16px; font-weight: 600; color: #111827;">
          ${escapeHTML(approverName)}
        </div>
        <div style="font-size: 14px; color: #6b7280;">
          ${escapeHTML(approverTitle)}
        </div>
      </div>

      <div style="margin-bottom: 12px;">
        <div style="font-size: 14px; color: #4b5563; margin-bottom: 4px;">
          <strong>Approval Date:</strong>
        </div>
        <div style="font-size: 14px; color: #111827;">
          ${approvedDate}
        </div>
      </div>

      ${digitalSignature
        ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #cbd5e1;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">
          <strong>Digital Signature:</strong>
        </div>
        <div style="
          font-family: 'Courier New', monospace;
          font-size: 11px;
          color: #374151;
          background: white;
          padding: 12px;
          border-radius: 4px;
          word-break: break-all;
        ">
          ${escapeHTML(digitalSignature)}
        </div>
      </div>
      `
        : ''}

      <div style="
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #cbd5e1;
        font-size: 11px;
        color: #6b7280;
        font-style: italic;
      ">
        This report has been reviewed and approved by an authorized representative.
        Any modifications after approval will invalidate this signature.
      </div>
    </div>
  `;
}
/**
 * Create confidentiality notice HTML
 *
 * @returns HTML string for confidentiality notice
 */
export function createConfidentialityNoticeHTML() {
    return `
    <div style="
      margin-top: 32px;
      padding: 16px;
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      border-radius: 4px;
      page-break-inside: avoid;
    ">
      <div style="
        font-size: 12px;
        font-weight: 700;
        color: #92400e;
        margin-bottom: 8px;
      ">
        ⚠️ CONFIDENTIAL INFORMATION
      </div>
      <div style="
        font-size: 11px;
        color: #78350f;
        line-height: 1.6;
      ">
        This document contains proprietary and confidential information.
        Distribution, reproduction, or disclosure of this report or its contents
        to unauthorized parties is strictly prohibited. If you have received this
        document in error, please notify the sender immediately and destroy all copies.
      </div>
    </div>
  `;
}
/**
 * Create methodology disclaimer HTML
 *
 * @returns HTML string for methodology disclaimer
 */
export function createMethodologyDisclaimerHTML() {
    return `
    <div style="
      margin-top: 24px;
      padding: 12px;
      background: #f3f4f6;
      border-radius: 4px;
      font-size: 10px;
      color: #6b7280;
      line-height: 1.5;
      page-break-inside: avoid;
    ">
      <strong>Methodology Note:</strong>
      Social Return on Investment (SROI) and Volunteer Impact Score (VIS) calculations
      are based on industry-standard methodologies and validated evidence. All metrics
      include confidence intervals and evidence lineage. For detailed methodology,
      refer to the Evidence Appendix or visit teei-platform.com/methodology.
    </div>
  `;
}
/**
 * Generate complete PDF with watermarks, stamps, and signatures
 *
 * This function combines all watermarking features into HTML that can be
 * rendered by Playwright/Puppeteer into a PDF.
 *
 * @param content - Main report content HTML
 * @param config - Watermark configuration
 * @param idStamp - ID stamp configuration
 * @param signatureBlock - Optional signature block
 * @returns Complete HTML ready for PDF generation
 */
export function generateWatermarkedPDFHTML(content, config, idStamp, signatureBlock) {
    const watermarkHTML = createWatermarkHTML(config);
    const idStampHTML = createIDStampHTML(idStamp);
    const signatureHTML = signatureBlock ? createSignatureBlockHTML(signatureBlock) : '';
    const confidentialityHTML = config.includeConfidentiality
        ? createConfidentialityNoticeHTML()
        : '';
    const disclaimerHTML = createMethodologyDisclaimerHTML();
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Report</title>
  <style>
    @page {
      margin: 20mm 15mm;
      size: A4;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #111827;
      margin: 0;
      padding: 0;
    }

    h1 {
      font-size: 24pt;
      font-weight: 700;
      color: #1e40af;
      margin: 0 0 16px 0;
      page-break-after: avoid;
    }

    h2 {
      font-size: 18pt;
      font-weight: 600;
      color: #1e40af;
      margin: 24px 0 12px 0;
      page-break-after: avoid;
    }

    h3 {
      font-size: 14pt;
      font-weight: 600;
      color: #374151;
      margin: 20px 0 8px 0;
      page-break-after: avoid;
    }

    p {
      margin: 0 0 12px 0;
    }

    .page-break {
      page-break-before: always;
    }

    .no-break {
      page-break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }

    th, td {
      padding: 8px 12px;
      border: 1px solid #e5e7eb;
      text-align: left;
    }

    th {
      background: #f3f4f6;
      font-weight: 600;
    }

    .footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
    }
  </style>
</head>
<body>
  ${watermarkHTML}

  <div class="content">
    ${content}

    ${signatureHTML}
    ${confidentialityHTML}
    ${disclaimerHTML}
  </div>

  <div class="footer">
    ${idStampHTML}
  </div>
</body>
</html>
  `.trim();
}
/**
 * Escape HTML special characters
 */
function escapeHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
/**
 * Validate watermark configuration
 */
export function validateWatermarkConfig(config) {
    const errors = [];
    if (config.enabled) {
        if (!config.text || config.text.trim().length === 0) {
            errors.push('Watermark text is required when watermarking is enabled');
        }
        if (config.opacity < 0 || config.opacity > 1) {
            errors.push('Opacity must be between 0 and 1');
        }
        if (config.font_size < 6 || config.font_size > 72) {
            errors.push('Font size must be between 6 and 72');
        }
        if (!['header', 'footer', 'diagonal', 'corner'].includes(config.position)) {
            errors.push('Invalid watermark position');
        }
        if (!/^#[0-9A-Fa-f]{6}$/.test(config.color)) {
            errors.push('Color must be a valid hex code (e.g., #666666)');
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Generate digital signature for approval
 *
 * @param reportId - Report ID
 * @param approverEmail - Approver's email
 * @param approvedAt - Approval timestamp
 * @param secretKey - Secret signing key
 * @returns HMAC-SHA256 signature in hex format
 */
export function generateDigitalSignature(reportId, approverEmail, approvedAt, secretKey) {
    const payload = `${reportId}|${approverEmail}|${approvedAt.toISOString()}`;
    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
}
/**
 * Verify digital signature
 *
 * @param signature - Signature to verify
 * @param reportId - Report ID
 * @param approverEmail - Approver's email
 * @param approvedAt - Approval timestamp
 * @param secretKey - Secret signing key
 * @returns true if signature is valid
 */
export function verifyDigitalSignature(signature, reportId, approverEmail, approvedAt, secretKey) {
    const expectedSignature = generateDigitalSignature(reportId, approverEmail, approvedAt, secretKey);
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
//# sourceMappingURL=pdfWatermark.js.map