/**
 * Regulatory Pack Generator
 *
 * Core service for generating regulatory compliance packs (CSRD/GRI/SDG).
 * Orchestrates mapping, validation, section assembly, and metadata generation.
 *
 * @module srs/generator
 */

import { randomUUID } from 'crypto';
import type {
  GeneratePackRequest,
  RegulatoryPack,
  PackSummary,
  PackSection,
  GapItem,
  FrameworkType,
  PackStatus,
} from '@teei/shared-types';
import { mapToFrameworks, getCSRDRegistry, getGRIRegistry, getSDGRegistry } from './mapper.js';
import { validatePackRequest } from './validator.js';

// ============================================================================
// IN-MEMORY STORAGE (Replace with database in production)
// ============================================================================

const packStorage = new Map<string, RegulatoryPack>();

// ============================================================================
// SECTION BUILDING
// ============================================================================

/**
 * Build sections for CSRD framework
 */
function buildCSRDSections(mappings: any[], registry: any): PackSection[] {
  const sections: PackSection[] = [];
  let pageNumber = 1;

  for (const topic of registry.topics) {
    for (const disclosure of topic.disclosures) {
      const mapping = mappings.find(m => m.disclosureId === disclosure.id);
      if (!mapping) continue;

      // Build narrative from disclosure description
      const narrative = `${disclosure.description}\n\nTopic: ${topic.name} (${topic.id})`;

      // Build metrics table if quantitative data points exist
      const quantitativeDataPoints = disclosure.dataPoints.filter(
        (dp: any) => dp.type === 'quantitative'
      );

      const tables = quantitativeDataPoints.length > 0 ? [{
        title: 'Key Metrics',
        headers: ['Data Point', 'Value', 'Unit', 'Evidence'],
        rows: quantitativeDataPoints.map((dp: any) => [
          dp.name,
          'N/A', // Placeholder - would be populated with actual data
          dp.unit || 'N/A',
          mapping.evidence.length > 0 ? mapping.evidence[0].evidenceId.slice(0, 8) : 'N/A',
        ]),
      }] : [];

      // Build metrics array
      const metrics = quantitativeDataPoints.map((dp: any) => ({
        name: dp.name,
        value: 'N/A',
        unit: dp.unit,
        evidenceId: mapping.evidence[0]?.evidenceId,
      }));

      sections.push({
        framework: 'CSRD',
        disclosureId: disclosure.id,
        title: `${disclosure.id}: ${disclosure.title}`,
        status: mapping.status,
        content: {
          narrative,
          tables,
          metrics,
        },
        citations: mapping.evidence,
        pageNumber: pageNumber++,
      });
    }
  }

  return sections;
}

/**
 * Build sections for GRI framework
 */
function buildGRISections(mappings: any[], registry: any): PackSection[] {
  const sections: PackSection[] = [];
  let pageNumber = 1;

  for (const disclosure of registry.disclosures) {
    const mapping = mappings.find(m => m.disclosureId === disclosure.id);
    if (!mapping) continue;

    // Build narrative
    const narrative = `${disclosure.description}\n\nStandard: ${disclosure.standard}`;

    // Build requirements table
    const tables = [{
      title: 'Disclosure Requirements',
      headers: ['Requirement', 'Type', 'Status'],
      rows: disclosure.requirements.map((req: any) => [
        req.text,
        req.type,
        mapping.evidence.length > 0 ? 'Covered' : 'Missing',
      ]),
    }];

    sections.push({
      framework: 'GRI',
      disclosureId: disclosure.id,
      title: `${disclosure.id}: ${disclosure.title}`,
      status: mapping.status,
      content: {
        narrative,
        tables,
        metrics: [],
      },
      citations: mapping.evidence,
      pageNumber: pageNumber++,
    });
  }

  return sections;
}

/**
 * Build sections for SDG framework
 */
function buildSDGSections(mappings: any[], registry: any): PackSection[] {
  const sections: PackSection[] = [];
  let pageNumber = 1;

  for (const target of registry.targets) {
    const mapping = mappings.find(m => m.disclosureId === target.target);
    if (!mapping) continue;

    // Build narrative
    const narrative = `SDG ${target.goal}: ${target.goalName}\n\nTarget ${target.target}: ${target.targetText}`;

    // Build indicators table
    const tables = [{
      title: 'Indicators',
      headers: ['Indicator', 'Description', 'Tier', 'Evidence Count'],
      rows: target.indicators.map((ind: any) => [
        ind.id,
        ind.description,
        ind.tier || 'N/A',
        mapping.evidence.length.toString(),
      ]),
    }];

    sections.push({
      framework: 'SDG',
      disclosureId: target.target,
      title: `SDG ${target.goal}.${target.target}: ${target.goalName}`,
      status: mapping.status,
      content: {
        narrative,
        tables,
        metrics: [],
      },
      citations: mapping.evidence,
      pageNumber: pageNumber++,
    });
  }

  return sections;
}

// ============================================================================
// SUMMARY CALCULATION
// ============================================================================

/**
 * Calculate pack summary from mappings
 */
