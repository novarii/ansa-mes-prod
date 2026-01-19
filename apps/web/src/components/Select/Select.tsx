/**
 * Select Component
 *
 * A dropdown select component with options.
 */

import React, { SelectHTMLAttributes, forwardRef, ChangeEvent } from 'react';
import './Select.scss';

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
  const classNames = [
    'select',
    error && 'select--error',
    fullWidth && 'select--full-width',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} data-testid={dataTestId}>
      <select
        ref={ref}
        className="select__input"
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
      <div className="select__icon" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
});
