/**
 * AI Safety Checker
 * Worker 10: AI/ML Explainability & Guardrails
 *
 * Performs safety moderation on AI-generated content before LLM calls
 */

import { Pool } from 'pg';
import {
  SafetyCheckRequest,
  SafetyCheckResult,
  SafetyViolation,
  SafetyCategory,
  AISafetyPolicy,
} from '@teei/shared-types';

export interface SafetyCheckerConfig {
  pgPool: Pool;
  openaiApiKey?: string;
  enableOpenAIMod?: boolean;
}

export class SafetyChecker {
  private pgPool: Pool;
  private openaiApiKey?: string;
  private enableOpenAIMod: boolean;

  constructor(config: SafetyCheckerConfig) {
    this.pgPool = config.pgPool;
    this.openaiApiKey = config.openaiApiKey;
    this.enableOpenAIMod = config.enableOpenAIMod ?? false;
  }

  /**
   * Check content for safety violations
   */
  async check(request: SafetyCheckRequest): Promise<SafetyCheckResult> {
    const startTime = Date.now();

    // Load policy for company (or fall back to global)
    const policy = await this.loadPolicy(request.companyId);

    if (!policy.enabled) {
      return {
        passed: true,
        violations: [],
        categoriesChecked: [],
        action: 'allow',
        checkDurationMs: Date.now() - startTime,
      };
    }

    // Run safety checks
    const violations: SafetyViolation[] = [];

    // 1. Pattern-based checks (fast, local)
    const patternViolations = this.checkPatterns(request.text, policy);
    violations.push(...patternViolations);

    // 2. OpenAI Moderation API (optional, if enabled)
    if (this.enableOpenAIMod && this.openaiApiKey) {
      const openaiViolations = await this.checkOpenAI(request.text);
      violations.push(...openaiViolations);
    }

    // Determine action based on violations
    const action = this.determineAction(violations, policy);

    return {
      passed: action === 'allow',
      violations,
      categoriesChecked: [
        ...policy.blockedCategories,
        ...policy.warningCategories,
      ] as SafetyCategory[],
      rationale: violations.length > 0
        ? `Found ${violations.length} safety violation(s)`
        : undefined,
      action,
      checkDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Load safety policy for a company
   */
  private async loadPolicy(companyId: string): Promise<AISafetyPolicy> {
    try {
      // Try to load company-specific policy
      const companyPolicyQuery = await this.pgPool.query(
        `SELECT * FROM ai_safety_policy WHERE company_id = $1 AND enabled = true LIMIT 1`,
        [companyId]
      );

      if (companyPolicyQuery.rows.length > 0) {
        return this.mapPolicyRow(companyPolicyQuery.rows[0]);
      }

      // Fall back to global policy
      const globalPolicyQuery = await this.pgPool.query(
        `SELECT * FROM ai_safety_policy WHERE is_global = true AND enabled = true LIMIT 1`
      );

      if (globalPolicyQuery.rows.length > 0) {
        return this.mapPolicyRow(globalPolicyQuery.rows[0]);
      }

      // Default policy if none found
      return this.getDefaultPolicy();
    } catch (error) {
      console.error('Failed to load safety policy:', error);
      return this.getDefaultPolicy();
    }
  }

  /**
   * Pattern-based safety checks (fast, local)
   */
  private checkPatterns(text: string, policy: AISafetyPolicy): SafetyViolation[] {
    const violations: SafetyViolation[] = [];

    // Hate speech patterns
    const hatePatterns = [
      /\b(hate|despise)\s+(all|every)\s+\w+/i,
      /\b(inferior|subhuman)\b/i,
    ];

    if (policy.blockedCategories.includes('hate')) {
      for (const pattern of hatePatterns) {
        const match = text.match(pattern);
        if (match) {
          violations.push({
            category: 'hate',
            confidence: 0.8,
            flaggedText: match[0].substring(0, 50),
            severity: 'high',
          });
        }
      }
    }

    // Violence patterns
    const violencePatterns = [
      /\b(kill|murder|harm|attack)\s+(someone|people|person)/i,
      /\b(bomb|weapon|explosive)\s+instructions/i,
    ];

    if (policy.blockedCategories.includes('violence')) {
      for (const pattern of violencePatterns) {
        const match = text.match(pattern);
        if (match) {
          violations.push({
            category: 'violence',
            confidence: 0.75,
            flaggedText: match[0].substring(0, 50),
            severity: 'high',
          });
        }
      }
    }

    // Self-harm patterns
    const selfHarmPatterns = [
      /\b(suicide|self-harm|end my life)\b/i,
      /\b(how to|ways to)\s+(hurt|harm|kill)\s+myself/i,
    ];

    if (policy.blockedCategories.includes('self-harm')) {
      for (const pattern of selfHarmPatterns) {
        const match = text.match(pattern);
        if (match) {
          violations.push({
            category: 'self-harm',
            confidence: 0.9,
            flaggedText: match[0].substring(0, 50),
            severity: 'high',
          });
        }
      }
    }

    return violations;
  }

  /**
   * Check with OpenAI Moderation API
   */
  private async checkOpenAI(text: string): Promise<SafetyViolation[]> {
    if (!this.openaiApiKey) {
      return [];
    }

    try {
      const response = await fetch('https://api.openai.com/v1/moderations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          input: text,
        }),
      });

      if (!response.ok) {
        console.error('OpenAI Moderation API error:', response.statusText);
        return [];
      }

      const data = await response.json() as { results: Array<{ flagged: boolean; categories: Record<string, boolean>; category_scores: Record<string, number> }> };
      const result = data.results[0];

      const violations: SafetyViolation[] = [];

      if (result && result.flagged) {
        const categories = result.categories;
        const scores = result.category_scores;

        for (const [category, flagged] of Object.entries(categories)) {
          if (flagged) {
            violations.push({
              category: this.mapOpenAICategory(category as string),
              confidence: scores[category] as number,
              severity: (scores[category] as number) > 0.9 ? 'high' : 'medium',
            });
          }
        }
      }

      return violations;
    } catch (error) {
      console.error('OpenAI Moderation API call failed:', error);
      return [];
    }
  }

  /**
   * Determine action based on violations
   */
  private determineAction(
    violations: SafetyViolation[],
    policy: AISafetyPolicy
  ): 'allow' | 'warn' | 'block' {
    if (violations.length === 0) {
      return 'allow';
    }

    // Check for blocked categories
    for (const violation of violations) {
      if (policy.blockedCategories.includes(violation.category)) {
        if (violation.confidence >= policy.minConfidenceThreshold) {
          if (policy.blockOnViolation) {
            return 'block';
          }
        }
      }
    }

    // Check for warning categories
    for (const violation of violations) {
      if (policy.warningCategories.includes(violation.category)) {
        return 'warn';
      }
    }

    return 'allow';
  }

  /**
   * Map database row to AISafetyPolicy
   */
  private mapPolicyRow(row: any): AISafetyPolicy {
    return {
      id: row.id,
      companyId: row.company_id,
      isGlobal: row.is_global,
      blockedCategories: row.blocked_categories,
      warningCategories: row.warning_categories,
      minConfidenceThreshold: parseFloat(row.min_confidence_threshold),
      blockOnViolation: row.block_on_violation,
      logViolations: row.log_violations,
      enabled: row.enabled,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }

  /**
   * Get default safety policy
   */
  private getDefaultPolicy(): AISafetyPolicy {
    return {
      id: 'default',
      isGlobal: true,
      blockedCategories: ['hate', 'violence', 'self-harm', 'sexual/minors'],
      warningCategories: ['sexual'],
      minConfidenceThreshold: 0.7,
      blockOnViolation: true,
      logViolations: true,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Map OpenAI category to our SafetyCategory
   */
  private mapOpenAICategory(category: string): SafetyCategory {
    const mapping: Record<string, SafetyCategory> = {
      'hate': 'hate',
      'hate/threatening': 'hate',
      'violence': 'violence',
      'violence/graphic': 'violence',
      'self-harm': 'self-harm',
      'self-harm/intent': 'self-harm',
      'self-harm/instructions': 'self-harm',
      'sexual': 'sexual',
      'sexual/minors': 'sexual/minors',
      'harassment': 'harassment',
      'harassment/threatening': 'harassment',
    };

    return mapping[category] || 'dangerous';
  }
}

/**
 * Create singleton instance
 */
let safetyCheckerInstance: SafetyChecker | null = null;

export function createSafetyChecker(config: SafetyCheckerConfig): SafetyChecker {
  if (!safetyCheckerInstance) {
    safetyCheckerInstance = new SafetyChecker(config);
  }
  return safetyCheckerInstance;
}

export function getSafetyChecker(): SafetyChecker {
  if (!safetyCheckerInstance) {
    throw new Error('SafetyChecker not initialized. Call createSafetyChecker first.');
  }
  return safetyCheckerInstance;
}
