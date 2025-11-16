/**
 * Entitlements Enforcement Middleware
 * Policy-based access control for commercial features
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { EntitlementEngine, Feature, Action } from '@teei/entitlements';
import { AuthenticatedRequest } from './auth.js';
import { getTenantContext } from './tenantScope.js';

/**
 * Feature mapping for routes
 * Maps route patterns to features
 */
const ROUTE_FEATURE_MAP: Record<string, Feature> = {
  '/v1/reports/generate': Feature.REPORT_BUILDER,
  '/v1/reports/export/pdf': Feature.EXPORT_PDF,
  '/v1/reports/export/csv': Feature.EXPORT_CSV,
  '/v1/reports/export/pptx': Feature.EXPORT_PPTX,
  '/v1/boardroom': Feature.BOARDROOM_LIVE,
  '/v1/forecast': Feature.FORECAST,
  '/v1/benchmarking': Feature.BENCHMARKING,
  '/v1/nlq': Feature.NLQ,
  '/v1/gen-ai': Feature.GEN_AI_REPORTS,
  '/v1/api': Feature.API_ACCESS,
  '/v1/sso': Feature.SSO,
  '/v1/branding': Feature.CUSTOM_BRANDING,
};

/**
 * Action mapping for HTTP methods
 */
const METHOD_ACTION_MAP: Record<string, Action> = {
  GET: Action.VIEW,
  POST: Action.CREATE,
  PUT: Action.UPDATE,
  PATCH: Action.UPDATE,
  DELETE: Action.DELETE,
};

/**
 * Initialize entitlement engine
 */
const engine = new EntitlementEngine({
  cache: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    ttl: 300, // 5 minutes
    keyPrefix: 'entitlement',
  },
  enableAuditLog: true,
});

/**
 * Get feature from route
 */
function getFeatureFromRoute(url: string): Feature | null {
  for (const [routePattern, feature] of Object.entries(ROUTE_FEATURE_MAP)) {
    if (url.startsWith(routePattern)) {
      return feature;
    }
  }
  return null;
}

/**
 * Get action from HTTP method
 */
function getActionFromMethod(method: string): Action {
  return METHOD_ACTION_MAP[method] || Action.VIEW;
}

/**
 * Entitlement check middleware
 * Enforces feature access based on subscription and policies
 */
export async function checkEntitlement(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;

  // Skip entitlement check for unauthenticated requests
  if (!authRequest.user) {
    return;
  }

  try {
    // Get tenant context
    const tenantContext = getTenantContext(request);

    // Determine feature from route
    const feature = getFeatureFromRoute(request.url);

    // Skip if route doesn't map to a feature (e.g., health checks, public routes)
    if (!feature) {
      return;
    }

    // Determine action from HTTP method
    const action = getActionFromMethod(request.method);

    // Check entitlement
    const decision = await engine.check({
      companyId: tenantContext.companyId,
      userId: authRequest.user.userId,
      feature,
      action,
      resource: request.url,
      context: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    });

    if (!decision.allowed) {
      request.log.warn({
        userId: authRequest.user.userId,
        companyId: tenantContext.companyId,
        feature,
        action,
        reason: decision.reason,
      }, 'Entitlement denied');

      // Return 402 Payment Required for subscription issues
      // Return 403 Forbidden for policy denials
      const statusCode = decision.reason.includes('plan') || decision.reason.includes('subscription')
        ? 402
        : 403;

      return reply.status(statusCode).send({
        success: false,
        error: statusCode === 402 ? 'PaymentRequired' : 'Forbidden',
        message: decision.reason,
        feature,
        action,
        quotaRemaining: decision.quotaRemaining,
        upgradeUrl: statusCode === 402 ? '/billing/upgrade' : undefined,
      });
    }

    // Log successful check
    request.log.debug({
      userId: authRequest.user.userId,
      companyId: tenantContext.companyId,
      feature,
      action,
      quotaRemaining: decision.quotaRemaining,
    }, 'Entitlement allowed');

  } catch (error: any) {
    request.log.error('Entitlement check error:', error);

    // Fail open in case of errors to avoid blocking legitimate requests
    // In production, you might want to fail closed (deny) instead
    if (process.env.ENTITLEMENT_FAIL_MODE === 'closed') {
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Unable to verify entitlements',
      });
    }

    // Fail open - allow request to proceed
    request.log.warn('Entitlement check failed, allowing request (fail-open mode)');
  }
}

/**
 * Require specific feature middleware
 * Explicit feature checking for routes
 */
export function requireFeature(feature: Feature, action: Action = Action.VIEW) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    try {
      const tenantContext = getTenantContext(request);

      const decision = await engine.check({
        companyId: tenantContext.companyId,
        userId: authRequest.user.userId,
        feature,
        action,
        resource: request.url,
      });

      if (!decision.allowed) {
        const statusCode = decision.reason.includes('plan') || decision.reason.includes('subscription')
          ? 402
          : 403;

        return reply.status(statusCode).send({
          success: false,
          error: statusCode === 402 ? 'PaymentRequired' : 'Forbidden',
          message: decision.reason,
          feature,
          action,
          upgradeUrl: statusCode === 402 ? '/billing/upgrade' : undefined,
        });
      }
    } catch (error: any) {
      request.log.error('Feature check error:', error);

      if (process.env.ENTITLEMENT_FAIL_MODE === 'closed') {
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: 'Unable to verify feature access',
        });
      }
    }
  };
}

/**
 * Track usage middleware
 * Increments usage quotas for metered features
 */
export function trackUsage(feature: Feature, quotaType: string, amountFn?: (request: FastifyRequest) => number) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    try {
      const tenantContext = getTenantContext(request);
      const amount = amountFn ? amountFn(request) : 1;

      // Increment usage asynchronously (don't block request)
      engine.incrementUsage(tenantContext.companyId, feature, quotaType, amount).catch((error) => {
        request.log.error('Failed to track usage:', { error, feature, quotaType });
      });
    } catch (error) {
      request.log.error('Usage tracking error:', error);
    }
  };
}

/**
 * Invalidate entitlement cache for company
 */
export async function invalidateCompanyCache(companyId: string): Promise<void> {
  await engine.invalidateCompany(companyId);
}

/**
 * Invalidate entitlement cache for user
 */
export async function invalidateUserCache(companyId: string, userId: string): Promise<void> {
  await engine.invalidateUser(companyId, userId);
}

/**
 * Invalidate entitlement cache for feature
 */
export async function invalidateFeatureCache(companyId: string, feature: string): Promise<void> {
  await engine.invalidateFeature(companyId, feature);
}

/**
 * Get entitlement cache statistics
 */
export async function getEntitlementCacheStats() {
  return engine.getCacheStats();
}

/**
 * Export engine for advanced usage
 */
export { engine as entitlementEngine };
