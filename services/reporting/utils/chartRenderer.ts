/**
 * Chart Renderer Service
 *
 * Server-side chart rendering for PDF exports
 * Converts chart data to base64-encoded PNG images
 *
 * @module chartRenderer
 */

import { chromium, Browser } from 'playwright';
import type { ChartData } from '../types';

/**
 * Render chart to base64-encoded PNG
 * Uses Playwright to screenshot a chart component
 */
export async function renderChartToBase64(chart: ChartData): Promise<string> {
  let browser: Browser | null = null;

  try {
    // Generate chart HTML
    const html = generateChartHTML(chart);

    // Launch browser
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Set viewport
    await page.setViewportSize({ width: 800, height: 500 });

    // Load HTML
    await page.setContent(html, { waitUntil: 'networkidle' });

    // Wait for chart to render
    await page.waitForSelector('#chart-container', { timeout: 5000 });
    await page.waitForTimeout(500); // Brief pause for animations

    // Screenshot chart
    const element = await page.$('#chart-container');
    if (!element) {
      throw new Error('Chart container not found');
    }

    const screenshot = await element.screenshot({ type: 'png' });

    await browser.close();

    // Convert to base64 data URL
    const base64 = screenshot.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('[Chart Renderer] Error:', error.message);
    // Return placeholder image on error
    return generatePlaceholderImage(chart.title || 'Chart');
  }
}

/**
 * Generate HTML for chart rendering
 * Uses QuickChart.io as a simple solution (no complex dependencies)
 */
function generateChartHTML(chart: ChartData): string {
  // For simplicity, we'll use QuickChart.io URL-based rendering
  // This avoids complex server-side chart libraries
  const chartConfig = buildQuickChartConfig(chart);
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: white;
    }
    #chart-container {
      width: 760px;
      height: 460px;
    }
    img {
      max-width: 100%;
      max-height: 100%;
    }
  </style>
</head>
<body>
  <div id="chart-container">
    <img src="${chartUrl}" alt="${chart.title || 'Chart'}" />
  </div>
</body>
</html>
  `;
}

/**
 * Build Chart.js configuration for QuickChart
 */
function buildQuickChartConfig(chart: ChartData): any {
  const { type, data, title } = chart;

  // Map our chart types to Chart.js types
  const chartType = mapChartType(type);

  return {
    type: chartType,
    data: {
      labels: data.labels || [],
      datasets: data.datasets || [],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      title: {
        display: !!title,
        text: title || '',
        fontSize: 16,
        fontColor: '#1f2937',
      },
      legend: {
        display: true,
        position: 'bottom',
      },
      scales:
        chartType !== 'pie' && chartType !== 'doughnut'
          ? {
              yAxes: [
                {
                  ticks: {
                    beginAtZero: true,
                  },
                },
              ],
            }
          : undefined,
    },
  };
}

/**
 * Map our chart types to Chart.js types
 */
function mapChartType(type: string): string {
  const typeMap: Record<string, string> = {
    bar: 'bar',
    line: 'line',
    pie: 'pie',
    doughnut: 'doughnut',
    area: 'line', // Area charts are line charts with fill
  };
  return typeMap[type] || 'bar';
}

/**
 * Generate placeholder image for failed chart renders
 */
function generatePlaceholderImage(title: string): string {
  // SVG placeholder
  const svg = `
    <svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="500" fill="#f3f4f6"/>
      <text x="400" y="250" font-family="Arial" font-size="18" fill="#6b7280" text-anchor="middle">
        Chart: ${title}
      </text>
      <text x="400" y="280" font-family="Arial" font-size="14" fill="#9ca3af" text-anchor="middle">
        (Preview not available)
      </text>
    </svg>
  `.trim();

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Alternative: Render chart using Chart.js + node-canvas (if QuickChart unavailable)
 * This requires installing canvas package: npm install canvas chart.js
 */
export async function renderChartWithNodeCanvas(chart: ChartData): Promise<string> {
  try {
    // Dynamic import to avoid dependency if not needed
    const { createCanvas } = await import('canvas');
    const { Chart } = await import('chart.js/auto');

    const canvas = createCanvas(800, 500);
    const ctx = canvas.getContext('2d');

    const chartConfig = buildQuickChartConfig(chart);

    new Chart(ctx as any, chartConfig);

    // Convert canvas to base64
    const buffer = canvas.toBuffer('image/png');
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error('[Chart Renderer] node-canvas fallback failed:', error.message);
    return generatePlaceholderImage(chart.title || 'Chart');
  }
}
