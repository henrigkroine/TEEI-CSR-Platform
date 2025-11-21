/**
 * Audit Persister
 * Worker 10: AI/ML Explainability & Guardrails
 */

import { Pool } from 'pg';
import { createHash } from 'crypto';
import {
  CreatePromptRecord,
  PromptRecord,
  AuditQueryFilters,
} from '@teei/shared-types';

export class AuditPersister {
  constructor(private pgPool: Pool) {}

  async store(record: CreatePromptRecord): Promise<PromptRecord> {
    const sql = `INSERT INTO ai_prompt_audit (
      request_id, company_id, user_id,
      model_name, model_version, provider, region,
      prompt_template, prompt_hash, prompt_variables,
      output_hash, output_summary,
      evidence_ids, citation_count, top_k,
      tokens_input, tokens_output, tokens_total, cost_usd,
      latency_ms,
      safety_check_passed, safety_check_details,
      evidence_gate_passed, evidence_gate_details,
      budget_check_passed, budget_check_details,
      status, error_message,
      section_explanations, retry_count, parent_request_id,
      operation, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
      $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33
    ) RETURNING *`;

    const result = await this.pgPool.query(sql, [
      record.requestId,
      record.companyId,
      record.userId || null,
      record.modelName,
      record.modelVersion || null,
      record.provider,
      record.region || null,
      record.promptTemplate || null,
      record.promptHash,
      record.promptVariables ? JSON.stringify(record.promptVariables) : null,
      record.outputHash,
      record.outputSummary || null,
      record.evidenceIds,
      record.citationCount,
      record.topK || null,
      record.tokensInput,
      record.tokensOutput,
      record.tokensTotal,
      record.costUsd,
      record.latencyMs,
      record.safetyCheckPassed,
      record.safetyCheckDetails ? JSON.stringify(record.safetyCheckDetails) : null,
      record.evidenceGatePassed,
      record.evidenceGateDetails ? JSON.stringify(record.evidenceGateDetails) : null,
      record.budgetCheckPassed,
      record.budgetCheckDetails ? JSON.stringify(record.budgetCheckDetails) : null,
      record.status,
      record.errorMessage || null,
      record.sectionExplanations ? JSON.stringify(record.sectionExplanations) : null,
      record.retryCount,
      record.parentRequestId || null,
      record.operation,
      record.createdBy || 'system',
    ]);

    return this.mapRow(result.rows[0]);
  }

  async getById(id: string): Promise<PromptRecord | null> {
    const result = await this.pgPool.query(
      'SELECT * FROM ai_prompt_audit WHERE id = $1',
      [id]
    );
    return result.rows.length ? this.mapRow(result.rows[0]) : null;
  }

  async getByRequestId(requestId: string): Promise<PromptRecord | null> {
    const result = await this.pgPool.query(
      'SELECT * FROM ai_prompt_audit WHERE request_id = $1',
      [requestId]
    );
    return result.rows.length ? this.mapRow(result.rows[0]) : null;
  }

  private mapRow(row: any): PromptRecord {
    return {
      id: row.id,
      requestId: row.request_id,
      companyId: row.company_id,
      userId: row.user_id,
      modelName: row.model_name,
      modelVersion: row.model_version,
      provider: row.provider,
      region: row.region,
      promptTemplate: row.prompt_template,
      promptHash: row.prompt_hash,
      promptVariables: row.prompt_variables,
      outputHash: row.output_hash,
      outputSummary: row.output_summary,
      evidenceIds: row.evidence_ids,
      citationCount: row.citation_count,
      topK: row.top_k,
      tokensInput: row.tokens_input,
      tokensOutput: row.tokens_output,
      tokensTotal: row.tokens_total,
      costUsd: parseFloat(row.cost_usd),
      latencyMs: row.latency_ms,
      createdAt: row.created_at.toISOString(),
      safetyCheckPassed: row.safety_check_passed,
      safetyCheckDetails: row.safety_check_details,
      evidenceGatePassed: row.evidence_gate_passed,
      evidenceGateDetails: row.evidence_gate_details,
      budgetCheckPassed: row.budget_check_passed,
      budgetCheckDetails: row.budget_check_details,
      status: row.status,
      errorMessage: row.error_message,
      sectionExplanations: row.section_explanations,
      retryCount: row.retry_count,
      parentRequestId: row.parent_request_id,
      operation: row.operation,
      createdBy: row.created_by,
      updatedAt: row.updated_at?.toISOString(),
    };
  }

  static hash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }
}
