import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectLanguage,
  detectLanguageWithDetails,
  clearLanguageCache,
  getCacheStats,
  type Language
} from '../inference/language_detection.js';

describe('Language Detection', () => {
  beforeEach(() => {
    clearLanguageCache();
  });

  describe('detectLanguage', () => {
    it('should detect English text', async () => {
      const text = 'I have been applying to jobs every day this week. My resume is ready.';
      const language = await detectLanguage(text);
      expect(language).toBe('en');
    });

    it('should detect Ukrainian text (Cyrillic)', async () => {
      const text = 'Я подавав заявки на роботу кожен день цього тижня. Моє резюме готове.';
      const language = await detectLanguage(text);
      expect(language).toBe('uk');
    });

    it('should detect Norwegian text', async () => {
      const text = 'Jeg har søkt på jobber hver dag denne uken. CV-en min er klar.';
      const language = await detectLanguage(text);
      expect(language).toBe('no');
    });

    it('should detect Norwegian using special characters', async () => {
      const text = 'Dette er en tekst på norsk med æ, ø og å.';
      const language = await detectLanguage(text);
      expect(language).toBe('no');
    });

    it('should return unknown for very short ambiguous text', async () => {
      const text = '123';
      const language = await detectLanguage(text, 0.9); // High threshold
      expect(language).toBe('unknown');
    });

    it('should default to English for Latin script without clear indicators', async () => {
      const text = 'abcdefghijklmnop qrstuv';
      const language = await detectLanguage(text, 0.6); // Lower threshold
      expect(['en', 'unknown']).toContain(language);
    });

    it('should use cache for repeated text', async () => {
      const text = 'I am learning programming.';

      // First call
      const lang1 = await detectLanguage(text);
      const stats1 = getCacheStats();

      // Second call should use cache
      const lang2 = await detectLanguage(text);
      const stats2 = getCacheStats();

      expect(lang1).toBe(lang2);
      expect(stats1.size).toBeLessThanOrEqual(stats2.size);
    });

    it('should handle mixed language text', async () => {
      const text = 'Hello Привіт Hei';
      const language = await detectLanguage(text);
      // Should detect Ukrainian due to Cyrillic presence
      expect(language).toBe('uk');
    });
  });

  describe('detectLanguageWithDetails', () => {
    it('should return detailed results for English', async () => {
      const text = 'The quick brown fox jumps over the lazy dog.';
      const result = await detectLanguageWithDetails(text);

      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.rawDetection).toBeDefined();
    });

    it('should return detailed results for Ukrainian', async () => {
      const text = 'Швидка бура лисиця перестрибує ліниву собаку.';
      const result = await detectLanguageWithDetails(text);

      expect(result.language).toBe('uk');
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.rawDetection).toContain('cyrillic');
    });

    it('should return detailed results for Norwegian', async () => {
      const text = 'Den raske brune reven hopper over den late hunden på søndager.';
      const result = await detectLanguageWithDetails(text);

      expect(result.language).toBe('no');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should have confidence below threshold for ambiguous text', async () => {
      const text = 'abc xyz 123';
      const result = await detectLanguageWithDetails(text);

      expect(result.confidence).toBeLessThan(0.8);
    });
  });

  describe('Cache management', () => {
    it('should cache detection results', async () => {
      const text = 'Testing cache functionality';

      clearLanguageCache();
      let stats = getCacheStats();
      expect(stats.size).toBe(0);

      await detectLanguage(text);
      stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });

    it('should clear cache', async () => {
      await detectLanguage('Test 1');
      await detectLanguage('Test 2');

      let stats = getCacheStats();
      expect(stats.size).toBeGreaterThan(0);

      clearLanguageCache();
      stats = getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return same result for same text (case-insensitive)', async () => {
      const text1 = 'Hello World';
      const text2 = 'hello world';

      const lang1 = await detectLanguage(text1);
      const lang2 = await detectLanguage(text2);

      expect(lang1).toBe(lang2);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', async () => {
      const text = '';
      const language = await detectLanguage(text);
      expect(['en', 'unknown']).toContain(language);
    });

    it('should handle very long text', async () => {
      const text = 'This is a very long English text. '.repeat(100);
      const language = await detectLanguage(text);
      expect(language).toBe('en');
    });

    it('should handle text with special characters', async () => {
      const text = '!!!??? ### @@@ Hello world';
      const language = await detectLanguage(text);
      expect(language).toBe('en');
    });

    it('should handle numbers only', async () => {
      const text = '123456789';
      const language = await detectLanguage(text);
      expect(['en', 'unknown']).toContain(language);
    });
  });

  describe('Real-world examples', () => {
    it('should correctly identify English feedback', async () => {
      const text = 'I feel much more confident about my job applications now. My buddy helped me improve my resume and I got two callbacks!';
      const language = await detectLanguage(text);
      expect(language).toBe('en');
    });

    it('should correctly identify Ukrainian feedback', async () => {
      const text = 'Я відчуваю себе набагато впевненіше щодо своїх заявок на роботу. Мій наставник допоміг покращити резюме.';
      const language = await detectLanguage(text);
      expect(language).toBe('uk');
    });

    it('should correctly identify Norwegian feedback', async () => {
      const text = 'Jeg føler meg mye mer selvsikker på jobbsøknadene mine nå. Min venn hjalp meg med å forbedre CV-en.';
      const language = await detectLanguage(text);
      expect(language).toBe('no');
    });
  });
});
