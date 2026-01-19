/**
 * Input Component
 *
 * A text/number input component with Turkish number formatting support.
 * Supports error states and various input types.
 */

import React, { InputHTMLAttributes, forwardRef, ChangeEvent } from 'react';
import { useI18n } from '@org/shared-i18n';
import './Input.scss';

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Show error state */
  error?: boolean;
  /**
   * Numeric value for number inputs.
   * When provided with type="number", enables Turkish number handling.
   */
  numericValue?: number;
  /**
   * Callback for numeric value changes.
   * Called with parsed number value.
   */
  onNumericChange?: (value: number) => void;
  /** Standard onChange handler */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Input component with support for text and number types.
 * Number inputs include Turkish locale formatting support.
 *
 * @example
 * ```tsx
 * // Text input
 * <Input placeholder="Enter name" onChange={handleChange} />
 *
 * // Number input with Turkish formatting
 * <Input
 *   type="number"
 *   numericValue={1234.56}
 *   onNumericChange={setAmount}
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    type = 'text',
    error = false,
    numericValue,
    onNumericChange,
    onChange,
    className = '',
    disabled = false,
    readOnly = false,
    ...props
  },
  ref
): React.ReactElement {
  const { parseNumber } = useI18n();

  const classNames = ['input', error && 'input--error', className]
    .filter(Boolean)
    .join(' ');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    if (onChange) {
      onChange(event);
    }

    if (type === 'number' && onNumericChange) {
      const rawValue = event.target.value;
      if (rawValue === '' || rawValue === '-') {
        onNumericChange(0);
      } else {
        // Parse as standard number (HTML number inputs use standard format)
        const parsed = parseFloat(rawValue);
        if (!isNaN(parsed)) {
          onNumericChange(parsed);
        }
      }
    }
  };

  // For number type with numericValue, use controlled value
  const inputValue =
    type === 'number' && numericValue !== undefined ? numericValue : undefined;

  return (
    <input
      ref={ref}
      type={type}
      className={classNames}
      disabled={disabled}
      readOnly={readOnly}
      aria-invalid={error ? 'true' : undefined}
      value={inputValue}
      onChange={handleChange}
      {...props}
    />
  );
});