function calculateSummary(
  mappings: any[],
  frameworks: FrameworkType[]
): PackSummary {
  const totalDisclosures = mappings.length;
  const completedDisclosures = mappings.filter(m => m.status === 'complete').length;
  const partialDisclosures = mappings.filter(m => m.status === 'partial').length;
  const missingDisclosures = mappings.filter(m => m.status === 'missing').length;

  const overallCompleteness = totalDisclosures > 0
    ? mappings.reduce((sum, m) => sum + m.completenessScore, 0) / totalDisclosures
    : 0;

  const byFramework = frameworks.map(framework => {
    const frameworkMappings = mappings.filter(m => m.frameworkType === framework);
    return {
      framework,
      completeness: frameworkMappings.length > 0
        ? frameworkMappings.reduce((sum, m) => sum + m.completenessScore, 0) / frameworkMappings.length
        : 0,
      disclosureCount: frameworkMappings.length,
    };
  });

  const criticalGaps = mappings.reduce(
    (sum, m) => sum + m.gaps.filter((g: GapItem) => g.severity === 'critical').length,
    0
  );

  return {
    totalDisclosures,
    completedDisclosures,
    partialDisclosures,
    missingDisclosures,
    overallCompleteness,
    byFramework,
    criticalGaps,
    lastUpdated: new Date().toISOString(),
  };
}

// ============================================================================
// PACK GENERATION
// ============================================================================

/**
 * Generate a regulatory pack
 * Main orchestration function
 */
export async function generatePack(
  request: GeneratePackRequest
): Promise<{ packId: string; status: PackStatus }> {
  // 1. Validate request
  const validation = validatePackRequest(request);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // 2. Generate pack ID
  const packId = randomUUID();

  // 3. Create initial pack with 'generating' status
  const pack: RegulatoryPack = {
    id: packId,
    companyId: request.companyId,
    period: request.period,
    frameworks: request.frameworks,
    status: 'generating',
    summary: {
      totalDisclosures: 0,
      completedDisclosures: 0,
      partialDisclosures: 0,
      missingDisclosures: 0,
      overallCompleteness: 0,
      byFramework: [],
      criticalGaps: 0,
      lastUpdated: new Date().toISOString(),
    },
    sections: [],
    gaps: [],
    metadata: {
      generatedAt: new Date().toISOString(),
      version: 'CSRD-2023-11,GRI-2021,SDG-2015',
      language: request.options?.language || 'en',
      evidenceCount: 0,
    },
  };

  // Store pack
  packStorage.set(packId, pack);

  // 4. Generate pack asynchronously (in production, use job queue)
  generatePackAsync(packId, request).catch(err => {
    console.error(`Error generating pack ${packId}:`, err);
    pack.status = 'failed';
    packStorage.set(packId, pack);
  });

  return { packId, status: 'generating' };
}

/**
 * Async pack generation (simulates background job)
 */
async function generatePackAsync(
  packId: string,
  request: GeneratePackRequest
): Promise<void> {
  const pack = packStorage.get(packId);
  if (!pack) throw new Error(`Pack ${packId} not found`);

  try {
    // 1. Map evidence to disclosures
    const mappings = await mapToFrameworks(
      request.companyId,
      request.period.start,
      request.period.end,
      request.frameworks,
      request.evidenceScope
    );

    // 2. Build sections for each framework
    const sections: PackSection[] = [];

    if (request.frameworks.includes('CSRD')) {
      const csrdMappings = mappings.filter(m => m.frameworkType === 'CSRD');
      sections.push(...buildCSRDSections(csrdMappings, getCSRDRegistry()));
    }

    if (request.frameworks.includes('GRI')) {
      const griMappings = mappings.filter(m => m.frameworkType === 'GRI');
      sections.push(...buildGRISections(griMappings, getGRIRegistry()));
    }

    if (request.frameworks.includes('SDG')) {
      const sdgMappings = mappings.filter(m => m.frameworkType === 'SDG');
      sections.push(...buildSDGSections(sdgMappings, getSDGRegistry()));
    }

    // 3. Aggregate gaps
    const gaps = mappings.flatMap(m => m.gaps);

    // 4. Calculate summary
    const summary = calculateSummary(mappings, request.frameworks);

    // 5. Update pack
    pack.status = 'ready';
    pack.sections = sections;
    pack.gaps = gaps;
    pack.summary = summary;
    pack.metadata.evidenceCount = mappings.reduce(
      (sum, m) => sum + m.evidence.length,
      0
    );

    packStorage.set(packId, pack);
  } catch (error) {
    pack.status = 'failed';
    packStorage.set(packId, pack);
    throw error;
  }
}

/**
 * Get a pack by ID
 */
export function getPack(packId: string): RegulatoryPack | undefined {
  return packStorage.get(packId);
}

/**
 * List all packs for a company
 */
export function listPacks(companyId: string): RegulatoryPack[] {
  return Array.from(packStorage.values()).filter(
    pack => pack.companyId === companyId
  );
}

/**
 * Delete a pack
 */
export function deletePack(packId: string): boolean {
  return packStorage.delete(packId);
}
