/**
 * PPTX Bridge
 *
 * Frontend bridge for PowerPoint export functionality.
 * Handles job submission, status polling, and file download.
 *
 * @module lib/reporting/pptxBridge
 */

/**
 * PPTX export options
 */
export interface PPTXExportOptions {
  format: 'pdf' | 'pptx' | 'both';
  companyId: string;
  reportId?: string;
  period: string;
  narrative: {
    tone: 'formal' | 'conversational' | 'technical';
    length: 'brief' | 'standard' | 'detailed';
    audience: 'board' | 'management' | 'public';
    promptInstructions: string;
  };
  watermark: {
    enabled: boolean;
    text: string;
  };
  includeEvidenceAppendix: boolean;
}

/**
 * Export job status
 */
export interface ExportJobStatus {
  exportId: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  message: string;
  pdfUrl?: string;
  pptxUrl?: string;
  completedAt?: string;
  error?: string;
}

/**
 * Export job submission response
 */
export interface ExportJobResponse {
  exportId: string;
  message: string;
  statusUrl: string;
}

/**
 * API base URL for exports
 */
const API_BASE_URL = import.meta.env.PUBLIC_REPORTING_API_URL || '';

/**
 * Submit PPTX export job
 *
 * @param options - Export options
 * @returns Export job response with ID and status URL
 */
export async function submitPPTXJob(options: PPTXExportOptions): Promise<ExportJobResponse> {
  const response = await fetch(`${API_BASE_URL}/exports/presentations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to submit export job: ${error.error || response.statusText}`);
  }

  return await response.json();
}

/**
 * Poll export job status
 *
 * @param jobId - Export job ID
 * @returns Current job status
 */
export async function pollPPTXStatus(jobId: string): Promise<ExportJobStatus> {
  const response = await fetch(`${API_BASE_URL}/exports/${jobId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(`Failed to poll export status: ${error.error || response.statusText}`);
  }

  return await response.json();
}

/**
 * Download completed PPTX file
 *
 * @param jobId - Export job ID
 * @param format - File format to download (pdf or pptx)
 * @returns Download URL
 */
export async function downloadPPTX(jobId: string, format: 'pdf' | 'pptx' = 'pptx'): Promise<string> {
  const url = `${API_BASE_URL}/exports/${jobId}/download?format=${format}`;

  // Check if file is ready
  const statusResponse = await fetch(`${API_BASE_URL}/exports/${jobId}/status`);
  if (!statusResponse.ok) {
    throw new Error('Export not found');
  }

  const status: ExportJobStatus = await statusResponse.json();

  if (status.status !== 'completed') {
    throw new Error(`Export not ready: ${status.status}`);
  }

  const fileUrl = format === 'pdf' ? status.pdfUrl : status.pptxUrl;
  if (!fileUrl) {
    throw new Error(`${format.toUpperCase()} not available for this export`);
  }

  return url;
}

/**
 * Poll export status with progress updates
 * Uses polling with exponential backoff
 *
 * @param jobId - Export job ID
 * @param onProgress - Progress callback
 * @param options - Polling options
 * @returns Final job status
 */
export async function pollWithProgress(
  jobId: string,
  onProgress: (status: ExportJobStatus) => void,
  options: {
    initialDelay?: number;
    maxDelay?: number;
    timeout?: number;
  } = {}
): Promise<ExportJobStatus> {
  const { initialDelay = 1000, maxDelay = 5000, timeout = 60000 } = options;

  const startTime = Date.now();
  let delay = initialDelay;

  while (true) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error('Export timed out');
    }

    // Poll status
    const status = await pollPPTXStatus(jobId);
    onProgress(status);

    // Check if complete or failed
    if (status.status === 'completed') {
      return status;
    }

    if (status.status === 'failed') {
      throw new Error(status.error || 'Export failed');
    }

    // Wait before next poll
    await sleep(delay);

    // Exponential backoff (up to maxDelay)
    delay = Math.min(delay * 1.5, maxDelay);
  }
}

/**
 * Subscribe to export progress via SSE
 * Fallback to polling if SSE not available
 *
 * @param jobId - Export job ID
 * @param onProgress - Progress callback
 * @returns Unsubscribe function
 */
export function subscribeToProgress(
  jobId: string,
  onProgress: (status: ExportJobStatus) => void
): () => void {
  // Check if SSE is supported
  if (typeof EventSource === 'undefined') {
    console.warn('[PPTXBridge] SSE not supported, falling back to polling');
    // Fallback to polling
    let cancelled = false;
    pollWithProgress(jobId, onProgress).catch((error) => {
      if (!cancelled) {
        console.error('[PPTXBridge] Polling error:', error);
      }
    });

    return () => {
      cancelled = true;
    };
  }

  // Use SSE for real-time updates
  const eventSource = new EventSource(`${API_BASE_URL}/exports/${jobId}/stream`);

  eventSource.onmessage = (event) => {
    try {
      const status: ExportJobStatus = JSON.parse(event.data);
      onProgress(status);

      // Close connection if complete or failed
      if (status.status === 'completed' || status.status === 'failed') {
        eventSource.close();
      }
    } catch (error) {
      console.error('[PPTXBridge] Failed to parse SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('[PPTXBridge] SSE error:', error);
    eventSource.close();

    // Fallback to polling
    pollWithProgress(jobId, onProgress).catch(console.error);
  };

  return () => {
    eventSource.close();
  };
}

/**
 * Generate and download PPTX in one call
 * Convenience method that handles job submission, polling, and download
 *
 * @param options - Export options
 * @param onProgress - Progress callback
 * @returns Download URL
 */
export async function generateAndDownload(
  options: PPTXExportOptions,
  onProgress?: (status: ExportJobStatus) => void
): Promise<string> {
  // Submit job
  const job = await submitPPTXJob(options);

  // Poll until complete
  const finalStatus = await pollWithProgress(
    job.exportId,
    (status) => {
      if (onProgress) {
        onProgress(status);
      }
    },
    {
      timeout: 120000, // 2 minutes
    }
  );

  // Get download URL
  const format = options.format === 'both' ? 'pptx' : options.format;
  return await downloadPPTX(job.exportId, format);
}

/**
 * Helper: Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validate export options before submission
 *
 * @param options - Export options to validate
 * @returns Validation errors (empty array if valid)
 */
export function validateExportOptions(options: PPTXExportOptions): string[] {
  const errors: string[] = [];

  if (!options.companyId) {
    errors.push('Company ID is required');
  }

  if (!options.period) {
    errors.push('Period is required');
  }

  if (!['pdf', 'pptx', 'both'].includes(options.format)) {
    errors.push('Format must be pdf, pptx, or both');
  }

  if (!['formal', 'conversational', 'technical'].includes(options.narrative.tone)) {
    errors.push('Invalid narrative tone');
  }

  if (!['brief', 'standard', 'detailed'].includes(options.narrative.length)) {
    errors.push('Invalid narrative length');
  }

  if (!['board', 'management', 'public'].includes(options.narrative.audience)) {
    errors.push('Invalid narrative audience');
  }

  return errors;
}
