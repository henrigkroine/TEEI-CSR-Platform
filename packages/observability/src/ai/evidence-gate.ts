/**
 * Evidence Gate
 * Worker 10: AI/ML Explainability & Guardrails
 */

import {
  EvidenceGateRequest,
  EvidenceGateResult,
  EvidenceGateConfig,
} from '@teei/shared-types';

export class EvidenceGate {
  private config: Required<EvidenceGateConfig>;

  constructor(config?: Partial<EvidenceGateConfig>) {
    this.config = {
      minCitationsPerParagraph: config?.minCitationsPerParagraph ?? 1,
      minCitationDensity: config?.minCitationDensity ?? 0.5,
      failFast: config?.failFast ?? true,
      enabled: config?.enabled ?? true,
    };
  }

  async validate(request: EvidenceGateRequest): Promise<EvidenceGateResult> {
    if (!this.config.enabled) {
      return {
        passed: true,
        citationCount: 0,
        paragraphCount: 0,
        citationDensity: 0,
        minCitationsRequired: 0,
        errors: [],
        warnings: [],
      };
    }

    const config = request.config || this.config;
    const text = request.generatedText;
    const citationPattern = /\[([a-f0-9-]+)\]/g;
    const citations = Array.from(text.matchAll(citationPattern));
    const citationIds = citations.map(m => m[1]).filter((id): id is string => typeof id === 'string');
    const paragraphs = text.split(/\n\n+|<\/p>/).filter(p => p.trim().length > 20);
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const citationCount = citations.length;
    const paragraphCount = paragraphs.length;
    const citationDensity = words > 0 ? (citationCount / words) * 100 : 0;
    const errors: string[] = [];
    const warnings: string[] = [];
    const minCitationsRequired = paragraphCount * config.minCitationsPerParagraph;
    
    if (citationCount < minCitationsRequired) {
      const msg = 'Insufficient citations: found ' + citationCount + ', required at least ' + minCitationsRequired;
      errors.push(msg);
    }
    
    if (citationDensity < config.minCitationDensity) {
      const density = citationDensity.toFixed(2);
      const msg = 'Citation density too low: ' + density + ' per 100 words, required ' + config.minCitationDensity;
      errors.push(msg);
    }
    
    const invalidCitations = citationIds.filter(
      id => !request.availableEvidenceIds.includes(id)
    );
    
    if (invalidCitations.length > 0) {
      errors.push('Invalid citation IDs: ' + invalidCitations.join(', '));
    }
    
    if (paragraphCount > 0 && citationCount / paragraphCount < 1.5) {
      warnings.push('Consider adding more citations for stronger evidence support');
    }

    return {
      passed: errors.length === 0,
      citationCount,
      paragraphCount,
      citationDensity,
      minCitationsRequired,
      errors,
      warnings,
    };
  }
}

let evidenceGateInstance: EvidenceGate | null = null;

export function createEvidenceGate(config?: Partial<EvidenceGateConfig>): EvidenceGate {
  if (!evidenceGateInstance) {
    evidenceGateInstance = new EvidenceGate(config);
  }
  return evidenceGateInstance;
}
