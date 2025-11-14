import { createClient, ClickHouseClient } from '@clickhouse/client';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('analytics:clickhouse');

let client: ClickHouseClient | null = null;

export function getClickHouseClient(): ClickHouseClient {
  if (!client) {
    const url = process.env.CLICKHOUSE_URL || 'http://localhost:8123';
    const username = process.env.CLICKHOUSE_USER || 'teei';
    const password = process.env.CLICKHOUSE_PASSWORD || 'teei_dev_password';
    const database = process.env.CLICKHOUSE_DB || 'teei_analytics';

    client = createClient({
      url,
      username,
      password,
      database,
      request_timeout: 30000, // 30 seconds
      compression: {
        request: true,
        response: true,
      },
    });

    logger.info('ClickHouse client initialized', { url, database });
  }

  return client;
}

export async function healthCheck(): Promise<boolean> {
  try {
    const client = getClickHouseClient();
    const result = await client.ping();
    return result.success;
  } catch (error) {
    logger.error('ClickHouse health check failed', { error });
    return false;
  }
}

export async function closeClient(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    logger.info('ClickHouse client closed');
  }
}
