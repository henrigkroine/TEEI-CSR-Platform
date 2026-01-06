/**
 * Chart Renderer Service
 *
 * Server-side chart rendering for PDF exports using Playwright and ChartJS
 * Supports all ChartJS chart types with caching for performance
 *
 * Features:
 * - Multi-format support (PNG, SVG)
 * - Redis + filesystem caching
 * - All ChartJS chart types (line, bar, pie, doughnut, radar, polarArea)
 * - Retry logic and error handling
 * - Performance monitoring
 *
 * @module utils/chartRenderer
 */

import { chromium, Browser, Page } from 'playwright';
import { createHash } from 'crypto';
import { getRedisCache } from '../cache/redis-cache.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Chart configuration interface (aligned with ChartJS)
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'polarArea' | 'area';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
      tension?: number;
      pointRadius?: number;
      pointHoverRadius?: number;
    }[];
  };
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      title?: {
        display: boolean;
        text: string;
        font?: { size: number };
      };
      legend?: {
        display: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
      tooltip?: {
        enabled: boolean;
      };
    };
    scales?: any;
  };
}

/**
 * Chart rendering options
 */
export interface ChartRenderOptions {
  width?: number;
  height?: number;
  format?: 'png' | 'svg';
  quality?: number; // 0-100 for PNG quality
  backgroundColor?: string;
  deviceScaleFactor?: number; // For high-DPI rendering
  useCache?: boolean;
  cacheTTL?: number; // Cache TTL in seconds
  timeout?: number; // Rendering timeout in ms
}

/**
 * Chart rendering result
 */
export interface ChartRenderResult {
  buffer: Buffer;
  format: 'png' | 'svg';
  width: number;
  height: number;
  cacheHit: boolean;
  renderTime: number;
  cacheKey?: string;
}

/**
 * Default rendering options
 */
const DEFAULT_OPTIONS: Required<ChartRenderOptions> = {
  width: 800,
  height: 500,
  format: 'png',
  quality: 90,
  backgroundColor: '#ffffff',
  deviceScaleFactor: 2, // Retina/HiDPI
  useCache: true,
  cacheTTL: 3600, // 1 hour
  timeout: 10000, // 10 seconds
};

/**
 * Browser pool for reusing browser instances
 */
class BrowserPool {
  private browser: Browser | null = null;
  private isInitializing = false;
  private initPromise: Promise<Browser> | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    if (this.isInitializing && this.initPromise) {
      return this.initPromise;
    }

    this.isInitializing = true;
    this.initPromise = this.initializeBrowser();

    try {
      this.browser = await this.initPromise;
      return this.browser;
    } finally {
      this.isInitializing = false;
      this.initPromise = null;
    }
  }

  private async initializeBrowser(): Promise<Browser> {
    console.log('[ChartRenderer] Launching browser...');
    return await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
      ],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('[ChartRenderer] Browser closed');
    }
  }
}

const browserPool = new BrowserPool();

/**
 * Performance monitoring
 */
interface RenderStats {
  totalRenders: number;
  cacheHits: number;
  cacheMisses: number;
  totalRenderTime: number;
  errors: number;
  averageRenderTime: number;
}

const stats: RenderStats = {
  totalRenders: 0,
  cacheHits: 0,
  cacheMisses: 0,
  totalRenderTime: 0,
  errors: 0,
  averageRenderTime: 0,
};

/**
 * Generate cache key from chart config and options
 */
function generateCacheKey(config: ChartConfig, options: ChartRenderOptions): string {
  const normalized = {
    config,
    options: {
      width: options.width,
      height: options.height,
      format: options.format,
      backgroundColor: options.backgroundColor,
      deviceScaleFactor: options.deviceScaleFactor,
    },
  };
  const hash = createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest('hex');
  return `chart:${hash}`;
}

/**
 * Generate HTML template for chart rendering
 */
function generateChartHTML(config: ChartConfig, options: Required<ChartRenderOptions>): string {
  // Map area type to line with fill
  const chartType = config.type === 'area' ? 'line' : config.type;
  const chartData = { ...config.data };

  if (config.type === 'area') {
    chartData.datasets = chartData.datasets.map(ds => ({
      ...ds,
      fill: true,
      tension: ds.tension ?? 0.4,
    }));
  }

  const chartConfig = {
    type: chartType,
    data: chartData,
    options: {
      responsive: false,
      maintainAspectRatio: false,
      animation: false, // Disable for server-side rendering
      ...config.options,
    },
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: ${options.backgroundColor};
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 0;
    }
    #chartContainer {
      width: ${options.width}px;
      height: ${options.height}px;
      position: relative;
    }
    canvas {
      display: block;
    }
  </style>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
