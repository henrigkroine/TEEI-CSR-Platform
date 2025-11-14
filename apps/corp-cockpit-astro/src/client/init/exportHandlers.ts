/**
 * Export Button Handlers - Worker 3 Phase D
 *
 * Extracted from inline script in index.astro
 * Handles CSV and PDF export functionality
 */

import { exportMetricsToCSV } from '../../lib/export';
import { exportMetricsToPDF } from '../../lib/pdf';

/**
 * Get company ID from cookies or context
 */
function getCompanyId(): string {
  // Try to get from cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'companyId') {
      return decodeURIComponent(value);
    }
  }

  // Default fallback
  return 'demo-company';
}

/**
 * Get company name for PDF export
 */
function getCompanyName(): string {
  // Try to get from page context (could be in a data attribute)
  const metaCompany = document.querySelector('meta[name="company-name"]');
  if (metaCompany) {
    return metaCompany.getAttribute('content') || 'Demo Company';
  }

  return 'Demo Company';
}

/**
 * Show error notification to user
 */
function showError(message: string): void {
  // Try to use native alert (will be replaced with better UI later)
  alert(message);

  // Log to console
  console.error('[Export]', message);
}

/**
 * Show success notification to user
 */
function showSuccess(message: string): void {
  console.log('[Export]', message);

  // Could show toast notification here in future
}

/**
 * Handle CSV export button click
 */
export async function handleCSVExport(companyId?: string, period: string = 'current'): Promise<void> {
  const actualCompanyId = companyId || getCompanyId();

  try {
    await exportMetricsToCSV(actualCompanyId, period);
    showSuccess('CSV export completed successfully');
  } catch (error) {
    console.error('[Export] CSV export failed:', error);
    showError('Failed to export CSV. Please try again.');
  }
}

/**
 * Handle PDF export button click
 */
export async function handlePDFExport(
  companyId?: string,
  companyName?: string,
  period: string = 'current'
): Promise<void> {
  const actualCompanyId = companyId || getCompanyId();
  const actualCompanyName = companyName || getCompanyName();

  try {
    await exportMetricsToPDF(actualCompanyId, actualCompanyName, period);
    showSuccess('PDF export completed successfully');
  } catch (error) {
    console.error('[Export] PDF export failed:', error);
    showError('Failed to export PDF. Please try again.');
  }
}

/**
 * Initialize export button event listeners
 *
 * Call this function when the page loads to attach event listeners
 */
export function initializeExportButtons(): void {
  // CSV Export button
  const csvButton = document.getElementById('exportCsvBtn');
  if (csvButton) {
    csvButton.addEventListener('click', () => {
      handleCSVExport().catch((error) => {
        console.error('[Export] Unhandled CSV export error:', error);
      });
    });
  }

  // PDF Export button
  const pdfButton = document.getElementById('exportPdfBtn');
  if (pdfButton) {
    pdfButton.addEventListener('click', () => {
      handlePDFExport().catch((error) => {
        console.error('[Export] Unhandled PDF export error:', error);
      });
    });
  }

  console.log('[Export] Export button handlers initialized');
}

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeExportButtons);
  } else {
    initializeExportButtons();
  }
}

export default {
  handleCSVExport,
  handlePDFExport,
  initializeExportButtons,
};
