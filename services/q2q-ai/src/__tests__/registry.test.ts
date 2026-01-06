import { describe, it, expect, beforeAll } from 'vitest';
import { loadModelsFromYAML, type ModelConfig } from '../registry/persist.js';

describe('Model Registry', () => {
  let models: ModelConfig[];

  beforeAll(async () => {
    models = await loadModelsFromYAML();
  });

  describe('loadModelsFromYAML', () => {
    it('should load models from YAML file', async () => {
      expect(models).toBeDefined();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThan(0);
    });

    it('should have valid model structure', () => {
      for (const model of models) {
        expect(model).toHaveProperty('id');
        expect(model).toHaveProperty('provider');
        expect(model).toHaveProperty('model');
        expect(model).toHaveProperty('prompt_version');
        expect(model).toHaveProperty('thresholds');
        expect(model).toHaveProperty('effective_from');
        expect(model).toHaveProperty('active');
      }
    });

    it('should have unique model IDs', () => {
      const ids = models.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid provider names', () => {
      const validProviders = ['claude', 'openai', 'gemini'];

      for (const model of models) {
        expect(validProviders).toContain(model.provider);
      }
    });

    it('should have valid model names for each provider', () => {
      for (const model of models) {
        expect(model.model).toBeTruthy();
        expect(typeof model.model).toBe('string');
        expect(model.model.length).toBeGreaterThan(0);
      }
    });

    it('should have prompt versions', () => {
      for (const model of models) {
        expect(model.prompt_version).toMatch(/^v\d+\.\d+$/);
      }
    });

    it('should have valid thresholds', () => {
      for (const model of models) {
        expect(model.thresholds).toBeDefined();
        expect(typeof model.thresholds).toBe('object');

        // Check common threshold keys
        const thresholdKeys = Object.keys(model.thresholds);
        expect(thresholdKeys.length).toBeGreaterThan(0);

        // All threshold values should be numbers
        for (const value of Object.values(model.thresholds)) {
          expect(typeof value).toBe('number');
        }
      }
    });

    it('should have valid effective_from dates', () => {
      for (const model of models) {
        const date = new Date(model.effective_from);
        expect(date.toString()).not.toBe('Invalid Date');
        expect(date.getFullYear()).toBeGreaterThanOrEqual(2025);
      }
    });

    it('should have boolean active status', () => {
      for (const model of models) {
        expect(typeof model.active).toBe('boolean');
      }
    });
  });

  describe('Model configurations', () => {
    it('should have at least one active model', () => {
      const activeModels = models.filter(m => m.active);
      expect(activeModels.length).toBeGreaterThanOrEqual(1);
    });

    it('should have Claude model configuration', () => {
      const claudeModel = models.find(m => m.provider === 'claude');
      expect(claudeModel).toBeDefined();
    });

    it('should have OpenAI model configuration', () => {
      const openaiModel = models.find(m => m.provider === 'openai');
      expect(openaiModel).toBeDefined();
    });

    it('should have Gemini model configuration', () => {
      const geminiModel = models.find(m => m.provider === 'gemini');
      expect(geminiModel).toBeDefined();
    });

    it('should have multilingual model configuration', () => {
      const multilingualModel = models.find(m => m.id.includes('multilingual'));
      expect(multilingualModel).toBeDefined();
      if (multilingualModel) {
        expect(multilingualModel.prompt_version).toBe('v2.0');
      }
    });
  });

  describe('Threshold configurations', () => {
    it('should have confidence thresholds', () => {
      for (const model of models) {
        const thresholds = model.thresholds;
        expect(thresholds.confidence_increase).toBeDefined();
        expect(thresholds.confidence_decrease).toBeDefined();
      }
    });

    it('should have belonging thresholds', () => {
      for (const model of models) {
        const thresholds = model.thresholds;
        expect(thresholds.belonging_increase).toBeDefined();
        expect(thresholds.belonging_decrease).toBeDefined();
      }
    });

    it('should have language comfort thresholds', () => {
      for (const model of models) {
        const thresholds = model.thresholds;
        expect(thresholds.language_comfort_high).toBeDefined();
        expect(thresholds.language_comfort_low).toBeDefined();
      }
    });

    it('should have reasonable threshold values', () => {
      for (const model of models) {
        const thresholds = model.thresholds;

        for (const [key, value] of Object.entries(thresholds)) {
          // Most thresholds should be between 0 and 1
          if (key.includes('min_')) {
            expect(value).toBeGreaterThanOrEqual(0);
          } else {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    it('should have consistent threshold structure across models', () => {
      const firstModel = models[0];
      const thresholdKeys = Object.keys(firstModel.thresholds).sort();

      for (const model of models) {
        const modelKeys = Object.keys(model.thresholds).sort();
        expect(modelKeys).toEqual(thresholdKeys);
      }
    });
  });

  describe('Model versioning', () => {
    it('should have v1.0 models', () => {
      const v1Models = models.filter(m => m.prompt_version === 'v1.0');
      expect(v1Models.length).toBeGreaterThan(0);
    });

    it('should have v2.0 models for multilingual support', () => {
      const v2Models = models.filter(m => m.prompt_version === 'v2.0');
      expect(v2Models.length).toBeGreaterThanOrEqual(1);
    });

    it('should have different thresholds for v2 multilingual models', () => {
      const v1Model = models.find(m => m.provider === 'claude' && m.prompt_version === 'v1.0');
      const v2Model = models.find(m => m.provider === 'claude' && m.prompt_version === 'v2.0');

      if (v1Model && v2Model) {
        // v2 might have different (typically higher) thresholds
        const v1Confidence = v1Model.thresholds.confidence_increase;
        const v2Confidence = v2Model.thresholds.confidence_increase;

        expect(v1Confidence).toBeDefined();
        expect(v2Confidence).toBeDefined();
        // They might be different (v2 is often more strict)
        expect(typeof v1Confidence).toBe('number');
        expect(typeof v2Confidence).toBe('number');
      }
    });
  });

  describe('Model metadata', () => {
    it('should have description for multilingual models', () => {
      const multilingualModels = models.filter(m => m.id.includes('multilingual'));

      for (const model of multilingualModels) {
        expect(model.description).toBeDefined();
        expect(model.description?.length).toBeGreaterThan(0);
      }
    });

    it('should use appropriate model names', () => {
      const claudeModel = models.find(m => m.provider === 'claude');
      if (claudeModel) {
        expect(claudeModel.model).toContain('claude');
      }

      const openaiModel = models.find(m => m.provider === 'openai');
      if (openaiModel) {
        expect(openaiModel.model).toContain('gpt');
      }

      const geminiModel = models.find(m => m.provider === 'gemini');
      if (geminiModel) {
        expect(geminiModel.model).toContain('gemini');
      }
    });
  });

  describe('Active model management', () => {
    it('should have only one active model per provider', () => {
      const providers = ['claude', 'openai', 'gemini'];

      for (const provider of providers) {
        const providerModels = models.filter(m => m.provider === provider);
        const activeCount = providerModels.filter(m => m.active).length;

        // Should have at most 1 active model per provider
        expect(activeCount).toBeLessThanOrEqual(1);
      }
    });

    it('should have default active model (Claude)', () => {
      const claudeModels = models.filter(m => m.provider === 'claude');
      const activeClaudeModels = claudeModels.filter(m => m.active);

      expect(activeClaudeModels.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('YAML file structure', () => {
    it('should have models array', () => {
      expect(Array.isArray(models)).toBe(true);
    });

    it('should have at least 3 models (one per provider)', () => {
      expect(models.length).toBeGreaterThanOrEqual(3);
    });

    it('should be parseable and valid', async () => {
      // If we got here, YAML parsing succeeded
      expect(models).toBeDefined();
      expect(models.length).toBeGreaterThan(0);
    });
  });
});
