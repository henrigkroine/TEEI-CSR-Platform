import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';
const connectionString = process.env.DATABASE_URL || 'postgresql://teei:teei_dev_password@localhost:5432/teei_platform';
// Create postgres connection
// Optimized for high-end development workstation (128GB RAM, 16c/32t)
// PostgreSQL max_connections: 500 (in docker-compose.dev.yml)
// Default pool: 100 connections (can be overridden via DATABASE_POOL_MAX)
export const sql = postgres(connectionString, {
    max: parseInt(process.env.DATABASE_POOL_MAX || '100'),
    idle_timeout: 20,
    connect_timeout: 10,
});
// Create drizzle instance
export const db = drizzle(sql, { schema });
//# sourceMappingURL=db.js.map