/**
 * Deck Composer Module
 *
 * Export all deck composition components and types.
 *
 * @module deck
 */

export { DeckComposer } from './DeckComposer';
export { DeckTemplateSelector } from './DeckTemplateSelector';
export { DeckTilePicker } from './DeckTilePicker';
export { DeckPreview } from './DeckPreview';

export type {
  DeckTemplate,
  DeckLocale,
  DeckTile,
  DeckConfig,
  DeckPreview as DeckPreviewData,
  TileMetadata,
  TemplateMetadata,
} from './types';

export {
  AVAILABLE_TILES,
  AVAILABLE_TEMPLATES,
  MAX_TILES_PER_DECK,
  LOCALE_NAMES,
  THEME_NAMES,
} from './constants';
