/**
 * Anomaly Signals Builder
 *
 * Detects outlier and fraudulent feedback using statistical methods.
 * Designed to flag suspicious patterns while maintaining <1% false positive rate.
 */

export interface AnomalySignal {
  /** Overall anomaly score (0.0 = normal, 1.0 = definitely anomalous) */
  anomalyScore: number;
  /** Whether this should be flagged for human review */
  flagForReview: boolean;
  /** List of anomaly types detected */
  anomalies: AnomalyType[];
  /** Detailed metrics */
  metrics: {
    textLength: number;
    textLengthZScore: number;
    repetitionScore: number;
    timingScore: number;
    languageConfidence: number;
    gibberishScore: number;
  };
}

export enum AnomalyType {
  TEXT_TOO_SHORT = 'text_too_short',
  TEXT_TOO_LONG = 'text_too_long',
  HIGH_REPETITION = 'high_repetition',
  COPY_PASTE_DETECTED = 'copy_paste_detected',
  SUSPICIOUS_TIMING = 'suspicious_timing',
  LANGUAGE_MISMATCH = 'language_mismatch',
  GIBBERISH_DETECTED = 'gibberish_detected',
  BOT_PATTERN = 'bot_pattern',
}

export interface FeedbackSubmission {
  text: string;
  userId: string;
  timestamp: Date;
  declaredLanguage?: string;
  detectedLanguage?: string;
}

export interface AnomalyDetectorConfig {
  /** Z-score threshold for length outliers (default: 3.0) */
  lengthZScoreThreshold: number;
  /** Repetition score threshold (default: 0.7) */
  repetitionThreshold: number;
  /** Review flag threshold for anomaly score (default: 0.75) */
  reviewThreshold: number;
  /** Min text length (default: 10 chars) */
  minTextLength: number;
  /** Max text length (default: 5000 chars) */
  maxTextLength: number;
  /** Target false positive rate (default: 0.01 = 1%) */
  targetFPR: number;
}

const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  lengthZScoreThreshold: 3.0,
  repetitionThreshold: 0.7,
  reviewThreshold: 0.75,
  minTextLength: 10,
  maxTextLength: 5000,
  targetFPR: 0.01,
};

/**
 * Historical statistics for baseline comparison
 * In production, this would be loaded from database
 */
interface HistoricalStats {
  meanLength: number;
  stdDevLength: number;
  sampleCount: number;
}

/** In-memory stats (would be DB-backed in production) */
let historicalStats: HistoricalStats = {
  meanLength: 250, // Typical feedback length
  stdDevLength: 150,
  sampleCount: 1000,
};

/**
 * Recent submissions for pattern detection
 */
const recentSubmissions: Array<{
  userId: string;
  textHash: string;
  timestamp: Date;
}> = [];
const MAX_RECENT_SUBMISSIONS = 10000;

/**
 * Update historical statistics with new submission
 */
export function updateHistoricalStats(textLength: number): void {
  const n = historicalStats.sampleCount;
  const oldMean = historicalStats.meanLength;

  // Online algorithm for running mean and variance
  const newMean = (oldMean * n + textLength) / (n + 1);
  const oldVariance = historicalStats.stdDevLength ** 2;
  const newVariance =
    (n * oldVariance + (textLength - oldMean) * (textLength - newMean)) / (n + 1);

  historicalStats = {
    meanLength: newMean,
    stdDevLength: Math.sqrt(newVariance),
    sampleCount: n + 1,
  };
}

/**
 * Calculate z-score for text length
 */
function calculateLengthZScore(length: number): number {
  if (historicalStats.stdDevLength === 0) return 0;
  return Math.abs(length - historicalStats.meanLength) / historicalStats.stdDevLength;
}

/**
 * Calculate repetition score using n-gram analysis
 * Returns 0.0-1.0, where 1.0 = highly repetitive
 */
