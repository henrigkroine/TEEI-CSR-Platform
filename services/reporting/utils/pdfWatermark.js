"use strict";
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEvidenceHash = generateEvidenceHash;
exports.generateReportId = generateReportId;
exports.createIDStampHTML = createIDStampHTML;
exports.createWatermarkHTML = createWatermarkHTML;
exports.createSignatureBlockHTML = createSignatureBlockHTML;
exports.createConfidentialityNoticeHTML = createConfidentialityNoticeHTML;
exports.createMethodologyDisclaimerHTML = createMethodologyDisclaimerHTML;
exports.generateWatermarkedPDFHTML = generateWatermarkedPDFHTML;
exports.validateWatermarkConfig = validateWatermarkConfig;
exports.generateDigitalSignature = generateDigitalSignature;
exports.verifyDigitalSignature = verifyDigitalSignature;
var crypto_1 = require("crypto");
/**
 * Generate SHA-256 hash of evidence set
 *
 * @param evidenceIds - Array of evidence IDs
 * @returns SHA-256 hash in hex format
 */
function generateEvidenceHash(evidenceIds) {
    var sorted = __spreadArray([], evidenceIds, true).sort();
    var combined = sorted.join('|');
    return crypto_1.default.createHash('sha256').update(combined).digest('hex').substring(0, 16);
}
/**
 * Generate Report ID
 *
 * @param companyId - Company identifier
 * @param period - Reporting period
 * @returns Report ID in format: RPT-{company}-{period}-{timestamp}
 */
function generateReportId(companyId, period) {
    var timestamp = Date.now().toString(36);
    var sanitizedCompany = companyId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    var sanitizedPeriod = period.replace(/[^a-zA-Z0-9]/g, '');
    return "RPT-".concat(sanitizedCompany, "-").concat(sanitizedPeriod, "-").concat(timestamp);
}
/**
 * Create ID stamp HTML for PDF footer
 *
 * @param config - ID stamp configuration
 * @returns HTML string for footer
 */
function createIDStampHTML(config) {
    var reportId = config.reportId, generatedAt = config.generatedAt, evidenceHash = config.evidenceHash, pageNumber = config.pageNumber, totalPages = config.totalPages;
    var generatedDate = generatedAt.toISOString().split('T')[0];
    var generatedTime = generatedAt.toISOString().split('T')[1].substring(0, 8);
    return "\n    <div style=\"\n      width: 100%;\n      padding: 8px 15mm;\n      font-family: 'Courier New', monospace;\n      font-size: 9px;\n      color: #666;\n      background: #f8f9fa;\n      border-top: 1px solid #dee2e6;\n      display: flex;\n      justify-content: space-between;\n      align-items: center;\n    \">\n      <div style=\"flex: 1; text-align: left;\">\n        <strong>Report ID:</strong> ".concat(reportId, "\n      </div>\n      <div style=\"flex: 1; text-align: center;\">\n        <strong>Generated:</strong> ").concat(generatedDate, " ").concat(generatedTime, " UTC\n      </div>\n      <div style=\"flex: 1; text-align: right;\">\n        <strong>Page ").concat(pageNumber, " of ").concat(totalPages, "</strong>\n      </div>\n    </div>\n    <div style=\"\n      padding: 4px 15mm;\n      font-family: 'Courier New', monospace;\n      font-size: 8px;\n      color: #999;\n      background: #f8f9fa;\n      text-align: center;\n    \">\n      Evidence Hash: ").concat(evidenceHash.toUpperCase(), " | Verification: teei-platform.com/verify/").concat(reportId, "\n    </div>\n  ");
}
/**
 * Create watermark overlay HTML
 *
 * @param config - Watermark configuration
 * @returns HTML string for watermark
 */
function createWatermarkHTML(config) {
    if (!config.enabled || !config.text) {
        return '';
    }
    var text = config.text, position = config.position, opacity = config.opacity, font_size = config.font_size, color = config.color;
    var styles = getWatermarkStyles(position, opacity, font_size, color);
    return "\n    <div style=\"".concat(styles, "\">\n      ").concat(escapeHTML(text), "\n    </div>\n  ");
}
/**
 * Get CSS styles for watermark based on position
 */
