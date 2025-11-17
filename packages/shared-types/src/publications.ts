/**
 * Publications Type Definitions - Worker 19
 *
 * TypeScript types for public impact pages and embeds.
 * Used across API gateway, reporting service, cockpit, and trust center.
 *
 * @module publications
 */

// Publication status
export type PublicationStatus = 'DRAFT' | 'LIVE' | 'ARCHIVED';

// Publication visibility
export type PublicationVisibility = 'PUBLIC' | 'TOKEN';

// Block kinds
export type PublicationBlockKind = 'TILE' | 'TEXT' | 'CHART' | 'EVIDENCE' | 'METRIC' | 'HEADING';

// Block width options
export type BlockWidth = 'full' | 'half' | 'third' | 'quarter';

/**
 * Block Payloads (discriminated union)
 */
export type BlockPayload =
  | {
      type: 'TILE';
      metric: string;
      value: number;
      label: string;
      trend?: number;
      unit?: string;
    }
  | {
      type: 'TEXT';
      content: string;
      format: 'markdown' | 'html';
    }
  | {
      type: 'CHART';
      chartType: 'line' | 'bar' | 'pie' | 'area';
      data: any;
      title: string;
      xLabel?: string;
      yLabel?: string;
    }
  | {
      type: 'EVIDENCE';
      snippets: Array<{
        id: string;
        text: string;
        source: string;
        timestamp?: string;
      }>;
    }
  | {
      type: 'METRIC';
      label: string;
      value: number;
      unit?: string;
      change?: number;
      changeLabel?: string;
    }
  | {
      type: 'HEADING';
      text: string;
      level: 1 | 2 | 3;
    };

/**
 * Block Styling
 */
export interface BlockStyling {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  padding?: string;
}

/**
 * Theme Configuration
 */
export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  customCss?: string;
}

/**
 * Publication (full entity)
 */
export interface Publication {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: PublicationStatus;
  visibility: PublicationVisibility;
  created_by: string;
  updated_by: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  og_title: string | null;
  og_description: string | null;
  theme_config: ThemeConfig | null;
  view_count: number;
  unique_visitors: number;
  last_viewed_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  archived_at: string | null;
}

/**
 * Publication Block
 */
export interface PublicationBlock {
  id: string;
  publication_id: string;
  kind: PublicationBlockKind;
  order: number;
  payload_json: BlockPayload;
  width: BlockWidth;
  styling: BlockStyling | null;
  created_at: string;
  updated_at: string;
}

/**
 * Publication with Blocks (for rendering)
 */
export interface PublicationWithBlocks extends Publication {
  blocks: PublicationBlock[];
}

/**
 * Publication Token
 */
export interface PublicationToken {
  id: string;
  publication_id: string;
  token_hash: string;
  token_prefix: string;
  label: string | null;
  created_by: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
}

/**
 * Publication View (analytics)
 */
export interface PublicationView {
  id: string;
  publication_id: string;
  visitor_hash: string;
  session_id: string | null;
  referer: string | null;
  user_agent: string | null;
  country_code: string | null;
  is_embed: boolean;
  embed_domain: string | null;
  view_duration_seconds: number | null;
  viewed_at: string;
}

/**
 * API Request/Response Types
 */

// Create Publication Request
export interface CreatePublicationRequest {
  slug: string;
  title: string;
  description?: string;
  visibility?: PublicationVisibility;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  theme_config?: ThemeConfig;
}

// Update Publication Request
export interface UpdatePublicationRequest {
  title?: string;
  description?: string;
  slug?: string;
  visibility?: PublicationVisibility;
  meta_title?: string;
  meta_description?: string;
  og_image_url?: string;
  og_title?: string;
  og_description?: string;
  theme_config?: ThemeConfig;
}

// Publish Request (DRAFT -> LIVE)
export interface PublishPublicationRequest {
  publish: boolean;
}

// Add Block Request
export interface AddBlockRequest {
  kind: PublicationBlockKind;
  order: number;
  payload_json: BlockPayload;
  width?: BlockWidth;
  styling?: BlockStyling;
}

// Update Block Request
export interface UpdateBlockRequest {
  order?: number;
  payload_json?: BlockPayload;
  width?: BlockWidth;
  styling?: BlockStyling;
}

// Generate Token Request
export interface GenerateTokenRequest {
  label?: string;
  expires_in_days?: number;
}

// Token Response (includes plaintext token only once)
export interface TokenResponse {
  id: string;
  token: string; // Plaintext, only returned once
  token_prefix: string;
  label: string | null;
  expires_at: string | null;
  created_at: string;
}

// Publication Stats Response
export interface PublicationStatsResponse {
  publication_id: string;
  view_count: number;
  unique_visitors: number;
  last_viewed_at: string | null;
  views_by_day: Array<{
    date: string;
    views: number;
    unique: number;
  }>;
  top_referrers: Array<{
    referer: string;
    count: number;
  }>;
  embed_stats: {
    total_embed_views: number;
    unique_embed_domains: string[];
  };
}

// Publication List Response
export interface PublicationListResponse {
  publications: Array<Publication & { block_count: number }>;
  total: number;
  page: number;
  page_size: number;
}

// Public Publication Response (no sensitive data)
export interface PublicPublicationResponse {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  blocks: PublicationBlock[];
  theme_config: ThemeConfig | null;
  published_at: string;
  meta_title: string | null;
  meta_description: string | null;
  og_image_url: string | null;
  og_title: string | null;
  og_description: string | null;
}

// Embed Configuration
export interface EmbedConfig {
  slug: string;
  tenant_id?: string;
  token?: string;
  width?: string;
  height?: string;
  border?: boolean;
}

// Embed Analytics Event
export interface EmbedAnalyticsEvent {
  publication_id: string;
  event_type: 'view' | 'exit';
  duration?: number;
  embed_domain?: string;
}
