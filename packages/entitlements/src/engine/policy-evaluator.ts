/**
 * Policy Evaluator Engine
 * Evaluates entitlement policies and makes access control decisions
 */

import { createServiceLogger } from '@teei/shared-utils';
import {
  db,
  entitlementPolicies,
  entitlementGrants,
  entitlementChecks,
  usageQuotas,
  billingSubscriptions,
} from '@teei/shared-schema';
import { eq, and, lte, gte, or, isNull } from 'drizzle-orm';
import {
  EntitlementCheckRequest,
  EntitlementDecision,
  Feature,
  DEFAULT_PLAN_FEATURES,
} from '../types/index.js';

const logger = createServiceLogger('entitlements:evaluator');

export class PolicyEvaluator {
  private db = db;

  /**
   * Check if a user/company has access to a feature
   */
  async checkEntitlement(
    request: EntitlementCheckRequest
  ): Promise<EntitlementDecision> {
    const startTime = Date.now();

    try {
      // 1. Check for explicit grants first (highest priority)
      const grant = await this.checkGrants(request);
      if (grant) {
        await this.logCheck(request, grant, Date.now() - startTime, false);
        return grant;
      }

      // 2. Check subscription-based entitlements
      const subscriptionDecision = await this.checkSubscription(request);
      if (subscriptionDecision) {
        await this.logCheck(request, subscriptionDecision, Date.now() - startTime, false);
        return subscriptionDecision;
      }

      // 3. Check custom policies
      const policyDecision = await this.checkPolicies(request);
      if (policyDecision) {
        await this.logCheck(request, policyDecision, Date.now() - startTime, false);
        return policyDecision;
      }

      // 4. Default deny
      const denyDecision: EntitlementDecision = {
        allowed: false,
        reason: 'No matching policy or subscription found',
      };

      await this.logCheck(request, denyDecision, Date.now() - startTime, false);
      return denyDecision;
    } catch (error: any) {
      logger.error('Error evaluating entitlement', { error, request });
      return {
        allowed: false,
        reason: 'Error evaluating entitlement policy',
      };
    }
  }

  /**
   * Check explicit grants
   */
  private async checkGrants(
    request: EntitlementCheckRequest
  ): Promise<EntitlementDecision | null> {
    const now = new Date();

    // Build where conditions
    const conditions = [
      eq(entitlementGrants.feature, request.feature),
      eq(entitlementGrants.revoked, false),
      or(
        isNull(entitlementGrants.validFrom),
        lte(entitlementGrants.validFrom, now)
      ),
      or(
        isNull(entitlementGrants.validUntil),
        gte(entitlementGrants.validUntil, now)
      ),
    ];

    // Add company or user filter
    if (request.companyId) {
      conditions.push(eq(entitlementGrants.companyId, request.companyId));
    }
    if (request.userId) {
      conditions.push(eq(entitlementGrants.userId, request.userId));
    }

    const grants = await this.db
      .select()
      .from(entitlementGrants)
      .where(and(...conditions));

    if (grants.length === 0) {
      return null;
    }

    // Use the first active grant
    const grant = grants[0]!;

    // Check quota if present
    if (grant.quota) {
      const { limit, used } = grant.quota as { limit: number; used: number };
      if (used >= limit) {
        return {
          allowed: false,
          reason: `Quota exceeded for grant ${grant.id}`,
          grantId: grant.id,
          quotaRemaining: 0,
        };
      }

      return {
        allowed: true,
        reason: `Granted via ${grant.grantType} grant`,
        grantId: grant.id,
        quotaRemaining: limit - used,
        expiresAt: grant.validUntil || undefined,
      };
    }

    return {
      allowed: true,
      reason: `Granted via ${grant.grantType} grant`,
      grantId: grant.id,
      expiresAt: grant.validUntil || undefined,
    };
  }

  /**
   * Check subscription-based entitlements
   */
  private async checkSubscription(
    request: EntitlementCheckRequest
  ): Promise<EntitlementDecision | null> {
    // Get active subscription for company
    const [subscription] = await this.db
      .select()
      .from(billingSubscriptions)
      .where(
        and(
          eq(billingSubscriptions.companyId, request.companyId),
          eq(billingSubscriptions.status, 'active')
        )
      )
      .limit(1);

    if (!subscription) {
      return null;
    }

    // Get plan features
    const planFeatures = DEFAULT_PLAN_FEATURES[subscription.plan as keyof typeof DEFAULT_PLAN_FEATURES];
    if (!planFeatures) {
      logger.warn('Unknown subscription plan', { plan: subscription.plan });
      return null;
    }

    // Check if feature is included in plan
    if (!planFeatures.features.has(request.feature)) {
      return {
        allowed: false,
        reason: `Feature ${request.feature} not included in ${subscription.plan} plan`,
      };
    }

    // Check usage quotas if applicable
    const quotaCheck = await this.checkUsageQuota(request);
    if (!quotaCheck.allowed) {
      return quotaCheck;
    }

    return {
      allowed: true,
      reason: `Allowed by ${subscription.plan} subscription`,
    };
  }

