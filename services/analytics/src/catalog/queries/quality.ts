/**
 * Quality query builders - Mock implementation
 * TODO: Replace with actual Great Expectations queries
 */

import type { QualityRunHistory, QualityRun } from '@teei/shared-types';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('catalog:queries:quality');

export async function getQualityHistory(
  datasetId: string,
  days: number
): Promise<QualityRunHistory> {
  logger.info({ datasetId, days }, 'Getting quality history');

  const runs = [];
  for (let i = 0; i < days; i++) {
    runs.push({
      runId: `run-${i}`,
      runAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
      status: 'pass' as const,
      passRate: 95 + Math.random() * 5,
      expectationsTotal: 50,
      expectationsFailed: Math.floor(Math.random() * 3),
    });
  }

  return {
    datasetId,
    datasetName: 'users',
    runs,
    trend: 'stable',
  };
}

export async function getLatestQualityRun(datasetId: string): Promise<QualityRun | null> {
  logger.info({ datasetId }, 'Getting latest quality run');

  return {
    id: 'qr-1',
    datasetId,
    datasetName: 'users',
    runId: 'run-latest',
    runAt: new Date(),
    runDurationMs: 1500,
    status: 'pass',
    expectationsTotal: 50,
    expectationsPassed: 49,
    expectationsFailed: 1,
    expectationsWarned: 0,
    passRate: 98,
    failedExpectations: [],
    geVersion: '0.18.0',
    checkpointName: 'users_checkpoint',
    batchIdentifier: 'batch-1',
  };
}
