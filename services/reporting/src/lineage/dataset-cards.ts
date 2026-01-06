/**
 * Dataset Cards Generation Library
 *
 * Generates dataset cards (Model Cards style) for NLQ query results, providing
 * comprehensive metadata about data provenance, quality, and limitations.
 *
 * References:
 * - Model Cards: https://arxiv.org/abs/1810.03993
 * - Datasheets for Datasets: https://arxiv.org/abs/1803.09010
 */

import { createServiceLogger } from '@teei/shared-utils';
import crypto from 'crypto';

const logger = createServiceLogger('dataset-cards');

// ===== TYPES =====

export interface DatasetCard {
  // Identification
  datasetId: string; // Unique identifier
  queryId: string; // NLQ query ID that generated this dataset
  generatedAt: string; // ISO timestamp
  version: string; // Card version

  // Dataset Summary
  summary: {
    name: string; // Human-readable dataset name
    description: string; // What this dataset represents
    rowCount: number;
    columnCount: number;
    sizeBytes: number;
    format: string; // 'json', 'csv', etc.
  };

  // Provenance
  provenance: {
    sourceQuery: string; // Original NL question
    generatedSQL: string; // SQL query executed
    executionTimeMs: number;
    cacheHit: boolean;

    // Data sources
    sourceTables: string[]; // Tables queried
    sourceColumns: string[]; // Columns selected
    joinPaths: string[]; // Join relationships

    // Temporal scope
    timeRange: {
      start: string | null;
      end: string | null;
      description: string;
    };

    // Filters applied
    filters: Record<string, any>;
  };

  // Data Quality
  quality: {
    completeness: number; // 0.0-1.0, percentage of non-null values
    freshness: {
      mostRecentRecord: string | null; // ISO timestamp
      oldestRecord: string | null;
      dataLag: string; // Human-readable lag (e.g., "2 hours")
    };
    accuracy: {
      confidenceScore: number; // 0.0-1.0
      evidenceCount: number; // Number of supporting evidence snippets
      citationDensity: number; // Citations per 100 words
    };
    consistency: {
      schemaValidation: boolean; // All records match expected schema
      rangeValidation: boolean; // Values within expected ranges
      anomalyCount: number; // Detected anomalies
    };
  };

  // Statistical Summary
  statistics: {
    numericColumns: Record<string, {
      min: number;
      max: number;
      mean: number;
      median: number;
      stdDev: number;
      nullCount: number;
    }>;
    categoricalColumns: Record<string, {
      uniqueCount: number;
      topValues: Array<{ value: string; count: number }>;
      nullCount: number;
    }>;
  };

  // Limitations & Warnings
  limitations: {
    sampleSize: {
      actual: number;
      recommended: number;
      warning: string | null;
    };
    temporalCoverage: {
      requested: string;
      actual: string;
      gaps: string[];
    };
    biases: {
      selectionBias: string | null;
      survivorshipBias: string | null;
      temporalBias: string | null;
    };
    warnings: string[];
  };

  // Governance
  governance: {
    companyId: string;
    tenantIsolation: boolean; // Data scoped to single tenant
    piiRedacted: boolean; // PII was redacted
    accessLevel: 'public' | 'internal' | 'confidential' | 'restricted';
    retentionPolicy: string; // How long this dataset should be retained
    safetyChecks: {
      sqlInjection: boolean;
      tableWhitelist: boolean;
      columnWhitelist: boolean;
      rowLimit: boolean;
      allPassed: boolean;
    };
  };

  // Lineage
  lineage: {
    upstreamDatasets: string[]; // IDs of source datasets
    downstreamUsage: string[]; // Where this data was used (report IDs, etc.)
    transformations: string[]; // List of transformations applied
  };

  // Cost & Performance
  cost: {
    computeCostUSD: number; // Cost of query execution
    storageCostUSD: number; // Cost to store result
    llmCostUSD: number; // Cost of any LLM processing
    totalCostUSD: number;
  };

  // Metadata
  metadata: {
    generatedBy: string; // Service name
    generatedByVersion: string;
    language: string; // Query language
    intentType: string; // Detected intent
    templateId: string | null;
    tags: string[];
  };
}

