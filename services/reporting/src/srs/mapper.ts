/**
 * Evidence-to-Disclosure Mapper
 *
 * Maps evidence from Q2Q pipeline and metrics to regulatory disclosure requirements.
 * Calculates completeness scores and identifies data gaps.
 *
 * @module srs/mapper
 */

import type {
  DisclosureMapping,
  EvidenceRef,
  GapItem,
  FrameworkType,
  DisclosureStatus,
} from '@teei/shared-types';
import csrdRegistry from './registry/csrd-esrs.json' assert { type: 'json' };
import griRegistry from './registry/gri-standards.json' assert { type: 'json' };
import sdgRegistry from './registry/sdg-targets.json' assert { type: 'json' };

// ============================================================================
// REGISTRY LOADERS
// ============================================================================

export function getCSRDRegistry() {
  return csrdRegistry;
}

export function getGRIRegistry() {
  return griRegistry;
}

export function getSDGRegistry() {
  return sdgRegistry;
}

// ============================================================================
// EVIDENCE FETCHING
// ============================================================================

interface Evidence {
  id: string;
  snippetId?: string;
  source: string;
  timestamp: string;
  content: string;
  category?: string;
  metrics?: string[];
  program?: string;
}

/**
 * Fetch evidence for a company and period
 * This is a stub - in production, this would query the database
 */
export async function fetchEvidenceForPeriod(
  companyId: string,
  periodStart: string,
  periodEnd: string,
  filters?: {
    programs?: string[];
    metrics?: string[];
    includeStale?: boolean;
  }
): Promise<Evidence[]> {
  // TODO: Implement actual database query
  // For now, return empty array - this will be populated with real data
  return [];
}

// ============================================================================
// EVIDENCE SCORING
// ============================================================================

/**
 * Calculate relevance score between evidence and disclosure requirement
 * Uses keyword matching and semantic similarity (simplified version)
 */
function calculateRelevanceScore(evidence: Evidence, requirement: any): number {
  const evidenceText = evidence.content.toLowerCase();
  const requirementText = (requirement.text || requirement.description || '').toLowerCase();

  // Extract keywords from requirement
  const keywords = requirementText
    .split(/\s+/)
    .filter(word => word.length > 4)
    .slice(0, 10);

  // Count keyword matches
  let matchCount = 0;
  for (const keyword of keywords) {
    if (evidenceText.includes(keyword)) {
      matchCount++;
    }
  }

  // Calculate base score from keyword overlap
  const baseScore = keywords.length > 0 ? matchCount / keywords.length : 0;

  // Boost score for specific categories
  let categoryBoost = 0;
  if (evidence.category) {
    if (requirementText.includes(evidence.category.toLowerCase())) {
      categoryBoost = 0.2;
    }
  }

  // Boost score for metric alignment
  let metricBoost = 0;
  if (evidence.metrics && evidence.metrics.length > 0) {
    if (requirement.type === 'quantitative') {
      metricBoost = 0.1;
    }
  }

  return Math.min(baseScore + categoryBoost + metricBoost, 1.0);
}

/**
 * Create evidence reference from raw evidence
 */
function createEvidenceRef(evidence: Evidence, relevanceScore: number): EvidenceRef {
  return {
    evidenceId: evidence.id,
    snippetId: evidence.snippetId,
    source: evidence.source,
    timestamp: evidence.timestamp,
    relevanceScore,
    excerpt: evidence.content.slice(0, 500), // Truncate for display
    metrics: evidence.metrics,
  };
}

// ============================================================================
// COMPLETENESS CALCULATION
// ============================================================================

interface RequirementCoverage {
  requirementId: string;
  covered: boolean;
  evidenceCount: number;
}

/**
 * Calculate completeness score for a disclosure
 * Based on: required data points covered, evidence quality, mandatory fields
 */
function calculateCompletenessScore(
  disclosure: any,
  evidenceRefs: EvidenceRef[],
  requirementCoverage: RequirementCoverage[]
): number {
  if (!disclosure.dataPoints && !disclosure.requirements) {
    return evidenceRefs.length > 0 ? 0.5 : 0;
  }

  const requirements = disclosure.dataPoints || disclosure.requirements || [];
  const requiredCount = requirements.filter((r: any) => r.required).length;
  const totalCount = requirements.length;

  if (totalCount === 0) {
    return evidenceRefs.length > 0 ? 1.0 : 0;
  }

  // Count covered requirements
  const coveredRequired = requirementCoverage.filter(
    rc => rc.covered && requirements.find((r: any) => r.id === rc.requirementId)?.required
  ).length;

  const coveredTotal = requirementCoverage.filter(rc => rc.covered).length;

  // Weight required fields more heavily (70%) vs optional (30%)
  const requiredScore = requiredCount > 0 ? (coveredRequired / requiredCount) : 1.0;
  const optionalScore = (totalCount - requiredCount) > 0
    ? ((coveredTotal - coveredRequired) / (totalCount - requiredCount))
    : 1.0;

  return (requiredScore * 0.7) + (optionalScore * 0.3);
}

