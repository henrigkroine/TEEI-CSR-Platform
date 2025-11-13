import { db } from '@teei/shared-schema';
import { journeyRules } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import type { Rule } from '../rules/schema.js';
import { createServiceLogger } from '@teei/shared-utils';
import { readFileSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const logger = createServiceLogger('journey-engine:rules-loader');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cache for rules
let rulesCache: Rule[] | null = null;
let lastLoadTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Load default rules from YAML files
 */
export async function loadDefaultRules(): Promise<Rule[]> {
  const defaultRulesPath = join(__dirname, '../rules/defaults');
  const defaultRuleFiles = ['mentor_ready.yaml', 'followup_needed.yaml', 'language_support_needed.yaml'];

  const rules: Rule[] = [];

  for (const file of defaultRuleFiles) {
    try {
      const filePath = join(defaultRulesPath, file);
      const content = readFileSync(filePath, 'utf-8');
      const rule = parseYaml(content) as Rule;
      rules.push(rule);
      logger.debug({ file, ruleId: rule.id }, 'Loaded default rule');
    } catch (error) {
      logger.error({ error, file }, 'Error loading default rule');
    }
  }

  return rules;
}

/**
 * Sync default rules to database if they don't exist
 */
export async function syncDefaultRules(): Promise<void> {
  const defaultRules = await loadDefaultRules();

  for (const rule of defaultRules) {
    try {
      const existing = await db
        .select()
        .from(journeyRules)
        .where(eq(journeyRules.ruleId, rule.id))
        .limit(1);

      if (existing.length === 0) {
        // Insert new rule
        await db.insert(journeyRules).values({
          ruleId: rule.id,
          name: rule.name,
          description: rule.description,
          ruleConfig: rule as any,
          active: rule.active,
          priority: rule.priority,
        });
        logger.info({ ruleId: rule.id }, 'Default rule synced to database');
      } else {
        logger.debug({ ruleId: rule.id }, 'Default rule already exists');
      }
    } catch (error) {
      logger.error({ error, ruleId: rule.id }, 'Error syncing default rule');
    }
  }
}

/**
 * Load all active rules from database
 */
export async function loadActiveRules(forceRefresh = false): Promise<Rule[]> {
  // Check cache
  if (!forceRefresh && rulesCache && Date.now() - lastLoadTime < CACHE_TTL) {
    logger.debug('Using cached rules');
    return rulesCache;
  }

  try {
    const dbRules = await db
      .select()
      .from(journeyRules)
      .where(eq(journeyRules.active, true));

    const rules: Rule[] = dbRules.map((r) => r.ruleConfig as Rule);

    // Update cache
    rulesCache = rules;
    lastLoadTime = Date.now();

    logger.info({ count: rules.length }, 'Active rules loaded');
    return rules;
  } catch (error) {
    logger.error({ error }, 'Error loading active rules');
    return [];
  }
}

/**
 * Clear rules cache
 */
export function clearRulesCache(): void {
  rulesCache = null;
  lastLoadTime = 0;
  logger.debug('Rules cache cleared');
}
