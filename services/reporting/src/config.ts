export const config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/teei_csr_platform',
    poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:4321',
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    timeWindow: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  env: process.env.NODE_ENV || 'development',
} as const;
