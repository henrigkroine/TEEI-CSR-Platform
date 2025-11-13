import { randomUUID } from 'crypto';
import {
  CalibrationDataset,
  CalibrationSample,
  EvaluationRun
} from './types.js';

/**
 * In-memory storage for calibration datasets and evaluation runs
 * In production, this should use a database
 */
class CalibrationStorage {
  private datasets: Map<string, CalibrationDataset> = new Map();
  private evaluationRuns: Map<string, EvaluationRun> = new Map();

  /**
   * Store a calibration dataset
   */
  saveDataset(dataset: CalibrationDataset): void {
    this.datasets.set(dataset.id, dataset);
  }

  /**
   * Get a dataset by ID
   */
  getDataset(id: string): CalibrationDataset | undefined {
    return this.datasets.get(id);
  }

  /**
   * Get all datasets
   */
  getAllDatasets(): CalibrationDataset[] {
    return Array.from(this.datasets.values());
  }

  /**
   * Delete a dataset
   */
  deleteDataset(id: string): boolean {
    return this.datasets.delete(id);
  }

  /**
   * Store an evaluation run
   */
  saveEvaluationRun(run: EvaluationRun): void {
    this.evaluationRuns.set(run.id, run);
  }

  /**
   * Get an evaluation run by ID
   */
  getEvaluationRun(id: string): EvaluationRun | undefined {
    return this.evaluationRuns.get(id);
  }

  /**
   * Get all evaluation runs
   */
  getAllEvaluationRuns(): EvaluationRun[] {
    return Array.from(this.evaluationRuns.values());
  }

  /**
   * Get evaluation runs for a specific dataset
   */
  getEvaluationRunsByDataset(datasetId: string): EvaluationRun[] {
    return Array.from(this.evaluationRuns.values())
      .filter(run => run.datasetId === datasetId);
  }

  /**
   * Update an evaluation run
   */
  updateEvaluationRun(id: string, updates: Partial<EvaluationRun>): void {
    const run = this.evaluationRuns.get(id);
    if (run) {
      this.evaluationRuns.set(id, { ...run, ...updates });
    }
  }

  /**
   * Clear all data (useful for testing)
   */
  clear(): void {
    this.datasets.clear();
    this.evaluationRuns.clear();
  }
}

// Singleton instance
const storage = new CalibrationStorage();

export { storage as calibrationStorage };
export type { CalibrationStorage };
