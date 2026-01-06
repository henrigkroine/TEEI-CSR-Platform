import { randomUUID } from 'crypto';
import { getInferenceDriver } from '../inference/driver.js';
import { AIProvider } from '../inference/types.js';
import { calibrationStorage } from './storage.js';
import {
  EvaluationRun,
  PredictionResult,
  CalibrationSample
} from './types.js';
import { calculateEvaluationResults } from './metrics.js';

/**
 * Run evaluation on a calibration dataset
 */
export async function runEvaluation(
  datasetId: string,
  options: {
    provider?: AIProvider;
    batchSize?: number;
    userId?: string;
  } = {}
): Promise<EvaluationRun> {
  const dataset = calibrationStorage.getDataset(datasetId);
  if (!dataset) {
    throw new Error(`Dataset ${datasetId} not found`);
  }

  const driver = getInferenceDriver();
  const provider = options.provider || driver.getDefaultProvider().name;
  const batchSize = options.batchSize || 10;

  // Create evaluation run
  const runId = randomUUID();
  const run: EvaluationRun = {
    id: runId,
    datasetId: dataset.id,
    datasetName: dataset.name,
    provider,
    modelName: driver.getProvider(provider).modelName,
    startedAt: new Date().toISOString(),
    status: 'running'
  };

  calibrationStorage.saveEvaluationRun(run);

  // Run evaluation asynchronously
  processEvaluation(run, dataset.samples, provider, batchSize, options.userId).catch(error => {
    console.error(`Evaluation ${runId} failed:`, error);
    calibrationStorage.updateEvaluationRun(runId, {
      status: 'failed',
      error: error.message
    });
  });

  return run;
}

/**
 * Process evaluation in background
 */
async function processEvaluation(
  run: EvaluationRun,
  samples: CalibrationSample[],
  provider: AIProvider,
  batchSize: number,
  userId?: string
): Promise<void> {
  const driver = getInferenceDriver();
  const predictions: PredictionResult[] = [];
  let totalCost = 0;

  console.log(`[Evaluation ${run.id}] Starting evaluation of ${samples.length} samples`);

  // Process samples in batches
  for (let i = 0; i < samples.length; i += batchSize) {
    const batch = samples.slice(i, Math.min(i + batchSize, samples.length));
    console.log(`[Evaluation ${run.id}] Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(samples.length / batchSize)}`);

    // Process batch
    const batchPromises = batch.map(async sample => {
      const startTime = Date.now();
      try {
        const result = await driver.classifyWithProvider(provider, {
          text: sample.text,
          correlationId: `eval-${run.id}-${sample.id}`,
          userId
        });

        const latencyMs = Date.now() - startTime;
        totalCost += result.cost.totalCost;

        // For evaluation, we'll use the primary label detection
        // This is simplified - in production you'd want more sophisticated mapping
        let predictedLabel = 'neutral';
        if (result.classification.confidence_increase) {
          predictedLabel = 'confidence_increase';
        } else if (result.classification.confidence_decrease) {
          predictedLabel = 'confidence_decrease';
        } else if (result.classification.belonging_increase) {
          predictedLabel = 'belonging_increase';
        } else if (result.classification.belonging_decrease) {
          predictedLabel = 'belonging_decrease';
        } else if (result.classification.risk_cues.length > 0) {
          predictedLabel = `risk:${result.classification.risk_cues[0]}`;
        } else if (result.classification.employability_signals.length > 0) {
          predictedLabel = `employability:${result.classification.employability_signals[0]}`;
        }

        return {
          sampleId: sample.id,
          text: sample.text,
          trueLabel: sample.trueLabel,
          predictedLabel,
          confidence: 1.0, // TODO: Extract confidence from classification
          latencyMs
        };
      } catch (error: any) {
        return {
          sampleId: sample.id,
          text: sample.text,
          trueLabel: sample.trueLabel,
          predictedLabel: 'error',
          confidence: 0,
          latencyMs: Date.now() - startTime,
          error: error.message
        };
      }
    });

    const batchResults = await Promise.all(batchPromises);
    predictions.push(...batchResults);

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < samples.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Calculate metrics
  const results = calculateEvaluationResults(predictions, totalCost);

  // Update run with results
  calibrationStorage.updateEvaluationRun(run.id, {
    status: 'completed',
    completedAt: new Date().toISOString(),
    results
  });

  console.log(`[Evaluation ${run.id}] Completed with accuracy: ${(results.accuracy * 100).toFixed(2)}%`);
}

/**
 * Get evaluation run status and results
 */
export function getEvaluationRun(runId: string): EvaluationRun | undefined {
  return calibrationStorage.getEvaluationRun(runId);
}

/**
 * Get all evaluation runs for a dataset
 */
export function getEvaluationRunsForDataset(datasetId: string): EvaluationRun[] {
  return calibrationStorage.getEvaluationRunsByDataset(datasetId);
}

/**
 * Get all evaluation runs
 */
export function getAllEvaluationRuns(): EvaluationRun[] {
  return calibrationStorage.getAllEvaluationRuns();
}