  /**
   * Check usage quotas
   */
  private async checkUsageQuota(
    request: EntitlementCheckRequest
  ): Promise<EntitlementDecision> {
    // Map features to quota types
    const featureQuotaMap: Record<string, string> = {
      [Feature.REPORT_BUILDER]: 'reports',
      [Feature.NLQ]: 'nlq_queries',
      [Feature.GEN_AI_REPORTS]: 'ai_tokens',
    };

    const quotaType = featureQuotaMap[request.feature];
    if (!quotaType) {
      // No quota enforcement for this feature
      return { allowed: true, reason: 'No quota limits for this feature' };
    }

    const [quota] = await this.db
      .select()
      .from(usageQuotas)
      .where(
        and(
          eq(usageQuotas.companyId, request.companyId),
          eq(usageQuotas.feature, request.feature),
          eq(usageQuotas.quotaType, quotaType)
        )
      )
      .limit(1);

    if (!quota) {
      // No quota record exists yet, allowed
      return { allowed: true, reason: 'Quota not yet tracked' };
    }

    if (quota.used >= quota.limit) {
      return {
        allowed: false,
        reason: `${quotaType} quota exceeded (${quota.used}/${quota.limit})`,
        quotaRemaining: 0,
      };
    }

    return {
      allowed: true,
      reason: 'Within quota limits',
      quotaRemaining: quota.limit - quota.used,
    };
  }

  /**
   * Check custom policies
   */
  private async checkPolicies(
    request: EntitlementCheckRequest
  ): Promise<EntitlementDecision | null> {
    const now = new Date();

    const policies = await this.db
      .select()
      .from(entitlementPolicies)
      .where(
        and(
          eq(entitlementPolicies.companyId, request.companyId),
          eq(entitlementPolicies.status, 'active'),
          or(
            isNull(entitlementPolicies.validFrom),
            lte(entitlementPolicies.validFrom, now)
          ),
          or(
            isNull(entitlementPolicies.validUntil),
            gte(entitlementPolicies.validUntil, now)
          )
        )
      )
      .orderBy(entitlementPolicies.priority);

    if (policies.length === 0) {
      return null;
    }

    // Evaluate policies in priority order (higher priority first)
    for (const policy of policies.reverse()) {
      const rules = policy.rules as any[];

      for (const rule of rules) {
        // Check if rule matches the request
        if (
          rule.feature === request.feature &&
          rule.actions.includes(request.action)
        ) {
          // Evaluate conditions if present
          if (rule.conditions && !this.evaluateConditions(rule.conditions, request.context)) {
            continue;
          }

          if (rule.effect === 'allow') {
            return {
              allowed: true,
              reason: `Allowed by policy: ${policy.name}`,
              policyId: policy.id,
            };
          } else {
            return {
              allowed: false,
              reason: `Denied by policy: ${policy.name}`,
              policyId: policy.id,
            };
          }
        }
      }
    }

    return null;
  }

  /**
   * Evaluate policy conditions
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any> = {}
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      const contextValue = context[key];

      // Simple equality check
      if (contextValue !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Log entitlement check for audit
   */
  private async logCheck(
    request: EntitlementCheckRequest,
    decision: EntitlementDecision,
    responseTime: number,
    cacheHit: boolean
  ): Promise<void> {
    try {
      await this.db.insert(entitlementChecks).values({
        companyId: request.companyId,
        userId: request.userId,
        feature: request.feature,
        action: request.action,
        resource: request.resource,
        allowed: decision.allowed,
        denialReason: decision.allowed ? null : decision.reason,
        policyId: decision.policyId,
        grantId: decision.grantId,
        responseTime,
        cacheHit,
      });
    } catch (error) {
      logger.error('Failed to log entitlement check', { error });
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
    try {
      const [quota] = await this.db
        .select()
        .from(usageQuotas)
        .where(
          and(
            eq(usageQuotas.companyId, companyId),
            eq(usageQuotas.feature, feature),
            eq(usageQuotas.quotaType, quotaType)
          )
        )
        .limit(1);

      if (!quota) {
        logger.warn('No quota found to increment', { companyId, feature, quotaType });
        return;
      }

      const newUsed = quota.used + amount;
      await this.db
        .update(usageQuotas)
        .set({
          used: newUsed,
          updatedAt: new Date(),
        })
        .where(eq(usageQuotas.id, quota.id));

      // Check if alert threshold reached
      if (!quota.alertSent && quota.alertThreshold) {
        const usagePercent = (newUsed / quota.limit) * 100;
        if (usagePercent >= quota.alertThreshold) {
          // TODO: Trigger alert notification
          await this.db
            .update(usageQuotas)
            .set({ alertSent: true })
            .where(eq(usageQuotas.id, quota.id));

          logger.warn('Quota alert threshold reached', {
            companyId,
            feature,
            quotaType,
            used: newUsed,
            limit: quota.limit,
            percent: usagePercent,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to increment usage', { error, companyId, feature });
    }
  }
}
