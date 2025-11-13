import type { Config } from 'drizzle-kit';

export default {
  schema: './src/tables/**/*.ts',
  out: './migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString:
      process.env.DATABASE_URL || 'postgres://teei_user:teei_dev_password@localhost:5432/teei_dev',
  },
  verbose: true,
  strict: true,
} satisfies Config;