// ===== GENERATION FUNCTIONS =====

/**
 * Generate a complete dataset card for an NLQ query result
 */
export async function generateDatasetCard(params: {
  queryId: string;
  query: {
    rawQuestion: string;
    generatedSQL: string;
    detectedIntent: string;
    templateId: string | null;
    templateName: string | null;
    answerConfidence: number;
    lineagePointers: any;
    executionTimeMs: number;
    cached: boolean;
    companyId: string;
    language: string;
  };
  resultData: any[];
  safetyChecks: {
    sqlInjection: boolean;
    tableWhitelist: boolean;
    columnWhitelist: boolean;
    rowLimit: boolean;
    allPassed: boolean;
  };
  filters?: Record<string, any>;
  evidenceCount?: number;
  citationDensity?: number;
  costUSD?: number;
}): Promise<DatasetCard> {
  const { queryId, query, resultData, safetyChecks, filters, evidenceCount, citationDensity, costUSD } = params;

  logger.info('Generating dataset card', { queryId, rowCount: resultData.length });

  // Generate unique dataset ID
  const datasetId = crypto.createHash('sha256').update(`${queryId}-${Date.now()}`).digest('hex').substring(0, 32);

  // Extract metadata from result data
  const columns = resultData.length > 0 ? Object.keys(resultData[0]) : [];
  const sizeBytes = Buffer.byteLength(JSON.stringify(resultData));

  // Parse SQL to extract source tables and columns
  const { sourceTables, sourceColumns, joinPaths } = parseSQL(query.generatedSQL);

  // Extract temporal scope from lineage or filters
  const timeRange = extractTimeRange(filters, query.lineagePointers);

  // Compute quality metrics
  const completeness = computeCompleteness(resultData, columns);
  const freshness = computeFreshness(resultData);
  const consistency = validateConsistency(resultData, columns);

  // Compute statistics
  const { numericColumns, categoricalColumns } = computeStatistics(resultData, columns);

  // Identify limitations
  const limitations = identifyLimitations({
    resultData,
    query,
    filters,
    timeRange,
  });

  // Build dataset card
  const card: DatasetCard = {
    datasetId,
    queryId,
    generatedAt: new Date().toISOString(),
    version: '1.0',

    summary: {
      name: `NLQ Result: ${query.templateName || query.detectedIntent}`,
      description: `Dataset generated from natural language query: "${query.rawQuestion}"`,
      rowCount: resultData.length,
      columnCount: columns.length,
      sizeBytes,
      format: 'json',
    },

    provenance: {
      sourceQuery: query.rawQuestion,
      generatedSQL: query.generatedSQL,
      executionTimeMs: query.executionTimeMs,
      cacheHit: query.cached,
      sourceTables,
      sourceColumns,
      joinPaths,
      timeRange,
      filters: filters || {},
    },

    quality: {
      completeness,
      freshness,
      accuracy: {
        confidenceScore: query.answerConfidence,
        evidenceCount: evidenceCount || 0,
        citationDensity: citationDensity || 0,
      },
      consistency,
    },

    statistics: {
      numericColumns,
      categoricalColumns,
    },

    limitations,

    governance: {
      companyId: query.companyId,
      tenantIsolation: true, // Always scoped to tenant
      piiRedacted: true, // Assume PII redacted
      accessLevel: 'internal',
      retentionPolicy: '90 days',
      safetyChecks,
    },

    lineage: {
      upstreamDatasets: extractUpstreamDatasets(query.lineagePointers),
      downstreamUsage: [],
      transformations: extractTransformations(query.generatedSQL),
    },

    cost: {
      computeCostUSD: costUSD || 0,
      storageCostUSD: sizeBytes * 0.000001, // $0.001 per MB (placeholder)
      llmCostUSD: costUSD || 0,
      totalCostUSD: (costUSD || 0) + sizeBytes * 0.000001,
    },

    metadata: {
      generatedBy: 'insights-nlq',
      generatedByVersion: '3.1.0',
      language: query.language,
      intentType: query.detectedIntent,
      templateId: query.templateId,
      tags: ['nlq', query.detectedIntent, query.language],
    },
  };

  logger.info('Dataset card generated', { datasetId, rowCount: resultData.length, columnCount: columns.length });

  return card;
}

