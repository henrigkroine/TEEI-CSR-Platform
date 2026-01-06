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
/**
 * Enhanced watermark configuration
 */
export interface PDFWatermarkConfig {
    enabled: boolean;
    text?: string;
    position: 'header' | 'footer' | 'diagonal' | 'corner';
    opacity: number;
    font_size: number;
    color: string;
    includeIdStamp?: boolean;
    includeSignature?: boolean;
    includeConfidentiality?: boolean;
    reportId?: string;
    companyName?: string;
    period?: string;
    approverName?: string;
    approvedAt?: Date;
}
/**
 * ID stamp configuration
 */
export interface IDStampConfig {
    reportId: string;
    generatedAt: Date;
    evidenceHash: string;
    pageNumber: number;
    totalPages: number;
}
/**
 * Signature block configuration
 */
export interface SignatureBlockConfig {
    approverName: string;
    approverTitle: string;
    approvedAt: Date;
    digitalSignature?: string;
}
/**
 * Generate SHA-256 hash of evidence set
 *
 * @param evidenceIds - Array of evidence IDs
 * @returns SHA-256 hash in hex format
 */
export declare function generateEvidenceHash(evidenceIds: string[]): string;
/**
 * Generate Report ID
 *
 * @param companyId - Company identifier
 * @param period - Reporting period
 * @returns Report ID in format: RPT-{company}-{period}-{timestamp}
 */
export declare function generateReportId(companyId: string, period: string): string;
/**
 * Create ID stamp HTML for PDF footer
 *
 * @param config - ID stamp configuration
 * @returns HTML string for footer
 */
export declare function createIDStampHTML(config: IDStampConfig): string;
/**
 * Create watermark overlay HTML
 *
 * @param config - Watermark configuration
 * @returns HTML string for watermark
 */
export declare function createWatermarkHTML(config: PDFWatermarkConfig): string;
/**
 * Create signature block HTML
 *
 * @param config - Signature block configuration
 * @returns HTML string for signature
 */
export declare function createSignatureBlockHTML(config: SignatureBlockConfig): string;
/**
 * Create confidentiality notice HTML
 *
 * @returns HTML string for confidentiality notice
 */
export declare function createConfidentialityNoticeHTML(): string;
/**
 * Create methodology disclaimer HTML
 *
 * @returns HTML string for methodology disclaimer
 */
export declare function createMethodologyDisclaimerHTML(): string;
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
export declare function generateWatermarkedPDFHTML(content: string, config: PDFWatermarkConfig, idStamp: IDStampConfig, signatureBlock?: SignatureBlockConfig): string;
/**
 * Validate watermark configuration
 */
export declare function validateWatermarkConfig(config: PDFWatermarkConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * Generate digital signature for approval
 *
 * @param reportId - Report ID
 * @param approverEmail - Approver's email
 * @param approvedAt - Approval timestamp
 * @param secretKey - Secret signing key
 * @returns HMAC-SHA256 signature in hex format
 */
export declare function generateDigitalSignature(reportId: string, approverEmail: string, approvedAt: Date, secretKey: string): string;
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
export declare function verifyDigitalSignature(signature: string, reportId: string, approverEmail: string, approvedAt: Date, secretKey: string): boolean;
//# sourceMappingURL=pdfWatermark.d.ts.map