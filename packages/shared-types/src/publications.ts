import { z } from 'zod';

/**
 * Public Impact Pages & Embeds Types
 * For Worker 19: publish selected tiles/sections to public microsites
 */

// Enums
export const PublicationStatusEnum = z.enum(['DRAFT', 'LIVE']);
export const PublicationVisibilityEnum = z.enum(['PUBLIC', 'TOKEN']);
export const PublicationBlockKindEnum = z.enum(['TILE', 'TEXT', 'CHART', 'EVIDENCE']);

// Block payloads (varies by kind)
export const TileBlockPayloadSchema = z.object({
  tileId: z.string(), // Reference to existing tile (e.g., SROI, VIS, Evidence Explorer)
  title: z.string().max(100).optional(), // Override tile title
  config: z.record(z.unknown()).optional(), // Tile-specific config (filters, date range, etc.)
});

export const TextBlockPayloadSchema = z.object({
  content: z.string().max(10000), // Rich text (sanitized HTML)
  format: z.enum(['markdown', 'html']).default('markdown'),
});

export const ChartBlockPayloadSchema = z.object({
  chartType: z.enum(['line', 'bar', 'pie', 'area', 'scatter']),
  dataSource: z.string(), // Data endpoint or static JSON reference
  title: z.string().max(100),
  config: z.record(z.unknown()).optional(), // Recharts config
});

export const EvidenceBlockPayloadSchema = z.object({
  evidenceIds: z.array(z.string().uuid()).max(10), // Max 10 evidence snippets per block
  title: z.string().max(100).optional(),
  layout: z.enum(['grid', 'list', 'carousel']).default('grid'),
});

export const PublicationBlockPayloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('TILE'), data: TileBlockPayloadSchema }),
  z.object({ kind: z.literal('TEXT'), data: TextBlockPayloadSchema }),
  z.object({ kind: z.literal('CHART'), data: ChartBlockPayloadSchema }),
  z.object({ kind: z.literal('EVIDENCE'), data: EvidenceBlockPayloadSchema }),
]);

// Publication block
export const PublicationBlockSchema = z.object({
  id: z.string().uuid(),
  publicationId: z.string().uuid(),
  kind: PublicationBlockKindEnum,
  order: z.number().int().min(0),
  payloadJson: z.record(z.unknown()), // Stored as JSONB, validated client-side
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PublicationBlock = z.infer<typeof PublicationBlockSchema>;

// Publication
export const PublicationSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/), // URL-safe slug
  title: z.string().min(1).max(255),
  description: z.string().max(160).optional(), // SEO meta description
  metaTitle: z.string().max(60).optional(), // SEO title override
  ogImage: z.string().url().optional(), // Open Graph image URL
  status: PublicationStatusEnum,
  visibility: PublicationVisibilityEnum,
  accessToken: z.string().length(64).optional(), // SHA-256 hash
  tokenExpiresAt: z.string().datetime().optional(),
  publishedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Publication = z.infer<typeof PublicationSchema>;

// Publication with blocks (joined)
export const PublicationWithBlocksSchema = PublicationSchema.extend({
  blocks: z.array(PublicationBlockSchema),
});

export type PublicationWithBlocks = z.infer<typeof PublicationWithBlocksSchema>;

// Create publication request
export const CreatePublicationRequestSchema = z.object({
  tenantId: z.string().uuid(),
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(255),
  description: z.string().max(160).optional(),
  metaTitle: z.string().max(60).optional(),
  ogImage: z.string().url().optional(),
  visibility: PublicationVisibilityEnum.default('PUBLIC'),
  blocks: z.array(
    z.object({
      kind: PublicationBlockKindEnum,
      order: z.number().int().min(0),
      payloadJson: z.record(z.unknown()),
    })
  ).max(50), // Max 50 blocks per publication
});

export type CreatePublicationRequest = z.infer<typeof CreatePublicationRequestSchema>;

// Update publication request
export const UpdatePublicationRequestSchema = z.object({
  slug: z.string().min(1).max(255).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(160).optional(),
  metaTitle: z.string().max(60).optional(),
  ogImage: z.string().url().optional(),
  visibility: PublicationVisibilityEnum.optional(),
  blocks: z.array(
    z.object({
      id: z.string().uuid().optional(), // If present, update existing block
      kind: PublicationBlockKindEnum,
      order: z.number().int().min(0),
      payloadJson: z.record(z.unknown()),
    })
  ).max(50).optional(),
});

export type UpdatePublicationRequest = z.infer<typeof UpdatePublicationRequestSchema>;

// Publish request (DRAFT → LIVE)
export const PublishPublicationRequestSchema = z.object({
  publishAt: z.string().datetime().optional(), // Scheduled publish (future feature)
});

export type PublishPublicationRequest = z.infer<typeof PublishPublicationRequestSchema>;

// Token rotation request
export const RotateTokenRequestSchema = z.object({
  expiresInDays: z.number().int().min(1).max(90).default(30), // Default 30d TTL
});

export type RotateTokenRequest = z.infer<typeof RotateTokenRequestSchema>;

// Token response
export const TokenResponseSchema = z.object({
  token: z.string(), // Plain-text token (returned once, then hashed)
  expiresAt: z.string().datetime(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

// Analytics stats
export const PublicationStatsSchema = z.object({
  publicationId: z.string().uuid(),
  totalViews: z.number().int(),
  uniqueVisitors: z.number().int(), // Count distinct anonymized IPs (last 30d)
  topReferrers: z.array(
    z.object({
      referrer: z.string(),
      count: z.number().int(),
    })
  ).max(10), // Top 10 referrers
  viewsLast7Days: z.number().int(),
  viewsLast30Days: z.number().int(),
});

export type PublicationStats = z.infer<typeof PublicationStatsSchema>;

// Public read request (with optional token)
export const PublicReadRequestSchema = z.object({
  slug: z.string(),
  token: z.string().optional(), // For TOKEN visibility
});

export type PublicReadRequest = z.infer<typeof PublicReadRequestSchema>;

// Embed configuration
export const EmbedConfigSchema = z.object({
  slug: z.string(),
  tenantId: z.string().uuid(),
  token: z.string().optional(),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  responsive: z.boolean().default(true),
  showHeader: z.boolean().default(true),
  showFooter: z.boolean().default(false),
});

export type EmbedConfig = z.infer<typeof EmbedConfigSchema>;
