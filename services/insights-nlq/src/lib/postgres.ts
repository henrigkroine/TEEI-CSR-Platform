/**
 * PostgreSQL Client for Insights NLQ Service
 *
 * Manages PostgreSQL connection pool and provides query helpers.
 */

import postgres from 'postgres';
import { config } from '../config.js';

let sql: postgres.Sql | null = null;

/**
 * Initialize PostgreSQL connection
 */
export async function initPostgres(): Promise<void> {
  if (sql) {
    return; // Already initialized
  }

  sql = postgres(config.database.postgresUrl, {
    max: config.database.poolMax,
    idle_timeout: 20,
    connect_timeout: config.database.connectionTimeout / 1000,
    onnotice: () => {}, // Suppress NOTICE messages
  });

  // Test connection
  await sql`SELECT 1 as test`;
}

/**
 * Get PostgreSQL client
 */
export function getPostgres(): postgres.Sql {
  if (!sql) {
    throw new Error('PostgreSQL not initialized. Call initPostgres() first.');
  }
  return sql;
}

/**
 * Close PostgreSQL connection
 */
export async function closePostgres(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

/**
 * Health check for PostgreSQL
 */
export async function healthCheck(): Promise<boolean> {
  if (!sql) {
    return false;
  }

  try {
    await sql`SELECT 1 as health_check`;
    return true;
  } catch (error) {
    return false;
  }
}
