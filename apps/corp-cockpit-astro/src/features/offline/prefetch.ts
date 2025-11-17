/**
 * Board Pack Prefetch Worker
 *
 * Features:
 * - Download all assets for a board pack
 * - Compute SRI hashes for integrity
 * - Store assets in IndexedDB
 * - Progress tracking
 * - Retry logic for failed downloads
 */

import type { BoardPack, BoardPackAsset, BoardPackDownloadProgress, BoardPackSlide } from './types';
import { saveBoardPack, saveAsset, enforceStorageLimit } from './storage';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

/**
 * Prefetch a board pack and all its assets
 */
export async function prefetchBoardPack(
  reportId: string,
  companyId: string,
  onProgress?: (progress: BoardPackDownloadProgress) => void
): Promise<BoardPack> {
  console.log('[Prefetch] Starting prefetch for report:', reportId);

  try {
    // 1. Fetch board pack metadata
    const response = await fetch(`/api/reports/${reportId}/board-pack`);
    if (!response.ok) {
      throw new Error(`Failed to fetch board pack metadata: ${response.statusText}`);
    }

    const metadata = await response.json();

    // 2. Extract all assets from slides
    const allAssets: BoardPackAsset[] = [];
    for (const slide of metadata.slides) {
      const slideAssets = extractAssetsFromSlide(slide);
      allAssets.push(...slideAssets);
    }

    // Remove duplicates
    const uniqueAssets = Array.from(
      new Map(allAssets.map((asset) => [asset.url, asset])).values()
    );

    const totalAssets = uniqueAssets.length;
    const totalSize = uniqueAssets.reduce((sum, asset) => sum + (asset.size || 0), 0);

    console.log('[Prefetch] Found', totalAssets, 'unique assets, total size:', totalSize);

    // Check storage limit before starting
    await enforceStorageLimit(totalSize);

    // 3. Initialize progress
    const progress: BoardPackDownloadProgress = {
      packId: metadata.id,
      totalAssets,
      downloadedAssets: 0,
      totalSize,
      downloadedSize: 0,
      percentage: 0,
      status: 'downloading',
    };

    onProgress?.(progress);

    // 4. Download all assets
    const downloadedAssets: BoardPackAsset[] = [];

    for (let i = 0; i < uniqueAssets.length; i++) {
      const asset = uniqueAssets[i];

      try {
        // Download asset with retry
        const blob = await downloadAssetWithRetry(asset.url);

        // Compute integrity hash
        const hash = await computeIntegrityHash(blob);
        asset.hash = hash;
        asset.cached = true;

        // Save to IndexedDB
        await saveAsset(metadata.id, asset, blob);

        downloadedAssets.push(asset);

        // Update progress
        progress.downloadedAssets++;
        progress.downloadedSize += asset.size || blob.size;
        progress.percentage = Math.floor((progress.downloadedAssets / progress.totalAssets) * 100);

        onProgress?.(progress);
      } catch (error) {
        console.error('[Prefetch] Failed to download asset:', asset.url, error);
        // Mark asset as failed but continue
        asset.cached = false;
      }
    }

    // 5. Create board pack object
    const boardPack: BoardPack = {
      id: metadata.id,
      reportId,
      title: metadata.title,
      companyId,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      lastAccessedAt: Date.now(),
      slides: metadata.slides,
      totalSize,
      version: '1.0',
      metadata: {
        author: metadata.author || 'Unknown',
        period: metadata.period || '',
        template: metadata.template || 'default',
        locale: metadata.locale || 'en',
      },
    };

    // 6. Save board pack
    await saveBoardPack(boardPack);

    // 7. Update progress to completed
    progress.status = 'completed';
    progress.percentage = 100;
    onProgress?.(progress);

    console.log('[Prefetch] Board pack prefetch completed:', boardPack.id);

    return boardPack;
  } catch (error) {
    console.error('[Prefetch] Prefetch failed:', error);

    // Update progress to failed
    if (onProgress) {
      onProgress({
        packId: reportId,
        totalAssets: 0,
        downloadedAssets: 0,
        totalSize: 0,
        downloadedSize: 0,
        percentage: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    throw error;
  }
}

/**
 * Extract all assets from a slide's HTML content
 */
function extractAssetsFromSlide(slide: BoardPackSlide): BoardPackAsset[] {
  const assets: BoardPackAsset[] = [];

  // Parse HTML content
  const parser = new DOMParser();
  const doc = parser.parseFromString(slide.content, 'text/html');

  // Extract images
  const images = doc.querySelectorAll('img[src]');
  images.forEach((img) => {
    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:')) {
      assets.push({
        url: src,
        type: 'image',
        size: 0, // Will be determined during download
        hash: '',
        cached: false,
      });
    }
  });

  // Extract CSS
  const links = doc.querySelectorAll('link[rel="stylesheet"]');
  links.forEach((link) => {
    const href = link.getAttribute('href');
    if (href) {
      assets.push({
        url: href,
        type: 'css',
        size: 0,
        hash: '',
        cached: false,
      });
    }
  });

  // Extract JS
  const scripts = doc.querySelectorAll('script[src]');
  scripts.forEach((script) => {
    const src = script.getAttribute('src');
    if (src) {
      assets.push({
        url: src,
        type: 'js',
        size: 0,
        hash: '',
        cached: false,
      });
    }
  });

  // Extract fonts from inline styles
  const styles = doc.querySelectorAll('[style]');
  styles.forEach((element) => {
    const style = element.getAttribute('style');
    if (style) {
      const fontMatches = style.match(/url\(['"]?([^'"]+\.(woff2?|ttf|eot))['"]?\)/g);
      fontMatches?.forEach((match) => {
        const urlMatch = match.match(/url\(['"]?([^'"]+)['"]?\)/);
        if (urlMatch && urlMatch[1]) {
          assets.push({
            url: urlMatch[1],
            type: 'font',
            size: 0,
            hash: '',
            cached: false,
          });
        }
      });
    }
  });

  return assets;
}

/**
 * Download asset with retry logic
 */
async function downloadAssetWithRetry(url: string, retries = MAX_RETRIES): Promise<Blob> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.warn(`[Prefetch] Download failed (attempt ${i + 1}/${retries}):`, url, error);

      if (i < retries - 1) {
        // Wait before retrying with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }

  throw new Error('Download failed after all retries');
}

/**
 * Compute SRI integrity hash for a blob
 */
async function computeIntegrityHash(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

  // Convert to base64
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));

  return `sha256-${hashBase64}`;
}

/**
 * Cancel prefetch (not implemented, placeholder for future enhancement)
 */
export function cancelPrefetch(packId: string): void {
  console.log('[Prefetch] Cancel prefetch not yet implemented:', packId);
  // TODO: Implement AbortController for cancellation
}

/**
 * Update board pack (re-download and update existing pack)
 */
export async function updateBoardPack(
  packId: string,
  onProgress?: (progress: BoardPackDownloadProgress) => void
): Promise<BoardPack> {
  console.log('[Prefetch] Updating board pack:', packId);

  // Get existing pack to retrieve reportId
  const { getBoardPack } = await import('./storage');
  const existingPack = await getBoardPack(packId);

  if (!existingPack) {
    throw new Error('Board pack not found');
  }

  // Prefetch again with same reportId and companyId
  return prefetchBoardPack(existingPack.reportId, existingPack.companyId, onProgress);
}
