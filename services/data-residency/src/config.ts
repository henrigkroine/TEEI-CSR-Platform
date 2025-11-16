import type { Region } from './types/index.js';

export interface DataResidencyConfig {
  port: number;
  currentRegion: Region;
  enforcement: 'strict' | 'permissive';
  defaultRegion: Region;
  cacheEnabled: boolean;
  cacheTTL: number; // in seconds
  databaseUrl: string;
  redisUrl?: string;
  vaultAddr?: string;
  vaultToken?: string;
}

/**
 * Load configuration from environment variables
 */
export function loadConfig(): DataResidencyConfig {
  const currentRegion = (process.env.AWS_REGION || process.env.DEFAULT_REGION || 'us-east-1') as Region;

  return {
    port: parseInt(process.env.PORT_DATA_RESIDENCY || '3015', 10),
    currentRegion,
    enforcement: (process.env.REGION_ENFORCEMENT || 'strict') as 'strict' | 'permissive',
    defaultRegion: (process.env.DEFAULT_REGION || 'us-east-1') as Region,
    cacheEnabled: process.env.CACHE_ENABLED !== 'false',
    cacheTTL: parseInt(process.env.CACHE_TTL || '300', 10), // 5 minutes default
    databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/teei',
    redisUrl: process.env.REDIS_URL,
    vaultAddr: process.env.VAULT_ADDR,
    vaultToken: process.env.VAULT_TOKEN,
  };
}
