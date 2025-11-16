/**
 * Configuration module for Insights NLQ Service
 *
 * Centralizes all environment variable parsing and validation.
 * Follows the pattern established in other TEEI services.
 */

export interface Config {
  // Server configuration
  server: {
    port: number;
    host: string;
    env: string;
  };

  // Database connections
  database: {
    postgresUrl: string;
    poolMin: number;
    poolMax: number;
    connectionTimeout: number;
  };

  // ClickHouse (optional, for advanced analytics)
  clickhouse?: {
    url: string;
    database: string;
    enabled: boolean;
  };

  // Redis cache
  redis: {
    url: string;
    keyPrefix: string;
    defaultTTL: number; // seconds
  };

  // LLM providers
  llm: {
    anthropicApiKey?: string;
    openaiApiKey?: string;
    defaultProvider: 'anthropic' | 'openai';
    defaultModel: string;
    maxTokens: number;
    temperature: number;
  };

  // NATS event bus
  nats: {
    url: string;
    enabled: boolean;
    reconnectAttempts: number;
  };

  // Feature flags
  features: {
    enableClickHouse: boolean;
    enableCacheWarming: boolean;
    enableNatsEvents: boolean;
    enablePrometheusMetrics: boolean;
    enableSafetyChecks: boolean;
  };

  // Performance & limits
  performance: {
    maxConcurrentQueries: number;
    queryTimeout: number; // milliseconds
    maxResultRows: number;
    enableQueryCache: boolean;
  };

  // Rate limiting
  rateLimit: {
    enabled: boolean;
    maxRequests: number;
    windowMs: number; // milliseconds
    skipSuccessfulRequests: boolean;
  };

  // Security
  security: {
    jwtSecret?: string;
    corsOrigin: string;
    allowedTablePatterns: string[]; // Regex patterns for allowed tables
    blockedKeywords: string[]; // SQL keywords to block (DROP, DELETE, etc.)
  };

  // Logging
  logging: {
    level: string;
    prettyPrint: boolean;
    redactPaths: string[]; // Paths to redact in logs (API keys, PII)
  };
}

