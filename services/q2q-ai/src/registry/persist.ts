import { readFile } from 'fs/promises';
import { parse } from 'yaml';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db } from '@teei/shared-schema';
import { modelRegistry } from '@teei/shared-schema/schema/q2q';
import { eq, and } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Model configuration from YAML
 */
export interface ModelConfig {
  id: string;
  provider: string;
  model: string;
  prompt_version: string;
  thresholds: Record<string, number>;
  effective_from: string;
  active: boolean;
  description?: string;
}

/**
 * YAML structure
 */
interface ModelsYAML {
  models: ModelConfig[];
}

/**
 * Load models from YAML file
 */
export async function loadModelsFromYAML(): Promise<ModelConfig[]> {
  const yamlPath = join(__dirname, 'models.yaml');
  const yamlContent = await readFile(yamlPath, 'utf-8');
  const parsed = parse(yamlContent) as ModelsYAML;
  return parsed.models;
}

/**
 * Sync models from YAML to database
 * Creates or updates model registry entries
 */
export async function syncModelsToDatabase(): Promise<void> {
  console.info('[ModelRegistry] Syncing models from YAML to database...');

  const models = await loadModelsFromYAML();

  for (const model of models) {
    try {
      // Check if model exists
      const existing = await db
        .select()
        .from(modelRegistry)
        .where(eq(modelRegistry.modelId, model.id))
        .limit(1);

      if (existing.length > 0) {
        // Update existing model
        await db
          .update(modelRegistry)
          .set({
            provider: model.provider,
            modelName: model.model,
            promptVersion: model.prompt_version,
            thresholds: model.thresholds,
            effectiveFrom: new Date(model.effective_from),
            active: model.active,
            updatedAt: new Date(),
          })
          .where(eq(modelRegistry.modelId, model.id));

        console.info(`[ModelRegistry] Updated model: ${model.id}`);
      } else {
        // Insert new model
        await db.insert(modelRegistry).values({
          modelId: model.id,
          provider: model.provider,
          modelName: model.model,
          promptVersion: model.prompt_version,
          thresholds: model.thresholds,
          effectiveFrom: new Date(model.effective_from),
          active: model.active,
        });

        console.info(`[ModelRegistry] Inserted model: ${model.id}`);
      }
    } catch (error: any) {
      console.error(`[ModelRegistry] Error syncing model ${model.id}:`, error.message);
    }
  }

  console.info('[ModelRegistry] Sync complete');
}

/**
 * Get active model for a specific provider
 */
export async function getActiveModel(provider: string): Promise<any> {
  const result = await db
    .select()
    .from(modelRegistry)
    .where(and(eq(modelRegistry.provider, provider), eq(modelRegistry.active, true)))
    .limit(1);

  if (result.length === 0) {
    throw new Error(`No active model found for provider: ${provider}`);
  }

  return result[0];
}

/**
 * Get all models (active and inactive)
 */
export async function getAllModels(): Promise<any[]> {
  return await db.select().from(modelRegistry).orderBy(modelRegistry.createdAt);
}

/**
 * Get model by ID
 */
export async function getModelById(modelId: string): Promise<any> {
  const result = await db
    .select()
    .from(modelRegistry)
    .where(eq(modelRegistry.modelId, modelId))
    .limit(1);

  if (result.length === 0) {
    throw new Error(`Model not found: ${modelId}`);
  }

  return result[0];
}

/**
 * Activate a model (sets all other models in the same provider to inactive)
 */
export async function activateModel(modelId: string): Promise<void> {
  console.info(`[ModelRegistry] Activating model: ${modelId}`);

  // Get the model to activate
  const model = await getModelById(modelId);

  // Deactivate all models for this provider
  await db
    .update(modelRegistry)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(modelRegistry.provider, model.provider));

  // Activate the specified model
  await db
    .update(modelRegistry)
    .set({ active: true, updatedAt: new Date() })
    .where(eq(modelRegistry.modelId, modelId));

  console.info(`[ModelRegistry] Activated model: ${modelId}`);
}

/**
 * Deactivate a model
 */
export async function deactivateModel(modelId: string): Promise<void> {
  console.info(`[ModelRegistry] Deactivating model: ${modelId}`);

  await db
    .update(modelRegistry)
    .set({ active: false, updatedAt: new Date() })
    .where(eq(modelRegistry.modelId, modelId));

  console.info(`[ModelRegistry] Deactivated model: ${modelId}`);
}

/**
 * Initialize model registry on service startup
 */
export async function initializeModelRegistry(): Promise<void> {
  try {
    console.info('[ModelRegistry] Initializing...');
    await syncModelsToDatabase();
    console.info('[ModelRegistry] Initialization complete');
  } catch (error: any) {
    console.error('[ModelRegistry] Initialization failed:', error.message);
    throw error;
  }
}
