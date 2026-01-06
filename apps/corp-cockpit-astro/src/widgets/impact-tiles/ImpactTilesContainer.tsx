import React, { useState, useEffect } from 'react';
import type { TileResult } from '@teei/shared-types';
import LanguageTileWidget from './LanguageTileWidget';
import MentorshipTileWidget from './MentorshipTileWidget';
import UpskillingTileWidget from './UpskillingTileWidget';
import WEEITileWidget from './WEEITileWidget';

interface ImpactTilesContainerProps {
  companyId: string;
  period?: { start: string; end: string };
  tileTypes?: ('language' | 'mentorship' | 'upskilling' | 'weei')[];
}

/**
 * Impact Tiles Container
 * Fetches and displays impact tiles for TEEI programs
 */
export default function ImpactTilesContainer({
  companyId,
  period,
  tileTypes = ['language', 'mentorship', 'upskilling', 'weei'],
}: ImpactTilesContainerProps) {
  const [tiles, setTiles] = useState<TileResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTiles();
  }, [companyId, period, tileTypes]);

  async function loadTiles() {
    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams({
        companyId,
      });

      if (period) {
        params.append('startDate', period.start);
        params.append('endDate', period.end);
      }

      if (tileTypes.length > 0) {
        params.append('types', tileTypes.join(','));
      }

      // Fetch tiles from analytics API
      const analyticsUrl = import.meta.env.PUBLIC_ANALYTICS_URL || 'http://localhost:3023';
      const response = await fetch(`${analyticsUrl}/v1/analytics/tiles?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tiles: ${response.statusText}`);
      }

      const data = await response.json();
      setTiles(data.tiles || []);
    } catch (err) {
      console.error('Error loading impact tiles:', err);
      setError(err instanceof Error ? err.message : 'Failed to load impact tiles');
    } finally {
      setLoading(false);
    }
  }

  function handleExport(tile: TileResult) {
    // Export tile data as JSON
    const dataStr = JSON.stringify(tile, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;

    const exportFileDefaultName = `tile-${tile.metadata.programType}-${tile.metadata.period.start}-${tile.metadata.period.end}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6" role="alert">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Impact Tiles</h3>
        <p className="text-red-700">{error}</p>
        <button
          onClick={loadTiles}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tiles.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No impact tiles available for the selected period.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
      {tiles.map((tile) => {
        switch (tile.metadata.programType) {
          case 'language':
            return (
              <LanguageTileWidget
                key={tile.metadata.tileId}
                tile={tile as any}
                onExport={() => handleExport(tile)}
              />
            );
          case 'mentorship':
            return (
              <MentorshipTileWidget
                key={tile.metadata.tileId}
                tile={tile as any}
                onExport={() => handleExport(tile)}
              />
            );
          case 'upskilling':
            return (
              <UpskillingTileWidget
                key={tile.metadata.tileId}
                tile={tile as any}
                onExport={() => handleExport(tile)}
              />
            );
          case 'weei':
            return (
              <WEEITileWidget
                key={tile.metadata.tileId}
                tile={tile as any}
                onExport={() => handleExport(tile)}
              />
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
