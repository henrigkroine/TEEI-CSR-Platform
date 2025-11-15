/**
 * Versioned Prompt Template System
 * Manages prompt versions with semantic versioning and A/B testing
 */

import { promises as fs } from 'fs';
import path from 'path';
import yaml from 'yaml';

export interface PromptVersion {
  version: string; // Semantic version (e.g., "2.1.0")
  name: string; // Descriptive name
  template: string; // Prompt template with placeholders
  placeholders: string[]; // Required placeholder variables
  metadata: {
    createdAt: string;
    author: string;
    description: string;
    language?: string; // Target language (en, uk, no)
    modelTargets?: string[]; // Optimized for specific models
    performanceMetrics?: {
      f1Score?: number;
      precision?: number;
      recall?: number;
      avgLatency?: number;
    };
  };
  active: boolean; // Whether this version is active
  canaryWeight?: number; // Weight for A/B testing (0-1)
}

export interface PromptTemplate {
  id: string; // Unique template ID (e.g., "q2q-classification")
  versions: PromptVersion[];
  activeVersion: string; // Currently active version
  canaryVersion?: string; // Version being tested
  defaultLanguage: string;
}

export interface PromptVariables {
  [key: string]: string | number | boolean;
}

/**
 * Prompt Version Manager
 */
export class PromptVersionManager {
  private templates: Map<string, PromptTemplate> = new Map();
  private promptsDir: string;

  constructor(promptsDir?: string) {
    this.promptsDir = promptsDir || path.join(process.cwd(), 'src', 'prompts', 'templates');
  }

