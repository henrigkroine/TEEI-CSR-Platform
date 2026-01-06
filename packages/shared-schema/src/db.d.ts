import postgres from 'postgres';
import * as schema from './schema/index.js';
export declare const sql: postgres.Sql<{}>;
export declare const db: import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema>;
export type Database = typeof db;
//# sourceMappingURL=db.d.ts.map