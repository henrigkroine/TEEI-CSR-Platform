/**
 * Formula Versioning and Migration System
 * Tracks changes to SROI/VIS formulas over time with full audit trail
 */

import yaml from 'yaml';
import { promises as fs } from 'fs';
import path from 'path';

export interface FormulaVersion {
  version: string; // Semantic version (e.g., "2.1.0")
  effectiveFrom: string; // ISO date
  effectiveTo?: string; // ISO date (null if currently active)
  active: boolean;
  formula: 'SROI' | 'VIS';

  config: {
    // SROI-specific
    volunteerHourValue?: number;
    dimensionValues?: Record<string, number>;
    dimensionWeights?: Record<string, number>;
    confidenceThreshold?: number;
    confidenceDiscount?: number;

    // VIS-specific
    hoursWeight?: number;
    consistencyWeight?: number;
    outcomeWeight?: number;
    maxHoursThreshold?: number;
    sessionThresholds?: Record<string, number>;
    improvementThreshold?: number;
  };

  metadata: {
    author: string;
    description: string;
    rationale: string;
    calibrationDataset?: string; // Reference to dataset used for calibration
    validationMetrics?: {
      mae?: number; // Mean Absolute Error
      rmse?: number; // Root Mean Squared Error
      r2?: number; // R-squared
      sampleSize?: number;
    };
    changeLog?: string[];
  };
}

export interface FormulaRegistry {
  formulaType: 'SROI' | 'VIS';
  currentVersion: string;
  versions: FormulaVersion[];
  migrationHistory: FormulaMigration[];
}

export interface FormulaMigration {
  id: string;
  fromVersion: string;
  toVersion: string;
  migratedAt: string;
  migratedBy: string;
  reason: string;
  impactedReports?: number; // Number of reports recalculated
  validationResults?: {
    averageChange: number; // Average % change in scores
    maxChange: number; // Max % change observed
    outliers: number; // Number of reports with >20% change
  };
}

/**
 * Formula Version Manager
 */
export class FormulaVersionManager {
  private registries: Map<'SROI' | 'VIS', FormulaRegistry> = new Map();
  private configDir: string;

  constructor(configDir?: string) {
    this.configDir = configDir || path.join(process.cwd(), 'src', 'config', 'versions');
  }

