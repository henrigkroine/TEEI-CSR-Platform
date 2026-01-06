/**
 * ClickHouse Client for Insights NLQ Service (Optional)
 *
 * Provides connection to ClickHouse for analytics queries.
 */

import { createClient, ClickHouseClient } from '@clickhouse/client';
import { config } from '../config.js';

let client: ClickHouseClient | null = null;

/**
 * Initialize ClickHouse connection
 */
export async function initClickHouse(): Promise<void> {
  if (!config.clickhouse) {
    throw new Error('ClickHouse configuration not provided');
  }

  if (client) {
    return; // Already initialized
  }

  client = createClient({
    url: config.clickhouse.url,
    database: config.clickhouse.database,
    request_timeout: config.performance.queryTimeout,
  });

  // Test connection
  await client.ping();
}

/**
 * Get ClickHouse client
 */
export function getClickHouse(): ClickHouseClient {
  if (!client) {
    throw new Error('ClickHouse not initialized. Call initClickHouse() first.');
  }
  return client;
}

/**
 * Close ClickHouse connection
 */
export async function closeClickHouse(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
  }
}

/**
 * Health check for ClickHouse
 */
export async function healthCheck(): Promise<boolean> {
  if (!client) {
    return false;
  }

  try {
    const result = await client.ping();
    return result.success;
  } catch (error) {
    return false;
  }
}
