/**
 * Prompt Injection Shield
 *
 * Detects and blocks common prompt injection attacks using regex patterns
 * and heuristic analysis. Designed to protect AI inference endpoints from
 * malicious input attempting to override system prompts or extract sensitive data.
 */

export interface PromptShieldResult {
  /** Whether the input is safe (below threshold) */
  isSafe: boolean;
  /** Risk score from 0.0 (safe) to 1.0 (definite attack) */
  riskScore: number;
  /** Patterns that were matched */
  matchedPatterns: string[];
  /** Detailed analysis of the input */
  analysis: {
    suspiciousTokens: number;
    encodingAttempts: number;
    instructionOverrides: number;
    specialCharDensity: number;
  };
}

export interface PromptShieldConfig {
  /** Block threshold (0.0-1.0), default 0.8 */
  blockThreshold: number;
  /** Enable logging of blocked requests */
  logBlocked: boolean;
}

/** Default configuration */
const DEFAULT_CONFIG: PromptShieldConfig = {
  blockThreshold: 0.8,
  logBlocked: true,
};

/**
 * Known prompt injection patterns
 * Each pattern has a weight (0.0-1.0) indicating severity
 */
const INJECTION_PATTERNS: Array<{ pattern: RegExp; weight: number; name: string }> = [
  // Direct instruction override attempts
  {
    pattern: /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?|commands?)/i,
    weight: 1.0,
    name: 'ignore_previous_instructions',
  },
  {
    pattern: /disregard\s+(all\s+)?(previous|prior|above|earlier|the|your|everything)/i,
    weight: 1.0,
    name: 'disregard_instructions',
  },
  {
    pattern: /forget\s+(all\s+)?(previous|prior|above|earlier|your|everything|the\s+)?(instructions?|prompts?|rules?|commands?|constraints?)/i,
    weight: 0.9,
    name: 'forget_instructions',
  },

  // System role manipulation
  {
    pattern: /(you\s+are\s+now|now\s+you\s+are|you\s+have\s+become)\s+(a\s+)?(developer|admin|root|system|sudo)/i,
    weight: 0.95,
    name: 'role_escalation',
  },
  {
    pattern: /developer\s+mode|debug\s+mode|admin\s+mode|sudo\s+mode/i,
    weight: 0.85,
    name: 'mode_override',
  },
  {
    pattern: /system\s*:\s*(you|ignore|disregard|override)/i,
    weight: 0.9,
    name: 'system_prefix_abuse',
  },

  // Prompt extraction attempts
  {
    pattern: /(show|reveal|display|print|output)\s+(me\s+)?(your\s+)?((original|initial|system)\s+)?(prompt|instructions?|rules?)/i,
    weight: 0.85,
    name: 'prompt_extraction',
  },
  {
    pattern: /what\s+(are\s+|is\s+)?(your\s+)?(original|initial|system)\s+(prompt|instructions?)/i,
    weight: 0.8,
    name: 'prompt_query',
  },

  // Jailbreak attempts
  {
    pattern: /\[SYSTEM\]|\[\/SYSTEM\]|\[INST\]|\[\/INST\]/i,
    weight: 0.9,
    name: 'bracket_injection',
  },
  {
    pattern: /<\|im_start\|>|<\|im_end\|>|<\|system\|>|<\|user\|>|<\|assistant\|>/i,
    weight: 0.95,
    name: 'special_token_injection',
  },

  // Encoding/obfuscation attempts
  {
    pattern: /\\x[0-9a-f]{2}|\\u[0-9a-f]{4}|\\U[0-9a-f]{8}/i,
    weight: 0.6,
    name: 'hex_unicode_encoding',
  },
  {
    pattern: /%[0-9a-f]{2}/i,
    weight: 0.5,
    name: 'url_encoding',
  },

  // Role reversal
  {
    pattern: /i\s+am\s+(the\s+)?(assistant|AI|model|system)/i,
    weight: 0.7,
    name: 'role_reversal',
  },
  {
    pattern: /you\s+are\s+(the\s+)?(user|human|customer)/i,
    weight: 0.7,
    name: 'role_swap',
  },

  // Boundary breaking
  {
    pattern: /end\s+of\s+(system\s+)?(prompt|instructions?)|new\s+(system\s+)?(prompt|instructions?)/i,
    weight: 0.85,
    name: 'boundary_break',
  },
  {
    pattern: /---+\s*end|===+\s*end|\*\*\*+\s*end/i,
    weight: 0.6,
    name: 'delimiter_injection',
  },
];

/**
 * Homoglyph detection - Unicode characters that look like ASCII
 * These are often used to bypass filters
 */
const HOMOGLYPH_PATTERNS = [
  /[\u0430-\u044f]/g, // Cyrillic lowercase (look like Latin)
  /[\u0410-\u042f]/g, // Cyrillic uppercase
  /[\u0391-\u03a9]/g, // Greek uppercase
  /[\u03b1-\u03c9]/g, // Greek lowercase
];

