import { z } from 'zod';

/**
 * Executive Deck & PPTX Export Types
 * For Phase D Boardroom-ready presentation generation
 */

// Deck template types aligned with report templates
export const DeckTemplateSchema = z.enum([
  'quarterly',
  'annual',
  'investor',
  'impact-deep-dive',
]);

export type DeckTemplate = z.infer<typeof DeckTemplateSchema>;

// Slide block types for different content layouts
export const SlideBlockTypeSchema = z.enum([
  'title',
  'content',
  'chart',
  'table',
  'image',
  'two-column',
]);

export type SlideBlockType = z.infer<typeof SlideBlockTypeSchema>;

// Slide block definition
export const SlideBlockSchema = z.object({
  id: z.string().uuid(),
  type: SlideBlockTypeSchema,
  title: z.string().optional(),
  content: z.string().optional(), // Markdown or plain text
  citationIds: z.array(z.string().uuid()).default([]),
  chartConfig: z.any().optional(), // Chart.js or other chart config
  tableData: z
    .object({
      headers: z.array(z.string()),
      rows: z.array(z.array(z.string())),
    })
    .optional(),
  imageUrl: z.string().url().optional(),
  leftColumn: z.string().optional(), // For two-column layout
  rightColumn: z.string().optional(), // For two-column layout
  order: z.number().int().min(0),
  speakerNotes: z.string().optional(),
  metadata: z.record(z.any()).optional(), // Additional slide-specific metadata
});

export type SlideBlock = z.infer<typeof SlideBlockSchema>;

// Theme configuration for deck branding
export const DeckThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  accentColor: z.string().regex(/^#[0-9A-F]{6}$/i, 'Must be a valid hex color'),
  logoUrl: z.string().url().optional(),
  fontFamily: z.string().optional(), // e.g., "Inter", "Arial"
  backgroundImageUrl: z.string().url().optional(),
});

export type DeckTheme = z.infer<typeof DeckThemeSchema>;

// Deck metadata tracking generation details
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
});

export type DeckMetadata = z.infer<typeof DeckMetadataSchema>;

// Complete deck definition
export const DeckDefinitionSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  template: DeckTemplateSchema,
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  locale: z.enum(['en', 'es', 'fr', 'uk', 'no']).default('en'),
  theme: DeckThemeSchema,
  slides: z.array(SlideBlockSchema).min(1, 'Deck must have at least one slide'),
  metadata: DeckMetadataSchema,
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
});

export type DeckDefinition = z.infer<typeof DeckDefinitionSchema>;

// Deck generation request
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

// Deck generation response
export const GenerateDeckResponseSchema = z.object({
  deckId: z.string().uuid(),
  deck: DeckDefinitionSchema,
  generatedAt: z.string().datetime(),
  estimatedExportTime: z.number().optional(), // Seconds
});

export type GenerateDeckResponse = z.infer<typeof GenerateDeckResponseSchema>;

// Export request for PPTX/PDF
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

// Export response
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
