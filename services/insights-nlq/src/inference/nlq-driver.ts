/**
 * NLQ Inference Driver
 *
 * Converts natural language queries to ClickHouse SQL using AI providers
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export enum AIProvider {
  CLAUDE = 'claude',
  OPENAI = 'openai'
}

export interface NLQRequest {
  query: string;
  language: 'en' | 'uk' | 'no' | 'ar' | 'he';
  companyId: string;
  userId: string;
  maxTokens?: number;
  temperature?: number;
}

export interface NLQResult {
  sql: string;
  provider: AIProvider;
  model: string;
  language: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
  costUSD: number;
  latencyMs: number;
  cacheHit: boolean;
}

export interface Citation {
  table: string;
  column: string;
  description: string;
}

/**
 * Token pricing per provider (USD per 1M tokens)
 */
const TOKEN_PRICING = {
  [AIProvider.CLAUDE]: {
    'claude-3-5-sonnet-20241022': {
      input: 3.0,
      output: 15.0
    },
    'claude-3-haiku-20240307': {
      input: 0.25,
      output: 1.25
    }
  },
  [AIProvider.OPENAI]: {
    'gpt-4o': {
      input: 2.5,
      output: 10.0
    },
    'gpt-4o-mini': {
      input: 0.15,
      output: 0.6
    }
  }
};

/**
 * NLQ Inference Driver
 */
export class NLQDriver {
  private claude: Anthropic | null = null;
  private openai: OpenAI | null = null;
  private defaultProvider: AIProvider;
  private templateCache: Map<string, string> = new Map();

  constructor() {
    // Initialize providers
    const claudeKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (claudeKey) {
      this.claude = new Anthropic({ apiKey: claudeKey });
    }

    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }

    // Determine default provider
    const providerEnv = process.env.NLQ_PROVIDER?.toLowerCase();
    if (providerEnv === 'openai' && this.openai) {
      this.defaultProvider = AIProvider.OPENAI;
    } else if (this.claude) {
      this.defaultProvider = AIProvider.CLAUDE;
    } else {
      throw new Error('No AI provider configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY');
    }

