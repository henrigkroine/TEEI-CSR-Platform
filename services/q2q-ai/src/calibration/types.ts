/**
 * Types for calibration and evaluation system
 */

export interface CalibrationSample {
  id: string;
  text: string;
  trueLabel: string;
  metadata?: Record<string, any>;
}

export interface CalibrationDataset {
  id: string;
  name: string;
  samples: CalibrationSample[];
  uploadedAt: string;
  uploadedBy?: string;
}

export interface PredictionResult {
  sampleId: string;
  text: string;
  trueLabel: string;
  predictedLabel: string;
  confidence: number;
  latencyMs: number;
  error?: string;
}

export interface LabelMetrics {
  label: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  support: number; // Number of samples with this true label
}

export interface ConfusionMatrix {
  labels: string[];
  matrix: number[][]; // matrix[i][j] = count of true label i predicted as label j
}

export interface EvaluationRun {
  id: string;
  datasetId: string;
  datasetName: string;
  provider: string;
  modelName: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
  results?: EvaluationResults;
  error?: string;
}

export interface EvaluationResults {
  accuracy: number;
  totalSamples: number;
  correctPredictions: number;
  labelMetrics: LabelMetrics[];
  confusionMatrix: ConfusionMatrix;
  averageLatencyMs: number;
  totalCost: number;
  predictions: PredictionResult[];
}
