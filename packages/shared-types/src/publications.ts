/**
 * Shared types for Publications feature
 */

/**
 * Publication status
 */
export type PublicationStatus = 'DRAFT' | 'LIVE' | 'ARCHIVED';

/**
 * Publication visibility
 */
export type PublicationVisibility = 'PUBLIC' | 'TOKEN';

/**
 * Publication block kinds
 */
export type PublicationBlockKind = 'TILE' | 'TEXT' | 'CHART' | 'EVIDENCE';

/**
 * Tile block payload (metric/KPI tile)
 */
export interface TileBlockPayload {
  kind: 'TILE';
  tileType: 'metric' | 'kpi' | 'impact';
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'neutral';
    value: number;
    label: string;
  };
  icon?: string;
  color?: string;
}

/**
 * Text block payload (rich text content)
 */
export interface TextBlockPayload {
  kind: 'TEXT';
  content: string; // HTML content (sanitized)
  format?: 'html' | 'markdown';
}

/**
 * Chart block payload (data visualization)
 */
export interface ChartBlockPayload {
  kind: 'CHART';
  chartType: 'bar' | 'line' | 'pie' | 'doughnut' | 'area';
  title: string;
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
    }>;
  };
  options?: Record<string, any>;
}

/**
 * Evidence block payload (evidence snippet)
 */
export interface EvidenceBlockPayload {
  kind: 'EVIDENCE';
  evidenceId: string;
  snippet: string;
  source: string;
  date: string;
  category?: string;
}

/**
 * Union type for all block payloads
 */
export type BlockPayload = TileBlockPayload | TextBlockPayload | ChartBlockPayload | EvidenceBlockPayload;

/**
 * Publication block
 */
export interface PublicationBlock {
  id: string;
  publicationId: string;
  kind: PublicationBlockKind;
  payloadJson: BlockPayload;
  order: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Publication
 */
export interface Publication {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description?: string;
  status: PublicationStatus;
  visibility: PublicationVisibility;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  etag?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Publication with blocks (full publication)
 */
export interface PublicationWithBlocks extends Publication {
  blocks: PublicationBlock[];
}

/**
 * Create publication request
 */
export interface CreatePublicationRequest {
  slug: string;
  title: string;
  description?: string;
  visibility?: PublicationVisibility;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

/**
 * Update publication request
 */
export interface UpdatePublicationRequest {
  slug?: string;
  title?: string;
  description?: string;
  visibility?: PublicationVisibility;
  status?: PublicationStatus;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

/**
 * Add block request
 */
export interface AddBlockRequest {
  kind: PublicationBlockKind;
  payloadJson: BlockPayload;
  order: number;
}

/**
 * Update block request
 */
export interface UpdateBlockRequest {
  payloadJson?: BlockPayload;
  order?: number;
}

/**
 * Publish publication request
 */
export interface PublishPublicationRequest {
  // Optional fields to set when publishing
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
}

/**
 * Rotate token request
 */
export interface RotateTokenRequest {
  expiresInDays?: number; // Default 30 days
}

/**
 * Rotate token response
 */
export interface RotateTokenResponse {
  accessToken: string;
  tokenExpiresAt: string;
  embedUrl: string; // Convenience URL with token
}

/**
 * Publication analytics stats
 */
export interface PublicationStats {
  publicationId: string;
  totalViews: number;
  uniqueVisitors: number;
  topReferrers: Array<{
    domain: string;
    count: number;
  }>;
  viewsByCountry: Array<{
    country: string;
    count: number;
  }>;
  viewsOverTime: Array<{
    date: string;
    count: number;
  }>;
}

/**
 * Public publication response (for public access)
 * Excludes sensitive fields like accessToken
 */
export interface PublicPublicationResponse {
  id: string;
  tenantId: string;
  slug: string;
  title: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: string;
  publishedAt?: string;
  blocks: PublicationBlock[];
  etag?: string;
}
