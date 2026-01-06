/**
 * Guardrails Orchestrator
 * Worker 10: AI/ML Explainability & Guardrails
 */

import {
  GuardrailsResult,
  SafetyCheckRequest,
  SafetyCheckResult,
  EvidenceGateRequest,
  EvidenceGateResult,
  BudgetCheckRequest,
  BudgetCheckResult,
} from '@teei/shared-types';

export interface GuardrailsOrchestratorDeps {
  safetyChecker: {
    check: (req: SafetyCheckRequest) => Promise<SafetyCheckResult>;
  };
  evidenceGate: {
    validate: (req: EvidenceGateRequest) => Promise<EvidenceGateResult>;
  };
  budgetEnforcer: {
    check: (req: BudgetCheckRequest) => Promise<BudgetCheckResult>;
  };
}

export class GuardrailsOrchestrator {
  constructor(private deps: GuardrailsOrchestratorDeps) {}

  async runPreChecks(params: {
    text: string;
    companyId: string;
    operation: string;
    estimatedCostUsd: number;
  }): Promise<Omit<GuardrailsResult, 'evidence'>> {
    const [safetyResult, budgetResult] = await Promise.all([
      this.deps.safetyChecker.check({
        text: params.text,
        companyId: params.companyId,
        operation: params.operation,
      }),
      this.deps.budgetEnforcer.check({
        companyId: params.companyId,
        estimatedCostUsd: params.estimatedCostUsd,
        operation: params.operation,
      }),
    ]);

    const safetyPassed = safetyResult.action !== 'block';
    const budgetPassed = budgetResult.allowed;
    const overallPassed = safetyPassed && budgetPassed;

    let blockedReason: string | undefined;
    if (!safetyPassed) {
      const reason = safetyResult.rationale || 'Content policy violation';
      blockedReason = 'Safety check failed: ' + reason;
    } else if (!budgetPassed) {
      blockedReason = 'Budget limit exceeded: ' + budgetResult.message;
    }

    return {
      safety: safetyResult,
      budget: budgetResult,
      overallPassed,
      blockedReason,
    };
  }

  async runPostChecks(params: {
    generatedText: string;
    availableEvidenceIds: string[];
  }): Promise<EvidenceGateResult> {
    return this.deps.evidenceGate.validate({
      generatedText: params.generatedText,
      availableEvidenceIds: params.availableEvidenceIds,
    });
  }
}
