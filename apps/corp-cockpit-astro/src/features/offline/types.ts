/**
 * Offline Board Pack Types
 *
 * Type definitions for offline board pack storage and management
 */

export interface BoardPackAsset {
  url: string;
  type: 'slide' | 'image' | 'font' | 'css' | 'js' | 'other';
  size: number;
  hash: string; // SRI integrity hash
  cached: boolean;
}

export interface BoardPackSlide {
  id: string;
  title: string;
  content: string; // HTML content
  assets: BoardPackAsset[];
  order: number;
}

export interface BoardPack {
  id: string;
  reportId: string;
  title: string;
  companyId: string;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
  slides: BoardPackSlide[];
  totalSize: number; // Total size in bytes
  version: string;
  metadata: {
    author: string;
    period: string;
    template: string;
    locale: string;
  };
}

export interface BoardPackDownloadProgress {
  packId: string;
  totalAssets: number;
  downloadedAssets: number;
  totalSize: number;
  downloadedSize: number;
  percentage: number;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  error?: string;
}

export interface BoardPackCache {
  packs: Map<string, BoardPack>;
  totalSize: number;
  maxSize: number; // Maximum cache size in bytes
  evictionPolicy: 'LRU' | 'FIFO' | 'manual';
}

export interface OfflinePackMetrics {
  totalPacks: number;
  totalSize: number;
  oldestPack: number | null;
  newestPack: number | null;
  mostAccessedPack: string | null;
}
