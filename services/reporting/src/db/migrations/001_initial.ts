import { pool } from '../connection.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function runInitialMigration() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Load and execute schema files in order
    const schemaFiles = [
      'companies.sql',
      'volunteers.sql',
      'sessions.sql',
      'outcomes.sql',
    ];

    for (const file of schemaFiles) {
      const schemaPath = join(__dirname, '../schema', file);
      const schemaSql = readFileSync(schemaPath, 'utf-8');
      await client.query(schemaSql);
      console.log(`✅ Applied schema: ${file}`);
    }

    await client.query('COMMIT');
    console.log('✅ Initial migration completed successfully');
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
  runInitialMigration()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