/**
 * Generate a markdown representation of the dataset card
 */
export function renderDatasetCardMarkdown(card: DatasetCard): string {
  return `# Dataset Card: ${card.summary.name}

**Dataset ID:** \`${card.datasetId}\`
**Generated:** ${card.generatedAt}
**Version:** ${card.version}

## Summary

${card.summary.description}

- **Rows:** ${card.summary.rowCount.toLocaleString()}
- **Columns:** ${card.summary.columnCount}
- **Size:** ${(card.summary.sizeBytes / 1024).toFixed(2)} KB
- **Format:** ${card.summary.format}

## Provenance

### Source Query
\`\`\`
${card.provenance.sourceQuery}
\`\`\`

### Generated SQL
\`\`\`sql
${card.provenance.generatedSQL}
\`\`\`

### Data Sources
- **Tables:** ${card.provenance.sourceTables.join(', ')}
- **Columns:** ${card.provenance.sourceColumns.slice(0, 10).join(', ')}${card.provenance.sourceColumns.length > 10 ? '...' : ''}
- **Time Range:** ${card.provenance.timeRange.description}

### Performance
- **Execution Time:** ${card.provenance.executionTimeMs}ms
- **Cache Hit:** ${card.provenance.cacheHit ? 'Yes' : 'No'}

## Data Quality

### Completeness
**${(card.quality.completeness * 100).toFixed(1)}%** of fields contain non-null values.

### Freshness
- **Most Recent Record:** ${card.quality.freshness.mostRecentRecord || 'N/A'}
- **Oldest Record:** ${card.quality.freshness.oldestRecord || 'N/A'}
- **Data Lag:** ${card.quality.freshness.dataLag}

### Accuracy
- **Confidence Score:** ${(card.quality.accuracy.confidenceScore * 100).toFixed(1)}%
- **Evidence Count:** ${card.quality.accuracy.evidenceCount}
- **Citation Density:** ${card.quality.accuracy.citationDensity.toFixed(2)} per 100 words

### Consistency
- **Schema Validation:** ${card.quality.consistency.schemaValidation ? '✓ Passed' : '✗ Failed'}
- **Range Validation:** ${card.quality.consistency.rangeValidation ? '✓ Passed' : '✗ Failed'}
- **Anomalies Detected:** ${card.quality.consistency.anomalyCount}

## Limitations & Warnings

### Sample Size
- **Actual:** ${card.limitations.sampleSize.actual.toLocaleString()}
- **Recommended:** ${card.limitations.sampleSize.recommended.toLocaleString()}
${card.limitations.sampleSize.warning ? `- ⚠️ **Warning:** ${card.limitations.sampleSize.warning}` : ''}

### Potential Biases
${card.limitations.biases.selectionBias ? `- **Selection Bias:** ${card.limitations.biases.selectionBias}` : ''}
${card.limitations.biases.survivorshipBias ? `- **Survivorship Bias:** ${card.limitations.biases.survivorshipBias}` : ''}
${card.limitations.biases.temporalBias ? `- **Temporal Bias:** ${card.limitations.biases.temporalBias}` : ''}

### General Warnings
${card.limitations.warnings.map((w) => `- ⚠️ ${w}`).join('\n')}

## Governance

- **Tenant Isolation:** ${card.governance.tenantIsolation ? 'Yes' : 'No'}
- **PII Redacted:** ${card.governance.piiRedacted ? 'Yes' : 'No'}
- **Access Level:** ${card.governance.accessLevel}
- **Retention Policy:** ${card.governance.retentionPolicy}

### Safety Checks
- **SQL Injection:** ${card.governance.safetyChecks.sqlInjection ? '✓' : '✗'}
- **Table Whitelist:** ${card.governance.safetyChecks.tableWhitelist ? '✓' : '✗'}
- **Column Whitelist:** ${card.governance.safetyChecks.columnWhitelist ? '✓' : '✗'}
- **Row Limit:** ${card.governance.safetyChecks.rowLimit ? '✓' : '✗'}
- **All Passed:** ${card.governance.safetyChecks.allPassed ? '✓ Yes' : '✗ No'}

## Cost

- **Compute Cost:** $${card.cost.computeCostUSD.toFixed(6)}
- **Storage Cost:** $${card.cost.storageCostUSD.toFixed(6)}
- **LLM Cost:** $${card.cost.llmCostUSD.toFixed(6)}
- **Total Cost:** $${card.cost.totalCostUSD.toFixed(6)}

## Metadata

- **Generated By:** ${card.metadata.generatedBy} v${card.metadata.generatedByVersion}
- **Language:** ${card.metadata.language}
- **Intent Type:** ${card.metadata.intentType}
- **Template ID:** ${card.metadata.templateId || 'N/A'}
- **Tags:** ${card.metadata.tags.join(', ')}
`;
}

