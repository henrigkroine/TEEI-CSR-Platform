import { describe, it, expect } from 'vitest';
import { buildClassificationPrompt, extractJSON } from '../inference/prompt';

describe('prompt', () => {
  describe('buildClassificationPrompt', () => {
    it('should build a prompt with the input text', () => {
      const text = 'I feel confident and motivated';
      const prompt = buildClassificationPrompt(text);

      expect(prompt).toContain(text);
      expect(prompt).toContain('confidence_increase');
      expect(prompt).toContain('belonging_increase');
      expect(prompt).toContain('language_comfort');
    });

    it('should include few-shot examples', () => {
      const text = 'Test text';
      const prompt = buildClassificationPrompt(text);

      expect(prompt).toContain('Example 1:');
      expect(prompt).toContain('Example 2:');
    });

    it('should include instructions for JSON output', () => {
      const text = 'Test text';
      const prompt = buildClassificationPrompt(text);

      expect(prompt).toContain('JSON');
      expect(prompt).toContain('schema');
    });
  });

  describe('extractJSON', () => {
    it('should extract JSON from code blocks', () => {
      const response = '```json\n{"key": "value"}\n```';
      const json = extractJSON(response);

      expect(json).toBe('{"key": "value"}');
    });

    it('should extract JSON without code block markers', () => {
      const response = 'Here is the result: {"key": "value"}';
      const json = extractJSON(response);

      expect(json).toBe('{"key": "value"}');
    });

    it('should handle complex nested JSON', () => {
      const response = '```\n{"nested": {"key": "value", "array": [1, 2, 3]}}\n```';
      const json = extractJSON(response);

      expect(json).toContain('"nested"');
      expect(json).toContain('"array"');
    });

    it('should return original string if no JSON found', () => {
      const response = 'No JSON here';
      const json = extractJSON(response);

      expect(json).toBe(response);
    });
  });
});
