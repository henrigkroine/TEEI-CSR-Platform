/**
 * Row-Level Security (RLS) for Insights NLQ v2
 *
 * Enforces tenant isolation and row-level access controls for natural language queries.
 * Implements defense-in-depth with application-layer and database-level security.
 */

import { FastifyRequest } from 'fastify';
import { TenantContext } from '../middleware/tenantScope.js';

export interface RLSPolicy {
  /** Unique policy identifier */
  id: string;
  /** Policy name */
  name: string;
  /** Tables this policy applies to */
  tables: string[];
  /** Row filter predicate (SQL WHERE clause) */
  filter: string;
  /** Check if policy applies to this tenant */
  appliesTo: (tenant: TenantContext) => boolean;
  /** Priority (higher = evaluated first) */
  priority: number;
}

export interface RLSContext {
  companyId: string;
  userId: string;
  role: string;
  permissions: string[];
  allowedTables: string[];
  deniedTables: string[];
  rateLimits: {
    queriesPerHour: number;
    queriesPerDay: number;
  };
}

/**
 * Default RLS policies for tenant isolation
 */
export const DEFAULT_RLS_POLICIES: RLSPolicy[] = [
  {
    id: 'tenant-isolation',
    name: 'Tenant Isolation',
    tables: ['*'],
    filter: 'company_id = ?',
    appliesTo: () => true,
    priority: 1000
  },
  {
    id: 'system-admin-bypass',
    name: 'System Admin Bypass',
    tables: ['*'],
    filter: '1=1', // No filter for system admins
    appliesTo: (tenant) => tenant.role === 'system_admin',
    priority: 2000
  },
  {
    id: 'pii-redaction',
    name: 'PII Redaction',
    tables: ['users', 'unified_profiles'],
    filter: "email IS NULL OR email LIKE '%@redacted.example'",
    appliesTo: (tenant) => !['system_admin', 'company_admin'].includes(tenant.role),
    priority: 500
  }
];

/**
 * Build RLS context from tenant context and request
 */
export function buildRLSContext(tenant: TenantContext, request: FastifyRequest): RLSContext {
  // Base context
  const context: RLSContext = {
    companyId: tenant.companyId,
    userId: tenant.userId,
    role: tenant.role,
    permissions: tenant.permissions || [],
    allowedTables: [],
    deniedTables: [],
    rateLimits: {
      queriesPerHour: 100,
      queriesPerDay: 1000
    }
  };

  // Role-based table access
  if (tenant.role === 'system_admin') {
    context.allowedTables = ['*']; // All tables
    context.rateLimits.queriesPerHour = 1000;
    context.rateLimits.queriesPerDay = 10000;
  } else if (tenant.role === 'company_admin') {
    context.allowedTables = [
      'outcome_scores',
      'evidence_snippets',
      'journey_transitions',
      'buddy_matches',
      'upskilling_completions',
      'impact_metrics',
      'unified_profiles'
    ];
    context.deniedTables = ['users', 'audits', 'pii'];
    context.rateLimits.queriesPerHour = 500;
    context.rateLimits.queriesPerDay = 5000;
  } else if (tenant.role === 'analyst') {
    context.allowedTables = [
      'outcome_scores',
      'evidence_snippets',
      'journey_transitions',
      'impact_metrics'
    ];
    context.deniedTables = ['users', 'audits', 'pii', 'unified_profiles'];
    context.rateLimits.queriesPerHour = 200;
    context.rateLimits.queriesPerDay = 2000;
  } else {
    // Default read-only access
    context.allowedTables = ['outcome_scores', 'impact_metrics'];
    context.deniedTables = ['users', 'audits', 'pii', 'unified_profiles'];
    context.rateLimits.queriesPerHour = 50;
    context.rateLimits.queriesPerDay = 500;
  }

  // Permission-based augmentation
  if (context.permissions.includes('view_pii')) {
    const piiIndex = context.deniedTables.indexOf('pii');
    if (piiIndex > -1) {
      context.deniedTables.splice(piiIndex, 1);
    }
  }

  return context;
}

/**
 * Apply RLS policies to a generated SQL query
 */