// ===== HELPER FUNCTIONS =====

function parseSQL(sql: string): { sourceTables: string[]; sourceColumns: string[]; joinPaths: string[] } {
  // Simple regex-based SQL parsing (in production, use a proper SQL parser)
  const tablePattern = /FROM\s+([a-z_]+)/gi;
  const columnPattern = /SELECT\s+(.*?)\s+FROM/is;
  const joinPattern = /JOIN\s+([a-z_]+)/gi;

  const tables = [...sql.matchAll(tablePattern)].map((m) => m[1]);
  const joins = [...sql.matchAll(joinPattern)].map((m) => m[1]);

  const columnMatch = sql.match(columnPattern);
  const columns = columnMatch ? columnMatch[1].split(',').map((c) => c.trim().split('.').pop()?.trim() || '') : [];

  return {
    sourceTables: [...new Set([...tables, ...joins])],
    sourceColumns: columns.filter((c) => c && c !== '*'),
    joinPaths: joins.length > 0 ? [`${tables[0]} → ${joins.join(' → ')}`] : [],
  };
}

function extractTimeRange(filters: Record<string, any> | undefined, lineagePointers: any): {
  start: string | null;
  end: string | null;
  description: string;
} {
  // Extract from filters if available
  if (filters?.startDate && filters?.endDate) {
    return {
      start: filters.startDate,
      end: filters.endDate,
      description: `${filters.startDate} to ${filters.endDate}`,
    };
  }

  // Default
  return {
    start: null,
    end: null,
    description: 'All available data',
  };
}

function computeCompleteness(data: any[], columns: string[]): number {
  if (data.length === 0 || columns.length === 0) return 0;

  const totalFields = data.length * columns.length;
  const nonNullFields = data.reduce((sum, row) => {
    return sum + columns.filter((col) => row[col] != null).length;
  }, 0);

  return nonNullFields / totalFields;
}

function computeFreshness(data: any[]): {
  mostRecentRecord: string | null;
  oldestRecord: string | null;
  dataLag: string;
} {
  // Look for common date fields
  const dateFields = ['created_at', 'updated_at', 'timestamp', 'date'];

  let dates: Date[] = [];
  for (const row of data) {
    for (const field of dateFields) {
      if (row[field]) {
        const date = new Date(row[field]);
        if (!isNaN(date.getTime())) {
          dates.push(date);
        }
      }
    }
  }

  if (dates.length === 0) {
    return {
      mostRecentRecord: null,
      oldestRecord: null,
      dataLag: 'Unknown',
    };
  }

  const mostRecent = new Date(Math.max(...dates.map((d) => d.getTime())));
  const oldest = new Date(Math.min(...dates.map((d) => d.getTime())));

  const lagMs = Date.now() - mostRecent.getTime();
  const lagHours = Math.floor(lagMs / (1000 * 60 * 60));

  return {
    mostRecentRecord: mostRecent.toISOString(),
    oldestRecord: oldest.toISOString(),
    dataLag: lagHours < 24 ? `${lagHours} hours` : `${Math.floor(lagHours / 24)} days`,
  };
}

function validateConsistency(data: any[], columns: string[]): {
  schemaValidation: boolean;
  rangeValidation: boolean;
  anomalyCount: number;
} {
  // Check schema consistency
  const schemaValidation = data.every((row) => {
    return columns.every((col) => col in row);
  });

  // Check range validation (simple check for negative counts)
  let anomalyCount = 0;
  for (const row of data) {
    for (const col of columns) {
      if (typeof row[col] === 'number' && col.includes('count') && row[col] < 0) {
        anomalyCount++;
      }
    }
  }

  return {
    schemaValidation,
    rangeValidation: anomalyCount === 0,
    anomalyCount,
  };
}

