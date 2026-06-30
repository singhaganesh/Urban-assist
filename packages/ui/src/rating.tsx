'use client';
// Star rating display + interactive input.

import * as React from 'react';
import { Star } from 'lucide-react';
import { cn } from './cn';

export function RatingStars({
  value,
  size = 14,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`Rated ${value.toFixed(1)} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= Math.round(value) ? 'fill-accent stroke-accent' : 'stroke-hairline fill-transparent'}
        />
      ))}
      <span className="ml-1 font-mono-utility text-muted">{value.toFixed(1)}</span>
    </span>
  );
}

export function RatingInput({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className="tap p-1"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            width={size}
            height={size}
            className={n <= value ? 'fill-accent stroke-accent' : 'stroke-muted fill-transparent'}
          />
        </button>
      ))}
    </div>
  );
}
