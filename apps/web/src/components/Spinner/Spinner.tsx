/**
 * Spinner Component
 *
 * A loading indicator component with size and color variants.
 */

import React, { HTMLAttributes } from 'react';
import './Spinner.scss';

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
  const spinnerClassNames = [
    'spinner',
    `spinner--${size}`,
    `spinner--${color}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const spinner = (
    <div
      className={spinnerClassNames}
      role="status"
      aria-live="polite"
      {...props}
    >
      <svg
        className="spinner__icon"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="spinner__track"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
        />
        <circle
          className="spinner__circle"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className={showLabel ? 'spinner__label' : 'spinner__sr-only'}>
        {label}
      </span>
    </div>
  );

  if (centered) {
    return <div className="spinner-container--centered">{spinner}</div>;
  }

  return spinner;
}