  /**
   * Load formula registries from YAML files
   */
  async loadRegistries(): Promise<void> {
    try {
      // Load SROI registry
      const sroiPath = path.join(this.configDir, 'sroi-registry.yaml');
      const sroiContent = await fs.readFile(sroiPath, 'utf-8');
      const sroiRegistry = yaml.parse(sroiContent) as FormulaRegistry;
      this.registries.set('SROI', sroiRegistry);

      // Load VIS registry
      const visPath = path.join(this.configDir, 'vis-registry.yaml');
      const visContent = await fs.readFile(visPath, 'utf-8');
      const visRegistry = yaml.parse(visContent) as FormulaRegistry;
      this.registries.set('VIS', visRegistry);

      console.info('[FormulaVersionManager] Loaded formula registries');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn('[FormulaVersionManager] Registry files not found, creating defaults');
        await this.createDefaultRegistries();
      } else {
        throw error;
      }
    }
  }

  /**
   * Get current active version for a formula
   */
  getCurrentVersion(formulaType: 'SROI' | 'VIS'): FormulaVersion | undefined {
    const registry = this.registries.get(formulaType);
    if (!registry) return undefined;

    return registry.versions.find(v => v.version === registry.currentVersion);
  }

  /**
   * Get a specific version
   */
  getVersion(formulaType: 'SROI' | 'VIS', version: string): FormulaVersion | undefined {
    const registry = this.registries.get(formulaType);
    if (!registry) return undefined;

    return registry.versions.find(v => v.version === version);
  }

  /**
   * Get version effective at a specific date
   */
  getVersionAtDate(formulaType: 'SROI' | 'VIS', date: Date): FormulaVersion | undefined {
    const registry = this.registries.get(formulaType);
    if (!registry) return undefined;

    const dateStr = date.toISOString();

    // Find version where effectiveFrom <= date and (effectiveTo is null or > date)
    return registry.versions.find(v => {
      const from = new Date(v.effectiveFrom);
      const to = v.effectiveTo ? new Date(v.effectiveTo) : new Date('9999-12-31');

      return from <= date && date < to;
    });
  }

  /**
   * Add a new version (migration)
   */
  async addVersion(
    formulaType: 'SROI' | 'VIS',
    newVersion: FormulaVersion,
    migration: Omit<FormulaMigration, 'id'>
  ): Promise<void> {
    const registry = this.registries.get(formulaType);
    if (!registry) {
      throw new Error(`Registry for ${formulaType} not found`);
    }

    // Validate version doesn't already exist
    if (registry.versions.some(v => v.version === newVersion.version)) {
      throw new Error(`Version ${newVersion.version} already exists for ${formulaType}`);
    }

    // Deactivate current version
    const currentVersion = registry.versions.find(v => v.version === registry.currentVersion);
    if (currentVersion) {
      currentVersion.active = false;
      currentVersion.effectiveTo = newVersion.effectiveFrom;
    }

    // Add new version
    registry.versions.push(newVersion);
    registry.currentVersion = newVersion.version;

    // Add migration record
    const migrationRecord: FormulaMigration = {
      id: `${formulaType}-${Date.now()}`,
      ...migration
    };
    registry.migrationHistory.push(migrationRecord);

    // Save updated registry
    await this.saveRegistry(formulaType);

    console.info(`[FormulaVersionManager] Added ${formulaType} version ${newVersion.version}`);
  }

  /**
   * Compare two versions
   */
  compareVersions(
    formulaType: 'SROI' | 'VIS',
    versionA: string,
    versionB: string
  ): {
    changes: Array<{ field: string; oldValue: any; newValue: any }>;
    summary: string;
  } {
    const vA = this.getVersion(formulaType, versionA);
    const vB = this.getVersion(formulaType, versionB);

    if (!vA || !vB) {
      throw new Error('One or both versions not found');
    }

    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // Deep compare configs
    const compareField = (field: string, a: any, b: any) => {
      if (JSON.stringify(a) !== JSON.stringify(b)) {
        changes.push({ field, oldValue: a, newValue: b });
      }
    };

    if (formulaType === 'SROI') {
      compareField('volunteerHourValue', vA.config.volunteerHourValue, vB.config.volunteerHourValue);
      compareField('dimensionValues', vA.config.dimensionValues, vB.config.dimensionValues);
      compareField('dimensionWeights', vA.config.dimensionWeights, vB.config.dimensionWeights);
      compareField('confidenceThreshold', vA.config.confidenceThreshold, vB.config.confidenceThreshold);
      compareField('confidenceDiscount', vA.config.confidenceDiscount, vB.config.confidenceDiscount);
    } else {
      compareField('hoursWeight', vA.config.hoursWeight, vB.config.hoursWeight);
      compareField('consistencyWeight', vA.config.consistencyWeight, vB.config.consistencyWeight);
      compareField('outcomeWeight', vA.config.outcomeWeight, vB.config.outcomeWeight);
      compareField('sessionThresholds', vA.config.sessionThresholds, vB.config.sessionThresholds);
    }

    const summary = `${changes.length} field(s) changed from v${versionA} to v${versionB}`;

    return { changes, summary };
  }

  /**
   * Get migration history
   */
  getMigrationHistory(formulaType: 'SROI' | 'VIS'): FormulaMigration[] {
    const registry = this.registries.get(formulaType);
    return registry?.migrationHistory || [];
  }

  /**
   * Save registry to YAML file
   */
  private async saveRegistry(formulaType: 'SROI' | 'VIS'): Promise<void> {
    const registry = this.registries.get(formulaType);
    if (!registry) return;

    const filename = formulaType === 'SROI' ? 'sroi-registry.yaml' : 'vis-registry.yaml';
    const filePath = path.join(this.configDir, filename);

    const content = yaml.stringify(registry);
    await fs.mkdir(this.configDir, { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Create default registries
   */
  private async createDefaultRegistries(): Promise<void> {
    // SROI Registry
    const sroiRegistry: FormulaRegistry = {
      formulaType: 'SROI',
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          effectiveFrom: '2024-01-01T00:00:00Z',
          active: true,
          formula: 'SROI',
          config: {
            volunteerHourValue: 29.95,
            dimensionValues: {
              integration: 150,
              language: 500,
              job_readiness: 300
            },
            dimensionWeights: {
              integration: 0.3,
              language: 0.35,
              job_readiness: 0.35
            },
            confidenceThreshold: 0.7,
            confidenceDiscount: 0.8
          },
          metadata: {
            author: 'AI Team',
            description: 'Baseline SROI formula',
            rationale: 'Initial calibration based on EU social impact studies and Independent Sector volunteer value estimates'
          }
        }
      ],
      migrationHistory: []
    };

    this.registries.set('SROI', sroiRegistry);
    await this.saveRegistry('SROI');

    // VIS Registry
    const visRegistry: FormulaRegistry = {
      formulaType: 'VIS',
      currentVersion: '1.0.0',
      versions: [
        {
          version: '1.0.0',
          effectiveFrom: '2024-01-01T00:00:00Z',
          active: true,
          formula: 'VIS',
          config: {
            hoursWeight: 0.3,
            consistencyWeight: 0.3,
            outcomeWeight: 0.4,
            maxHoursThreshold: 100,
            sessionThresholds: {
              excellent: 8,
              good: 4,
              fair: 2,
              poor: 0
            },
            improvementThreshold: 0.1
          },
          metadata: {
            author: 'AI Team',
            description: 'Baseline VIS formula',
            rationale: 'Balanced weighting between volunteer effort (hours + consistency) and participant outcomes'
          }
        }
      ],
      migrationHistory: []
    };

    this.registries.set('VIS', visRegistry);
    await this.saveRegistry('VIS');

    console.info('[FormulaVersionManager] Created default registries');
  }

  /**
   * Export changelog for a formula
   */
  exportChangelog(formulaType: 'SROI' | 'VIS'): string {
    const registry = this.registries.get(formulaType);
    if (!registry) return '';

    const lines: string[] = [];

    lines.push(`# ${formulaType} Formula Changelog`);
    lines.push('');

    // Sort versions by date (newest first)
    const sorted = [...registry.versions].sort((a, b) =>
      new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
    );

    for (const version of sorted) {
      lines.push(`## Version ${version.version}`);
      lines.push(`**Effective From:** ${version.effectiveFrom}`);
      if (version.effectiveTo) {
        lines.push(`**Effective To:** ${version.effectiveTo}`);
      }
      lines.push(`**Status:** ${version.active ? 'Active' : 'Inactive'}`);
      lines.push('');

      lines.push(`**Description:** ${version.metadata.description}`);
      lines.push('');

      if (version.metadata.rationale) {
        lines.push(`**Rationale:** ${version.metadata.rationale}`);
        lines.push('');
      }

      if (version.metadata.validationMetrics) {
        lines.push('**Validation Metrics:**');
        const vm = version.metadata.validationMetrics;
        if (vm.mae) lines.push(`- MAE: ${vm.mae.toFixed(4)}`);
        if (vm.rmse) lines.push(`- RMSE: ${vm.rmse.toFixed(4)}`);
        if (vm.r2) lines.push(`- R²: ${vm.r2.toFixed(4)}`);
        if (vm.sampleSize) lines.push(`- Sample Size: ${vm.sampleSize}`);
        lines.push('');
      }

      if (version.metadata.changeLog && version.metadata.changeLog.length > 0) {
        lines.push('**Changes:**');
        for (const change of version.metadata.changeLog) {
          lines.push(`- ${change}`);
        }
        lines.push('');
      }

      lines.push('---');
      lines.push('');
    }

    return lines.join('\n');
  }
}

/**
 * Singleton instance
 */
let managerInstance: FormulaVersionManager | null = null;

export async function getFormulaVersionManager(): Promise<FormulaVersionManager> {
  if (!managerInstance) {
    managerInstance = new FormulaVersionManager();
    await managerInstance.loadRegistries();
  }
  return managerInstance;
}
