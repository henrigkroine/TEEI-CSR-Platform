import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL || 'postgres://teei_user:teei_dev_password@localhost:5432/teei_dev';

// Create the PostgreSQL connection
export const sql = postgres(connectionString, { max: 10 });

// Create the Drizzle instance
export const db = drizzle(sql);

// Export types
export type Database = typeof db;
