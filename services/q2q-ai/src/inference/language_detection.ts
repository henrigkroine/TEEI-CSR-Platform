import { createHash } from 'crypto';

/**
 * Supported languages for Q2Q classification
 */
export type Language = 'en' | 'uk' | 'no' | 'unknown';

/**
 * Language detection result with confidence
 */
export interface LanguageDetectionResult {
  language: Language;
  confidence: number;
  rawDetection?: string;
}

/**
 * Simple in-memory cache for language detection results
 * Key: SHA-256 hash of text
 * Value: Detected language
 */
const detectionCache = new Map<string, Language>();

/**
 * Create a hash key for caching
 */
function createCacheKey(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Simple rule-based language detection
 * Uses characteristic patterns for English, Ukrainian, and Norwegian
 */
function simpleLanguageDetection(text: string): LanguageDetectionResult {
  const lowerText = text.toLowerCase();

  // Ukrainian uses Cyrillic alphabet
  const cyrillicPattern = /[\u0400-\u04FF]/;
  const cyrillicRatio = (text.match(cyrillicPattern) || []).length / text.length;

  // Norwegian-specific characters and words
  const norwegianChars = /[æøå]/i;
  const norwegianWords = /\b(jeg|og|det|er|på|ikke|en|som|til|har|for|med|at|av|være)\b/i;

  // English common words
  const englishWords = /\b(the|is|and|to|of|in|it|you|that|was|for|on|are|with|as)\b/i;

  // Detect Ukrainian (Cyrillic)
  if (cyrillicRatio > 0.3) {
    return {
      language: 'uk',
      confidence: Math.min(0.8 + cyrillicRatio, 0.95),
      rawDetection: 'cyrillic-pattern'
    };
  }

  // Count Norwegian indicators
  const norwegianScore = (norwegianChars.test(text) ? 0.4 : 0) +
                         (norwegianWords.test(lowerText) ? 0.4 : 0);

  // Count English indicators
  const englishScore = (englishWords.test(lowerText) ? 0.4 : 0);

  // Decide based on scores
  if (norwegianScore > 0.5) {
    return {
      language: 'no',
      confidence: Math.min(0.75 + norwegianScore * 0.2, 0.95),
      rawDetection: 'norwegian-pattern'
    };
  }

  if (englishScore > 0.3 || text.length < 20) {
    return {
      language: 'en',
      confidence: Math.min(0.75 + englishScore * 0.2, 0.90),
      rawDetection: 'english-pattern'
    };
  }

  // Default to English for Latin script
  const latinRatio = (text.match(/[a-zA-Z]/) || []).length / text.length;
  if (latinRatio > 0.5) {
    return {
      language: 'en',
      confidence: 0.65,
      rawDetection: 'latin-default'
    };
  }

  return {
    language: 'unknown',
    confidence: 0.5,
    rawDetection: 'no-match'
  };
}

/**
 * Detect language of input text
 *
 * @param text - Input text to analyze
 * @param confidenceThreshold - Minimum confidence to accept detection (default 0.8)
 * @returns Detected language or 'unknown' if confidence is too low
 */
export async function detectLanguage(
  text: string,
  confidenceThreshold: number = 0.8
): Promise<Language> {
  // Check cache first
  const cacheKey = createCacheKey(text);
  const cached = detectionCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Perform detection
  const result = simpleLanguageDetection(text);

  // Apply confidence threshold
  const detectedLanguage = result.confidence >= confidenceThreshold
    ? result.language
    : 'unknown';

  // Cache the result
  detectionCache.set(cacheKey, detectedLanguage);

  // Log detection for debugging
  console.debug(`[LanguageDetection] Text: "${text.substring(0, 50)}..." => ${detectedLanguage} (confidence: ${result.confidence.toFixed(2)})`);

  return detectedLanguage;
}

/**
 * Detect language with full result details (for testing/debugging)
 */
export async function detectLanguageWithDetails(text: string): Promise<LanguageDetectionResult> {
  return simpleLanguageDetection(text);
}

/**
 * Clear the language detection cache
 * Useful for testing or memory management
 */
export function clearLanguageCache(): void {
  detectionCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; maxSize: number } {
  return {
    size: detectionCache.size,
    maxSize: 1000 // Keep cache manageable
  };
}

// Periodic cache cleanup to prevent memory issues
setInterval(() => {
  if (detectionCache.size > 1000) {
    console.info('[LanguageDetection] Clearing cache (size exceeded 1000)');
    detectionCache.clear();
  }
}, 60000); // Check every minute
