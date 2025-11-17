import { z } from 'zod';

/**
 * Deck & Executive Presentation Types
 * For Boardroom Mode v2 deck generator and PPTX export
 */

/**
 * Available deck templates
 */
export const DeckTemplateSchema = z.enum([
  'quarterly',
  'annual',
  'investor',
  'impact',
]);

export type DeckTemplate = z.infer<typeof DeckTemplateSchema>;

/**
 * Available slide block types
 */
export const SlideBlockTypeSchema = z.enum([
  'title',
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
  id: z.string(),
  type: SlideBlockTypeSchema,
  title: z.string().optional(),
  content: z.string().optional(),
  bullets: z.array(z.string()).optional(),
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
  order: z.number(),
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
 * Theme configuration
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
 * Deck definition - the complete presentation
 */
export const DeckDefinitionSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  subtitle: z.string().optional(),
  template: DeckTemplateSchema,
  companyId: z.string().uuid(),
  period: z.object({
    start: z.string().date(), // ISO 8601 date (YYYY-MM-DD)
    end: z.string().date(),
  }),
  locale: z.enum(['en', 'es', 'fr', 'no', 'uk', 'he', 'ar']).default('en'),
  theme: ThemeConfigSchema.optional(),
  slides: z.array(SlideDefinitionSchema),
  metadata: z
    .object({
      author: z.string(),
      createdAt: z.string().datetime(),
      updatedAt: z.string().datetime(),
      version: z.string(),
      approvalStatus: z.enum(['draft', 'pending', 'approved', 'rejected']).default('draft'),
    })
    .optional(),
});

export type DeckDefinition = z.infer<typeof DeckDefinitionSchema>;

/**
 * Deck export request
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
 * Deck export response
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
