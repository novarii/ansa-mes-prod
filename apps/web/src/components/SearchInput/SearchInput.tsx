/**
 * SearchInput Component
 *
 * A debounced search input with clear button and loading state.
 */

import React, { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';
import './SearchInput.scss';

export interface SearchInputProps {
  /** Callback called with search value after debounce */
  onSearch: (value: string) => void;
  /** Controlled value */
  value?: string;
  /** Change handler for controlled mode */
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Show loading indicator */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom className */
  className?: string;
  /** Aria label */
  'aria-label'?: string;
  /** Data testid for testing */
  'data-testid'?: string;
}

/**
 * SearchInput component with debounced search callback.
 *
 * @example
 * ```tsx
 * <SearchInput
 *   onSearch={(query) => fetchResults(query)}
 *   placeholder="Tabloda Ara..."
 *   debounceMs={300}
 * />
 * ```
 */
export function SearchInput({
  onSearch,
  value: controlledValue,
  onChange,
  placeholder = 'Ara...',
  debounceMs = 300,
  loading = false,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
  'data-testid': dataTestId,
}: SearchInputProps): React.ReactElement {
  const [internalValue, setInternalValue] = useState(controlledValue ?? '');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with controlled value
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const debouncedSearch = useCallback(
    (searchValue: string): void => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      debounceTimer.current = setTimeout(() => {
        onSearch(searchValue);
      }, debounceMs);
    },
    [onSearch, debounceMs]
  );

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const newValue = event.target.value;
    setInternalValue(newValue);

    if (onChange) {
      onChange(event);
    }

    debouncedSearch(newValue);
  };

  const handleClear = (): void => {
    setInternalValue('');

    if (onChange) {
      const syntheticEvent = {
        target: { value: '' },
      } as ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }

    debouncedSearch('');
    inputRef.current?.focus();
  };

  const displayValue = controlledValue !== undefined ? controlledValue : internalValue;
  const showClear = displayValue.length > 0 && !disabled;

  const classNames = ['search-input', className].filter(Boolean).join(' ');

  return (
    <div className={classNames} data-testid={dataTestId}>
      <div
        className={`search-input__icon ${loading ? 'search-input__icon--hidden' : ''}`}
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </div>

      {loading && (
        <div className="search-input__loading" aria-hidden="true">
          <svg className="search-input__spinner" viewBox="0 0 24 24">
            <circle
              cx="12"
              cy="12"
              r="10"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeDasharray="31.4"
              strokeDashoffset="15.7"
            />
          </svg>
        </div>
      )}

      <input
        ref={inputRef}
        type="search"
        className="search-input__input"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
      />

      {showClear && (
        <button
          type="button"
          className="search-input__clear"
          onClick={handleClear}
          aria-label="Temizle"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}
