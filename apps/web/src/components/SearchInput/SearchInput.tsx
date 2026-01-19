/**
 * SearchInput Component
 *
 * A debounced search input with clear button and loading state.
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
} from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { cn } from '@/lib/utils';

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
  className,
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

  const displayValue =
    controlledValue !== undefined ? controlledValue : internalValue;
  const showClear = displayValue.length > 0 && !disabled;

  return (
    <div
      className={cn('relative flex items-center', className)}
      data-testid={dataTestId}
    >
      <div className="pointer-events-none absolute left-3 flex items-center">
        {loading ? (
          <Loader2
            className="size-4 animate-spin text-muted-foreground"
            aria-hidden="true"
          />
        ) : (
          <Search className="size-4 text-muted-foreground" aria-hidden="true" />
        )}
      </div>

      <Input
        ref={inputRef}
        type="search"
        className="pl-9 pr-9"
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
      />

      {showClear && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 size-7"
          onClick={handleClear}
          aria-label="Temizle"
        >
          <X className="size-4" />
        </Button>
      )}
    </div>
  );
}
