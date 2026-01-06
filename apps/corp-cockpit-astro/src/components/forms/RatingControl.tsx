import { useMemo } from 'react';
import './RatingControl.css';

interface Props {
  value: number | null;
  onChange?: (value: number) => void;
  ratingValues?: number[];
}

const DEFAULT_VALUES = [10, 9, 8, 7, 6, 5];

const defaultCopy = [
  { range: '9–10', label: 'Must apply' },
  { range: '7–8', label: 'Strong fit' },
  { range: '5–6', label: 'Watch list' },
];

export const RatingControl = ({ value, onChange, ratingValues = DEFAULT_VALUES }: Props) => {
  const helper = useMemo(() => {
    if (value && value >= 9) return defaultCopy[0].label;
    if (value && value >= 7) return defaultCopy[1].label;
    return defaultCopy[2].label;
  }, [value]);

  return (
    <div className="rating-control" role="group" aria-label="Score opportunity">
      {ratingValues.map((rating) => {
        const isActive = value === rating;
        return (
          <button
            key={rating}
            type="button"
            className={`rating-chip ${isActive ? 'active' : ''}`}
            aria-label={`Rate ${rating}`}
            aria-pressed={isActive}
            onClick={() => onChange?.(rating)}
          >
            {rating}
            <span className="rating-tooltip">{helper}</span>
          </button>
        );
      })}
    </div>
  );
};

export default RatingControl;