  /**
   * Load all prompt templates from YAML files
   */
  async loadTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.promptsDir);
      const yamlFiles = files.filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

      for (const file of yamlFiles) {
        const filePath = path.join(this.promptsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const template = yaml.parse(content) as PromptTemplate;

        this.templates.set(template.id, template);
        console.info(`[PromptVersionManager] Loaded template: ${template.id} (${template.versions.length} versions)`);
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.warn(`[PromptVersionManager] Prompts directory not found: ${this.promptsDir}`);
      } else {
        console.error('[PromptVersionManager] Error loading templates:', error);
        throw error;
      }
    }
  }

  /**
   * Get a prompt template by ID
   */
  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Get active version of a template
   */
  getActiveVersion(templateId: string): PromptVersion | undefined {
    const template = this.templates.get(templateId);
    if (!template) return undefined;

    return template.versions.find(v => v.version === template.activeVersion);
  }

  /**
   * Get a specific version
   */
  getVersion(templateId: string, version: string): PromptVersion | undefined {
    const template = this.templates.get(templateId);
    if (!template) return undefined;

    return template.versions.find(v => v.version === version);
  }

  /**
   * Render a prompt with variables
   */
  render(templateId: string, variables: PromptVariables, version?: string): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Determine which version to use
    let promptVersion: PromptVersion | undefined;

    if (version) {
      // Specific version requested
      promptVersion = this.getVersion(templateId, version);
    } else {
      // Use canary or active based on A/B test
      promptVersion = this.selectVersionForABTest(template);
    }

    if (!promptVersion) {
      throw new Error(`Version not found: ${templateId}@${version || 'active'}`);
    }

    // Validate required placeholders
    const missing = promptVersion.placeholders.filter(p => !(p in variables));
    if (missing.length > 0) {
      throw new Error(`Missing required placeholders: ${missing.join(', ')}`);
    }

    // Replace placeholders
    let rendered = promptVersion.template;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      rendered = rendered.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return rendered;
  }

  /**
   * Select version for A/B testing
   * Returns canary version with probability = canaryWeight, otherwise active
   */
  private selectVersionForABTest(template: PromptTemplate): PromptVersion {
    const active = template.versions.find(v => v.version === template.activeVersion);

    if (!template.canaryVersion || !active) {
      return active!;
    }

    const canary = template.versions.find(v => v.version === template.canaryVersion);
    if (!canary || !canary.canaryWeight) {
      return active;
    }

    // Random selection based on canary weight
    const random = Math.random();
    return random < canary.canaryWeight ? canary : active;
  }

  /**
   * Add a new version to a template
   */
  async addVersion(templateId: string, version: PromptVersion): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Check if version already exists
    if (template.versions.some(v => v.version === version.version)) {
      throw new Error(`Version ${version.version} already exists for template ${templateId}`);
    }

    template.versions.push(version);
    await this.saveTemplate(template);

    console.info(`[PromptVersionManager] Added version ${version.version} to ${templateId}`);
  }

  /**
   * Activate a version
   */
  async activateVersion(templateId: string, version: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const versionObj = template.versions.find(v => v.version === version);
    if (!versionObj) {
      throw new Error(`Version ${version} not found in template ${templateId}`);
    }

    // Deactivate current active
    const currentActive = template.versions.find(v => v.version === template.activeVersion);
    if (currentActive) {
      currentActive.active = false;
    }

    // Activate new version
    versionObj.active = true;
    template.activeVersion = version;

    await this.saveTemplate(template);

    console.info(`[PromptVersionManager] Activated version ${version} for ${templateId}`);
  }

  /**
   * Start canary deployment
   */
  async startCanary(templateId: string, version: string, weight: number): Promise<void> {
    if (weight < 0 || weight > 1) {
      throw new Error('Canary weight must be between 0 and 1');
    }

    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const versionObj = template.versions.find(v => v.version === version);
    if (!versionObj) {
      throw new Error(`Version ${version} not found in template ${templateId}`);
    }

    template.canaryVersion = version;
    versionObj.canaryWeight = weight;

    await this.saveTemplate(template);

    console.info(`[PromptVersionManager] Started canary for ${templateId}@${version} with weight ${weight}`);
  }

  /**
   * Stop canary deployment
   */
  async stopCanary(templateId: string): Promise<void> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    if (template.canaryVersion) {
      const canary = template.versions.find(v => v.version === template.canaryVersion);
      if (canary) {
        canary.canaryWeight = undefined;
      }
    }

    template.canaryVersion = undefined;

    await this.saveTemplate(template);

    console.info(`[PromptVersionManager] Stopped canary for ${templateId}`);
  }

  /**
   * Save template to YAML file
   */
  private async saveTemplate(template: PromptTemplate): Promise<void> {
    const filePath = path.join(this.promptsDir, `${template.id}.yaml`);
    const content = yaml.stringify(template);

    await fs.writeFile(filePath, content, 'utf-8');
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Compare two versions (for diff/changelog)
   */
  compareVersions(
    templateId: string,
    versionA: string,
    versionB: string
  ): {
    templateDiff: string;
    metadataChanges: Record<string, any>;
  } {
    const vA = this.getVersion(templateId, versionA);
    const vB = this.getVersion(templateId, versionB);

    if (!vA || !vB) {
      throw new Error('One or both versions not found');
    }

    return {
      templateDiff: this.diffStrings(vA.template, vB.template),
      metadataChanges: {
        performanceMetrics: {
          before: vA.metadata.performanceMetrics,
          after: vB.metadata.performanceMetrics
        },
        placeholders: {
          added: vB.placeholders.filter(p => !vA.placeholders.includes(p)),
          removed: vA.placeholders.filter(p => !vB.placeholders.includes(p))
        }
      }
    };
  }

  /**
   * Simple string diff (line-based)
   */
  private diffStrings(a: string, b: string): string {
    const linesA = a.split('\n');
    const linesB = b.split('\n');

    const diff: string[] = [];
    const maxLen = Math.max(linesA.length, linesB.length);

    for (let i = 0; i < maxLen; i++) {
      const lineA = linesA[i] || '';
      const lineB = linesB[i] || '';

      if (lineA !== lineB) {
        if (lineA) diff.push(`- ${lineA}`);
        if (lineB) diff.push(`+ ${lineB}`);
      }
    }

    return diff.join('\n');
  }
}

/**
 * Singleton instance
 */
let managerInstance: PromptVersionManager | null = null;

export async function getPromptManager(): Promise<PromptVersionManager> {
  if (!managerInstance) {
    managerInstance = new PromptVersionManager();
    await managerInstance.loadTemplates();
  }
  return managerInstance;
}