    console.info(`[NLQDriver] Initialized with default provider: ${this.defaultProvider}`);
  }

  /**
   * Load and cache prompt template for a language
   */
  private async loadTemplate(language: string): Promise<string> {
    const cacheKey = `nlq-prompt.${language}`;

    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey)!;
    }

    try {
      const templatePath = join(__dirname, '..', 'templates', `${cacheKey}.hbs`);
      const template = await readFile(templatePath, 'utf-8');
      this.templateCache.set(cacheKey, template);
      return template;
    } catch (error) {
      // Fallback to English if language template not found
      console.warn(`Template for ${language} not found, falling back to English`);
      const fallbackPath = join(__dirname, '..', 'templates', 'nlq-prompt.en.hbs');
      const template = await readFile(fallbackPath, 'utf-8');
      return template;
    }
  }

  /**
   * Build prompt from template and user query
   */
  private async buildPrompt(request: NLQRequest): Promise<string> {
    const template = await this.loadTemplate(request.language);

    // Simple template replacement (Handlebars not needed for basic substitution)
    const prompt = template.replace(/\{\{userQuery\}\}/g, request.query);

    return prompt;
  }

  /**
   * Generate SQL using Claude
   */
  private async generateWithClaude(request: NLQRequest): Promise<NLQResult> {
    if (!this.claude) {
      throw new Error('Claude provider not configured');
    }

    const startTime = Date.now();
    const prompt = await this.buildPrompt(request);

    const model = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
    const maxTokens = request.maxTokens || 2000;

    const response = await this.claude.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: request.temperature || 0.0,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const latencyMs = Date.now() - startTime;

    // Extract SQL from response
    const content = response.content[0];
    let sql = '';

    if (content.type === 'text') {
      sql = this.extractSQL(content.text);
    }

    // Calculate cost
    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const pricing = TOKEN_PRICING[AIProvider.CLAUDE][model as keyof typeof TOKEN_PRICING.claude];
    const costUSD =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    return {
      sql,
      provider: AIProvider.CLAUDE,
      model,
      language: request.language,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      },
      costUSD,
      latencyMs,
      cacheHit: false
    };
  }

  /**
   * Generate SQL using OpenAI
   */
  private async generateWithOpenAI(request: NLQRequest): Promise<NLQResult> {
    if (!this.openai) {
      throw new Error('OpenAI provider not configured');
    }

    const startTime = Date.now();
    const prompt = await this.buildPrompt(request);

    const model = process.env.OPENAI_MODEL || 'gpt-4o';
    const maxTokens = request.maxTokens || 2000;

    const response = await this.openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature: request.temperature || 0.0,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const latencyMs = Date.now() - startTime;

    // Extract SQL from response
    const content = response.choices[0]?.message?.content || '';
    const sql = this.extractSQL(content);

    // Calculate cost
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const pricing = TOKEN_PRICING[AIProvider.OPENAI][model as keyof typeof TOKEN_PRICING.openai];
    const costUSD =
      (inputTokens / 1_000_000) * pricing.input +
      (outputTokens / 1_000_000) * pricing.output;

    return {
      sql,
      provider: AIProvider.OPENAI,
      model,
      language: request.language,
      tokensUsed: {
        input: inputTokens,
        output: outputTokens,
        total: inputTokens + outputTokens
      },
      costUSD,
      latencyMs,
      cacheHit: false
    };
  }

  /**
   * Extract SQL from AI response (handle code blocks, markdown, etc.)
   */
  private extractSQL(response: string): string {
    // Remove markdown code blocks
    let sql = response.replace(/```sql\n?/gi, '').replace(/```\n?/g, '');

    // Trim whitespace
    sql = sql.trim();

    // If multiple queries, take the first one
    if (sql.includes(';')) {
      sql = sql.split(';')[0].trim();
    }

    return sql;
  }

  /**
   * Generate SQL from natural language query
   */
  async generate(request: NLQRequest): Promise<NLQResult> {
    const provider = this.defaultProvider;

    console.info(
      `[NLQDriver] Generating SQL for query (${request.language}): "${request.query.slice(0, 100)}..."`
    );

    if (provider === AIProvider.CLAUDE) {
      return this.generateWithClaude(request);
    } else {
      return this.generateWithOpenAI(request);
    }
  }

  /**
   * Generate with specific provider
   */
  async generateWithProvider(
    provider: AIProvider,
    request: NLQRequest
  ): Promise<NLQResult> {
    if (provider === AIProvider.CLAUDE) {
      return this.generateWithClaude(request);
    } else {
      return this.generateWithOpenAI(request);
    }
  }

  /**
   * Extract citations from generated SQL
   */
  extractCitations(sql: string): Citation[] {
    const citations: Citation[] = [];
    const tableRegex = /FROM\s+([a-zA-Z0-9_]+)|JOIN\s+([a-zA-Z0-9_]+)/gi;
    const tables = new Set<string>();

    let match;
    while ((match = tableRegex.exec(sql)) !== null) {
      const table = match[1] || match[2];
      tables.add(table);
    }

    // Map tables to descriptions
    const tableDescriptions: Record<string, string> = {
      outcome_scores: 'Outcome assessment scores from qualitative feedback',
      journey_transitions: 'Program lifecycle stage transitions',
      impact_metrics: 'SROI, VIS, and impact calculations',
      buddy_matches: 'Mentorship match records',
      upskilling_completions: 'Course completion tracking',
      unified_profiles: 'Aggregated participant profiles'
    };

    for (const table of tables) {
      citations.push({
        table,
        column: '*',
        description: tableDescriptions[table] || 'Data table'
      });
    }

    return citations;
  }
}