/**
 * Determine disclosure status from completeness score
 */
function determineStatus(completenessScore: number): DisclosureStatus {
  if (completenessScore === 0) return 'missing';
  if (completenessScore < 0.5) return 'partial';
  if (completenessScore < 1.0) return 'partial';
  return 'complete';
}

// ============================================================================
// GAP IDENTIFICATION
// ============================================================================

/**
 * Identify data gaps for a disclosure
 */
function identifyGaps(
  disclosure: any,
  framework: FrameworkType,
  requirementCoverage: RequirementCoverage[]
): GapItem[] {
  const gaps: GapItem[] = [];
  const requirements = disclosure.dataPoints || disclosure.requirements || [];

  for (const requirement of requirements) {
    const coverage = requirementCoverage.find(rc => rc.requirementId === requirement.id);

    if (!coverage || !coverage.covered) {
      const severity = requirement.required || requirement.mandatory
        ? 'critical'
        : 'medium';

      gaps.push({
        disclosureId: disclosure.id,
        framework,
        requirementId: requirement.id,
        title: requirement.name || requirement.text || requirement.title,
        severity,
        description: `Missing data for: ${requirement.name || requirement.text}`,
        suggestedAction: getSuggestedAction(requirement),
        affectedMetrics: [],
      });
    }
  }

  return gaps;
}

/**
 * Get suggested action for filling a gap
 */
function getSuggestedAction(requirement: any): string {
  const reqText = (requirement.name || requirement.text || '').toLowerCase();

  if (reqText.includes('emission') || reqText.includes('ghg') || reqText.includes('carbon')) {
    return 'Enable environmental data connector or manually enter emissions data';
  }

  if (reqText.includes('employee') || reqText.includes('workforce') || reqText.includes('headcount')) {
    return 'Connect HRIS system or provide employee data manually';
  }

  if (reqText.includes('training') || reqText.includes('upskilling')) {
    return 'Enable learning platform integration (e.g., Kintell, LMS)';
  }

  if (reqText.includes('volunteer') || reqText.includes('community')) {
    return 'Enable volunteer platform connector (e.g., Benevity, Goodera)';
  }

  if (reqText.includes('injury') || reqText.includes('safety') || reqText.includes('health')) {
    return 'Provide occupational health and safety data';
  }

  return 'Provide required data through manual entry or connector integration';
}

// ============================================================================
// MAPPER FUNCTIONS
// ============================================================================

/**
 * Map evidence to CSRD ESRS disclosure
 */