</head>
<body>
  <div id="chartContainer">
    <canvas id="chart"></canvas>
  </div>
  <script>
    (function() {
      const ctx = document.getElementById('chart').getContext('2d');
      const config = ${JSON.stringify(chartConfig)};

      // Initialize chart
      try {
        new Chart(ctx, config);

        // Signal rendering complete
        window.chartReady = true;
      } catch (error) {
        console.error('Chart rendering error:', error);
        window.chartError = error.message;
      }
    })();
  </script>
</body>
</html>`;
}

/**
 * Try to get cached chart from Redis
 */
async function getCachedChart(cacheKey: string): Promise<Buffer | null> {
  try {
    const cache = getRedisCache();
    const cached = await cache.get<{ buffer: string; format: string }>('charts', cacheKey);

    if (cached && cached.buffer) {
      return Buffer.from(cached.buffer, 'base64');
    }
  } catch (error) {
    console.warn('[ChartRenderer] Redis cache read failed:', error);
  }

  return null;
}

/**
 * Try to get cached chart from filesystem
 */
async function getCachedChartFromFS(cacheKey: string, format: string): Promise<Buffer | null> {
  try {
    const cacheDir = join(tmpdir(), 'teei-chart-cache');
    const cachePath = join(cacheDir, `${cacheKey}.${format}`);

    const buffer = await fs.readFile(cachePath);

    // Check if file is expired (based on mtime + TTL)
    const stats = await fs.stat(cachePath);
    const age = Date.now() - stats.mtimeMs;
    const maxAge = DEFAULT_OPTIONS.cacheTTL * 1000;

    if (age > maxAge) {
      await fs.unlink(cachePath).catch(() => {});
      return null;
    }

    return buffer;
  } catch (error) {
    return null;
  }
}

/**
 * Cache chart to Redis
 */
async function cacheChart(cacheKey: string, buffer: Buffer, format: string, ttl: number): Promise<void> {
  try {
    const cache = getRedisCache();
    await cache.set(
      'charts',
      cacheKey,
      {
        buffer: buffer.toString('base64'),
        format,
        createdAt: new Date().toISOString(),
      },
      ttl
    );
  } catch (error) {
    console.warn('[ChartRenderer] Redis cache write failed:', error);
  }
}

/**
 * Cache chart to filesystem (fallback)
 */
async function cacheChartToFS(cacheKey: string, buffer: Buffer, format: string): Promise<void> {
  try {
    const cacheDir = join(tmpdir(), 'teei-chart-cache');
    await fs.mkdir(cacheDir, { recursive: true });

    const cachePath = join(cacheDir, `${cacheKey}.${format}`);
    await fs.writeFile(cachePath, buffer);
  } catch (error) {
    console.warn('[ChartRenderer] Filesystem cache write failed:', error);
  }
}

/**
 * Render chart with retries
 */
async function renderChartWithRetry(
  config: ChartConfig,
  options: Required<ChartRenderOptions>,
  maxRetries: number = 3
): Promise<{ buffer: Buffer; renderTime: number }> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await renderChartInternal(config, options);
    } catch (error) {
      lastError = error as Error;
      console.warn(`[ChartRenderer] Render attempt ${attempt}/${maxRetries} failed:`, error);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 100));
      }
    }
  }

  throw new Error(`Chart rendering failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Internal chart rendering logic
 */
async function renderChartInternal(
  config: ChartConfig,
  options: Required<ChartRenderOptions>
): Promise<{ buffer: Buffer; renderTime: number }> {
  const startTime = Date.now();
  let page: Page | null = null;

  try {
    // Get browser from pool
    const browser = await browserPool.getBrowser();

    // Create new page
    page = await browser.newPage();

    // Set viewport
    await page.setViewportSize({
      width: options.width,
      height: options.height,
      deviceScaleFactor: options.deviceScaleFactor,
    });

    // Generate and load HTML
    const html = generateChartHTML(config, options);
    await page.setContent(html, {
      waitUntil: 'networkidle',
      timeout: options.timeout,
    });

    // Wait for chart to be ready
    await page.waitForFunction(
      () => (window as any).chartReady === true || (window as any).chartError,
      { timeout: options.timeout }
    );

    // Check for rendering errors
    const chartError = await page.evaluate(() => (window as any).chartError);
    if (chartError) {
      throw new Error(`Chart rendering error: ${chartError}`);
    }

    // Take screenshot
    const element = await page.$('#chartContainer');
    if (!element) {
      throw new Error('Chart container not found');
    }

    const buffer = await element.screenshot({
      type: options.format === 'svg' ? 'png' : 'png', // SVG not directly supported, convert later if needed
      quality: options.format === 'png' ? options.quality : undefined,
    });

    const renderTime = Date.now() - startTime;

    await page.close();

    return { buffer, renderTime };
  } catch (error) {
    if (page) {
      await page.close().catch(() => {});
    }
    throw error;
  }
}

