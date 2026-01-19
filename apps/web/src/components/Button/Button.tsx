/**
 * Button Component (Legacy)
 *
 * A versatile button component with multiple variants and sizes.
 * Supports primary, secondary, danger, and ghost variants.
 *
 * @deprecated Prefer using the shadcn Button from './ui/button' for new code.
 */

import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

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

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
};

const sizeStyles: Record<ButtonSize, string> = {
  small: 'h-8 px-3 text-xs',
  medium: 'h-9 px-4 py-2 text-sm',
  large: 'h-10 px-8 text-base',
};

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
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
        variantStyles[variant],
        sizeStyles[size],
        loading && 'button--loading',
        fullWidth && 'w-full button--full-width',
        className
      )}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {loading && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      <span className={loading ? 'opacity-0' : ''}>
        {children}
      </span>
    </button>
  );
});
