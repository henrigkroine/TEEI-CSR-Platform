/**
 * SlidePreview Component
 *
 * Thumbnail preview card for deck slides.
 * Shows slide type, citation count, and optional thumbnail image.
 *
 * @module deck/slides
 */

import { CitationBadge } from './CitationBadge';

export interface SlidePreviewProps {
  slide: {
    id: string;
    slideNumber?: number;
    title: string;
    type: 'title' | 'content' | 'chart' | 'data-table' | 'two-column' | 'image';
    citationCount: number;
  };
  thumbnail?: string;
  onClick?: () => void;
  isSelected?: boolean;
}

/**
 * Get icon and color for slide type
 */
function getSlideTypeMetadata(
  type: SlidePreviewProps['slide']['type']
): { icon: string; color: string; label: string } {
  const metadata = {
    title: {
      icon: '📊',
      color: 'bg-purple-100 dark:bg-purple-900',
      label: 'Title Slide',
    },
    content: {
      icon: '📝',
      color: 'bg-blue-100 dark:bg-blue-900',
      label: 'Content',
    },
    chart: {
      icon: '📈',
      color: 'bg-green-100 dark:bg-green-900',
      label: 'Chart',
    },
    'data-table': {
      icon: '📋',
      color: 'bg-orange-100 dark:bg-orange-900',
      label: 'Data Table',
    },
    'two-column': {
      icon: '📑',
      color: 'bg-teal-100 dark:bg-teal-900',
      label: 'Two Column',
    },
    image: {
      icon: '🖼️',
      color: 'bg-pink-100 dark:bg-pink-900',
      label: 'Image',
    },
  };

  return metadata[type];
}

export function SlidePreview({
  slide,
  thumbnail,
  onClick,
  isSelected = false,
}: SlidePreviewProps) {
  const typeMetadata = getSlideTypeMetadata(slide.type);

  return (
    <div
      className={`slide-preview group relative border rounded-lg overflow-hidden transition-all duration-200 ${
        isSelected
          ? 'ring-2 ring-primary border-primary shadow-lg'
          : 'border-gray-200 dark:border-gray-700 hover:border-primary/50 hover:shadow-md'
      } ${onClick ? 'cursor-pointer' : ''}`}
      data-testid={`slide-preview-${slide.id}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      aria-label={`Slide ${slide.slideNumber || ''}: ${slide.title}`}
    >
      {/* Slide number badge */}
      {slide.slideNumber !== undefined && (
        <div
          className="absolute top-2 left-2 z-10 bg-gray-900/80 text-white text-xs font-bold px-2 py-1 rounded-md"
          data-testid="slide-number"
        >
          #{slide.slideNumber}
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 bg-primary text-white rounded-full p-1">
          <svg
            className="w-4 h-4"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Thumbnail or placeholder */}
      <div className="relative w-full aspect-[16/9] bg-gray-100 dark:bg-gray-800">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={slide.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className={`w-full h-full flex flex-col items-center justify-center ${typeMetadata.color} transition-colors group-hover:opacity-90`}
          >
            <span className="text-4xl mb-2" role="img" aria-hidden="true">
              {typeMetadata.icon}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {typeMetadata.label}
            </span>
          </div>
        )}
      </div>

      {/* Slide info */}
      <div className="p-3 bg-white dark:bg-gray-900">
        <h4
          className="text-sm font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 min-h-[40px]"
          title={slide.title}
        >
          {slide.title}
        </h4>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {typeMetadata.label}
          </span>
          <CitationBadge count={slide.citationCount} minRequired={0} />
        </div>
      </div>

      {/* Hover overlay (only if clickable) */}
      {onClick && (
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      )}
    </div>
  );
}
