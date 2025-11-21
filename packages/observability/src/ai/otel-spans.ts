/**
 * OpenTelemetry AI Spans
 * Worker 10: AI/ML Explainability & Guardrails
 */

import { trace, Span, SpanStatusCode } from '@opentelemetry/api';

const AI_TRACER_NAME = 'teei.ai';

export interface AISpanParams {
  operation: 'report-generation' | 'nlq-query' | 'q2q-classification' | 'other';
  model: string;
  provider: string;
  companyId: string;
  requestId: string;
}

export class AISpanHelper {
  static startSpan(name: string, params: AISpanParams): Span {
    const tracer = trace.getTracer(AI_TRACER_NAME);

    const span = tracer.startSpan(name, {
      attributes: {
        'ai.operation': params.operation,
        'ai.model.name': params.model,
        'ai.model.provider': params.provider,
        'ai.company_id': params.companyId,
        'ai.request_id': params.requestId,
      },
    });

    return span;
  }

  static recordTokens(span: Span, tokensInput: number, tokensOutput: number, costUsd: number): void {
    span.setAttributes({
      'ai.tokens.input': tokensInput,
      'ai.tokens.output': tokensOutput,
      'ai.tokens.total': tokensInput + tokensOutput,
      'ai.cost.usd': costUsd,
    });
  }

  static recordGuardrails(
    span: Span,
    safetyPassed: boolean,
    evidencePassed: boolean,
    budgetPassed: boolean
  ): void {
    span.setAttributes({
      'ai.guardrails.safety.passed': safetyPassed,
      'ai.guardrails.evidence.passed': evidencePassed,
      'ai.guardrails.budget.passed': budgetPassed,
    });
  }

  static recordError(span: Span, error: Error, blockedReason?: string): void {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: blockedReason || error.message,
    });
    span.recordException(error);
  }

  static endSpan(span: Span, promptRecordId?: string): void {
    if (promptRecordId) {
      span.setAttribute('ai.prompt_record_id', promptRecordId);
    }
    span.end();
  }
}
