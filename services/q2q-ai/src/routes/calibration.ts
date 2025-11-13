import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { calibrationStorage } from '../calibration/storage.js';
import { runEvaluation, getEvaluationRun, getAllEvaluationRuns } from '../calibration/evaluator.js';
import { formatConfusionMatrix, formatLabelMetrics } from '../calibration/metrics.js';
import { AIProvider } from '../inference/types.js';
import type { CalibrationDataset, CalibrationSample } from '../calibration/types.js';

// Validation schemas
const UploadDatasetSchema = z.object({
  name: z.string().min(1).max(255),
  samples: z.array(z.object({
    text: z.string().min(1),
    true_label: z.string().min(1),
    metadata: z.record(z.any()).optional()
  })).min(1).max(1000),
  uploaded_by: z.string().optional()
});

const RunEvaluationSchema = z.object({
  datasetId: z.string().uuid(),
  provider: z.enum(['claude', 'openai', 'gemini']).optional(),
  batchSize: z.number().int().min(1).max(50).optional(),
  userId: z.string().uuid().optional()
});

export const calibrationRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /q2q/eval/upload
   * Upload a calibration dataset
   */
  app.post('/q2q/eval/upload', async (request, reply) => {
    try {
      const body = UploadDatasetSchema.parse(request.body);

      // Convert samples to internal format
      const samples: CalibrationSample[] = body.samples.map(s => ({
        id: randomUUID(),
        text: s.text,
        trueLabel: s.true_label,
        metadata: s.metadata
      }));

      // Create dataset
      const dataset: CalibrationDataset = {
        id: randomUUID(),
        name: body.name,
        samples,
        uploadedAt: new Date().toISOString(),
        uploadedBy: body.uploaded_by
      };

      // Save dataset
      calibrationStorage.saveDataset(dataset);

      return {
        success: true,
        dataset: {
          id: dataset.id,
          name: dataset.name,
          sampleCount: dataset.samples.length,
          uploadedAt: dataset.uploadedAt
        },
        message: `Dataset uploaded with ${samples.length} samples`
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /q2q/eval/datasets
   * List all calibration datasets
   */
  app.get('/q2q/eval/datasets', async (request, reply) => {
    try {
      const datasets = calibrationStorage.getAllDatasets();

      return {
        success: true,
        datasets: datasets.map(d => ({
          id: d.id,
          name: d.name,
          sampleCount: d.samples.length,
          uploadedAt: d.uploadedAt,
          uploadedBy: d.uploadedBy
        })),
        count: datasets.length
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /q2q/eval/datasets/:id
   * Get a specific dataset with samples
   */
  app.get<{ Params: { id: string } }>('/q2q/eval/datasets/:id', async (request, reply) => {
    try {
      const dataset = calibrationStorage.getDataset(request.params.id);

      if (!dataset) {
        return reply.status(404).send({
          success: false,
          error: 'Dataset not found'
        });
      }

      return {
        success: true,
        dataset
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * POST /q2q/eval/run
   * Run evaluation on a dataset
   */
  app.post('/q2q/eval/run', async (request, reply) => {
    try {
      const body = RunEvaluationSchema.parse(request.body);

      const run = await runEvaluation(body.datasetId, {
        provider: body.provider as AIProvider | undefined,
        batchSize: body.batchSize,
        userId: body.userId
      });

      return {
        success: true,
        run: {
          id: run.id,
          datasetId: run.datasetId,
          datasetName: run.datasetName,
          provider: run.provider,
          modelName: run.modelName,
          status: run.status,
          startedAt: run.startedAt
        },
        message: 'Evaluation started. Use GET /q2q/eval/results/:id to check progress'
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors
        });
      }

      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /q2q/eval/results/:id
   * Get evaluation results
   */
  app.get<{ Params: { id: string } }>('/q2q/eval/results/:id', async (request, reply) => {
    try {
      const run = getEvaluationRun(request.params.id);

      if (!run) {
        return reply.status(404).send({
          success: false,
          error: 'Evaluation run not found'
        });
      }

      return {
        success: true,
        run: {
          id: run.id,
          datasetId: run.datasetId,
          datasetName: run.datasetName,
          provider: run.provider,
          modelName: run.modelName,
          status: run.status,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          results: run.results,
          error: run.error
        }
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /q2q/eval/results
   * Get all evaluation runs
   */
  app.get('/q2q/eval/results', async (request, reply) => {
    try {
      const runs = getAllEvaluationRuns();

      return {
        success: true,
        runs: runs.map(run => ({
          id: run.id,
          datasetId: run.datasetId,
          datasetName: run.datasetName,
          provider: run.provider,
          modelName: run.modelName,
          status: run.status,
          startedAt: run.startedAt,
          completedAt: run.completedAt,
          accuracy: run.results?.accuracy,
          totalSamples: run.results?.totalSamples,
          error: run.error
        })),
        count: runs.length
      };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * GET /q2q/eval/results/:id/report
   * Get human-readable evaluation report
   */
  app.get<{ Params: { id: string } }>('/q2q/eval/results/:id/report', async (request, reply) => {
    try {
      const run = getEvaluationRun(request.params.id);

      if (!run) {
        return reply.status(404).send({
          success: false,
          error: 'Evaluation run not found'
        });
      }

      if (run.status !== 'completed' || !run.results) {
        return reply.status(400).send({
          success: false,
          error: 'Evaluation not completed yet'
        });
      }

      const results = run.results;
      let report = '';

      report += '='.repeat(80) + '\n';
      report += 'Q2Q AI CLASSIFIER - EVALUATION REPORT\n';
      report += '='.repeat(80) + '\n\n';

      report += `Dataset: ${run.datasetName}\n`;
      report += `Evaluation ID: ${run.id}\n`;
      report += `Provider: ${run.provider} (${run.modelName})\n`;
      report += `Started: ${run.startedAt}\n`;
      report += `Completed: ${run.completedAt}\n`;
      report += `Duration: ${Math.round((new Date(run.completedAt!).getTime() - new Date(run.startedAt).getTime()) / 1000)}s\n\n`;

      report += '-'.repeat(80) + '\n';
      report += 'OVERALL METRICS\n';
      report += '-'.repeat(80) + '\n';
      report += `Accuracy: ${(results.accuracy * 100).toFixed(2)}%\n`;
      report += `Total Samples: ${results.totalSamples}\n`;
      report += `Correct Predictions: ${results.correctPredictions}\n`;
      report += `Average Latency: ${results.averageLatencyMs.toFixed(0)}ms\n`;
      report += `Total Cost: $${results.totalCost.toFixed(4)}\n`;
      report += `Cost per Sample: $${(results.totalCost / results.totalSamples).toFixed(6)}\n\n`;

      report += formatLabelMetrics(results.labelMetrics);
      report += '\n';
      report += formatConfusionMatrix(results.confusionMatrix);

      return reply.type('text/plain').send(report);
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};
