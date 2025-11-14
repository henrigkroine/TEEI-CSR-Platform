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
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.example.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || 'reports@teei.io',
        pass: process.env.SMTP_PASSWORD || '',
      },
    },
    from: {
      name: process.env.EMAIL_FROM_NAME || 'TEEI CSR Platform',
      address: process.env.EMAIL_FROM_ADDRESS || 'reports@teei.io',
    },
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3', 10),
  },
  scheduling: {
    enabled: process.env.SCHEDULING_ENABLED !== 'false',
    timezone: process.env.SCHEDULING_TIMEZONE || 'UTC',
  },
  env: process.env.NODE_ENV || 'development',
} as const;
