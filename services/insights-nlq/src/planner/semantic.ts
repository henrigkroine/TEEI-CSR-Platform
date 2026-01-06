/**
 * Semantic Planner - nlq-semantic-planner
 * Converts natural language to safe query plan using LLM
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { getMetric, type Metric } from '../ontology/metrics.js';
import { getJoinRule } from '../ontology/joins.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('nlq-semantic-planner');

/**
 * Query Plan Schema
 */
export const QueryPlanSchema = z.object({
  intent: z.string(), // What the user wants
  metrics: z.array(
    z.object({
      id: z.string(),
      aggregation: z.string(),
      alias: z.string().optional(),
    })
  ),
  dimensions: z.array(
    z.object({
      table: z.string(),
      column: z.string(),
      alias: z.string().optional(),
    })
  ),
  filters: z.array(
    z.object({
      table: z.string(),
      column: z.string(),
      operator: z.string(),
      value: z.any(),
    })
  ),
  timeRange: z.object({
    start: z.string(), // ISO date
    end: z.string(), // ISO date
    granularity: z.string(), // day, week, month, etc.
  }),
  joins: z.array(
    z.object({
      fromTable: z.string(),
      toTable: z.string(),
    })
  ),
  orderBy: z
    .array(
      z.object({
        column: z.string(),
        direction: z.enum(['ASC', 'DESC']),
      })
    )
    .optional(),
  limit: z.number().optional(),
  tenantId: z.string(), // Required for row-level security
});

export type QueryPlan = z.infer<typeof QueryPlanSchema>;

/**
 * Semantic planner using Claude
 */
export class SemanticPlanner {
  private client: Anthropic;
  private model = 'claude-3-5-sonnet-20241022';

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Plan query from natural language
   */
  async planQuery(
    naturalLanguage: string,
    tenantId: string,
    options: {
      userId?: string;
      userRole?: string;
      contextMetrics?: string[]; // Previously used metrics
    } = {}
  ): Promise<QueryPlan> {
    const startTime = Date.now();

    try {
      // Build system prompt with ontology
      const systemPrompt = this.buildSystemPrompt();

      // Build user prompt
      const userPrompt = this.buildUserPrompt(naturalLanguage, tenantId, options);

      logger.info({ naturalLanguage, tenantId }, 'Planning NLQ query');

      // Call Claude
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Extract plan from response
      const planText = response.content[0].type === 'text' ? response.content[0].text : '';
      const plan = this.extractPlan(planText, tenantId);

      const planTime = Date.now() - startTime;
      logger.info({ planTime, plan }, 'Query plan generated');

      // Validate plan meets performance targets (avg ≤ 350ms)
      if (planTime > 500) {
        logger.warn({ planTime }, 'Plan generation exceeded 500ms target');
      }

      return plan;
    } catch (error) {
      logger.error({ error, naturalLanguage }, 'Failed to plan query');
      throw new Error(`Query planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build system prompt with ontology context
   */
  private buildSystemPrompt(): string {
    return `You are a CSR analytics query planner. Convert natural language questions into structured query plans.

**Available Metrics:**
- volunteer_hours: Total hours volunteered (sum, avg, count, median)
- donation_amount: Total monetary donations (sum, avg, count, min, max)
- participant_count: Unique participants (count_distinct)
- sroi_ratio: Social Return on Investment (avg, min, max, median)
- carbon_offset: Carbon offset in tCO2e (sum, avg)

**Available Dimensions:**
- program_id, campaign_id, region, department, activity_type, cause, program_type, activity_category, currency

**Time Granularities:**
- day, week, month, quarter, year

**Rules:**
1. ALWAYS include tenantId in the plan (for row-level security)
2. ALWAYS include a timeRange (start, end, granularity)
3. Only use metrics and dimensions from the allowed lists above
4. Use appropriate aggregations for each metric
5. Keep joins to a minimum (max 3)
6. Default limit to 1000 rows
7. Infer reasonable time ranges if not specified (e.g., "last quarter")

**Output Format:**
Return ONLY a valid JSON object matching this schema:
{
  "intent": "user's intent in one sentence",
  "metrics": [{ "id": "metric_id", "aggregation": "sum", "alias": "optional" }],
  "dimensions": [{ "table": "table_name", "column": "column_name", "alias": "optional" }],
  "filters": [{ "table": "table_name", "column": "column_name", "operator": "=", "value": "value" }],
  "timeRange": { "start": "2024-01-01", "end": "2024-12-31", "granularity": "month" },
  "joins": [{ "fromTable": "table1", "toTable": "table2" }],
  "orderBy": [{ "column": "column_name", "direction": "DESC" }],
  "limit": 1000,
  "tenantId": "will be injected"
}

No other text or explanation - ONLY the JSON object.`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(
    naturalLanguage: string,
    tenantId: string,
    options: { userId?: string; userRole?: string; contextMetrics?: string[] }
  ): string {
    let prompt = `Convert this natural language question into a query plan:\n\n"${naturalLanguage}"\n\n`;
    prompt += `Tenant ID: ${tenantId}\n`;

    if (options.contextMetrics && options.contextMetrics.length > 0) {
      prompt += `User has recently queried: ${options.contextMetrics.join(', ')}\n`;
    }

    prompt += `\nReturn ONLY the JSON query plan.`;

    return prompt;
  }

  /**
   * Extract and validate plan from LLM response
   */
  private extractPlan(responseText: string, tenantId: string): QueryPlan {
    try {
      // Extract JSON from response (may be wrapped in markdown code blocks)
      let jsonText = responseText.trim();

      // Remove markdown code blocks if present
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
      }

      // Parse JSON
      const parsed = JSON.parse(jsonText);

      // Inject tenant ID
      parsed.tenantId = tenantId;

      // Validate with Zod
      const plan = QueryPlanSchema.parse(parsed);

      return plan;
    } catch (error) {
      logger.error({ error, responseText }, 'Failed to extract plan from LLM response');
      throw new Error('Invalid query plan format');
    }
  }

  /**
   * Calculate estimated cost for a plan
   */
  calculatePlanCost(plan: QueryPlan): number {
    let cost = 0;

    // Base cost
    cost += 10;

    // Metric costs
    for (const metric of plan.metrics) {
      const metricDef = getMetric(metric.id);
      if (metricDef) {
        cost += metricDef.costWeight * 5;
      }
    }

    // Join costs
    for (const join of plan.joins) {
      const joinRule = getJoinRule(join.fromTable, join.toTable);
      if (joinRule) {
        cost += joinRule.costWeight * 10;
      }
    }

    // Dimension costs
    cost += plan.dimensions.length * 2;

    // Time range cost (longer = more expensive)
    const start = new Date(plan.timeRange.start);
    const end = new Date(plan.timeRange.end);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    cost += Math.min(daysDiff / 30, 10); // Cap at 10 points

    return Math.round(cost);
  }
}