export async function mapToCSRD(
  companyId: string,
  periodStart: string,
  periodEnd: string,
  filters?: any
): Promise<DisclosureMapping[]> {
  const evidence = await fetchEvidenceForPeriod(companyId, periodStart, periodEnd, filters);
  const registry = getCSRDRegistry();
  const mappings: DisclosureMapping[] = [];

  for (const topic of registry.topics) {
    for (const disclosure of topic.disclosures) {
      // Match evidence to disclosure requirements
      const relevantEvidence: Array<{ evidence: Evidence; score: number }> = [];

      for (const ev of evidence) {
        for (const dataPoint of disclosure.dataPoints) {
          const score = calculateRelevanceScore(ev, dataPoint);
          if (score >= 0.3) { // Minimum relevance threshold
            relevantEvidence.push({ evidence: ev, score });
            break; // Don't double-count same evidence
          }
        }
      }

      // Create evidence references
      const evidenceRefs = relevantEvidence.map(({ evidence: ev, score }) =>
        createEvidenceRef(ev, score)
      );

      // Calculate requirement coverage
      const requirementCoverage: RequirementCoverage[] = disclosure.dataPoints.map(dp => ({
        requirementId: dp.id,
        covered: relevantEvidence.some(({ evidence: ev, score }) =>
          calculateRelevanceScore(ev, dp) >= 0.3
        ),
        evidenceCount: relevantEvidence.filter(({ evidence: ev }) =>
          calculateRelevanceScore(ev, dp) >= 0.3
        ).length,
      }));

      // Calculate completeness
      const completenessScore = calculateCompletenessScore(
        disclosure,
        evidenceRefs,
        requirementCoverage
      );

      const status = determineStatus(completenessScore);
      const gaps = identifyGaps(disclosure, 'CSRD', requirementCoverage);

      mappings.push({
        disclosureId: disclosure.id,
        frameworkType: 'CSRD',
        status,
        completenessScore,
        evidence: evidenceRefs,
        gaps,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  return mappings;
}

/**
 * Map evidence to GRI disclosure
 */
export async function mapToGRI(
  companyId: string,
  periodStart: string,
  periodEnd: string,
  filters?: any
): Promise<DisclosureMapping[]> {
  const evidence = await fetchEvidenceForPeriod(companyId, periodStart, periodEnd, filters);
  const registry = getGRIRegistry();
  const mappings: DisclosureMapping[] = [];

  for (const disclosure of registry.disclosures) {
    // Match evidence to disclosure requirements
    const relevantEvidence: Array<{ evidence: Evidence; score: number }> = [];

    for (const ev of evidence) {
      for (const requirement of disclosure.requirements) {
        const score = calculateRelevanceScore(ev, requirement);
        if (score >= 0.3) {
          relevantEvidence.push({ evidence: ev, score });
          break;
        }
      }
    }

    // Create evidence references
    const evidenceRefs = relevantEvidence.map(({ evidence: ev, score }) =>
      createEvidenceRef(ev, score)
    );

    // Calculate requirement coverage
    const requirementCoverage: RequirementCoverage[] = disclosure.requirements.map(req => ({
      requirementId: req.id,
      covered: relevantEvidence.some(({ evidence: ev }) =>
        calculateRelevanceScore(ev, req) >= 0.3
      ),
      evidenceCount: relevantEvidence.filter(({ evidence: ev }) =>
        calculateRelevanceScore(ev, req) >= 0.3
      ).length,
    }));

    // Calculate completeness
    const completenessScore = calculateCompletenessScore(
      disclosure,
      evidenceRefs,
      requirementCoverage
    );

    const status = determineStatus(completenessScore);
    const gaps = identifyGaps(disclosure, 'GRI', requirementCoverage);

    mappings.push({
      disclosureId: disclosure.id,
      frameworkType: 'GRI',
      status,
      completenessScore,
      evidence: evidenceRefs,
      gaps,
      lastUpdated: new Date().toISOString(),
    });
  }

  return mappings;
}

/**
 * Map evidence to SDG targets
 */
export async function mapToSDG(
  companyId: string,
  periodStart: string,
  periodEnd: string,
  filters?: any
): Promise<DisclosureMapping[]> {
  const evidence = await fetchEvidenceForPeriod(companyId, periodStart, periodEnd, filters);
  const registry = getSDGRegistry();
  const mappings: DisclosureMapping[] = [];

  for (const target of registry.targets) {
    // Match evidence to target indicators
    const relevantEvidence: Array<{ evidence: Evidence; score: number }> = [];

    for (const ev of evidence) {
      // Check against target text and indicators
      const targetScore = calculateRelevanceScore(ev, {
        text: target.targetText,
        description: target.targetText
      });

      if (targetScore >= 0.3) {
        relevantEvidence.push({ evidence: ev, score: targetScore });
      }
    }

    // Create evidence references
    const evidenceRefs = relevantEvidence.map(({ evidence: ev, score }) =>
      createEvidenceRef(ev, score)
    );

    // Calculate requirement coverage (for SDG, indicators are requirements)
    const requirementCoverage: RequirementCoverage[] = target.indicators.map(indicator => ({
      requirementId: indicator.id,
      covered: relevantEvidence.some(({ evidence: ev }) =>
        calculateRelevanceScore(ev, indicator) >= 0.3
      ),
      evidenceCount: relevantEvidence.filter(({ evidence: ev }) =>
        calculateRelevanceScore(ev, indicator) >= 0.3
      ).length,
    }));

    // For SDGs, completeness is more lenient (any evidence = partial, multiple = complete)
    const completenessScore = evidenceRefs.length === 0
      ? 0
      : evidenceRefs.length === 1
        ? 0.5
        : Math.min(evidenceRefs.length / target.indicators.length, 1.0);

    const status = determineStatus(completenessScore);
    const gaps = identifyGaps(
      { id: target.target, requirements: target.indicators },
      'SDG',
      requirementCoverage
    );

    mappings.push({
      disclosureId: target.target,
      frameworkType: 'SDG',
      status,
      completenessScore,
      evidence: evidenceRefs,
      gaps,
      lastUpdated: new Date().toISOString(),
    });
  }

  return mappings;
}

/**
 * Map evidence to all selected frameworks
 */
export async function mapToFrameworks(
  companyId: string,
  periodStart: string,
  periodEnd: string,
  frameworks: FrameworkType[],
  filters?: any
): Promise<DisclosureMapping[]> {
  const mappings: DisclosureMapping[] = [];

  for (const framework of frameworks) {
    switch (framework) {
      case 'CSRD':
        mappings.push(...await mapToCSRD(companyId, periodStart, periodEnd, filters));
        break;
      case 'GRI':
        mappings.push(...await mapToGRI(companyId, periodStart, periodEnd, filters));
        break;
      case 'SDG':
        mappings.push(...await mapToSDG(companyId, periodStart, periodEnd, filters));
        break;
    }
  }

  return mappings;
}
