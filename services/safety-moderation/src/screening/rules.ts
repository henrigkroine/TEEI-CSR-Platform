import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('safety-screening');

/**
 * Confidence thresholds
 */
export const ConfidenceThreshold = {
  LOW: 0.3,
  MEDIUM: 0.6,
  HIGH: 0.9,
} as const;

/**
 * Profanity word list (basic set - expand as needed)
 */
const PROFANITY_WORDS = [
  // Common profanity
  'damn', 'hell', 'crap', 'ass', 'bastard', 'bitch', 'shit', 'fuck',
  'piss', 'dick', 'cock', 'pussy', 'slut', 'whore',
  // Add more as needed
];

/**
 * PII patterns
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
};

/**
 * Screening result interface
 */
export interface ScreeningResult {
  safe: boolean;
  flags: ScreeningFlag[];
  requiresReview: boolean;
  overallConfidence: number;
}

export interface ScreeningFlag {
  type: 'profanity' | 'spam' | 'pii' | 'toxic';
  reason: string;
  confidence: number;
  details?: any;
}

/**
 * Check for profanity in text
 */
export function checkProfanity(text: string): ScreeningFlag | null {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  const foundProfanity: string[] = [];

  for (const word of words) {
    // Remove punctuation
    const cleanWord = word.replace(/[^\w]/g, '');
    if (PROFANITY_WORDS.includes(cleanWord)) {
      foundProfanity.push(cleanWord);
    }
  }

  if (foundProfanity.length > 0) {
    const confidence = Math.min(0.9, 0.5 + (foundProfanity.length * 0.1));
    return {
      type: 'profanity',
      reason: 'Profanity detected in text',
      confidence,
      details: {
        count: foundProfanity.length,
        words: foundProfanity.slice(0, 5), // Only include first 5 to avoid storing too much
      },
    };
  }

  return null;
}

/**
 * Check for spam patterns
 */
export function checkSpam(text: string): ScreeningFlag | null {
  const flags: any = {};
  let spamScore = 0;

  // Check for excessive caps
  const capsCount = (text.match(/[A-Z]/g) || []).length;
  const totalLetters = (text.match(/[a-zA-Z]/g) || []).length;
  if (totalLetters > 0) {
    const capsRatio = capsCount / totalLetters;
    if (capsRatio > 0.7 && totalLetters > 10) {
      flags.excessiveCaps = true;
      spamScore += 0.3;
    }
  }

  // Check for repeated patterns
  const repeatedPattern = /(.{3,})\1{3,}/;
  if (repeatedPattern.test(text)) {
    flags.repeatedPattern = true;
    spamScore += 0.3;
  }

  // Check for excessive punctuation
  const punctCount = (text.match(/[!?]{3,}/g) || []).length;
  if (punctCount > 0) {
    flags.excessivePunctuation = true;
    spamScore += 0.2;
  }

  // Check for excessive emojis
  const emojiPattern = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojiCount = (text.match(emojiPattern) || []).length;
  if (emojiCount > 10) {
    flags.excessiveEmojis = true;
    spamScore += 0.2;
  }

  if (spamScore >= 0.3) {
    return {
      type: 'spam',
      reason: 'Spam patterns detected',
      confidence: Math.min(0.9, spamScore),
      details: flags,
    };
  }

  return null;
}

/**
 * Check for PII in text (warn, don't block)
 */
export function checkPII(text: string): ScreeningFlag | null {
  const piiFound: any = {};
  let piiCount = 0;

  // Check for email
  const emails = text.match(PII_PATTERNS.email);
  if (emails && emails.length > 0) {
    piiFound.emails = emails.length;
    piiCount += emails.length;
  }

  // Check for phone numbers
  const phones = text.match(PII_PATTERNS.phone);
  if (phones && phones.length > 0) {
    piiFound.phones = phones.length;
    piiCount += phones.length;
  }

  // Check for SSN
  const ssns = text.match(PII_PATTERNS.ssn);
  if (ssns && ssns.length > 0) {
    piiFound.ssns = ssns.length;
    piiCount += ssns.length * 2; // Weight SSN higher
  }

  // Check for credit cards
  const creditCards = text.match(PII_PATTERNS.creditCard);
  if (creditCards && creditCards.length > 0) {
    piiFound.creditCards = creditCards.length;
    piiCount += creditCards.length * 2; // Weight credit cards higher
  }

  if (piiCount > 0) {
    return {
      type: 'pii',
      reason: 'Personally Identifiable Information detected',
      confidence: Math.min(0.9, 0.4 + (piiCount * 0.15)),
      details: piiFound,
    };
  }

  return null;
}

/**
 * Simple toxic content detection (basic keyword-based)
 * In production, this would use a more sophisticated ML model
 */
export function checkToxic(text: string): ScreeningFlag | null {
  const lowerText = text.toLowerCase();

  const toxicKeywords = [
    'hate', 'kill', 'die', 'death', 'threat', 'violence',
    'suicide', 'harm yourself', 'kys', 'racist', 'sexist',
  ];

  const foundToxic: string[] = [];

  for (const keyword of toxicKeywords) {
    if (lowerText.includes(keyword)) {
      foundToxic.push(keyword);
    }
  }

  if (foundToxic.length > 0) {
    const confidence = Math.min(0.8, 0.5 + (foundToxic.length * 0.1));
    return {
      type: 'toxic',
      reason: 'Potentially toxic content detected',
      confidence,
      details: {
        count: foundToxic.length,
        keywords: foundToxic.slice(0, 5),
      },
    };
  }

  return null;
}

/**
 * Screen text for safety issues
 */
export function screenText(text: string): ScreeningResult {
  const flags: ScreeningFlag[] = [];

  // Run all checks
  const profanityFlag = checkProfanity(text);
  if (profanityFlag) flags.push(profanityFlag);

  const spamFlag = checkSpam(text);
  if (spamFlag) flags.push(spamFlag);

  const piiFlag = checkPII(text);
  if (piiFlag) flags.push(piiFlag);

  const toxicFlag = checkToxic(text);
  if (toxicFlag) flags.push(toxicFlag);

  // Calculate overall confidence
  const overallConfidence = flags.length > 0
    ? Math.max(...flags.map(f => f.confidence))
    : 0;

  // Determine if requires review
  const requiresReview = flags.some(f =>
    (f.type === 'toxic' && f.confidence >= ConfidenceThreshold.MEDIUM) ||
    (f.type === 'profanity' && f.confidence >= ConfidenceThreshold.HIGH) ||
    (f.type === 'pii' && f.confidence >= ConfidenceThreshold.HIGH)
  );

  // Determine if safe (PII is warning only, not blocking)
  const safe = !flags.some(f =>
    f.type !== 'pii' && f.confidence >= ConfidenceThreshold.MEDIUM
  );

  logger.info(`Screened text: ${flags.length} flags found, safe: ${safe}, requiresReview: ${requiresReview}`);

  return {
    safe,
    flags,
    requiresReview,
    overallConfidence,
  };
}
