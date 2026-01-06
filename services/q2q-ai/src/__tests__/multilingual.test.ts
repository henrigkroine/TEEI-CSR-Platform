import { describe, it, expect } from 'vitest';
import {
  getSystemPrompt,
  getFewShotExamples,
  buildMultilingualPrompt,
  systemPromptEN,
  systemPromptUK,
  systemPromptNO
} from '../inference/prompts/multilingual.js';

describe('Multilingual Prompts', () => {
  describe('getSystemPrompt', () => {
    it('should return English prompt for en language', () => {
      const prompt = getSystemPrompt('en');
      expect(prompt).toBe(systemPromptEN);
      expect(prompt).toContain('You are an expert qualitative analyst');
    });

    it('should return Ukrainian prompt for uk language', () => {
      const prompt = getSystemPrompt('uk');
      expect(prompt).toBe(systemPromptUK);
      expect(prompt).toContain('Ви - експерт-аналітик');
    });

    it('should return Norwegian prompt for no language', () => {
      const prompt = getSystemPrompt('no');
      expect(prompt).toBe(systemPromptNO);
      expect(prompt).toContain('Du er en ekspert kvalitativ analytiker');
    });

    it('should return English prompt for unknown language', () => {
      const prompt = getSystemPrompt('unknown');
      expect(prompt).toBe(systemPromptEN);
    });

    it('should include classification dimensions in all prompts', () => {
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const prompt = getSystemPrompt(lang);
        expect(prompt.length).toBeGreaterThan(500);
        expect(prompt).toContain('confidence');
        expect(prompt).toContain('belonging');
      }
    });
  });

  describe('getFewShotExamples', () => {
    it('should return English examples for en language', () => {
      const examples = getFewShotExamples('en');
      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0].input).toContain('applying to jobs');
    });

    it('should return Ukrainian examples for uk language', () => {
      const examples = getFewShotExamples('uk');
      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0].input).toMatch(/[\u0400-\u04FF]/); // Contains Cyrillic
    });

    it('should return Norwegian examples for no language', () => {
      const examples = getFewShotExamples('no');
      expect(examples.length).toBeGreaterThan(0);
      expect(examples[0].input).toContain('Jeg');
    });

    it('should return English examples for unknown language', () => {
      const examples = getFewShotExamples('unknown');
      expect(examples.length).toBeGreaterThan(0);
    });

    it('should have consistent structure across all languages', () => {
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const examples = getFewShotExamples(lang);

        for (const example of examples) {
          expect(example).toHaveProperty('input');
          expect(example).toHaveProperty('output');
          expect(example.output).toHaveProperty('confidence_increase');
          expect(example.output).toHaveProperty('belonging_increase');
          expect(example.output).toHaveProperty('language_comfort');
          expect(example.output).toHaveProperty('employability_signals');
          expect(example.output).toHaveProperty('risk_cues');
          expect(example.output).toHaveProperty('evidence');
        }
      }
    });
  });

  describe('buildMultilingualPrompt', () => {
    it('should build complete prompt for English', () => {
      const text = 'I am learning programming and feel confident.';
      const prompt = buildMultilingualPrompt(text, 'en');

      expect(prompt).toContain(systemPromptEN);
      expect(prompt).toContain('Example');
      expect(prompt).toContain(text);
      expect(prompt).toContain('Now classify the following text');
    });

    it('should build complete prompt for Ukrainian', () => {
      const text = 'Я навчаюся програмуванню і відчуваю впевненість.';
      const prompt = buildMultilingualPrompt(text, 'uk');

      expect(prompt).toContain(systemPromptUK);
      expect(prompt).toContain(text);
      expect(prompt).toMatch(/[\u0400-\u04FF]/); // Contains Cyrillic in examples
    });

    it('should build complete prompt for Norwegian', () => {
      const text = 'Jeg lærer programmering og føler meg selvsikker.';
      const prompt = buildMultilingualPrompt(text, 'no');

      expect(prompt).toContain(systemPromptNO);
      expect(prompt).toContain(text);
    });

    it('should include few-shot examples in prompt', () => {
      const text = 'Test text';
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const prompt = buildMultilingualPrompt(text, lang);
        const examples = getFewShotExamples(lang);

        expect(prompt).toContain('Example 1:');
        expect(prompt).toContain(examples[0].input);
      }
    });

    it('should format examples as JSON', () => {
      const text = 'Test';
      const prompt = buildMultilingualPrompt(text, 'en');

      // Should contain JSON formatting
      expect(prompt).toContain('{');
      expect(prompt).toContain('}');
      expect(prompt).toContain('confidence_increase');
    });

    it('should instruct model to respond with JSON', () => {
      const text = 'Test';
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const prompt = buildMultilingualPrompt(text, lang);
        expect(prompt.toLowerCase()).toContain('json');
      }
    });
  });

  describe('Prompt content validation', () => {
    it('should have all required dimensions in English prompt', () => {
      const prompt = systemPromptEN;

      expect(prompt).toContain('Confidence Changes');
      expect(prompt).toContain('Belonging Changes');
      expect(prompt).toContain('Language Comfort');
      expect(prompt).toContain('Employability Signals');
      expect(prompt).toContain('Risk Cues');
    });

    it('should specify response format', () => {
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const prompt = getSystemPrompt(lang);
        expect(prompt).toContain('boolean');
      }
    });

    it('should include evidence requirement', () => {
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const prompt = getSystemPrompt(lang);
        expect(prompt.toLowerCase()).toContain('evidence');
      }
    });
  });

  describe('Example validation', () => {
    it('should have positive and negative examples', () => {
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const examples = getFewShotExamples(lang);

        const hasPositive = examples.some(ex => ex.output.confidence_increase);
        const hasNegative = examples.some(ex => ex.output.confidence_decrease);

        expect(hasPositive).toBe(true);
        expect(hasNegative).toBe(true);
      }
    });

    it('should have examples with different language comfort levels', () => {
      const examples = getFewShotExamples('en');

      const levels = new Set(examples.map(ex => ex.output.language_comfort));
      expect(levels.size).toBeGreaterThan(1);
    });

    it('should have examples with employability signals', () => {
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const examples = getFewShotExamples(lang);
        const hasEmployability = examples.some(ex => ex.output.employability_signals.length > 0);
        expect(hasEmployability).toBe(true);
      }
    });

    it('should have examples with risk cues', () => {
      const languages = ['en', 'uk', 'no'] as const;

      for (const lang of languages) {
        const examples = getFewShotExamples(lang);
        const hasRisk = examples.some(ex => ex.output.risk_cues.length > 0);
        expect(hasRisk).toBe(true);
      }
    });
  });
});
