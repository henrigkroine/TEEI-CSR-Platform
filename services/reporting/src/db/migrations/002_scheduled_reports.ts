import { pool } from '../connection.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runScheduledReportsMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Load and execute scheduled reports schema
    const schemaPath = join(__dirname, '../schema', 'scheduled_reports.sql');
    const schemaSql = readFileSync(schemaPath, 'utf-8');
    await client.query(schemaSql);

    console.log('✅ Applied schema: scheduled_reports.sql');

    await client.query('COMMIT');
    console.log('✅ Scheduled reports migration completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runScheduledReportsMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