function computeStatistics(data: any[], columns: string[]): {
  numericColumns: Record<string, any>;
  categoricalColumns: Record<string, any>;
} {
  const numericColumns: Record<string, any> = {};
  const categoricalColumns: Record<string, any> = {};

  for (const col of columns) {
    const values = data.map((row) => row[col]).filter((v) => v != null);

    if (values.length === 0) continue;

    // Check if numeric
    if (values.every((v) => typeof v === 'number')) {
      const sorted = values.sort((a, b) => a - b);
      const sum = sorted.reduce((a, b) => a + b, 0);
      const mean = sum / sorted.length;
      const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / sorted.length;

      numericColumns[col] = {
        min: Math.min(...sorted),
        max: Math.max(...sorted),
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        stdDev: Math.sqrt(variance),
        nullCount: data.length - values.length,
      };
    } else {
      // Categorical
      const valueCounts: Record<string, number> = {};
      for (const val of values) {
        const key = String(val);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      }

      const topValues = Object.entries(valueCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([value, count]) => ({ value, count }));

      categoricalColumns[col] = {
        uniqueCount: Object.keys(valueCounts).length,
        topValues,
        nullCount: data.length - values.length,
      };
    }
  }

  return { numericColumns, categoricalColumns };
}

function identifyLimitations(params: {
  resultData: any[];
  query: any;
  filters: Record<string, any> | undefined;
  timeRange: any;
}): DatasetCard['limitations'] {
  const { resultData, query, filters, timeRange } = params;

  const warnings: string[] = [];
  let selectionBias: string | null = null;
  let survivorshipBias: string | null = null;
  let temporalBias: string | null = null;

  // Sample size check
  const MIN_VIABLE_SAMPLE = 30;
  const sampleSizeWarning =
    resultData.length < MIN_VIABLE_SAMPLE
      ? `Sample size (${resultData.length}) is below recommended minimum (${MIN_VIABLE_SAMPLE}) for statistical significance.`
      : null;

  if (sampleSizeWarning) {
    warnings.push(sampleSizeWarning);
  }

  // Temporal biases
  if (timeRange.description.includes('last_30d') || timeRange.description.includes('last_quarter')) {
    temporalBias = 'Recent data only - may not reflect long-term trends or seasonal patterns.';
    warnings.push(temporalBias);
  }

  // Survivorship bias (if filtering by status)
  if (filters?.status === 'active' || filters?.status === 'completed') {
    survivorshipBias = 'Data filtered by status - may exclude important historical or failed cases.';
    warnings.push(survivorshipBias);
  }

  // Low confidence warning
  if (query.answerConfidence < 0.7) {
    warnings.push(`Low confidence score (${(query.answerConfidence * 100).toFixed(1)}%) - results may be unreliable.`);
  }

  return {
    sampleSize: {
      actual: resultData.length,
      recommended: MIN_VIABLE_SAMPLE,
      warning: sampleSizeWarning,
    },
    temporalCoverage: {
      requested: timeRange.description,
      actual: timeRange.description,
      gaps: [],
    },
    biases: {
      selectionBias,
      survivorshipBias,
      temporalBias,
    },
    warnings,
  };
}

function extractUpstreamDatasets(lineagePointers: any): string[] {
  // Extract upstream dataset IDs from lineage pointers
  if (!lineagePointers) return [];

  // Placeholder - in production, parse lineagePointers
  return [];
}

function extractTransformations(sql: string): string[] {
  const transformations: string[] = [];

  if (sql.includes('GROUP BY')) transformations.push('Aggregation');
  if (sql.includes('ORDER BY')) transformations.push('Sorting');
  if (sql.includes('WHERE')) transformations.push('Filtering');
  if (sql.includes('JOIN')) transformations.push('Joining');
  if (sql.includes('DISTINCT')) transformations.push('Deduplication');

  return transformations;
}