function calculateRepetitionScore(text: string): number {
  // Analyze 3-grams (sequences of 3 words)
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);

  if (words.length < 3) return 0;

  const trigrams = new Map<string, number>();
  let totalTrigrams = 0;

  for (let i = 0; i <= words.length - 3; i++) {
    const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    trigrams.set(trigram, (trigrams.get(trigram) || 0) + 1);
    totalTrigrams++;
  }

  // Calculate max repetition ratio
  const maxCount = Math.max(...Array.from(trigrams.values()));
  const repetitionRatio = maxCount / totalTrigrams;

  // Also check character-level repetition
  const chars = text.toLowerCase().replace(/\s/g, '');
  const charCounts = new Map<string, number>();
  for (const char of chars) {
    charCounts.set(char, (charCounts.get(char) || 0) + 1);
  }

  const maxCharCount = Math.max(...Array.from(charCounts.values()));
  const charRepetitionRatio = maxCharCount / chars.length;

  // Return the higher of the two
  return Math.max(repetitionRatio, charRepetitionRatio * 0.5);
}

/**
 * Detect gibberish text using vowel/consonant ratio and dictionary-like patterns
 */
function calculateGibberishScore(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 2);

  if (words.length === 0) return 0;

  let suspiciousWordCount = 0;

  for (const word of words) {
    const vowels = (word.match(/[aeiou]/g) || []).length;
    const consonants = (word.match(/[bcdfghjklmnpqrstvwxyz]/g) || []).length;
    const total = vowels + consonants;

    if (total === 0) continue;

    const vowelRatio = vowels / total;

    // Normal English: ~40% vowels
    // Gibberish: often <20% or >70%
    if (vowelRatio < 0.15 || vowelRatio > 0.75) {
      suspiciousWordCount++;
    }

    // Check for excessive consonant clusters
    if (/[bcdfghjklmnpqrstvwxyz]{4,}/.test(word)) {
      suspiciousWordCount++;
    }
  }

  return suspiciousWordCount / words.length;
}

/**
 * Simple hash function for text deduplication
 */
