/**
 * Deck Tile Picker Component
 *
 * Multi-select checkbox list with drag-to-reorder support.
 * Allows selecting up to 8 tiles for the deck.
 *
 * @module deck/DeckTilePicker
 */

import { useState, useCallback } from 'react';
import type { DeckTile } from './types';
import { AVAILABLE_TILES, MAX_TILES_PER_DECK } from './constants';

export interface DeckTilePickerProps {
  /** Currently selected tiles in order */
  selectedTiles: DeckTile[];
  /** Callback when tiles change */
  onChange: (tiles: DeckTile[]) => void;
  /** Disable all interactions */
  disabled?: boolean;
}

export function DeckTilePicker({
  selectedTiles,
  onChange,
  disabled = false,
}: DeckTilePickerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const isTileSelected = useCallback(
    (tileId: DeckTile) => selectedTiles.includes(tileId),
    [selectedTiles]
  );

  const handleToggleTile = useCallback(
    (tileId: DeckTile) => {
      if (isTileSelected(tileId)) {
        // Remove tile
        onChange(selectedTiles.filter((t) => t !== tileId));
      } else {
        // Add tile (if under max limit)
        if (selectedTiles.length < MAX_TILES_PER_DECK) {
          onChange([...selectedTiles, tileId]);
        }
      }
    },
    [selectedTiles, onChange, isTileSelected]
  );

  const handleDragStart = useCallback(
    (index: number) => {
      setDraggedIndex(index);
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      setDragOverIndex(index);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();

      if (draggedIndex === null || draggedIndex === dropIndex) {
        setDraggedIndex(null);
        setDragOverIndex(null);
        return;
      }

      const newTiles = [...selectedTiles];
      const draggedTile = newTiles[draggedIndex];
      newTiles.splice(draggedIndex, 1);
      newTiles.splice(dropIndex, 0, draggedTile);

      onChange(newTiles);
      setDraggedIndex(null);
      setDragOverIndex(null);
    },
    [draggedIndex, selectedTiles, onChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  // Group tiles by category
  const tilesByCategory = AVAILABLE_TILES.reduce(
    (acc, tile) => {
      if (!acc[tile.category]) {
        acc[tile.category] = [];
      }
      acc[tile.category].push(tile);
      return acc;
    },
    {} as Record<string, typeof AVAILABLE_TILES>
  );

  const categoryNames = {
    metrics: 'Metrics',
    charts: 'Charts',
    achievements: 'Achievements',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Select Tiles</h3>
        <span
          className={`text-sm font-medium ${
            selectedTiles.length >= MAX_TILES_PER_DECK
              ? 'text-red-600'
              : 'text-gray-600'
          }`}
        >
          {selectedTiles.length} / {MAX_TILES_PER_DECK} selected
        </span>
      </div>

      {/* Selected tiles (reorderable) */}
      {selectedTiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-3">
            Selected Tiles (drag to reorder)
          </h4>
          <div className="space-y-2">
            {selectedTiles.map((tileId, index) => {
              const tile = AVAILABLE_TILES.find((t) => t.id === tileId);
              if (!tile) return null;

              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <div
                  key={tileId}
                  draggable={!disabled}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-3 p-3 bg-white rounded-lg border-2
                    transition-all cursor-move
                    ${isDragging ? 'opacity-50 border-blue-400' : 'border-gray-200'}
                    ${isDragOver ? 'border-blue-500 shadow-md' : ''}
                    ${disabled ? 'cursor-not-allowed opacity-50' : ''}
                  `}
                >
                  {/* Drag handle */}
                  <div className="text-gray-400" aria-hidden="true">
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M7 2a2 2 0 00-2 2v12a2 2 0 104 0V4a2 2 0 00-2-2zM13 2a2 2 0 00-2 2v12a2 2 0 104 0V4a2 2 0 00-2-2z" />
                    </svg>
                  </div>

                  {/* Order number */}
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>

                  {/* Tile info */}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{tile.name}</div>
                    <div className="text-xs text-gray-500">
                      {tile.estimatedSlides} slide{tile.estimatedSlides !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Icon */}
                  <div className="text-2xl" aria-hidden="true">
                    {tile.icon}
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleToggleTile(tileId)}
                    disabled={disabled}
                    className="flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                    aria-label={`Remove ${tile.name}`}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Available tiles (grouped by category) */}
      <div className="space-y-4">
        {Object.entries(tilesByCategory).map(([category, tiles]) => (
          <div key={category}>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              {categoryNames[category as keyof typeof categoryNames]}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tiles.map((tile) => {
                const isSelected = isTileSelected(tile.id);
                const isDisabled =
                  disabled ||
                  (!isSelected && selectedTiles.length >= MAX_TILES_PER_DECK);

                return (
                  <label
                    key={tile.id}
                    className={`
                      flex items-start gap-3 p-4 rounded-lg border-2 transition-all cursor-pointer
                      ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300'
                      }
                      ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleTile(tile.id)}
                      disabled={isDisabled}
                      className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      aria-describedby={`tile-${tile.id}-description`}
                    />

                    {/* Icon */}
                    <div className="text-2xl flex-shrink-0" aria-hidden="true">
                      {tile.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{tile.name}</div>
                      <div
                        id={`tile-${tile.id}-description`}
                        className="text-sm text-gray-600 mt-1"
                      >
                        {tile.description}
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        {tile.estimatedSlides} slide{tile.estimatedSlides !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Warning when at max */}
      {selectedTiles.length >= MAX_TILES_PER_DECK && (
        <div
          className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p className="text-sm font-medium text-yellow-800">
              Maximum tiles selected. Remove a tile to add another.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
