import { z } from 'zod';

export const quarterSchema = z
  .string()
  .regex(/^\d{4}-Q[1-4]$/, 'Quarter must be in format YYYY-QN (e.g., 2025-Q1)');

export const companyIdSchema = z.string().uuid('Company ID must be a valid UUID');

export const atAGlanceQuerySchema = z.object({
  period: quarterSchema.optional(),
});

export const outcomesQuerySchema = z.object({
  dimensions: z
    .string()
    .optional()
    .transform((val) => val?.split(',').map((d) => d.trim()))
    .refine(
      (dims) => !dims || dims.every((d) => ['integration', 'language', 'job_readiness'].includes(d)),
      'Dimensions must be integration, language, or job_readiness'
    ),
});

export const q2qFeedQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((n) => n > 0 && n <= 100, 'Limit must be between 1 and 100'),
});

export const exportQuerySchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('json'),
  period: quarterSchema.optional(),
});
