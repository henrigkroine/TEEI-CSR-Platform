import { z } from 'zod';

/**
 * Deck & Executive Presentation Types
 * For Boardroom Mode v2 deck generator and PPTX export
 * Phase D Boardroom-ready presentation generation
 */

/**
 * Available deck templates
 */
export const DeckTemplateSchema = z.enum([
  'quarterly',
  'annual',
  'investor',
  'impact',
  'impact-deep-dive',
]);

export type DeckTemplate = z.infer<typeof DeckTemplateSchema>;

/**
 * Available slide block types
 */
export const SlideBlockTypeSchema = z.enum([
  'title',
  'content',
  'metrics-grid',
  'chart',
  'narrative',
  'table',
  'two-column',
  'image',
  'key-achievements',
  'evidence-summary',
]);

export type SlideBlockType = z.infer<typeof SlideBlockTypeSchema>;

/**
 * Citation info for a paragraph/section
 */
export const CitationInfoSchema = z.object({
  paragraphIndex: z.number(),
  citationCount: z.number(),
  citationIds: z.array(z.string()),
  evidenceIds: z.array(z.string().uuid()),
});

export type CitationInfo = z.infer<typeof CitationInfoSchema>;

/**
 * Slide block - a composable section within a slide
 */
export const SlideBlockSchema = z.object({
  id: z.string().uuid(),
  type: SlideBlockTypeSchema,
  title: z.string().optional(),
  content: z.string().optional(), // Markdown or plain text
  bullets: z.array(z.string()).optional(),
  citationIds: z.array(z.string().uuid()).default([]),
  citations: z.array(CitationInfoSchema).optional(),
  chartConfig: z
    .object({
      type: z.enum(['bar', 'line', 'pie', 'doughnut', 'area']),
      labels: z.array(z.string()),
      datasets: z.array(
        z.object({
          label: z.string(),
          data: z.array(z.number()),
          backgroundColor: z.union([z.string(), z.array(z.string())]).optional(),
          borderColor: z.string().optional(),
        })
      ),
    })
    .optional(),
  tableConfig: z
    .object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
      columnWidths: z.array(z.number()).optional(),
    })
    .optional(),
  imageConfig: z
    .object({
      path: z.string(),
      alt: z.string(),
      caption: z.string().optional(),
    })
    .optional(),
  metricsConfig: z
    .object({
      metrics: z.array(
        z.object({
          label: z.string(),
          value: z.union([z.string(), z.number()]),
          change: z.number().optional(),
          changeLabel: z.string().optional(),
        })
      ),
    })
    .optional(),
  explainer: z
    .object({
      title: z.string(),
      content: z.string(),
    })
    .optional(),
  leftColumn: z.string().optional(), // For two-column layout
  rightColumn: z.string().optional(), // For two-column layout
  order: z.number().int().min(0),
  speakerNotes: z.string().optional(),
  metadata: z.record(z.any()).optional(), // Additional slide-specific metadata
});

export type SlideBlock = z.infer<typeof SlideBlockSchema>;

/**
 * Slide definition
 */
export const SlideDefinitionSchema = z.object({
  id: z.string(),
  slideNumber: z.number(),
  template: z.string(), // e.g., 'title-only', 'content', 'chart', 'two-column'
  blocks: z.array(SlideBlockSchema),
  notes: z.string().optional(), // Speaker notes
  evidenceIds: z.array(z.string().uuid()).optional(), // Evidence IDs for lineage
});

export type SlideDefinition = z.infer<typeof SlideDefinitionSchema>;

/**
 * Theme configuration for deck branding (HEAD version)
 */
export const DeckThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  logoUrl: z.string().url().optional(),
  fontFamily: z.string().optional(), // e.g., "Inter", "Arial"
  backgroundImageUrl: z.string().url().optional(),
});

export type DeckTheme = z.infer<typeof DeckThemeSchema>;

/**
 * Theme configuration (incoming version - structured colors)
 */
