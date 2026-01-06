/**
 * TileGrid - Display all impact tiles in a responsive grid
 * Supports SSE for live updates
 */

import { useState, useEffect } from 'react';
import type { ImpactTile } from '@teei/shared-types';
import LanguageTileWidget from './LanguageTileWidget';
import MentorshipTileWidget from './MentorshipTileWidget';
import UpskillingTileWidget from './UpskillingTileWidget';
import WEEITileWidget from './WEEITileWidget';

export interface TileGridProps {
  companyId: string;
  period?: 'week' | 'month' | 'quarter' | 'year';
  apiBaseUrl?: string;
  enableSSE?: boolean;
}

export function TileGrid({
  companyId,
  period = 'month',
  apiBaseUrl = '/v1/analytics',
  enableSSE = false,
}: TileGridProps) {
  const [tiles, setTiles] = useState<Record<string, ImpactTile>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch all tiles on mount
  useEffect(() => {
    const fetchTiles = async () => {
      const tileTypes = ['language', 'mentorship', 'upskilling', 'weei'];

      // Set all to loading
      const loadingState: Record<string, boolean> = {};
      tileTypes.forEach(type => loadingState[type] = true);
      setLoading(loadingState);

      // Fetch all tiles in parallel
      const results = await Promise.allSettled(
        tileTypes.map(async (type) => {
          const url = `${apiBaseUrl}/tiles/${type}?companyId=${companyId}&period=${period}`;
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`Failed to fetch ${type} tile: ${response.statusText}`);
          }

          const data = await response.json();
          return { type, tile: data.tile };
        })
      );

      const newTiles: Record<string, ImpactTile> = {};
      const newLoading: Record<string, boolean> = {};
      const newErrors: Record<string, string> = {};

      results.forEach((result, index) => {
        const type = tileTypes[index];
        newLoading[type] = false;

        if (result.status === 'fulfilled') {
          newTiles[type] = result.value.tile;
        } else {
          newErrors[type] = result.reason.message || 'Failed to load tile';
        }
      });

      setTiles(newTiles);
      setLoading(newLoading);
      setErrors(newErrors);
    };

    fetchTiles();
  }, [companyId, period, apiBaseUrl]);

  // TODO: Add SSE support for live updates
  // useEffect(() => {
  //   if (!enableSSE) return;
  //
  //   const eventSource = new EventSource(`${apiBaseUrl}/stream/updates?companyId=${companyId}`);
  //
  //   eventSource.addEventListener('metric_updated', (event) => {
  //     // Handle tile updates
  //   });
  //
  //   return () => eventSource.close();
  // }, [companyId, apiBaseUrl, enableSSE]);

  return (
    <div
      className="tile-grid-container"
      role="region"
      aria-label="Impact metrics dashboard"
    >
      <style>{`
        .tile-grid-container .tile-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        @media (max-width: 1024px) {
          .tile-grid-container .tile-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="tile-grid">
        {tiles.language && (
          <LanguageTileWidget
            tile={tiles.language}
            loading={loading.language}
            error={errors.language}
          />
        )}

        {tiles.mentorship && (
          <MentorshipTileWidget
            tile={tiles.mentorship}
            loading={loading.mentorship}
            error={errors.mentorship}
          />
        )}

        {tiles.upskilling && (
          <UpskillingTileWidget
            tile={tiles.upskilling}
            isLoading={loading.upskilling}
            error={errors.upskilling}
          />
        )}

        {tiles.weei && (
          <WEEITileWidget
            tile={tiles.weei}
            isLoading={loading.weei}
            error={errors.weei}
          />
        )}
      </div>
    </div>
  );
}
