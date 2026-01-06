/**
 * Deck Composer Types
 *
 * Type definitions for boardroom deck composition.
 *
 * @module deck/types
 */

/**
 * Available deck templates
 */
export type DeckTemplate = 'quarterly' | 'annual' | 'investor' | 'impact';

/**
 * Available locale codes
 */
export type DeckLocale = 'en' | 'fr' | 'es' | 'uk' | 'no';

/**
 * Available dashboard tiles/widgets
 */
export type DeckTile =
  | 'sroi-metric'
  | 'vis-trend'
  | 'evidence-density'
  | 'outcome-distribution'
  | 'sdg-alignment'
  | 'volunteer-hours'
  | 'integration-score'
  | 'top-achievements';

/**
 * Tile metadata for display
 */
export interface TileMetadata {
  id: DeckTile;
  name: string;
  description: string;
  icon: string;
  category: 'metrics' | 'charts' | 'achievements';
  estimatedSlides: number;
}

/**
 * Template metadata
 */
export interface TemplateMetadata {
  id: DeckTemplate;
  name: string;
  description: string;
  icon: string;
  defaultTiles: DeckTile[];
  minSlides: number;
  maxSlides: number;
  audience: string;
}

/**
 * Deck configuration for export
 */
export interface DeckConfig {
  template: DeckTemplate;
  tiles: DeckTile[];
  locale: DeckLocale;
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  includeWatermark?: boolean;
  watermarkText?: string;
  theme?: 'default' | 'corporate' | 'minimalist';
}

/**
 * Deck preview data
 */
export interface DeckPreview {
  totalSlides: number;
  citationCount: number;
  estimatedPageCount: number;
  slides: SlidePreview[];
}

/**
 * Individual slide preview
 */
export interface SlidePreview {
  slideNumber: number;
  title: string;
  type: 'title' | 'content' | 'chart' | 'data-table' | 'two-column' | 'image';
  citationCount: number;
  thumbnailUrl?: string;
}
