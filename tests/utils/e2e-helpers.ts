/**
 * E2E Test Helper Utilities
 *
 * Common functions used across E2E tests
 */

import { Page } from '@playwright/test';

/**
 * Wait for event to be published and processed
 */
export async function waitForEvent(
  eventType: string,
  criteria: Record<string, any>,
  timeout: number = 10000
): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    // Poll event endpoint
    // Implementation depends on CSR Platform API structure
    await sleep(500);
  }

  throw new Error(`Timeout waiting for event ${eventType}`);
}

/**
 * Wait for metric to update on dashboard
 */
export async function waitForMetricUpdate(
  page: Page,
  widgetSelector: string,
  expectedValue: number,
  timeout: number = 10000
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const metricValue = await page.locator(`${widgetSelector} .metric-value`).textContent();
    const currentValue = parseFloat(metricValue || '0');

    if (currentValue >= expectedValue) {
      return;
    }

    await sleep(500);
  }

  throw new Error(`Timeout waiting for metric to reach ${expectedValue}`);
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries || 3;
  const baseDelay = options.baseDelay || 1000;
  const maxDelay = options.maxDelay || 10000;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Wait for page to be fully loaded and hydrated
 */
export async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');

  // Wait for any pending API requests
  await sleep(1000);
}

/**
 * Take full-page screenshot with consistent naming
 */
export async function takeScreenshot(
  page: Page,
  name: string,
  options: { fullPage?: boolean } = {}
): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `test-results/screenshots/${name}-${timestamp}.png`;

  await page.screenshot({
    path: filename,
    fullPage: options.fullPage !== false
  });
}

/**
 * Verify visual element is stable (not animating or changing)
 */
export async function waitForStableElement(
  page: Page,
  selector: string,
  timeout: number = 5000
): Promise<void> {
  const element = page.locator(selector);
  let previousPosition: any = null;
  const checkInterval = 100;
  const checks = Math.floor(timeout / checkInterval);

  for (let i = 0; i < checks; i++) {
    const boundingBox = await element.boundingBox();

    if (previousPosition && boundingBox) {
      if (
        Math.abs(boundingBox.x - previousPosition.x) < 1 &&
        Math.abs(boundingBox.y - previousPosition.y) < 1 &&
        Math.abs(boundingBox.width - previousPosition.width) < 1 &&
        Math.abs(boundingBox.height - previousPosition.height) < 1
      ) {
        return; // Element is stable
      }
    }

    previousPosition = boundingBox;
    await sleep(checkInterval);
  }
}

/**
 * Extract metric value from widget
 */
export async function getMetricValue(
  page: Page,
  widgetSelector: string
): Promise<number> {
  const metricText = await page.locator(`${widgetSelector} .metric-value`).textContent();
  return parseFloat(metricText?.replace(/[^0-9.-]/g, '') || '0');
}

/**
 * Check if service is healthy
 */
export async function checkServiceHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Wait for all services to be ready
 */
export async function waitForServices(
  services: Record<string, string>,
  timeout: number = 60000
): Promise<void> {
  const startTime = Date.now();
  const serviceNames = Object.keys(services);

  while (Date.now() - startTime < timeout) {
    const healthChecks = await Promise.all(
      serviceNames.map(async name => ({
        name,
        healthy: await checkServiceHealth(services[name])
      }))
    );

    const allHealthy = healthChecks.every(check => check.healthy);

    if (allHealthy) {
      console.log('All services ready:', serviceNames.join(', '));
      return;
    }

    const unhealthy = healthChecks.filter(c => !c.healthy).map(c => c.name);
    console.log('Waiting for services:', unhealthy.join(', '));

    await sleep(2000);
  }

  throw new Error('Timeout waiting for services to be ready');
}

/**
 * Generate random test data
 */
export function generateRandomEmail(): string {
  return `test-${crypto.randomUUID().slice(0, 8)}@teei-e2e.com`;
}

export function generateRandomName(): string {
  const firstNames = ['Alice', 'Bob', 'Carol', 'David', 'Eve', 'Frank', 'Grace', 'Henry'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];

  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)]
  };
}

/**
 * Format date for input fields
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parse metric display value (handles K, M suffixes)
 */
export function parseMetricDisplay(text: string): number {
  const cleaned = text.trim().replace(/,/g, '');

  if (cleaned.endsWith('K')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000;
  }

  if (cleaned.endsWith('M')) {
    return parseFloat(cleaned.slice(0, -1)) * 1000000;
  }

  return parseFloat(cleaned);
}
