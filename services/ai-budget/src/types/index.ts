import { z } from 'zod';

// Claude 3.5 Sonnet pricing (per million tokens)
export const AI_PRICING = {
  'claude-3-5-sonnet-20241022': {
    input: 3.0, // $3/MTok
    output: 15.0, // $15/MTok
  },
  'claude-3-opus-20240229': {
    input: 15.0, // $15/MTok
    output: 75.0, // $75/MTok
  },
  'claude-3-haiku-20240307': {
    input: 0.25, // $0.25/MTok
    output: 1.25, // $1.25/MTok
  },
} as const;

export type AIModel = keyof typeof AI_PRICING;

// Database schemas
export interface AITokenBudget {
  id: number;
  tenant_id: string;
  model: AIModel;
  monthly_limit_usd: number;
  current_usage_usd: number;
  token_count_input: number;
  token_count_output: number;
  reset_date: Date;
  soft_limit_notified: boolean;
  hard_limit_reached: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AITokenUsage {
  id: number;
  request_id: string;
  tenant_id: string;
  model: AIModel;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  report_type?: string;
  user_id?: string;
  timestamp: Date;
}

// API request/response schemas
export const TrackUsageSchema = z.object({
  request_id: z.string().uuid(),
  tenant_id: z.string(),
  model: z.enum(['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']),
  prompt_tokens: z.number().int().positive(),
  completion_tokens: z.number().int().positive(),
  report_type: z.string().optional(),
  user_id: z.string().optional(),
});

export type TrackUsageRequest = z.infer<typeof TrackUsageSchema>;

export const SetBudgetSchema = z.object({
  tenant_id: z.string(),
  model: z.enum(['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']),
  monthly_limit_usd: z.number().positive(),
});

export type SetBudgetRequest = z.infer<typeof SetBudgetSchema>;

export interface BudgetStatusResponse {
  tenant_id: string;
  budgets: Array<{
    model: AIModel;
    monthly_limit_usd: number;
    current_usage_usd: number;
    percentage_used: number;
    token_count_input: number;
    token_count_output: number;
    reset_date: string;
    status: 'ok' | 'warning' | 'exceeded';
    soft_limit_notified: boolean;
    hard_limit_reached: boolean;
  }>;
  total_usage_usd: number;
  total_limit_usd: number;
}

export interface BudgetCheckResult {
  allowed: boolean;
  reason?: string;
  current_usage_usd: number;
  monthly_limit_usd: number;
  percentage_used: number;
}

// Utility function to calculate cost
export function calculateCost(
  model: AIModel,
  promptTokens: number,
  completionTokens: number
): number {
  const pricing = AI_PRICING[model];
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}