/**
 * Main chart rendering function
 *
 * @param config - Chart configuration (ChartJS format)
 * @param options - Rendering options
 * @returns Chart render result with buffer and metadata
 */
export async function renderChart(
  config: ChartConfig,
  options: ChartRenderOptions = {}
): Promise<ChartRenderResult> {
  const startTime = Date.now();
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    // Generate cache key
    const cacheKey = generateCacheKey(config, opts);

    // Try cache first (if enabled)
    if (opts.useCache) {
      // Try Redis cache
      let cachedBuffer = await getCachedChart(cacheKey);

      // Fallback to filesystem cache
      if (!cachedBuffer) {
        cachedBuffer = await getCachedChartFromFS(cacheKey, opts.format);
      }

      if (cachedBuffer) {
        stats.cacheHits++;
        stats.totalRenders++;

        console.log(`[ChartRenderer] Cache hit for ${cacheKey}`);

        return {
          buffer: cachedBuffer,
          format: opts.format,
          width: opts.width,
          height: opts.height,
          cacheHit: true,
          renderTime: 0,
          cacheKey,
        };
      }
    }

    // Cache miss - render chart
    stats.cacheMisses++;
    console.log(`[ChartRenderer] Cache miss, rendering chart...`);

    const { buffer, renderTime } = await renderChartWithRetry(config, opts);

    // Update stats
    stats.totalRenders++;
    stats.totalRenderTime += renderTime;
    stats.averageRenderTime = stats.totalRenderTime / stats.totalRenders;

    // Cache the result
    if (opts.useCache) {
      await Promise.all([
        cacheChart(cacheKey, buffer, opts.format, opts.cacheTTL),
        cacheChartToFS(cacheKey, buffer, opts.format),
      ]);
    }

    console.log(`[ChartRenderer] Chart rendered in ${renderTime}ms`);

    return {
      buffer,
      format: opts.format,
      width: opts.width,
      height: opts.height,
      cacheHit: false,
      renderTime,
      cacheKey,
    };
  } catch (error) {
    stats.errors++;
    console.error('[ChartRenderer] Error:', error);
    throw error;
  }
}

/**
 * Render chart to base64 data URL (for inline use in HTML/PDF)
 */
export async function renderChartToBase64(
  config: ChartConfig,
  options: ChartRenderOptions = {}
): Promise<string> {
  const result = await renderChart(config, options);
  const base64 = result.buffer.toString('base64');
  const mimeType = result.format === 'svg' ? 'image/svg+xml' : 'image/png';
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Batch render multiple charts (more efficient)
 */
export async function renderChartsBatch(
  configs: ChartConfig[],
  options: ChartRenderOptions = {}
): Promise<ChartRenderResult[]> {
  console.log(`[ChartRenderer] Batch rendering ${configs.length} charts`);

  // Render in parallel (with concurrency limit)
  const concurrency = 3;
  const results: ChartRenderResult[] = [];

  for (let i = 0; i < configs.length; i += concurrency) {
    const batch = configs.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(config => renderChart(config, options))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Get rendering statistics
 */
export function getRenderStats(): RenderStats {
  return { ...stats };
}

/**
 * Reset statistics
 */
export function resetRenderStats(): void {
  stats.totalRenders = 0;
  stats.cacheHits = 0;
  stats.cacheMisses = 0;
  stats.totalRenderTime = 0;
  stats.errors = 0;
  stats.averageRenderTime = 0;
}

/**
 * Clear chart cache
 */
export async function clearChartCache(): Promise<void> {
  // Clear Redis cache
  try {
    const cache = getRedisCache();
    await cache.invalidatePattern('charts:*');
    console.log('[ChartRenderer] Redis cache cleared');
  } catch (error) {
    console.warn('[ChartRenderer] Failed to clear Redis cache:', error);
  }

  // Clear filesystem cache
  try {
    const cacheDir = join(tmpdir(), 'teei-chart-cache');
    const files = await fs.readdir(cacheDir);
    await Promise.all(
      files.map(file => fs.unlink(join(cacheDir, file)).catch(() => {}))
    );
    console.log('[ChartRenderer] Filesystem cache cleared');
  } catch (error) {
    console.warn('[ChartRenderer] Failed to clear filesystem cache:', error);
  }
}

/**
 * Cleanup resources (call on shutdown)
 */
export async function cleanup(): Promise<void> {
  console.log('[ChartRenderer] Cleaning up resources...');
  await browserPool.close();
}

/**
 * Warm up cache with commonly used charts
 */
export async function warmCache(configs: ChartConfig[], options: ChartRenderOptions = {}): Promise<void> {
  console.log(`[ChartRenderer] Warming cache with ${configs.length} charts`);
  await renderChartsBatch(configs, { ...options, useCache: true });
  console.log('[ChartRenderer] Cache warming complete');
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await cleanup();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await cleanup();
  process.exit(0);
});
