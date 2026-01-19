/**
 * Spinner Component (Legacy)
 *
 * A loading indicator component with size and color variants.
 *
 * @deprecated Prefer using the shadcn Spinner from './ui/spinner' for new code.
 */

import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export type SpinnerSize = 'small' | 'medium' | 'large';
export type SpinnerColor = 'primary' | 'white' | 'inherit';

export interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** Spinner size */
  size?: SpinnerSize;
  /** Spinner color */
  color?: SpinnerColor;
  /** Center the spinner in its container */
  centered?: boolean;
  /** Show loading label visibly (always visible to screen readers) */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  small: 'size-4 spinner--small',
  medium: 'size-6 spinner--medium',
  large: 'size-8 spinner--large',
};

const colorStyles: Record<SpinnerColor, string> = {
  primary: 'text-primary spinner--primary',
  white: 'text-white spinner--white',
  inherit: 'text-current spinner--inherit',
};

/**
 * Spinner component for loading states.
 *
 * @example
 * ```tsx
 * // Basic spinner
 * <Spinner />
 *
 * // Large centered spinner
 * <Spinner size="large" centered />
 *
 * // Spinner with visible label
 * <Spinner showLabel label="Loading data..." />
 * ```
 */
export function Spinner({
  size = 'medium',
  color = 'primary',
  centered = false,
  showLabel = false,
  label = 'Yukleniyor...',
  className = '',
  ...props
}: SpinnerProps): React.ReactElement {
  const spinner = (
    <div
      className={cn('inline-flex items-center gap-2', className)}
      role="status"
      aria-live="polite"
      {...props}
    >
      <svg
        className={cn('animate-spin', sizeStyles[size], colorStyles[color])}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className={showLabel ? 'text-sm' : 'sr-only'}>{label}</span>
    </div>
  );

  if (centered) {
    return (
      <div className="flex min-h-[200px] items-center justify-center spinner-container--centered">
        {spinner}
      </div>
    );
  }

  return spinner;
}
