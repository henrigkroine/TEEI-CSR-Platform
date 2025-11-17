/**
 * PDF Renderer Service
 *
 * Server-side PDF generation for CSR reports using Playwright
 * Supports company branding, charts, citations, and professional layouts
 *
 * @module pdfRenderer
 */
import { chromium } from 'playwright';
import { generateReportHTML } from '../templates/reportTemplate';
import { renderChartToBase64 } from './chartRenderer';
/**
 * Main PDF rendering function
 * Converts a GeneratedReport to a professionally formatted PDF
 */
export async function renderReportToPDF(report, options = {}) {
    const startTime = Date.now();
    let browser = null;
    try {
        // 1. Prepare chart images (if charts included)
        const chartImages = {};
        if (options.includeCharts && report.sections) {
            for (const section of report.sections) {
                if (section.charts) {
                    for (let i = 0; i < section.charts.length; i++) {
                        const chart = section.charts[i];
                        const key = `${section.order}-${i}`;
                        chartImages[key] = await renderChartToBase64(chart);
                    }
                }
            }
        }
        // 2. Generate HTML from report
        const html = await generateReportHTML(report, {
            ...options,
            chartImages,
        });
        // 3. Launch headless browser
        browser = await chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // Prevent memory issues in Docker
            ],
        });
        const page = await browser.newPage();
        // 4. Set viewport for consistent rendering
        await page.setViewportSize({ width: 1200, height: 1600 });
        // 5. Load HTML content
        await page.setContent(html, {
            waitUntil: 'networkidle',
            timeout: 30000,
        });
        // 6. Wait for any custom fonts to load
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(500); // Brief pause for font rendering
        // 7. Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm',
            },
            displayHeaderFooter: true,
            headerTemplate: generateHeaderTemplate(report, options.theme),
            footerTemplate: generateFooterTemplate(report, options.watermark),
            preferCSSPageSize: false,
        });
        const renderTime = Date.now() - startTime;
        // 8. Get page count (estimate from buffer)
        const pageCount = estimatePageCount(pdfBuffer);
        await browser.close();
        return {
            buffer: pdfBuffer,
            metadata: {
                pageCount,
                fileSize: pdfBuffer.length,
                renderTime,
            },
        };
    }
    catch (error) {
        if (browser) {
            await browser.close();
        }
        throw new Error(`PDF rendering failed: ${error.message}`);
    }
}
/**
 * Generate header template for PDF
 * Includes company logo and report title
 */
function generateHeaderTemplate(report, theme) {
    const logoHTML = theme?.logo
        ? `<img src="${theme.logo}" style="height: 30px; margin-right: 10px;" />`
        : '';
    const primaryColor = theme?.primaryColor || '#6366f1';
    return `
    <div style="width: 100%; padding: 10px 15mm; font-size: 10px; color: #666; border-bottom: 2px solid ${primaryColor}; display: flex; align-items: center;">
      ${logoHTML}
      <span style="flex: 1;">${report.metadata?.companyName || 'CSR Impact Report'}</span>
      <span style="font-size: 8px; color: #999;">Page <span class="pageNumber"></span></span>
    </div>
  `;
}
/**
 * Generate footer template for PDF
 * Includes page numbers, generation timestamp, and optional watermark
 */
function generateFooterTemplate(report, watermark) {
    const generatedDate = new Date(report.metadata?.generatedAt || Date.now()).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const watermarkHTML = watermark
        ? `<div style="position: absolute; left: 50%; transform: translateX(-50%); font-size: 18px; color: rgba(0,0,0,0.1); font-weight: bold; text-transform: uppercase;">${watermark}</div>`
        : '';
    return `
    <div style="width: 100%; padding: 10px 15mm; font-size: 8px; color: #999; border-top: 1px solid #e5e7eb; position: relative;">
      ${watermarkHTML}
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span>Generated: ${generatedDate}</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        <span>TEEI CSR Platform</span>
      </div>
    </div>
  `;
}
/**
 * Estimate page count from PDF buffer
 * Looks for /Type /Page occurrences in PDF structure
 */
function estimatePageCount(buffer) {
    const pdfString = buffer.toString('latin1');
    const matches = pdfString.match(/\/Type\s*\/Page[^s]/g);
    return matches ? matches.length : 1;
}
const defaultCacheConfig = {
    enabled: process.env.PDF_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.PDF_CACHE_TTL || '3600', 10), // 1 hour default
    maxSize: parseInt(process.env.PDF_CACHE_MAX_SIZE_MB || '100', 10),
};
/**
 * In-memory PDF cache (for development/simple deployments)
 * For production, use Redis or S3
 */
const pdfCache = new Map();
/**
 * Get cached PDF or render new one
 */
export async function getCachedOrRenderPDF(reportId, report, options = {}) {
    const cacheKey = `${reportId}-${JSON.stringify(options)}`;
    // Check cache
    if (defaultCacheConfig.enabled) {
        const cached = pdfCache.get(cacheKey);
        if (cached) {
            const age = Date.now() - cached.timestamp;
            if (age < defaultCacheConfig.ttl * 1000) {
                console.log(`[PDF] Cache hit for report ${reportId}`);
                return {
                    buffer: cached.buffer,
                    metadata: {
                        pageCount: estimatePageCount(cached.buffer),
                        fileSize: cached.buffer.length,
                        renderTime: 0, // Cached, instant
                    },
                };
            }
            else {
                // Expired, remove from cache
                pdfCache.delete(cacheKey);
            }
        }
    }
    // Render new PDF
    console.log(`[PDF] Rendering report ${reportId}`);
    const result = await renderReportToPDF(report, options);
    // Cache result
    if (defaultCacheConfig.enabled) {
        pdfCache.set(cacheKey, {
            buffer: result.buffer,
            timestamp: Date.now(),
        });
        // Simple cache size management (evict oldest if over limit)
        manageCacheSize();
    }
    return result;
}
/**
 * Manage cache size by evicting oldest entries
 */
function manageCacheSize() {
    const maxSizeBytes = defaultCacheConfig.maxSize * 1024 * 1024;
    let totalSize = 0;
    // Calculate total cache size
    for (const entry of pdfCache.values()) {
        totalSize += entry.buffer.length;
    }
    // Evict oldest entries if over limit
    if (totalSize > maxSizeBytes) {
        const entries = Array.from(pdfCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        while (totalSize > maxSizeBytes && entries.length > 0) {
            const [key, value] = entries.shift();
            totalSize -= value.buffer.length;
            pdfCache.delete(key);
            console.log(`[PDF] Evicted cached PDF: ${key}`);
        }
    }
}
/**
 * Clear PDF cache (for testing or manual cleanup)
 */
export function clearPDFCache() {
    pdfCache.clear();
    console.log('[PDF] Cache cleared');
}
/**
 * Get cache statistics
 */
export function getPDFCacheStats() {
    let totalSize = 0;
    for (const entry of pdfCache.values()) {
        totalSize += entry.buffer.length;
    }
    return {
        entries: pdfCache.size,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        maxSizeMB: defaultCacheConfig.maxSize,
        ttl: defaultCacheConfig.ttl,
    };
}
//# sourceMappingURL=pdfRenderer.js.map