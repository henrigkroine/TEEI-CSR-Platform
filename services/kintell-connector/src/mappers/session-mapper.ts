import { z } from 'zod';
import type { KintellSessionCompleted } from '@teei/event-contracts';
import { getEventBus } from '@teei/shared-utils';

// CSV row schema
const KintellCSVRowSchema = z.object({
  session_id: z.string(),
  session_type: z.string(), // "Language Connect" or "Mentorship"
  participant_email: z.string().email(),
  volunteer_email: z.string().email(),
  date: z.string(), // ISO date string
  duration_min: z.coerce.number().int().positive(),
  rating: z.coerce.number().min(1).max(5).optional(), // 1-5 scale
  feedback_text: z.string().optional(),
  language_level: z.string().optional(), // CEFR level
});

export type KintellCSVRow = z.infer<typeof KintellCSVRowSchema>;

/**
 * Normalize session type from Kintell format to internal format
 */
function normalizeSessionType(type: string): 'language' | 'mentorship' {
  const normalized = type.toLowerCase().trim();
  if (normalized.includes('language')) return 'language';
  if (normalized.includes('mentor')) return 'mentorship';
  throw new Error(`Unknown session type: ${type}`);
}

/**
 * Normalize rating from 1-5 scale to 0-1 scale
 */
function normalizeRating(rating?: number): number | undefined {
  if (rating === undefined) return undefined;
  return (rating - 1) / 4; // 1→0, 5→1
}

/**
 * Map CSV row to internal session object
 */
export function mapCSVRowToSession(row: Record<string, string>): {
  externalSessionId: string;
  sessionType: 'language' | 'mentorship';
  participantEmail: string;
  volunteerEmail: string;
  scheduledAt: Date;
  completedAt: Date;
  durationMinutes: number;
  rating?: number;
  feedbackText?: string;
  languageLevel?: string;
} {
  const parsed = KintellCSVRowSchema.parse(row);

  const sessionType = normalizeSessionType(parsed.session_type);
  const rating = parsed.rating ? normalizeRating(parsed.rating) : undefined;

  return {
    externalSessionId: parsed.session_id,
    sessionType,
    participantEmail: parsed.participant_email.trim().toLowerCase(),
    volunteerEmail: parsed.volunteer_email.trim().toLowerCase(),
    scheduledAt: new Date(parsed.date),
    completedAt: new Date(parsed.date), // Assume completed at scheduled time for now
    durationMinutes: parsed.duration_min,
    rating,
    feedbackText: parsed.feedback_text?.trim(),
    languageLevel: parsed.language_level?.toUpperCase(),
  };
}
