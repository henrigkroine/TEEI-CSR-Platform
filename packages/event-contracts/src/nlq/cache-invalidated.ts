import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const NLQCacheInvalidatedSchema = BaseEventSchema.extend({
  type: z.literal('nlq.cache.invalidated'),
  data: z.object({
    companyId: z.string().uuid().optional(),
    templateId: z.string().optional(),
    pattern: z.string().optional(),
    keysInvalidated: z.number().int().nonnegative(),
    reason: z.enum(['manual', 'data_update', 'metrics_updated', 'scheduled']),
    invalidatedAt: z.string().datetime(),
  }),
});

export type NLQCacheInvalidated = z.infer<typeof NLQCacheInvalidatedSchema>;
