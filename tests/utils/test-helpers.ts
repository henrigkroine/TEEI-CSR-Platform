/**
 * Test Utilities and Helpers
 * Ref: MULTI_AGENT_PLAN.md § QA Lead
 */

import crypto from 'crypto';
import { TEST_CONSTANTS } from '../setup.js';

/**
 * Generate HMAC signature for webhook testing
 */
export function generateWebhookSignature(
  payload: string | object,
  secret: string,
  includeTimestamp = false
): string {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const signature = hmac.digest('hex');

  if (includeTimestamp) {
    const timestamp = Math.floor(Date.now() / 1000);
    return `t=${timestamp},v1=${signature}`;
  }

  return `sha256=${signature}`;
}

/**
 * Generate expired webhook signature (for replay attack testing)
 */
export function generateExpiredWebhookSignature(
  payload: string | object,
  secret: string,
  ageInSeconds = 600 // 10 minutes old
): string {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const signature = hmac.digest('hex');

  const expiredTimestamp = Math.floor(Date.now() / 1000) - ageInSeconds;
  return `t=${expiredTimestamp},v1=${signature}`;
}

/**
 * Generate invalid webhook signature (for security testing)
 */
export function generateInvalidWebhookSignature(): string {
  return `sha256=${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Create test JWT token
 */
export function createTestJWT(payload: object, expiresIn = '24h'): string {
  // This is a simplified version for testing
  // In real implementation, use proper JWT library with RS256
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', TEST_CONSTANTS.TEST_JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Wait for a condition to be true (with timeout)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeoutMs = 10000,
  intervalMs = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const result = await condition();
    if (result) {
      return true;
    }
    await sleep(intervalMs);
  }

  return false;
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate unique test ID
 */
export function generateTestId(prefix = 'test'): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

/**
 * Make HTTP request with retries
 */
export async function httpRequestWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  retryDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries - 1) {
        await sleep(retryDelay * (attempt + 1)); // Exponential backoff
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Compare objects deeply (for test assertions)
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;
  if (obj1 == null || obj2 == null) return false;
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return false;

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * Create test profile data
 */
export function createTestProfile(overrides: Partial<any> = {}) {
  return {
    userId: generateTestId('user'),
    email: `test${Date.now()}@example.com`,
    name: 'Test User',
    companyId: generateTestId('company'),
    ...overrides
  };
}

/**
 * Create test webhook payload
 */
export function createTestWebhookPayload(type: string, data: any) {
  return {
    event_type: type,
    event_id: generateTestId('evt'),
    timestamp: Math.floor(Date.now() / 1000),
    delivery_id: generateTestId('delivery'),
    data
  };
}

/**
 * Mock event bus for testing
 */
export class MockEventBus {
  private events: Array<{ subject: string; data: any }> = [];
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.events = [];
  }

  async publish(subject: string, data: any): Promise<void> {
    if (!this.connected) {
      throw new Error('Event bus not connected');
    }
    this.events.push({ subject, data });
  }

  getPublishedEvents(): Array<{ subject: string; data: any }> {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Load fixture file
 */
export async function loadFixture(filename: string): Promise<any> {
  const path = await import('path');
  const fs = await import('fs/promises');
  const fixturesDir = path.resolve(__dirname, '../fixtures');
  const filePath = path.join(fixturesDir, filename);
  const content = await fs.readFile(filePath, 'utf-8');

  if (filename.endsWith('.json')) {
    return JSON.parse(content);
  }

  return content;
}

/**
 * Verify response has correct CORS headers
 */
export function verifyCORSHeaders(response: Response, expectedOrigin?: string): boolean {
  const corsHeader = response.headers.get('access-control-allow-origin');
  if (expectedOrigin) {
    return corsHeader === expectedOrigin;
  }
  return corsHeader !== null;
}

/**
 * Create test CSV data
 */
export function createTestCSV(rows: Array<Record<string, any>>): string {
  if (rows.length === 0) return '';

  const headers = Object.keys(rows[0]);
  const csvHeaders = headers.join(',');
  const csvRows = rows.map(row =>
    headers.map(header => {
      const value = row[header];
      // Escape commas and quotes in CSV values
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  return [csvHeaders, ...csvRows].join('\n');
}
