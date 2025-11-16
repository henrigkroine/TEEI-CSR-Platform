/**
 * Offline Snapshot Utility for Boardroom Live
 *
 * Creates static HTML snapshots of the boardroom dashboard for offline viewing.
 * Captures current state, embeds inline styles, and saves as a single HTML file.
 *
 * Features:
 * - Capture full page HTML including styles
 * - Embed external CSS as inline styles
 * - Convert canvas charts to static images
 * - Save current data state (localStorage backup)
 * - Generate watermarked PDF from snapshot
 * - Include timestamp and metadata
 * - Compress and download as single file
 *
 * Performance targets:
 * - Snapshot generation: < 2.0s (p95)
 * - File size: < 5MB
 * - Load time (offline): < 2.0s (p95)
 *
 * @module OfflineSnapshot
 */

export interface SnapshotOptions {
  /** Company ID */
  companyId: string;
  /** Include evidence data in snapshot */
  includeEvidence?: boolean;
  /** Include lineage metadata */
  includeLineage?: boolean;
  /** Watermark text */
  watermark?: string;
  /** Quality for image conversion (0-1) */
  imageQuality?: number;
  /** Include timestamp in filename */
  includeTimestamp?: boolean;
  /** Custom filename (without extension) */
  filename?: string;
}

export interface SnapshotMetadata {
  /** When snapshot was created */
  timestamp: string;
  /** Company ID */
  companyId: string;
  /** User who created snapshot */
  createdBy?: string;
  /** Page title */
  title: string;
  /** Current URL */
  url: string;
  /** Data included in snapshot */
  dataIncluded: {
    evidence: boolean;
    lineage: boolean;
    charts: number;
    metrics: number;
  };
  /** Watermark text */
  watermark?: string;
}

export interface SnapshotResult {
  /** Success status */
  success: boolean;
  /** Generated HTML */
  html?: string;
  /** Metadata */
  metadata?: SnapshotMetadata;
  /** File size in bytes */
  fileSize?: number;
  /** Generation time in ms */
  generationTime?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Create offline snapshot of current page
 */
export async function createSnapshot(
  options: SnapshotOptions
): Promise<SnapshotResult> {
  const startTime = performance.now();

  try {
    console.log('[OfflineSnapshot] Starting snapshot generation', options);

    // Get current page HTML
    const html = document.documentElement.cloneNode(true) as HTMLElement;

    // Remove scripts (not needed for static snapshot)
    const scripts = html.querySelectorAll('script');
    scripts.forEach((script) => script.remove());

    // Convert canvas elements to static images
    const canvases = document.querySelectorAll('canvas');
    const canvasImages = html.querySelectorAll('canvas');

    for (let i = 0; i < canvases.length && i < canvasImages.length; i++) {
      const originalCanvas = canvases[i];
      const clonedCanvas = canvasImages[i];

      try {
        // Convert canvas to data URL
        const dataUrl = originalCanvas.toDataURL('image/png', options.imageQuality ?? 0.9);

        // Replace canvas with img element
        const img = document.createElement('img');
        img.src = dataUrl;
        img.alt = 'Chart snapshot';
        img.style.cssText = originalCanvas.style.cssText;
        img.className = originalCanvas.className;

        clonedCanvas.parentNode?.replaceChild(img, clonedCanvas);
      } catch (err) {
        console.warn('[OfflineSnapshot] Failed to convert canvas to image:', err);
      }
    }

    // Inline all external CSS
    await inlineStyles(html);

    // Add watermark if specified
    if (options.watermark) {
      addWatermark(html, options.watermark);
    }

    // Create metadata
    const metadata: SnapshotMetadata = {
      timestamp: new Date().toISOString(),
      companyId: options.companyId,
      title: document.title,
      url: window.location.href,
      dataIncluded: {
        evidence: options.includeEvidence ?? false,
        lineage: options.includeLineage ?? false,
        charts: canvases.length,
        metrics: document.querySelectorAll('[data-metric]').length,
      },
      watermark: options.watermark,
    };

    // Embed metadata as JSON in HTML
    const metadataScript = document.createElement('script');
    metadataScript.type = 'application/json';
    metadataScript.id = 'snapshot-metadata';
    metadataScript.textContent = JSON.stringify(metadata, null, 2);
    html.querySelector('head')?.appendChild(metadataScript);

    // Add offline indicator banner
    addOfflineBanner(html, metadata);

    // Backup localStorage data if needed
    if (options.includeEvidence || options.includeLineage) {
      const dataBackup = captureLocalStorageData(options.companyId);
      const dataScript = document.createElement('script');
      dataScript.type = 'application/json';
      dataScript.id = 'snapshot-data';
      dataScript.textContent = JSON.stringify(dataBackup, null, 2);
      html.querySelector('head')?.appendChild(dataScript);
    }

    // Serialize to HTML string
    const htmlString = new XMLSerializer().serializeToString(html);
    const doctype = '<!DOCTYPE html>\n';
    const fullHtml = doctype + htmlString;

    const generationTime = performance.now() - startTime;
    const fileSize = new Blob([fullHtml]).size;

    console.log('[OfflineSnapshot] Snapshot generated successfully', {
      generationTime: `${generationTime.toFixed(2)}ms`,
      fileSize: `${(fileSize / 1024).toFixed(2)} KB`,
    });

    return {
      success: true,
      html: fullHtml,
      metadata,
      fileSize,
      generationTime,
    };
  } catch (error) {
    const generationTime = performance.now() - startTime;
    console.error('[OfflineSnapshot] Snapshot generation failed:', error);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      generationTime,
    };
  }
}

/**
 * Download snapshot as HTML file
 */
