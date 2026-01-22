import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva('animate-spin', {
  variants: {
    size: {
      sm: 'size-4',
      default: 'size-6',
      lg: 'size-8',
    },
    color: {
      default: 'text-primary',
      muted: 'text-muted-foreground',
      white: 'text-white',
    },
  },
  defaultVariants: {
    size: 'default',
    color: 'default',
  },
});

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /** Center the spinner in its container */
  centered?: boolean;
  /** Show loading label visibly (always visible to screen readers) */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      className,
      size,
      color,
      centered = false,
      showLabel = false,
      label = 'Yukleniyor...',
      ...props
    },
    ref
  ) => {
    const spinner = (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn('inline-flex items-center gap-2', className)}
        {...props}
      >
        <svg
          className={cn(spinnerVariants({ size, color }))}
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
        <div className="flex min-h-[200px] items-center justify-center">
          {spinner}
        </div>
      );
    }

    return spinner;
  }
);
Spinner.displayName = 'Spinner';

export { Spinner, spinnerVariants };