export function applyRLSToQuery(
  query: string,
  context: RLSContext,
  policies: RLSPolicy[] = DEFAULT_RLS_POLICIES
): { sql: string; params: any[] } {
  const tenant: TenantContext = {
    companyId: context.companyId,
    userId: context.userId,
    role: context.role,
    permissions: context.permissions
  };

  // Sort policies by priority (highest first)
  const applicablePolicies = policies
    .filter(p => p.appliesTo(tenant))
    .sort((a, b) => b.priority - a.priority);

  let modifiedQuery = query;
  const params: any[] = [context.companyId];

  // Apply tenant isolation filter
  if (!applicablePolicies.some(p => p.id === 'system-admin-bypass')) {
    // Add WHERE clause or augment existing WHERE
    if (modifiedQuery.toLowerCase().includes('where')) {
      // Augment existing WHERE clause
      modifiedQuery = modifiedQuery.replace(
        /WHERE/i,
        `WHERE company_id = $1 AND`
      );
    } else if (modifiedQuery.toLowerCase().includes('from')) {
      // Add WHERE clause after FROM
      const fromIndex = modifiedQuery.toLowerCase().indexOf('from');
      const nextClauseRegex = /(GROUP BY|ORDER BY|LIMIT|OFFSET)/i;
      const nextClauseMatch = modifiedQuery.slice(fromIndex).match(nextClauseRegex);

      if (nextClauseMatch && nextClauseMatch.index) {
        const insertPosition = fromIndex + nextClauseMatch.index;
        modifiedQuery =
          modifiedQuery.slice(0, insertPosition) +
          ` WHERE company_id = $1 ` +
          modifiedQuery.slice(insertPosition);
      } else {
        modifiedQuery += ` WHERE company_id = $1`;
      }
    }
  }

  return { sql: modifiedQuery, params };
}

/**
 * Validate table access against RLS context
 */
export function validateTableAccess(
  tables: string[],
  context: RLSContext
): { allowed: boolean; deniedTables: string[]; reason?: string } {
  // System admins can access all tables
  if (context.allowedTables.includes('*')) {
    return { allowed: true, deniedTables: [] };
  }

  const deniedTables: string[] = [];

  for (const table of tables) {
    // Check deny list first
    if (context.deniedTables.includes(table)) {
      deniedTables.push(table);
      continue;
    }

    // Check allow list
    if (!context.allowedTables.includes(table)) {
      deniedTables.push(table);
    }
  }

  if (deniedTables.length > 0) {
    return {
      allowed: false,
      deniedTables,
      reason: `Access denied to tables: ${deniedTables.join(', ')}`
    };
  }

  return { allowed: true, deniedTables: [] };
}

/**
 * Extract table names from a SQL query
 */
export function extractTables(sql: string): string[] {
  const tables: string[] = [];

  // Match FROM and JOIN clauses
  const fromRegex = /FROM\s+([a-zA-Z0-9_]+)/gi;
  const joinRegex = /JOIN\s+([a-zA-Z0-9_]+)/gi;

  let match;
  while ((match = fromRegex.exec(sql)) !== null) {
    tables.push(match[1]);
  }
  while ((match = joinRegex.exec(sql)) !== null) {
    tables.push(match[1]);
  }

  return [...new Set(tables)]; // Deduplicate
}

/**
 * Rate limiting check for NLQ queries
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

/**
 * Check rate limits for a tenant
 * Uses Redis for distributed rate limiting
 */
export async function checkRateLimit(
  context: RLSContext,
  redis: any
): Promise<RateLimitResult> {
  const hourKey = `nlq:ratelimit:${context.companyId}:${context.userId}:hour`;
  const dayKey = `nlq:ratelimit:${context.companyId}:${context.userId}:day`;

  try {
    // Check hourly limit
    const hourCount = await redis.incr(hourKey);
    if (hourCount === 1) {
      await redis.expire(hourKey, 3600); // 1 hour TTL
    }

    if (hourCount > context.rateLimits.queriesPerHour) {
      const ttl = await redis.ttl(hourKey);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + ttl * 1000),
        reason: `Hourly rate limit exceeded (${context.rateLimits.queriesPerHour} queries/hour)`
      };
    }

    // Check daily limit
    const dayCount = await redis.incr(dayKey);
    if (dayCount === 1) {
      await redis.expire(dayKey, 86400); // 24 hours TTL
    }

    if (dayCount > context.rateLimits.queriesPerDay) {
      const ttl = await redis.ttl(dayKey);
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(Date.now() + ttl * 1000),
        reason: `Daily rate limit exceeded (${context.rateLimits.queriesPerDay} queries/day)`
      };
    }

    return {
      allowed: true,
      remaining: Math.min(
        context.rateLimits.queriesPerHour - hourCount,
        context.rateLimits.queriesPerDay - dayCount
      ),
      resetAt: new Date(Date.now() + 3600 * 1000)
    };
  } catch (error) {
    // On Redis error, fail open but log
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: 0,
      resetAt: new Date(Date.now() + 3600 * 1000)
    };
  }
}
