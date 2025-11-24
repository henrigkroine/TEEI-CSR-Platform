/**
 * Database Connection - Drizzle ORM
 *
 * Provides Drizzle database instance for type-safe queries
 * Uses the existing PostgreSQL connection pool
 *
 * @module db/index
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from './connection.js';
import * as schema from '@teei/shared-schema';

/**
 * Drizzle database instance
 * Wraps the existing PostgreSQL pool with Drizzle ORM
 */
export const db = drizzle(pool, { schema });

/**
 * Export pool for backward compatibility
 */
export { pool } from './connection.js';
