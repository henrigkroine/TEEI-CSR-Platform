/**
 * Deck Composer Constants
 *
 * Configuration data for templates and tiles.
 *
 * @module deck/constants
 */

import type { TemplateMetadata, TileMetadata } from './types';

/**
 * Available tile configurations
 */
export const AVAILABLE_TILES: TileMetadata[] = [
  {
    id: 'sroi-metric',
    name: 'SROI Metric Card',
    description: 'Social Return on Investment key metric and trend',
    icon: '📊',
    category: 'metrics',
    estimatedSlides: 1,
  },
  {
    id: 'vis-trend',
    name: 'VIS Trend Chart',
    description: 'Volunteer Impact Score trend over time',
    icon: '📈',
    category: 'charts',
    estimatedSlides: 1,
  },
  {
    id: 'evidence-density',
    name: 'Evidence Density Gauge',
    description: 'Quality score for evidence and citations',
    icon: '🎯',
    category: 'metrics',
    estimatedSlides: 1,
  },
  {
    id: 'outcome-distribution',
    name: 'Outcome Distribution',
    description: 'Breakdown of outcomes by category',
    icon: '🥧',
    category: 'charts',
    estimatedSlides: 1,
  },
  {
    id: 'sdg-alignment',
    name: 'SDG Alignment',
    description: 'Sustainable Development Goals mapping',
    icon: '🌍',
    category: 'charts',
    estimatedSlides: 1,
  },
  {
    id: 'volunteer-hours',
    name: 'Volunteer Hours',
    description: 'Total volunteer hours and participation',
    icon: '⏱️',
    category: 'metrics',
    estimatedSlides: 1,
  },
  {
    id: 'integration-score',
    name: 'Integration Score',
    description: 'Platform integration health metrics',
    icon: '🔗',
    category: 'metrics',
    estimatedSlides: 1,
  },
  {
    id: 'top-achievements',
    name: 'Top Achievements',
    description: 'Highlight major accomplishments',
    icon: '🏆',
    category: 'achievements',
    estimatedSlides: 1,
  },
];

/**
 * Available template configurations
 */
export const AVAILABLE_TEMPLATES: TemplateMetadata[] = [
  {
    id: 'quarterly',
    name: 'Quarterly Report',
    description: 'Quick overview for quarterly business reviews (8-10 slides)',
    icon: '📅',
    defaultTiles: ['sroi-metric', 'vis-trend', 'evidence-density', 'top-achievements'],
    minSlides: 6,
    maxSlides: 12,
    audience: 'Executives, Board Members',
  },
  {
    id: 'annual',
    name: 'Annual Report',
    description: 'Comprehensive year-end summary with detailed analysis (15-20 slides)',
    icon: '🏆',
    defaultTiles: [
      'sroi-metric',
      'vis-trend',
      'evidence-density',
      'outcome-distribution',
      'sdg-alignment',
      'volunteer-hours',
      'top-achievements',
    ],
    minSlides: 12,
    maxSlides: 25,
    audience: 'Shareholders, Stakeholders',
  },
  {
    id: 'investor',
    name: 'Investor Update',
    description: 'Impact metrics focused on ROI and value creation (6-8 slides)',
    icon: '💼',
    defaultTiles: ['sroi-metric', 'outcome-distribution', 'integration-score'],
    minSlides: 4,
    maxSlides: 10,
    audience: 'Investors, Financial Analysts',
  },
  {
    id: 'impact',
    name: 'Impact Deep Dive',
    description: 'Detailed evidence-based impact narrative (12-15 slides)',
    icon: '🔍',
    defaultTiles: [
      'sroi-metric',
      'vis-trend',
      'evidence-density',
      'outcome-distribution',
      'sdg-alignment',
      'volunteer-hours',
    ],
    minSlides: 10,
    maxSlides: 18,
    audience: 'CSR Teams, Impact Managers',
  },
];

/**
 * Maximum tiles allowed per deck
 */
export const MAX_TILES_PER_DECK = 8;

/**
 * Locale display names
 */
export const LOCALE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  uk: 'українська',
  no: 'Norsk',
};

/**
 * Theme display names
 */
export const THEME_NAMES: Record<string, string> = {
  default: 'Default',
  corporate: 'Corporate',
  minimalist: 'Minimalist',
};
