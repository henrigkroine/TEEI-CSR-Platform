import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import Handlebars from 'handlebars';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServiceLogger } from '@teei/shared-utils';
import { OutcomeDimension } from './taxonomy.js';

const logger = createServiceLogger('q2q-ai:classifier-real');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ClassificationResult {
  scores: Record<OutcomeDimension, number>;
  confidences: Record<OutcomeDimension, number>;
  evidenceSnippets: Record<OutcomeDimension, string>;
  metadata: {
    textLength: number;
    wordCount: number;
    timestamp: string;
    modelName: string;
    tokensUsed: number;
  };
}

/**
 * Real LLM-based classifier for outcome dimensions
 * Replaces the stub implementation with actual AI classification
 */
export class RealClassifier {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private provider: string;
  private model: string;
  private promptTemplate: HandlebarsTemplateDelegate;

  constructor() {
    this.provider = process.env.LLM_PROVIDER || 'openai';
    this.model = process.env.LLM_MODEL || (this.provider === 'openai' ? 'gpt-4-turbo' : 'claude-3-sonnet-20240229');

    // Initialize LLM client
    if (this.provider === 'openai') {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }
      this.openaiClient = new OpenAI({ apiKey });
    } else if (this.provider === 'anthropic') {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY not configured');
      }
      this.anthropicClient = new Anthropic({ apiKey });
    } else {
      throw new Error(`Unsupported LLM provider: ${this.provider}`);
    }

    // Load and compile prompt template
    const templatePath = join(__dirname, 'prompts', 'outcome-classification.hbs');
    const templateContent = readFileSync(templatePath, 'utf-8');
    this.promptTemplate = Handlebars.compile(templateContent);

    logger.info(`Real classifier initialized with provider: ${this.provider}, model: ${this.model}`);
  }

  /**
   * Classify text using LLM
   */
  async classifyText(text: string): Promise<ClassificationResult> {
    const startTime = Date.now();
    const textLength = text.length;
    const wordCount = text.trim().split(/\s+/).length;

    logger.info(`Classifying text (${textLength} chars, ${wordCount} words)`);

    // Generate prompt from template
    const prompt = this.promptTemplate({ text });

    // Call LLM
    let response: any;
    let tokensUsed = 0;

    try {
      if (this.provider === 'openai') {
        response = await this.callOpenAI(prompt);
        tokensUsed = response.tokensUsed;
      } else {
        response = await this.callAnthropic(prompt);
        tokensUsed = response.tokensUsed;
      }

      // Parse JSON response
      const result = this.parseClassificationResponse(response.content);

      const duration = Date.now() - startTime;
      logger.info(`Classification completed in ${duration}ms`, {
        tokensUsed,
        avgScores: this.calculateAverageScore(result.scores),
      });

      return {
        scores: result.scores,
        confidences: result.confidences,
        evidenceSnippets: result.evidenceSnippets,
        metadata: {
          textLength,
          wordCount,
          timestamp: new Date().toISOString(),
          modelName: this.model,
          tokensUsed,
        },
      };
    } catch (error: any) {
      logger.error(`Classification failed: ${error.message}`, { error });
      throw error;
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<{ content: string; tokensUsed: number }> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const completion = await this.openaiClient.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are an expert outcome classifier. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3, // Low temperature for consistent classification
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const choice = completion.choices[0];
    if (!choice || !choice.message.content) {
      throw new Error('No response from OpenAI');
    }

    return {
      content: choice.message.content,
      tokensUsed: completion.usage?.total_tokens || 0,
    };
  }

  /**
   * Call Anthropic API
   */
  private async callAnthropic(prompt: string): Promise<{ content: string; tokensUsed: number }> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model: this.model,
      max_tokens: 1000,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text content in Anthropic response');
    }

    return {
      content: textContent.text,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  /**
   * Parse LLM JSON response into classification result
   */
  private parseClassificationResponse(content: string): {
    scores: Record<OutcomeDimension, number>;
    confidences: Record<OutcomeDimension, number>;
    evidenceSnippets: Record<OutcomeDimension, string>;
  } {
    try {
      const parsed = JSON.parse(content);

      const scores: any = {};
      const confidences: any = {};
      const evidenceSnippets: any = {};

      for (const dimension of Object.values(OutcomeDimension)) {
        if (parsed[dimension]) {
          scores[dimension] = parsed[dimension].score || 0.5;
          confidences[dimension] = parsed[dimension].confidence || 0.5;
          evidenceSnippets[dimension] = parsed[dimension].evidence || '';
        } else {
          // Default values if dimension not in response
          scores[dimension] = 0.5;
          confidences[dimension] = 0.3;
          evidenceSnippets[dimension] = '';
        }
      }

      return { scores, confidences, evidenceSnippets };
    } catch (error: any) {
      logger.error(`Failed to parse classification response: ${error.message}`, { content });
      throw new Error('Invalid JSON response from LLM');
    }
  }

  /**
   * Calculate average score across dimensions
   */
  private calculateAverageScore(scores: Record<OutcomeDimension, number>): number {
    const values = Object.values(scores);
    return values.reduce((sum, score) => sum + score, 0) / values.length;
  }

  /**
   * Extract evidence snippet for a specific dimension
   * This is used to populate the evidence_snippets table
   */
  extractEvidenceSnippet(
    text: string,
    dimension: OutcomeDimension,
    evidence: string
  ): string {
    // If we have specific evidence from LLM, use it
    if (evidence && evidence.length > 0) {
      return evidence;
    }

    // Otherwise, extract a relevant snippet from the text (max 200 chars)
    const maxLength = 200;
    if (text.length <= maxLength) {
      return text;
    }

    // Simple extraction - take first 200 chars
    // In production, could use more sophisticated extraction based on dimension
    return text.substring(0, maxLength) + '...';
  }
}

/**
 * Create singleton instance
 */
let classifierInstance: RealClassifier | null = null;

/**
 * Get or create real classifier instance
 */
export function getRealClassifier(): RealClassifier {
  if (!classifierInstance) {
    classifierInstance = new RealClassifier();
  }
  return classifierInstance;
}

/**
 * Check if real classifier is enabled
 */
export function isRealClassifierEnabled(): boolean {
  return process.env.USE_REAL_CLASSIFIER === 'true' || process.env.USE_REAL_CLASSIFIER === '1';
}
