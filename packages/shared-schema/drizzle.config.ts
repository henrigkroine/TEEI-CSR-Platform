import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/*.ts',
  out: './src/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || 'postgresql://teei:teei_dev_password@localhost:5432/teei_platform',
  },
} satisfies Config;
