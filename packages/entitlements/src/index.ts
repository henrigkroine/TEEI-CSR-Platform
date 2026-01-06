/**
 * TEEI Entitlements Package
 * Policy-based access control for commercial features
 */

import { PolicyEvaluator } from './engine/policy-evaluator.js';
import { DecisionCache } from './cache/decision-cache.js';
import {
  EntitlementCheckRequest,
  EntitlementDecision,
  EntitlementEngineConfig,
  Feature,
} from './types/index.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('entitlements');

/**
 * Entitlement Engine
 * Main entry point for entitlement checks
 */
export class EntitlementEngine {
  private evaluator: PolicyEvaluator;
  private cache?: DecisionCache;

  constructor(config: EntitlementEngineConfig = {}) {
    this.evaluator = new PolicyEvaluator();

    if (config.cache) {
      this.cache = new DecisionCache(config.cache);
    }
  }

  /**
   * Check entitlement with caching
   */
  async check(request: EntitlementCheckRequest): Promise<EntitlementDecision> {
    const startTime = Date.now();

    try {
      // Try cache first
      if (this.cache) {
        const cached = await this.cache.get(request);
        if (cached) {
          logger.debug('Entitlement check (cached)', {
            feature: request.feature,
            action: request.action,
            allowed: cached.allowed,
            responseTime: Date.now() - startTime,
          });
          return cached;
        }
      }

      // Evaluate policy
      const decision = await this.evaluator.checkEntitlement(request);

      // Cache the decision if allowed
      if (this.cache && decision.allowed) {
        await this.cache.set(request, decision);
      }

      logger.info('Entitlement check', {
        feature: request.feature,
        action: request.action,
        allowed: decision.allowed,
        reason: decision.reason,
        responseTime: Date.now() - startTime,
      });

      return decision;
    } catch (error: any) {
      logger.error('Entitlement check failed', { error, request });
      return {
        allowed: false,
        reason: 'Internal error during entitlement check',
      };
    }
  }

  /**
   * Increment usage quota
   */
  async incrementUsage(
    companyId: string,
    feature: Feature,
    quotaType: string,
    amount: number = 1
  ): Promise<void> {
    await this.evaluator.incrementUsage(companyId, feature, quotaType, amount);
  }

  /**
   * Invalidate cache for company
   */
  async invalidateCompany(companyId: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidateCompany(companyId);
    }
  }

  /**
   * Invalidate cache for user
   */
  async invalidateUser(companyId: string, userId: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidateUser(companyId, userId);
    }
  }

  /**
   * Invalidate cache for feature
   */
  async invalidateFeature(companyId: string, feature: string): Promise<void> {
    if (this.cache) {
      await this.cache.invalidateFeature(companyId, feature);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ totalKeys: number; memoryUsage: string } | null> {
    if (this.cache) {
      return this.cache.getStats();
    }
    return null;
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.cache) {
      await this.cache.close();
    }
  }
}

// Re-export types
export {
  EntitlementCheckRequest,
  EntitlementDecision,
  EntitlementEngineConfig,
  Feature,
  Action,
  DEFAULT_PLAN_FEATURES,
} from './types/index.js';

export { PolicyEvaluator } from './engine/policy-evaluator.js';
export { DecisionCache } from './cache/decision-cache.js';
