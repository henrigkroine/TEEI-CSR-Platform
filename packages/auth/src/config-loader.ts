import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';

/**
 * Secure Configuration Loader
 *
 * Provides type-safe configuration loading with validation
 * and support for multiple environment sources:
 * - .env files
 * - Environment variables
 * - AWS Secrets Manager (planned)
 * - HashiCorp Vault (planned)
 *
 * Security Features:
 * - Required vs optional configuration validation
 * - Secret redaction in logs
 * - Type safety with TypeScript
 * - Environment-specific overrides
 */

export interface SecretConfig {
  key: string;
  required: boolean;
  defaultValue?: string;
  sensitive?: boolean;  // Redact in logs
  validator?: (value: string) => boolean;
  description?: string;
}

export interface ConfigSchema {
  [key: string]: SecretConfig;
}

export interface LoadedConfig {
  [key: string]: string | undefined;
}

/**
 * Configuration validation result
 */
export interface ValidationResult {
  valid: boolean;
  missing: string[];
  invalid: string[];
  warnings: string[];
}

/**
 * Secure Config Loader
 */
export class SecureConfigLoader {
  private schema: ConfigSchema;
  private config: LoadedConfig;
  private validationResult?: ValidationResult;

  constructor(schema: ConfigSchema) {
    this.schema = schema;
    this.config = {};
  }

  /**
   * Load configuration from environment
   */
  load(envFilePath?: string): LoadedConfig {
    // Load .env file if specified
    if (envFilePath && fs.existsSync(envFilePath)) {
      config({ path: envFilePath });
    } else {
      config(); // Load from default .env
    }

    // Load each config key
    for (const [key, secretConfig] of Object.entries(this.schema)) {
      const value = process.env[secretConfig.key] || secretConfig.defaultValue;
      this.config[key] = value;
    }

    // Validate
    this.validationResult = this.validate();

    return this.config;
  }

  /**
   * Validate loaded configuration
   */
  validate(): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      missing: [],
      invalid: [],
      warnings: []
    };

    for (const [key, secretConfig] of Object.entries(this.schema)) {
      const value = this.config[key];

      // Check required
      if (secretConfig.required && !value) {
        result.missing.push(secretConfig.key);
        result.valid = false;
      }

      // Check validator
      if (value && secretConfig.validator && !secretConfig.validator(value)) {
        result.invalid.push(secretConfig.key);
        result.valid = false;
      }

      // Warnings for missing optional but recommended configs
      if (!secretConfig.required && !value && process.env.NODE_ENV === 'production') {
        result.warnings.push(`Optional config '${secretConfig.key}' not set (recommended for production)`);
      }
    }

    return result;
  }

  /**
   * Get a config value
   */
  get(key: string): string | undefined {
    return this.config[key];
  }

  /**
   * Get a config value or throw if missing
   */
  require(key: string): string {
    const value = this.config[key];
    if (!value) {
      throw new Error(`Required configuration '${key}' is missing`);
    }
    return value;
  }

  /**
   * Get validation result
   */
  getValidationResult(): ValidationResult | undefined {
    return this.validationResult;
  }

  /**
   * Print validation errors and warnings
   */
  printValidation(): void {
    const result = this.validationResult;
    if (!result) {
      console.log('⚠️  Configuration not yet loaded');
      return;
    }

    if (result.valid && result.warnings.length === 0) {
      console.log('✅ Configuration validated successfully');
      return;
    }

    if (result.missing.length > 0) {
      console.error('❌ Missing required configuration:');
      result.missing.forEach(key => {
        const schema = Object.values(this.schema).find(s => s.key === key);
        console.error(`   - ${key}${schema?.description ? `: ${schema.description}` : ''}`);
      });
    }

    if (result.invalid.length > 0) {
      console.error('❌ Invalid configuration:');
      result.invalid.forEach(key => {
        console.error(`   - ${key}: failed validation`);
      });
    }

    if (result.warnings.length > 0) {
      console.warn('⚠️  Configuration warnings:');
      result.warnings.forEach(warning => {
        console.warn(`   - ${warning}`);
      });
    }

    if (!result.valid) {
      throw new Error('Configuration validation failed');
    }
  }

  /**
   * Export safe config for logging (redacts sensitive values)
   */
  toSafeObject(): Record<string, string> {
    const safe: Record<string, string> = {};

    for (const [key, secretConfig] of Object.entries(this.schema)) {
      const value = this.config[key];
      if (secretConfig.sensitive && value) {
        safe[key] = '***REDACTED***';
      } else {
        safe[key] = value || '(not set)';
      }
    }

    return safe;
  }
}

/**
 * Predefined configuration schemas
 */

/**
 * Security configuration schema
 */
