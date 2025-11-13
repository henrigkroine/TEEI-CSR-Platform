import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';

const connectionString = process.env.DATABASE_URL || 'postgresql://teei:teei_dev_password@localhost:5432/teei_platform';

// Create postgres connection
export const sql = postgres(connectionString, {
  max: parseInt(process.env.DATABASE_POOL_MAX || '10'),
  idle_timeout: 20,
  connect_timeout: 10,
});

// Create drizzle instance
export const db = drizzle(sql, { schema });

export type Database = typeof db;
