/**
 * Select Component (Legacy)
 *
 * A dropdown select component with options.
 *
 * @deprecated Prefer using the shadcn Select from './ui/select' for new code.
 */

import React, { SelectHTMLAttributes, forwardRef, ChangeEvent } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  /** Option value */
  value: string;
  /** Display label */
  label: string;
  /** Disable this option */
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  /** Available options */
  options: SelectOption[];
  /** Placeholder text (first disabled option) */
  placeholder?: string;
  /** Show error state */
  error?: boolean;
  /** Full width select */
  fullWidth?: boolean;
  /** Change handler */
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void;
  /** Test ID for testing */
  'data-testid'?: string;
}

/**
 * Select component for dropdown selection.
 *
 * @example
 * ```tsx
 * const options = [
 *   { value: 'a', label: 'Option A' },
 *   { value: 'b', label: 'Option B' },
 * ];
 *
 * <Select
 *   options={options}
 *   placeholder="Select an option"
 *   value={selected}
 *   onChange={(e) => setSelected(e.target.value)}
 * />
 * ```
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    options,
    placeholder,
    error = false,
    fullWidth = false,
    disabled = false,
    className = '',
    onChange,
    'data-testid': dataTestId,
    ...props
  },
  ref
): React.ReactElement {
  return (
    <div
      className={cn(
        'relative',
        fullWidth && 'w-full select--full-width',
        error && 'select--error',
        className
      )}
      data-testid={dataTestId}
    >
      <select
        ref={ref}
        className={cn(
          'flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus:ring-destructive'
        )}
        disabled={disabled}
        aria-invalid={error ? 'true' : undefined}
        onChange={onChange}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
        <ChevronDown className="size-4" aria-hidden="true" />
      </div>
    </div>
  );
});
