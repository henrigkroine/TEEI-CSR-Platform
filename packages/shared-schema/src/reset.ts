import { sql as sqlConnection } from './db.js';

async function resetDatabase() {
  console.log('Resetting database...');
  try {
    // Drop all tables (cascading)
    await sqlConnection`
      DROP SCHEMA public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO teei;
      GRANT ALL ON SCHEMA public TO public;
    `;
    console.log('Database reset successfully!');
    console.log('Run "pnpm db:migrate" to recreate tables.');
  } catch (error) {
    console.error('Reset failed:', error);
    process.exit(1);
  } finally {
    await sqlConnection.end();
  }
}

resetDatabase();
