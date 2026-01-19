/**
 * Button Component
 *
 * A versatile button component with multiple variants and sizes.
 * Supports primary, secondary, danger, and ghost variants.
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import './Button.scss';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button style variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Show loading state */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Button content */
  children: React.ReactNode;
}

/**
 * Button component with support for variants, sizes, and loading state.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>Save</Button>
 * <Button variant="danger" loading>Deleting...</Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'medium',
    loading = false,
    fullWidth = false,
    disabled = false,
    className = '',
    children,
    type = 'button',
    ...props
  },
  ref
): React.ReactElement {
  const classNames = [
    'button',
    `button--${variant}`,
    `button--${size}`,
    loading && 'button--loading',
    fullWidth && 'button--full-width',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classNames}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {loading && <span className="button__spinner" aria-hidden="true" />}
      <span className={loading ? 'button__content--hidden' : 'button__content'}>
        {children}
      </span>
    </button>
  );
});