function hashText(text: string): string {
  const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

/**
 * Check for duplicate or near-duplicate submissions
 */
function checkForDuplicates(
  userId: string,
  textHash: string,
  timestamp: Date
): { isDuplicate: boolean; timingScore: number } {
  // Clean old submissions (>1 hour)
  const oneHourAgo = new Date(timestamp.getTime() - 60 * 60 * 1000);
  while (recentSubmissions.length > 0 && recentSubmissions[0].timestamp < oneHourAgo) {
    recentSubmissions.shift();
  }

  // Check for exact duplicates from same user
  const userSubmissions = recentSubmissions.filter(s => s.userId === userId);
  const duplicateCount = userSubmissions.filter(s => s.textHash === textHash).length;

  // Check submission timing pattern (bot detection)
  let timingScore = 0;
  if (userSubmissions.length >= 3) {
    const intervals: number[] = [];
    for (let i = 1; i < userSubmissions.length; i++) {
      const interval =
        userSubmissions[i].timestamp.getTime() - userSubmissions[i - 1].timestamp.getTime();
      intervals.push(interval);
    }

    // Check if intervals are suspiciously uniform (bot-like)
    if (intervals.length >= 2) {
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance =
        intervals.reduce((sum, val) => sum + (val - avgInterval) ** 2, 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // Low variance in timing = suspicious (coefficient of variation < 0.1)
      if (avgInterval > 0 && stdDev / avgInterval < 0.1) {
        timingScore = 0.8;
      }
    }

    // Check for burst submissions (many in short time)
    const last5MinSubmissions = userSubmissions.filter(
      s => s.timestamp.getTime() > timestamp.getTime() - 5 * 60 * 1000
    ).length;

    if (last5MinSubmissions > 10) {
      timingScore = Math.max(timingScore, 0.9);
    }
  }

  // Record this submission
  recentSubmissions.push({ userId, textHash, timestamp });
  if (recentSubmissions.length > MAX_RECENT_SUBMISSIONS) {
    recentSubmissions.shift();
  }

  return {
    isDuplicate: duplicateCount > 0,
    timingScore,
  };
}

/**
 * Detect anomalies in feedback submission
 */
export function detectAnomalies(
  submission: FeedbackSubmission,
  config: Partial<AnomalyDetectorConfig> = {}
): AnomalySignal {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const anomalies: AnomalyType[] = [];
  const scores: number[] = [];

  // 1. Text length analysis
  const textLength = submission.text.length;
  const lengthZScore = calculateLengthZScore(textLength);

  if (textLength < cfg.minTextLength) {
    anomalies.push(AnomalyType.TEXT_TOO_SHORT);
    scores.push(0.6);
  } else if (textLength > cfg.maxTextLength) {
    anomalies.push(AnomalyType.TEXT_TOO_LONG);
    scores.push(0.7);
  } else if (lengthZScore > cfg.lengthZScoreThreshold) {
    if (textLength < historicalStats.meanLength) {
      anomalies.push(AnomalyType.TEXT_TOO_SHORT);
    } else {
      anomalies.push(AnomalyType.TEXT_TOO_LONG);
    }
    scores.push(Math.min(lengthZScore / 10, 0.8));
  }

  // 2. Repetition analysis
  const repetitionScore = calculateRepetitionScore(submission.text);
  if (repetitionScore > cfg.repetitionThreshold) {
    anomalies.push(AnomalyType.HIGH_REPETITION);
    scores.push(repetitionScore);
  }

  // 3. Duplicate detection
  const textHash = hashText(submission.text);
  const { isDuplicate, timingScore } = checkForDuplicates(
    submission.userId,
    textHash,
    submission.timestamp
  );

  if (isDuplicate) {
    anomalies.push(AnomalyType.COPY_PASTE_DETECTED);
    scores.push(0.9);
  }

  if (timingScore > 0.5) {
    anomalies.push(AnomalyType.SUSPICIOUS_TIMING);
    scores.push(timingScore);
  }

  if (timingScore > 0.8 && repetitionScore > 0.5) {
    anomalies.push(AnomalyType.BOT_PATTERN);
    scores.push(0.95);
  }

  // 4. Gibberish detection
  const gibberishScore = calculateGibberishScore(submission.text);
  if (gibberishScore > 0.5) {
    anomalies.push(AnomalyType.GIBBERISH_DETECTED);
    scores.push(gibberishScore);
  }

  // 5. Language mismatch
  let languageConfidence = 1.0;
  if (
    submission.declaredLanguage &&
    submission.detectedLanguage &&
    submission.declaredLanguage !== submission.detectedLanguage
  ) {
    anomalies.push(AnomalyType.LANGUAGE_MISMATCH);
    scores.push(0.4);
    languageConfidence = 0.6;
  }

  // Calculate overall anomaly score
  // Use weighted average with higher weight on severe anomalies
  const anomalyScore = scores.length > 0
    ? Math.min(Math.max(...scores) * 0.6 + (scores.reduce((a, b) => a + b, 0) / scores.length) * 0.4, 1.0)
    : 0.0;

  // Update historical stats for legitimate-looking submissions
  if (anomalyScore < 0.5) {
    updateHistoricalStats(textLength);
  }

  return {
    anomalyScore,
    flagForReview: anomalyScore >= cfg.reviewThreshold,
    anomalies,
    metrics: {
      textLength,
      textLengthZScore: lengthZScore,
      repetitionScore,
      timingScore,
      languageConfidence,
      gibberishScore,
    },
  };
}

/**
 * Get current historical statistics (for monitoring)
 */
export function getHistoricalStats(): HistoricalStats {
  return { ...historicalStats };
}

/**
 * Reset historical statistics (for testing)
 */
export function resetHistoricalStats(stats?: Partial<HistoricalStats>): void {
  historicalStats = {
    meanLength: stats?.meanLength ?? 250,
    stdDevLength: stats?.stdDevLength ?? 150,
    sampleCount: stats?.sampleCount ?? 1000,
  };
}

/**
 * Clear recent submissions log (for testing)
 */
export function clearRecentSubmissions(): void {
  recentSubmissions.length = 0;
}

/**
 * Get anomaly detection statistics
 */
export function getAnomalyStats(): {
  recentSubmissionsCount: number;
  historicalStats: HistoricalStats;
  uniqueUsers: number;
} {
  const uniqueUsers = new Set(recentSubmissions.map(s => s.userId)).size;

  return {
    recentSubmissionsCount: recentSubmissions.length,
    historicalStats: { ...historicalStats },
    uniqueUsers,
  };
}
