/**
 * AI Generation Wrapper with Audit Trail
 * Example integration for services/reporting
 * Worker 10: AI/ML Explainability & Guardrails
 */

import { Pool } from 'pg';
import { AuditPersister, GuardrailsOrchestrator, AISpanHelper } from '@teei/observability/ai';
import { createSafetyChecker } from '@teei/safety-moderation';
import { createBudgetEnforcer } from '@teei/ai-budget';
import { createEvidenceGate } from '@teei/observability/ai';
import { CreatePromptRecord } from '@teei/shared-types';
import { randomUUID } from 'crypto';

export interface AIGenerationRequest {
  companyId: string;
  userId?: string;
  promptText: string;
  evidenceSnippets: Array<{ id: string; text: string }>;
  model: string;
  provider: 'openai' | 'anthropic' | 'google';
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerationResponse {
  content: string;
  promptRecordId: string;
  citationCount: number;
  costUsd: number;
  latencyMs: number;
}

export class AIGenerationWrapper {
  private auditor: AuditPersister;
  private guardrails: GuardrailsOrchestrator;

  constructor(private pgPool: Pool, private llmClient: any) {
    this.auditor = new AuditPersister(pgPool);

    const safetyChecker = createSafetyChecker({
      pgPool,
      enableOpenAIMod: false,
    });

    const budgetEnforcer = createBudgetEnforcer({
      pgPool,
    });

    const evidenceGate = createEvidenceGate();

    this.guardrails = new GuardrailsOrchestrator({
      safetyChecker,
      evidenceGate,
      budgetEnforcer,
    });
  }

  async generate(request: AIGenerationRequest): Promise<AIGenerationResponse> {
    const requestId = randomUUID();
    const startTime = Date.now();

    const span = AISpanHelper.startSpan('ai.generate.report', {
      operation: 'report-generation',
      model: request.model,
      provider: request.provider,
      companyId: request.companyId,
      requestId,
    });

    try {
      const estimatedCostUsd = this.estimateCost(request.model, request.promptText.length);

      const preChecks = await this.guardrails.runPreChecks({
        text: request.promptText,
        companyId: request.companyId,
        operation: 'report-generation',
        estimatedCostUsd,
      });

      if (!preChecks.overallPassed) {
        const error = new Error(preChecks.blockedReason);
        AISpanHelper.recordError(span, error, preChecks.blockedReason);
        span.end();

        await this.auditor.store(this.createBlockedRecord(
          requestId,
          request,
          preChecks,
          Date.now() - startTime
        ));

        throw error;
      }

      const response = await this.llmClient.generate({
        model: request.model,
        messages: [
          { role: 'system', content: 'You are an expert CSR analyst.' },
          { role: 'user', content: request.promptText },
        ],
        temperature: request.temperature,
        maxTokens: request.maxTokens,
      });

      const evidenceCheck = await this.guardrails.runPostChecks({
        generatedText: response.content,
        availableEvidenceIds: request.evidenceSnippets.map(e => e.id),
      });

      if (!evidenceCheck.passed) {
        const error = new Error('Evidence validation failed: ' + evidenceCheck.errors.join('; '));
        AISpanHelper.recordError(span, error);
        span.end();

        await this.auditor.store(this.createFailedRecord(
          requestId,
          request,
          response,
          preChecks,
          evidenceCheck,
          Date.now() - startTime,
          error.message
        ));

        throw error;
      }

      const actualCostUsd = this.calculateActualCost(request.model, response.usage);
      const latencyMs = Date.now() - startTime;

      AISpanHelper.recordTokens(span, response.usage.promptTokens, response.usage.completionTokens, actualCostUsd);
      AISpanHelper.recordGuardrails(span, true, true, true);

      const auditRecord = await this.auditor.store({
        requestId,
        companyId: request.companyId,
        userId: request.userId,
        modelName: request.model,
        provider: request.provider,
        promptHash: AuditPersister.hash(request.promptText),
        outputHash: AuditPersister.hash(response.content),
        evidenceIds: request.evidenceSnippets.map(e => e.id),
        citationCount: evidenceCheck.citationCount,
        tokensInput: response.usage.promptTokens,
        tokensOutput: response.usage.completionTokens,
        tokensTotal: response.usage.totalTokens,
        costUsd: actualCostUsd,
        latencyMs,
        safetyCheckPassed: preChecks.safety.passed,
        safetyCheckDetails: preChecks.safety,
        evidenceGatePassed: evidenceCheck.passed,
        evidenceGateDetails: evidenceCheck,
        budgetCheckPassed: preChecks.budget.allowed,
        budgetCheckDetails: preChecks.budget,
        status: 'success',
        operation: 'report-generation',
      });

      AISpanHelper.endSpan(span, auditRecord.id);

      return {
        content: response.content,
        promptRecordId: auditRecord.id,
        citationCount: evidenceCheck.citationCount,
        costUsd: actualCostUsd,
        latencyMs,
      };
    } catch (error) {
      AISpanHelper.recordError(span, error as Error);
      span.end();
      throw error;
    }
  }