export const securityConfigSchema: ConfigSchema = {
  // JWT Configuration
  jwtSecret: {
    key: 'JWT_SECRET',
    required: false,  // Not required if using RS256
    sensitive: true,
    description: 'JWT secret for HS256 (deprecated, use RS256)'
  },
  jwtKeysDir: {
    key: 'JWT_KEYS_DIR',
    required: false,
    defaultValue: '.keys',
    description: 'Directory containing RSA keys for RS256 JWT'
  },

  // OIDC Configuration
  googleClientId: {
    key: 'GOOGLE_CLIENT_ID',
    required: false,
    description: 'Google OAuth 2.0 Client ID'
  },
  googleClientSecret: {
    key: 'GOOGLE_CLIENT_SECRET',
    required: false,
    sensitive: true,
    description: 'Google OAuth 2.0 Client Secret'
  },
  googleRedirectUri: {
    key: 'GOOGLE_REDIRECT_URI',
    required: false,
    description: 'Google OAuth 2.0 Redirect URI'
  },
  googleHostedDomain: {
    key: 'GOOGLE_HOSTED_DOMAIN',
    required: false,
    description: 'Google Workspace domain restriction (optional)'
  },
  azureClientId: {
    key: 'AZURE_CLIENT_ID',
    required: false,
    description: 'Azure AD Application (client) ID'
  },
  azureClientSecret: {
    key: 'AZURE_CLIENT_SECRET',
    required: false,
    sensitive: true,
    description: 'Azure AD Client Secret'
  },
  azureTenantId: {
    key: 'AZURE_TENANT_ID',
    required: false,
    description: 'Azure AD Tenant ID'
  },
  azureRedirectUri: {
    key: 'AZURE_REDIRECT_URI',
    required: false,
    description: 'Azure AD Redirect URI'
  },
  oidcSessionSecret: {
    key: 'OIDC_SESSION_SECRET',
    required: false,
    defaultValue: 'change-me-in-production',
    sensitive: true,
    description: 'Session secret for OIDC state management'
  },

  // Webhook Secrets
  kintellWebhookSecret: {
    key: 'KINTELL_WEBHOOK_SECRET',
    required: false,
    sensitive: true,
    description: 'HMAC secret for Kintell webhook signature verification'
  },
  upskillingWebhookSecret: {
    key: 'UPSKILLING_WEBHOOK_SECRET',
    required: false,
    sensitive: true,
    description: 'HMAC secret for Upskilling webhook signature verification'
  },

  // Service Auth
  serviceKeysDir: {
    key: 'SERVICE_KEYS_DIR',
    required: false,
    defaultValue: '.keys',
    description: 'Directory containing service-to-service auth keys'
  },

  // WAF Configuration
  wafEnabled: {
    key: 'WAF_ENABLED',
    required: false,
    defaultValue: 'true',
    validator: (v) => v === 'true' || v === 'false',
    description: 'Enable/disable WAF middleware'
  },
  wafRateLimitGlobal: {
    key: 'WAF_RATE_LIMIT_GLOBAL',
    required: false,
    defaultValue: '100',
    validator: (v) => !isNaN(parseInt(v, 10)),
    description: 'Global rate limit (requests per minute)'
  },
  wafPayloadJsonMax: {
    key: 'WAF_PAYLOAD_JSON_MAX',
    required: false,
    defaultValue: '1048576',  // 1MB
    validator: (v) => !isNaN(parseInt(v, 10)),
    description: 'Maximum JSON payload size in bytes'
  },
  wafBlocklistIps: {
    key: 'WAF_BLOCKLIST_IPS',
    required: false,
    description: 'Comma-separated list of blocked IP addresses'
  },

  // Redis (for distributed rate limiting)
  redisUrl: {
    key: 'REDIS_URL',
    required: false,
    description: 'Redis connection URL for distributed rate limiting'
  }
};

/**
 * Create a secure config loader for security settings
 */
export function createSecurityConfigLoader(): SecureConfigLoader {
  return new SecureConfigLoader(securityConfigSchema);
}

/**
 * Load and validate security configuration
 */
export function loadSecurityConfig(): LoadedConfig {
  const loader = createSecurityConfigLoader();
  const config = loader.load();

  // Print validation results
  loader.printValidation();

  return config;
}

/**
 * Example usage
 */
export function exampleUsage() {
  return `
// Example 1: Load security config
import { loadSecurityConfig } from '@teei/auth/config-loader';

const config = loadSecurityConfig();

// Example 2: Custom config schema
import { SecureConfigLoader, ConfigSchema } from '@teei/auth/config-loader';

const mySchema: ConfigSchema = {
  apiKey: {
    key: 'MY_API_KEY',
    required: true,
    sensitive: true,
    description: 'API key for external service'
  }
};

const loader = new SecureConfigLoader(mySchema);
const config = loader.load();

// Example 3: Get config values
const apiKey = loader.require('apiKey');  // Throws if missing
const optional = loader.get('optional');  // Returns undefined if missing
  `.trim();
}