/**
 * Parse and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';

  // Validate required environment variables
  const requiredVars = [
    'DATABASE_URL',
    'REDIS_URL',
  ];

  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }

  // LLM provider validation
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!anthropicKey && !openaiKey) {
    throw new Error('At least one LLM provider API key required (ANTHROPIC_API_KEY or OPENAI_API_KEY)');
  }

  const defaultProvider = (process.env.LLM_PROVIDER || 'anthropic') as 'anthropic' | 'openai';

  // Validate default provider has key
  if (defaultProvider === 'anthropic' && !anthropicKey) {
    throw new Error('ANTHROPIC_API_KEY required when LLM_PROVIDER=anthropic');
  }
  if (defaultProvider === 'openai' && !openaiKey) {
    throw new Error('OPENAI_API_KEY required when LLM_PROVIDER=openai');
  }

  const config: Config = {
    server: {
      port: parseInt(process.env.PORT_INSIGHTS_NLQ || process.env.PORT || '3009', 10),
      host: process.env.HOST || '0.0.0.0',
      env,
    },

    database: {
      postgresUrl: process.env.DATABASE_URL!,
      poolMin: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
      poolMax: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
      connectionTimeout: parseInt(process.env.DATABASE_TIMEOUT || '10000', 10),
    },

    clickhouse: process.env.CLICKHOUSE_URL ? {
      url: process.env.CLICKHOUSE_URL,
      database: process.env.CLICKHOUSE_DATABASE || 'teei_analytics',
      enabled: process.env.ENABLE_CLICKHOUSE !== 'false',
    } : undefined,

    redis: {
      url: process.env.REDIS_URL!,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'insights-nlq:',
      defaultTTL: parseInt(process.env.REDIS_DEFAULT_TTL || '3600', 10), // 1 hour
    },

    llm: {
      anthropicApiKey: anthropicKey,
      openaiApiKey: openaiKey,
      defaultProvider,
      defaultModel: process.env.LLM_MODEL || (
        defaultProvider === 'anthropic'
          ? 'claude-3-5-sonnet-20241022'
          : 'gpt-4-turbo-preview'
      ),
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '4096', 10),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0'),
    },

    nats: {
      url: process.env.NATS_URL || 'nats://localhost:4222',
      enabled: process.env.ENABLE_NATS !== 'false',
      reconnectAttempts: parseInt(process.env.NATS_RECONNECT_ATTEMPTS || '10', 10),
    },

    features: {
      enableClickHouse: process.env.ENABLE_CLICKHOUSE === 'true',
      enableCacheWarming: process.env.ENABLE_CACHE_WARMING !== 'false',
      enableNatsEvents: process.env.ENABLE_NATS !== 'false',
      enablePrometheusMetrics: process.env.ENABLE_PROMETHEUS !== 'false',
      enableSafetyChecks: process.env.ENABLE_SAFETY_CHECKS !== 'false',
    },

    performance: {
      maxConcurrentQueries: parseInt(process.env.MAX_CONCURRENT_QUERIES || '10', 10),
      queryTimeout: parseInt(process.env.QUERY_TIMEOUT || '30000', 10), // 30 seconds
      maxResultRows: parseInt(process.env.MAX_RESULT_ROWS || '10000', 10),
      enableQueryCache: process.env.ENABLE_QUERY_CACHE !== 'false',
    },

    rateLimit: {
      enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
      maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
      skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
    },

    security: {
      jwtSecret: process.env.JWT_SECRET,
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4321',
      allowedTablePatterns: parseStringArray(
        process.env.ALLOWED_TABLE_PATTERNS ||
        'events,metrics,analytics,csrd_metrics,volunteer_activities,sroi_calculations'
      ),
      blockedKeywords: parseStringArray(
        process.env.BLOCKED_SQL_KEYWORDS ||
        'DROP,DELETE,TRUNCATE,ALTER,CREATE,INSERT,UPDATE,GRANT,REVOKE,EXEC,EXECUTE'
      ),
    },

    logging: {
      level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
      prettyPrint: process.env.LOG_PRETTY === 'true' || isDevelopment,
      redactPaths: [
        'req.headers.authorization',
        'req.headers["x-api-key"]',
        '*.apiKey',
        '*.password',
        '*.token',
        'llm.anthropicApiKey',
        'llm.openaiApiKey',
      ],
    },
  };

  return config;
}

/**
 * Parse comma-separated string array
 */
function parseStringArray(value: string): string[] {
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

/**
 * Validate configuration at runtime
 */
export function validateConfig(config: Config): void {
  // Validate port range
  if (config.server.port < 1 || config.server.port > 65535) {
    throw new Error(`Invalid port: ${config.server.port}`);
  }

  // Validate database pool
  if (config.database.poolMin > config.database.poolMax) {
    throw new Error('DATABASE_POOL_MIN cannot exceed DATABASE_POOL_MAX');
  }

  // Validate Redis TTL
  if (config.redis.defaultTTL < 0) {
    throw new Error('REDIS_DEFAULT_TTL must be positive');
  }

  // Validate LLM config
  if (config.llm.maxTokens < 1 || config.llm.maxTokens > 128000) {
    throw new Error('LLM_MAX_TOKENS must be between 1 and 128000');
  }

  if (config.llm.temperature < 0 || config.llm.temperature > 2) {
    throw new Error('LLM_TEMPERATURE must be between 0 and 2');
  }

  // Validate performance limits
  if (config.performance.maxConcurrentQueries < 1) {
    throw new Error('MAX_CONCURRENT_QUERIES must be at least 1');
  }

  if (config.performance.queryTimeout < 1000) {
    throw new Error('QUERY_TIMEOUT must be at least 1000ms');
  }

  // Validate rate limiting
  if (config.rateLimit.enabled) {
    if (config.rateLimit.maxRequests < 1) {
      throw new Error('RATE_LIMIT_MAX must be at least 1');
    }
    if (config.rateLimit.windowMs < 1000) {
      throw new Error('RATE_LIMIT_WINDOW_MS must be at least 1000ms');
    }
  }
}

/**
 * Global configuration instance
 * Loaded once at startup
 */
export const config = loadConfig();
validateConfig(config);