export async function downloadSnapshot(
  options: SnapshotOptions
): Promise<SnapshotResult> {
  const result = await createSnapshot(options);

  if (!result.success || !result.html) {
    return result;
  }

  try {
    // Generate filename
    const timestamp = options.includeTimestamp
      ? `-${new Date().toISOString().split('T')[0]}`
      : '';
    const filename =
      options.filename || `boardroom-snapshot-${options.companyId}${timestamp}.html`;

    // Create blob and download
    const blob = new Blob([result.html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();

    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);

    console.log('[OfflineSnapshot] Snapshot downloaded:', filename);

    return result;
  } catch (error) {
    console.error('[OfflineSnapshot] Download failed:', error);
    return {
      ...result,
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

/**
 * Inline all external CSS stylesheets
 */
async function inlineStyles(html: HTMLElement): Promise<void> {
  const styleSheets = Array.from(document.styleSheets);
  const inlineStylesElement = document.createElement('style');
  inlineStylesElement.id = 'inlined-styles';

  let cssText = '';

  for (const sheet of styleSheets) {
    try {
      // Skip external stylesheets from different origins (CORS)
      if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
        console.warn('[OfflineSnapshot] Skipping external stylesheet:', sheet.href);
        continue;
      }

      // Get all CSS rules
      const rules = Array.from(sheet.cssRules || []);
      for (const rule of rules) {
        cssText += rule.cssText + '\n';
      }
    } catch (err) {
      console.warn('[OfflineSnapshot] Could not access stylesheet:', err);
    }
  }

  inlineStylesElement.textContent = cssText;

  // Remove existing stylesheet links
  const links = html.querySelectorAll('link[rel="stylesheet"]');
  links.forEach((link) => link.remove());

  // Add inlined styles
  html.querySelector('head')?.appendChild(inlineStylesElement);
}

/**
 * Add watermark to snapshot
 */
function addWatermark(html: HTMLElement, watermark: string): void {
  const watermarkDiv = document.createElement('div');
  watermarkDiv.id = 'snapshot-watermark';
  watermarkDiv.textContent = watermark;
  watermarkDiv.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    z-index: 9999;
    pointer-events: none;
  `;

  html.querySelector('body')?.appendChild(watermarkDiv);
}

/**
 * Add offline indicator banner
 */
function addOfflineBanner(html: HTMLElement, metadata: SnapshotMetadata): void {
  const banner = document.createElement('div');
  banner.id = 'offline-snapshot-banner';
  banner.innerHTML = `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      text-align: center;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    ">
      📸 Offline Snapshot • Created ${new Date(metadata.timestamp).toLocaleString()} • ${metadata.companyId}
    </div>
  `;

  // Adjust body padding to account for banner
  const body = html.querySelector('body');
  if (body) {
    const existingPadding = body.style.paddingTop || '0px';
    const paddingValue = parseInt(existingPadding) || 0;
    body.style.paddingTop = `${paddingValue + 48}px`;
    body.appendChild(banner);
  }
}

/**
 * Capture relevant localStorage data
 */
function captureLocalStorageData(companyId: string): Record<string, any> {
  const data: Record<string, any> = {};
  const prefix = `teei_${companyId}_`;

  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const value = localStorage.getItem(key);
        if (value) {
          try {
            data[key] = JSON.parse(value);
          } catch {
            data[key] = value;
          }
        }
      }
    }
  } catch (error) {
    console.warn('[OfflineSnapshot] Failed to capture localStorage:', error);
  }

  return data;
}

/**
 * Restore localStorage data from snapshot
 */
export function restoreSnapshotData(): void {
  const dataScript = document.getElementById('snapshot-data');
  if (!dataScript) {
    console.log('[OfflineSnapshot] No snapshot data to restore');
    return;
  }

  try {
    const data = JSON.parse(dataScript.textContent || '{}');

    for (const [key, value] of Object.entries(data)) {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
    }

    console.log('[OfflineSnapshot] Restored snapshot data to localStorage');
  } catch (error) {
    console.error('[OfflineSnapshot] Failed to restore snapshot data:', error);
  }
}

/**
 * Check if current page is a snapshot
 */
export function isSnapshot(): boolean {
  return !!document.getElementById('snapshot-metadata');
}

/**
 * Get snapshot metadata (if current page is a snapshot)
 */
export function getSnapshotMetadata(): SnapshotMetadata | null {
  const metadataScript = document.getElementById('snapshot-metadata');
  if (!metadataScript) {
    return null;
  }

  try {
    return JSON.parse(metadataScript.textContent || '{}');
  } catch {
    return null;
  }
}

/**
 * Convert snapshot to PDF (watermarked)
 */
export async function snapshotToPDF(
  options: SnapshotOptions
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate snapshot first
    const snapshot = await createSnapshot(options);

    if (!snapshot.success || !snapshot.html) {
      throw new Error(snapshot.error || 'Snapshot generation failed');
    }

    // Use browser's print-to-PDF functionality
    // Note: This requires user interaction due to browser security
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Failed to open print window (popup blocked?)');
    }

    printWindow.document.write(snapshot.html);
    printWindow.document.close();

    // Add print styles
    const printStyle = printWindow.document.createElement('style');
    printStyle.textContent = `
      @media print {
        @page {
          margin: 1cm;
          size: A4 landscape;
        }
        body {
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }
        #offline-snapshot-banner {
          display: block !important;
        }
        #snapshot-watermark {
          display: block !important;
        }
      }
    `;
    printWindow.document.head.appendChild(printStyle);

    // Trigger print dialog
    printWindow.print();

    return { success: true };
  } catch (error) {
    console.error('[OfflineSnapshot] PDF generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF generation failed',
    };
  }
}
