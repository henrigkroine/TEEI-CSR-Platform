import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle> | null = null;
let sql: ReturnType<typeof postgres> | null = null;

/**
 * Initialize database connection
 */
export function initDatabase(databaseUrl: string) {
  if (db) {
    return db;
  }

  sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  db = drizzle(sql, { schema });
  return db;
}

/**
 * Get database instance
 */
export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase() {
  if (sql) {
    await sql.end();
    db = null;
    sql = null;
  }
}

export { schema };
