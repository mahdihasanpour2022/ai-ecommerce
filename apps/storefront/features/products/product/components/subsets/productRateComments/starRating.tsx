'use client';
import { StarIcon } from '@/components/shared/icons/star-icon';
import { UiButton } from '@/components/shared/ui';
import { useCallback, useState } from 'react';

interface StarRatingProps {
  initialRating?: number;
  onRatingChange?: (rating: number) => void;
  readOnly?: boolean;
}

export const StarRating = ({
  initialRating = 0,
  onRatingChange,
  readOnly = false,
}: StarRatingProps) => {
  const [rating, setRating] = useState(initialRating);
  const [hover, setHover] = useState(0);

  const handleRating = useCallback(
    (newRating: number) => {
      if (readOnly) return;
      setRating(newRating);
      if (onRatingChange) onRatingChange(newRating);
    },
    [readOnly, onRatingChange],
  );

  return (
    <div className={`flex items-center gap-1 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}>
      {[...Array(5)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= (hover || rating);

        return (
          <UiButton
            key={index}
            type="button"
            variant="style_9"
            disabled={readOnly}
            className="transition-transform focus:outline-none active:scale-90 disabled:pointer-events-none"
            onClick={() => handleRating(starValue)}
            onMouseEnter={() => !readOnly && setHover(starValue)}
            onMouseLeave={() => !readOnly && setHover(0)}
          >
            <StarIcon
              filled={isFilled}
              className={`h-5 w-5 transition-colors duration-200 ${
                isFilled ? 'text-yellow-400' : 'text-gray-300'
              }`}
            />
          </UiButton>
        );
      })}
    </div>
  );
};