/**
 * Calculate special character density
 * High density of special chars may indicate injection attempt
 */
function calculateSpecialCharDensity(text: string): number {
  const specialChars = text.match(/[^\w\s.,!?;:'"()-]/g) || [];
  return specialChars.length / Math.max(text.length, 1);
}

/**
 * Detect homoglyph usage
 */
function detectHomoglyphs(text: string): number {
  let count = 0;
  for (const pattern of HOMOGLYPH_PATTERNS) {
    const matches = text.match(pattern);
    if (matches) {
      count += matches.length;
    }
  }
  return count;
}

/**
 * Analyze text for prompt injection patterns
 */
export function analyzePromptInjection(
  text: string,
  config: Partial<PromptShieldConfig> = {}
): PromptShieldResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const matchedPatterns: string[] = [];
  let totalWeight = 0.0;
  let maxWeight = 0.0;

  // Check against known patterns
  for (const { pattern, weight, name } of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      matchedPatterns.push(name);
      totalWeight += weight;
      maxWeight = Math.max(maxWeight, weight);
    }
  }

  // Analyze text characteristics
  const specialCharDensity = calculateSpecialCharDensity(text);
  const homoglyphCount = detectHomoglyphs(text);
  const encodingAttempts = (text.match(/\\[xu][0-9a-f]/gi) || []).length;

  // Heuristic scoring
  let heuristicScore = 0.0;

  // High special character density is suspicious (>15%)
  if (specialCharDensity > 0.15) {
    heuristicScore += 0.3;
  }

  // Presence of homoglyphs
  if (homoglyphCount > 0) {
    heuristicScore += Math.min(homoglyphCount * 0.1, 0.4);
  }

  // Encoding attempts
  if (encodingAttempts > 3) {
    heuristicScore += 0.4;
  }

  // Calculate final risk score
  // Use the max of: highest single pattern, average patterns, or heuristics
  const avgPatternScore = matchedPatterns.length > 0 ? totalWeight / matchedPatterns.length : 0;
  const riskScore = Math.min(
    Math.max(maxWeight, avgPatternScore * 0.8 + heuristicScore * 0.2, heuristicScore),
    1.0
  );

  const result: PromptShieldResult = {
    isSafe: riskScore < cfg.blockThreshold,
    riskScore,
    matchedPatterns,
    analysis: {
      suspiciousTokens: matchedPatterns.length,
      encodingAttempts,
      instructionOverrides: matchedPatterns.filter(p =>
        p.includes('ignore') || p.includes('disregard') || p.includes('forget')
      ).length,
      specialCharDensity,
    },
  };

  return result;
}

/**
 * Blocked request log entry
 */
export interface BlockedRequest {
  timestamp: Date;
  text: string;
  riskScore: number;
  matchedPatterns: string[];
  userId?: string;
  contextId?: string;
}

/** In-memory store of blocked requests (last 1000) */
const blockedRequestsLog: BlockedRequest[] = [];
const MAX_LOG_SIZE = 1000;

/**
 * Log a blocked request
 */
export function logBlockedRequest(
  text: string,
  result: PromptShieldResult,
  metadata?: { userId?: string; contextId?: string }
): void {
  const entry: BlockedRequest = {
    timestamp: new Date(),
    text: text.substring(0, 500), // Truncate for storage
    riskScore: result.riskScore,
    matchedPatterns: result.matchedPatterns,
    ...metadata,
  };

  blockedRequestsLog.unshift(entry);

  // Keep only last MAX_LOG_SIZE entries
  if (blockedRequestsLog.length > MAX_LOG_SIZE) {
    blockedRequestsLog.pop();
  }
}

/**
 * Get recent blocked requests
 */
export function getBlockedRequests(limit: number = 100): BlockedRequest[] {
  return blockedRequestsLog.slice(0, limit);
}

/**
 * Get statistics about blocked requests
 */
export function getBlockedRequestStats(): {
  total: number;
  last24h: number;
  topPatterns: Array<{ pattern: string; count: number }>;
  averageRiskScore: number;
} {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const last24h = blockedRequestsLog.filter(r => r.timestamp >= dayAgo).length;

  // Count pattern occurrences
  const patternCounts = new Map<string, number>();
  let totalRiskScore = 0;

  for (const request of blockedRequestsLog) {
    totalRiskScore += request.riskScore;
    for (const pattern of request.matchedPatterns) {
      patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
    }
  }

  // Sort patterns by count
  const topPatterns = Array.from(patternCounts.entries())
    .map(([pattern, count]) => ({ pattern, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: blockedRequestsLog.length,
    last24h,
    topPatterns,
    averageRiskScore: blockedRequestsLog.length > 0
      ? totalRiskScore / blockedRequestsLog.length
      : 0,
  };
}

/**
 * Clear blocked requests log (for testing)
 */
export function clearBlockedRequestsLog(): void {
  blockedRequestsLog.length = 0;
}