function getWatermarkStyles(position, opacity, fontSize, color) {
    var baseStyles = "\n    position: absolute;\n    font-family: Arial, sans-serif;\n    font-size: ".concat(fontSize, "px;\n    color: ").concat(color, ";\n    opacity: ").concat(opacity, ";\n    font-weight: bold;\n    text-transform: uppercase;\n    pointer-events: none;\n    user-select: none;\n  ");
    switch (position) {
        case 'header':
            return "".concat(baseStyles, "\n        top: 10mm;\n        left: 50%;\n        transform: translateX(-50%);\n        text-align: center;\n      ");
        case 'footer':
            return "".concat(baseStyles, "\n        bottom: 10mm;\n        left: 50%;\n        transform: translateX(-50%);\n        text-align: center;\n      ");
        case 'diagonal':
            return "".concat(baseStyles, "\n        top: 50%;\n        left: 50%;\n        transform: translate(-50%, -50%) rotate(-45deg);\n        font-size: ").concat(fontSize * 2, "px;\n        white-space: nowrap;\n      ");
        case 'corner':
            return "".concat(baseStyles, "\n        bottom: 10mm;\n        right: 10mm;\n        text-align: right;\n      ");
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
function createSignatureBlockHTML(config) {
    var approverName = config.approverName, approverTitle = config.approverTitle, approvedAt = config.approvedAt, digitalSignature = config.digitalSignature;
    var approvedDate = approvedAt.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    return "\n    <div style=\"\n      margin-top: 40px;\n      padding: 24px;\n      border: 2px solid #3b82f6;\n      border-radius: 8px;\n      background: #f0f9ff;\n      page-break-inside: avoid;\n    \">\n      <div style=\"\n        font-size: 16px;\n        font-weight: 700;\n        color: #1e40af;\n        margin-bottom: 16px;\n        border-bottom: 2px solid #3b82f6;\n        padding-bottom: 8px;\n      \">\n        Approved Report\n      </div>\n\n      <div style=\"margin-bottom: 12px;\">\n        <div style=\"font-size: 14px; color: #4b5563; margin-bottom: 4px;\">\n          <strong>Approved By:</strong>\n        </div>\n        <div style=\"font-size: 16px; font-weight: 600; color: #111827;\">\n          ".concat(escapeHTML(approverName), "\n        </div>\n        <div style=\"font-size: 14px; color: #6b7280;\">\n          ").concat(escapeHTML(approverTitle), "\n        </div>\n      </div>\n\n      <div style=\"margin-bottom: 12px;\">\n        <div style=\"font-size: 14px; color: #4b5563; margin-bottom: 4px;\">\n          <strong>Approval Date:</strong>\n        </div>\n        <div style=\"font-size: 14px; color: #111827;\">\n          ").concat(approvedDate, "\n        </div>\n      </div>\n\n      ").concat(digitalSignature
        ? "\n      <div style=\"margin-top: 16px; padding-top: 16px; border-top: 1px solid #cbd5e1;\">\n        <div style=\"font-size: 12px; color: #6b7280; margin-bottom: 8px;\">\n          <strong>Digital Signature:</strong>\n        </div>\n        <div style=\"\n          font-family: 'Courier New', monospace;\n          font-size: 11px;\n          color: #374151;\n          background: white;\n          padding: 12px;\n          border-radius: 4px;\n          word-break: break-all;\n        \">\n          ".concat(escapeHTML(digitalSignature), "\n        </div>\n      </div>\n      ")
        : '', "\n\n      <div style=\"\n        margin-top: 16px;\n        padding-top: 16px;\n        border-top: 1px solid #cbd5e1;\n        font-size: 11px;\n        color: #6b7280;\n        font-style: italic;\n      \">\n        This report has been reviewed and approved by an authorized representative.\n        Any modifications after approval will invalidate this signature.\n      </div>\n    </div>\n  ");
}
/**
 * Create confidentiality notice HTML
 *
 * @returns HTML string for confidentiality notice
 */
function createConfidentialityNoticeHTML() {
    return "\n    <div style=\"\n      margin-top: 32px;\n      padding: 16px;\n      background: #fef3c7;\n      border-left: 4px solid #f59e0b;\n      border-radius: 4px;\n      page-break-inside: avoid;\n    \">\n      <div style=\"\n        font-size: 12px;\n        font-weight: 700;\n        color: #92400e;\n        margin-bottom: 8px;\n      \">\n        \u26A0\uFE0F CONFIDENTIAL INFORMATION\n      </div>\n      <div style=\"\n        font-size: 11px;\n        color: #78350f;\n        line-height: 1.6;\n      \">\n        This document contains proprietary and confidential information.\n        Distribution, reproduction, or disclosure of this report or its contents\n        to unauthorized parties is strictly prohibited. If you have received this\n        document in error, please notify the sender immediately and destroy all copies.\n      </div>\n    </div>\n  ";
}
/**
 * Create methodology disclaimer HTML
 *
 * @returns HTML string for methodology disclaimer
 */
function createMethodologyDisclaimerHTML() {
    return "\n    <div style=\"\n      margin-top: 24px;\n      padding: 12px;\n      background: #f3f4f6;\n      border-radius: 4px;\n      font-size: 10px;\n      color: #6b7280;\n      line-height: 1.5;\n      page-break-inside: avoid;\n    \">\n      <strong>Methodology Note:</strong>\n      Social Return on Investment (SROI) and Volunteer Impact Score (VIS) calculations\n      are based on industry-standard methodologies and validated evidence. All metrics\n      include confidence intervals and evidence lineage. For detailed methodology,\n      refer to the Evidence Appendix or visit teei-platform.com/methodology.\n    </div>\n  ";
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
function generateWatermarkedPDFHTML(content, config, idStamp, signatureBlock) {
    var watermarkHTML = createWatermarkHTML(config);
    var idStampHTML = createIDStampHTML(idStamp);
    var signatureHTML = signatureBlock ? createSignatureBlockHTML(signatureBlock) : '';
    var confidentialityHTML = config.includeConfidentiality
        ? createConfidentialityNoticeHTML()
        : '';
    var disclaimerHTML = createMethodologyDisclaimerHTML();
    return "\n<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Executive Report</title>\n  <style>\n    @page {\n      margin: 20mm 15mm;\n      size: A4;\n    }\n\n    * {\n      box-sizing: border-box;\n    }\n\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;\n      font-size: 11pt;\n      line-height: 1.6;\n      color: #111827;\n      margin: 0;\n      padding: 0;\n    }\n\n    h1 {\n      font-size: 24pt;\n      font-weight: 700;\n      color: #1e40af;\n      margin: 0 0 16px 0;\n      page-break-after: avoid;\n    }\n\n    h2 {\n      font-size: 18pt;\n      font-weight: 600;\n      color: #1e40af;\n      margin: 24px 0 12px 0;\n      page-break-after: avoid;\n    }\n\n    h3 {\n      font-size: 14pt;\n      font-weight: 600;\n      color: #374151;\n      margin: 20px 0 8px 0;\n      page-break-after: avoid;\n    }\n\n    p {\n      margin: 0 0 12px 0;\n    }\n\n    .page-break {\n      page-break-before: always;\n    }\n\n    .no-break {\n      page-break-inside: avoid;\n    }\n\n    table {\n      width: 100%;\n      border-collapse: collapse;\n      margin: 16px 0;\n    }\n\n    th, td {\n      padding: 8px 12px;\n      border: 1px solid #e5e7eb;\n      text-align: left;\n    }\n\n    th {\n      background: #f3f4f6;\n      font-weight: 600;\n    }\n\n    .footer {\n      position: fixed;\n      bottom: 0;\n      left: 0;\n      right: 0;\n    }\n  </style>\n</head>\n<body>\n  ".concat(watermarkHTML, "\n\n  <div class=\"content\">\n    ").concat(content, "\n\n    ").concat(signatureHTML, "\n    ").concat(confidentialityHTML, "\n    ").concat(disclaimerHTML, "\n  </div>\n\n  <div class=\"footer\">\n    ").concat(idStampHTML, "\n  </div>\n</body>\n</html>\n  ").trim();
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
function validateWatermarkConfig(config) {
    var errors = [];
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
        errors: errors,
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
function generateDigitalSignature(reportId, approverEmail, approvedAt, secretKey) {
    var payload = "".concat(reportId, "|").concat(approverEmail, "|").concat(approvedAt.toISOString());
    return crypto_1.default.createHmac('sha256', secretKey).update(payload).digest('hex');
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
function verifyDigitalSignature(signature, reportId, approverEmail, approvedAt, secretKey) {
    var expectedSignature = generateDigitalSignature(reportId, approverEmail, approvedAt, secretKey);
    return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}