  private estimateCost(model: string, promptLength: number): number {
    const tokensEstimate = promptLength / 4;
    const costPer1kTokens = model.includes('gpt-4') ? 0.03 : 0.002;
    return (tokensEstimate / 1000) * costPer1kTokens;
  }

  private calculateActualCost(model: string, usage: any): number {
    const inputCostPer1k = model.includes('gpt-4') ? 0.03 : 0.002;
    const outputCostPer1k = model.includes('gpt-4') ? 0.06 : 0.004;
    return (usage.promptTokens / 1000) * inputCostPer1k + (usage.completionTokens / 1000) * outputCostPer1k;
  }

  private createBlockedRecord(
    requestId: string,
    request: AIGenerationRequest,
    preChecks: any,
    latencyMs: number
  ): CreatePromptRecord {
    const status = !preChecks.safety.passed ? 'blocked_safety' : 'blocked_budget';
    
    return {
      requestId,
      companyId: request.companyId,
      userId: request.userId,
      modelName: request.model,
      provider: request.provider,
      promptHash: AuditPersister.hash(request.promptText),
      outputHash: AuditPersister.hash(''),
      evidenceIds: request.evidenceSnippets.map(e => e.id),
      citationCount: 0,
      tokensInput: 0,
      tokensOutput: 0,
      tokensTotal: 0,
      costUsd: 0,
      latencyMs,
      safetyCheckPassed: preChecks.safety.passed,
      safetyCheckDetails: preChecks.safety,
      evidenceGatePassed: false,
      budgetCheckPassed: preChecks.budget.allowed,
      budgetCheckDetails: preChecks.budget,
      status: status as any,
      errorMessage: preChecks.blockedReason,
      operation: 'report-generation',
    };
  }

  private createFailedRecord(
    requestId: string,
    request: AIGenerationRequest,
    response: any,
    preChecks: any,
    evidenceCheck: any,
    latencyMs: number,
    errorMessage: string
  ): CreatePromptRecord {
    return {
      requestId,
      companyId: request.companyId,
      userId: request.userId,
      modelName: request.model,
      provider: request.provider,
      promptHash: AuditPersister.hash(request.promptText),
      outputHash: AuditPersister.hash(response.content),
      evidenceIds: request.evidenceSnippets.map(e => e.id),
      citationCount: evidenceCheck.citationCount,
      tokensInput: response.usage.promptTokens,
      tokensOutput: response.usage.completionTokens,
      tokensTotal: response.usage.totalTokens,
      costUsd: this.calculateActualCost(request.model, response.usage),
      latencyMs,
      safetyCheckPassed: preChecks.safety.passed,
      safetyCheckDetails: preChecks.safety,
      evidenceGatePassed: evidenceCheck.passed,
      evidenceGateDetails: evidenceCheck,
      budgetCheckPassed: preChecks.budget.allowed,
      budgetCheckDetails: preChecks.budget,
      status: 'blocked_evidence',
      errorMessage,
      operation: 'report-generation',
    };
  }
}