export const ThemeConfigSchema = z.object({
  name: z.string(),
  colors: z.object({
    primary: z.string(),
    secondary: z.string(),
    accent: z.string(),
    textOnPrimary: z.string(),
    textOnSecondary: z.string(),
    textOnAccent: z.string(),
  }),
  logo: z
    .object({
      url: z.string().url(),
      position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

export type ThemeConfig = z.infer<typeof ThemeConfigSchema>;

/**
 * Deck metadata tracking generation details
 */
export const DeckMetadataSchema = z.object({
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid(),
  updatedAt: z.string().datetime().optional(),
  updatedBy: z.string().uuid().optional(),
  estimatedPages: z.number().int().min(1),
  citationCount: z.number().int().min(0),
  version: z.number().int().min(1).default(1),
  status: z.enum(['draft', 'review', 'approved', 'archived']).default('draft'),
  approvedAt: z.string().datetime().optional(),
  approvedBy: z.string().uuid().optional(),
  exportedAt: z.string().datetime().optional(),
  exportFormat: z.enum(['pptx', 'pdf', 'both']).optional(),
  // Additional metadata fields from incoming
  author: z.string().optional(),
  approvalStatus: z.enum(['draft', 'pending', 'approved', 'rejected']).optional(),
});

export type DeckMetadata = z.infer<typeof DeckMetadataSchema>;

/**
 * Deck definition - the complete presentation (merged)
 */
export const DeckDefinitionSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  template: DeckTemplateSchema,
  // Support both datetime and date-only period formats
  periodStart: z.string().datetime().optional(),
  periodEnd: z.string().datetime().optional(),
  period: z
    .object({
      start: z.string().date(), // ISO 8601 date (YYYY-MM-DD)
      end: z.string().date(),
    })
    .optional(),
  locale: z.enum(['en', 'es', 'fr', 'uk', 'no', 'he', 'ar']).default('en'),
  // Support both theme formats
  theme: z.union([DeckThemeSchema, ThemeConfigSchema]).optional(),
  // Support both slide formats
  slides: z.union([
    z.array(SlideBlockSchema).min(1, 'Deck must have at least one slide'),
    z.array(SlideDefinitionSchema),
  ]),
  metadata: z.union([DeckMetadataSchema, z.object({
    author: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    version: z.string(),
    approvalStatus: z.enum(['draft', 'pending', 'approved', 'rejected']).default('draft'),
  })]).optional(),
  // Fields from HEAD version
  coverSlide: z
    .object({
      title: z.string(),
      subtitle: z.string().optional(),
      date: z.string().optional(),
      author: z.string().optional(),
      logoUrl: z.string().url().optional(),
    })
    .optional(),
  footerText: z.string().optional(), // Standard footer for all slides
  watermark: z
    .object({
      text: z.string(),
      opacity: z.number().min(0).max(1).default(0.3),
      position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right']).default('bottom-right'),
    })
    .optional(),
  // Fields from incoming version
  title: z.string().optional(),
  subtitle: z.string().optional(),
});

export type DeckDefinition = z.infer<typeof DeckDefinitionSchema>;

/**
 * Deck generation request (for creating new decks from data)
 */
export const GenerateDeckRequestSchema = z.object({
  companyId: z.string().uuid(),
  template: DeckTemplateSchema,
  period: z.object({
    start: z.string().date(), // ISO 8601 date (YYYY-MM-DD)
    end: z.string().date(),
  }),
  locale: z.enum(['en', 'es', 'fr', 'uk', 'no']).default('en'),
  theme: DeckThemeSchema.optional(), // If not provided, use company defaults
  options: z
    .object({
      includeCharts: z.boolean().default(true),
      includeEvidence: z.boolean().default(true),
      includeSpeakerNotes: z.boolean().default(false),
      maxSlides: z.number().int().min(5).max(50).default(20),
      tone: z.enum(['formal', 'conversational', 'technical']).default('formal'),
    })
    .optional(),
});

export type GenerateDeckRequest = z.infer<typeof GenerateDeckRequestSchema>;

/**
 * Deck generation response
 */
export const GenerateDeckResponseSchema = z.object({
  deckId: z.string().uuid(),
  deck: DeckDefinitionSchema,
  generatedAt: z.string().datetime(),
  estimatedExportTime: z.number().optional(), // Seconds
});

export type GenerateDeckResponse = z.infer<typeof GenerateDeckResponseSchema>;

/**
 * Deck export request (for converting existing deck to file format)
 * Note: This is the simpler synchronous export schema from HEAD
 */
export const ExportDeckRequestSchema = z.object({
  deckId: z.string().uuid(),
  format: z.enum(['pptx', 'pdf']),
  options: z
    .object({
      includeWatermark: z.boolean().default(true),
      includeEvidence: z.boolean().default(true),
      includeSpeakerNotes: z.boolean().default(false),
      quality: z.enum(['standard', 'high', 'print']).default('standard'),
    })
    .optional(),
});

export type ExportDeckRequest = z.infer<typeof ExportDeckRequestSchema>;

/**
 * Deck export response (synchronous version with immediate download)
 */
export const ExportDeckResponseSchema = z.object({
  deckId: z.string().uuid(),
  format: z.enum(['pptx', 'pdf']),
  downloadUrl: z.string().url(),
  fileSize: z.number().int(), // Bytes
  expiresAt: z.string().datetime(), // Download link expiration
  checksum: z.string(), // SHA-256 for integrity verification
  metadata: z.object({
    exportedAt: z.string().datetime(),
    exportedBy: z.string().uuid(),
    pageCount: z.number().int(),
  }),
});

export type ExportDeckResponse = z.infer<typeof ExportDeckResponseSchema>;

/**
 * Deck export request (async version with progress tracking)
 * Supports both PDF and PPTX in single request
 */
export const DeckExportRequestSchema = z.object({
  deckId: z.string().uuid(),
  format: z.enum(['pptx', 'pdf', 'both']).default('pptx'),
  options: z
    .object({
      includeWatermark: z.boolean().default(false),
      watermarkText: z.string().optional(),
      includeNotes: z.boolean().default(true),
      includeEvidence: z.boolean().default(true),
      compressImages: z.boolean().default(true),
    })
    .optional(),
});

export type DeckExportRequest = z.infer<typeof DeckExportRequestSchema>;

/**
 * Deck export response (async version with job tracking)
 */
export const DeckExportResponseSchema = z.object({
  exportId: z.string().uuid(),
  status: z.enum(['queued', 'generating', 'completed', 'failed']),
  progress: z.number().min(0).max(100),
  message: z.string(),
  downloadUrl: z.string().url().optional(),
  pdfUrl: z.string().url().optional(),
  pptxUrl: z.string().url().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
});

export type DeckExportResponse = z.infer<typeof DeckExportResponseSchema>;

/**
 * Deck template metadata
 */
export const DeckTemplateMetadataSchema = z.object({
  id: DeckTemplateSchema,
  name: z.string(),
  description: z.string(),
  defaultSlides: z.array(z.string()), // Default slide types
  supportedLocales: z.array(z.string()),
  previewImage: z.string().url().optional(),
  estimatedSlides: z.number(),
});

export type DeckTemplateMetadata = z.infer<typeof DeckTemplateMetadataSchema>;

/**
 * Live tile configuration for Boardroom Mode
 */
export const LiveTileConfigSchema = z.object({
  id: z.string(),
  type: z.enum(['metric', 'chart', 'narrative', 'table']),
  title: z.string(),
  dataSource: z.string(), // API endpoint or SSE channel
  refreshInterval: z.number().optional(), // Milliseconds
  position: z.object({
    row: z.number(),
    col: z.number(),
    width: z.number(),
    height: z.number(),
  }),
});

export type LiveTileConfig = z.infer<typeof LiveTileConfigSchema>;

/**
 * Boardroom v2 configuration
 */
export const BoardroomConfigSchema = z.object({
  deckId: z.string().uuid().optional(),
  tiles: z.array(LiveTileConfigSchema),
  layout: z.enum(['grid', 'slides', 'hybrid']).default('grid'),
  autoCycle: z.boolean().default(false),
  cycleInterval: z.number().default(30000), // Milliseconds
  enableSSE: z.boolean().default(true),
});

export type BoardroomConfig = z.infer<typeof BoardroomConfigSchema>;

/**
 * Validation Helpers
 */

/**
 * Validates deck definition data
 * @throws {ZodError} If validation fails
 */
export function validateDeckDefinition(data: unknown): DeckDefinition {
  return DeckDefinitionSchema.parse(data);
}

/**
 * Safely validates deck definition without throwing
 */
export function safeParseDeckDefinition(data: unknown) {
  return DeckDefinitionSchema.safeParse(data);
}

/**
 * Validates if a string is a valid deck template
 */
export function isValidTemplate(template: string): boolean {
  return DeckTemplateSchema.safeParse(template).success;
}

/**
 * Validates if a string is a valid slide block type
 */
export function isValidSlideBlockType(type: string): boolean {
  return SlideBlockTypeSchema.safeParse(type).success;
}

/**
 * Validates slide block data
 * @throws {ZodError} If validation fails
 */
export function validateSlideBlock(data: unknown): SlideBlock {
  return SlideBlockSchema.parse(data);
}

/**
 * Validates deck theme configuration
 * @throws {ZodError} If validation fails
 */
export function validateDeckTheme(data: unknown): DeckTheme {
  return DeckThemeSchema.parse(data);
}

/**
 * Validates generation request
 * @throws {ZodError} If validation fails
 */
export function validateGenerateDeckRequest(data: unknown): GenerateDeckRequest {
  return GenerateDeckRequestSchema.parse(data);
}

/**
 * Validates export request
 * @throws {ZodError} If validation fails
 */
export function validateExportDeckRequest(data: unknown): ExportDeckRequest {
  return ExportDeckRequestSchema.parse(data);
}
