/**
 * Vitest Global Test Setup
 * Ref: MULTI_AGENT_PLAN.md § QA Lead
 */

import { beforeAll, afterAll, beforeEach } from 'vitest';
import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  console.log('🧪 Test Suite Initialization...');

  // Set default test environment variables if not set
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://teei:teei_test@localhost:5432/teei_platform_test';
  }

  if (!process.env.NATS_URL) {
    process.env.NATS_URL = 'nats://localhost:4222';
  }

  if (!process.env.KINTELL_WEBHOOK_SECRET) {
    process.env.KINTELL_WEBHOOK_SECRET = 'test_webhook_secret_32_chars_long';
  }

  if (!process.env.UPSKILLING_WEBHOOK_SECRET) {
    process.env.UPSKILLING_WEBHOOK_SECRET = 'test_upskilling_secret_32_chars';
  }

  // Disable actual external API calls
  process.env.DISABLE_EXTERNAL_APIS = 'true';

  console.log('✅ Test environment configured');
});

// Global test cleanup
afterAll(async () => {
  console.log('🧹 Test Suite Cleanup...');

  // Add any global cleanup here
  // e.g., close database connections, event bus, etc.

  console.log('✅ Test cleanup complete');
});

// Reset between tests
beforeEach(() => {
  // Clear any test-specific state
  // This ensures tests are isolated and don't affect each other
});

// Export test utilities
export const TEST_CONSTANTS = {
  API_GATEWAY_URL: process.env.TEST_API_GATEWAY_URL || 'http://localhost:3017',
  PROFILE_SERVICE_URL: process.env.TEST_PROFILE_SERVICE_URL || 'http://localhost:3018',
  KINTELL_SERVICE_URL: process.env.TEST_KINTELL_SERVICE_URL || 'http://localhost:3027',
  BUDDY_SERVICE_URL: process.env.TEST_BUDDY_SERVICE_URL || 'http://localhost:3019',
  UPSKILLING_SERVICE_URL: process.env.TEST_UPSKILLING_SERVICE_URL || 'http://localhost:3028',
  Q2Q_SERVICE_URL: process.env.TEST_Q2Q_SERVICE_URL || 'http://localhost:3021',
  SAFETY_SERVICE_URL: process.env.TEST_SAFETY_SERVICE_URL || 'http://localhost:3022',

  TEST_JWT_SECRET: 'test_jwt_secret_for_integration_tests_only',
  TEST_WEBHOOK_SECRET: process.env.KINTELL_WEBHOOK_SECRET || 'test_webhook_secret_32_chars_long',
  TEST_UPSKILLING_SECRET: process.env.UPSKILLING_WEBHOOK_SECRET || 'test_upskilling_secret_32_chars',

  TEST_TIMEOUT: 30000,
  WEBHOOK_REPLAY_TOLERANCE: 300, // 5 minutes
};

// Helper to wait for services to be ready
export async function waitForService(url: string, maxRetries = 30, retryDelay = 1000): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${url}/health/liveness`);
      if (response.ok) {
        return true;
      }
    } catch (error) {
      // Service not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }
  return false;
}

// Mock data generators
export function generateTestUserId(): string {
  return `test_user_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function generateTestCompanyId(): string {
  return `test_company_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function generateTestEventId(): string {
  return `test_event_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}
