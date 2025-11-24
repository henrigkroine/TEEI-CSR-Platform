/**
 * Campaign Service Configuration
 */

export const config = {
  service: {
    name: 'campaigns',
    port: parseInt(process.env.PORT_CAMPAIGNS || '3020'),
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/teei_dev',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2'),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10'),
  },
  validation: {
    // Capacity utilization thresholds
    nearCapacityThreshold: parseFloat(process.env.NEAR_CAPACITY_THRESHOLD || '0.8'), // 80%
    overCapacityThreshold: parseFloat(process.env.OVER_CAPACITY_THRESHOLD || '1.0'), // 100%
  },
} as const;
