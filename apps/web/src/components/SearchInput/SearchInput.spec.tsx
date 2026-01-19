/**
 * SearchInput Component Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('rendering', () => {
    it('should render search input', () => {
      render(<SearchInput onSearch={() => {}} />);
      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      render(<SearchInput onSearch={() => {}} placeholder="Search..." />);
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });

    it('should render search icon', () => {
      render(<SearchInput onSearch={() => {}} />);
      expect(document.querySelector('.search-input__icon')).toBeInTheDocument();
    });
  });

  describe('debounced search', () => {
    it('should call onSearch after debounce delay', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const handleSearch = vi.fn();
      render(<SearchInput onSearch={handleSearch} debounceMs={300} />);

      await user.type(screen.getByRole('searchbox'), 'test');

      // Should not have called yet
      expect(handleSearch).not.toHaveBeenCalled();

      // Advance timers past debounce delay
      vi.advanceTimersByTime(300);

      expect(handleSearch).toHaveBeenCalledWith('test');
    });

    it('should use default debounce of 300ms', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const handleSearch = vi.fn();
      render(<SearchInput onSearch={handleSearch} />);

      await user.type(screen.getByRole('searchbox'), 'query');

      expect(handleSearch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(300);

      expect(handleSearch).toHaveBeenCalledWith('query');
    });

    it('should reset debounce timer on each keystroke', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const handleSearch = vi.fn();
      render(<SearchInput onSearch={handleSearch} debounceMs={300} />);

      await user.type(screen.getByRole('searchbox'), 'a');
      vi.advanceTimersByTime(200);

      await user.type(screen.getByRole('searchbox'), 'b');
      vi.advanceTimersByTime(200);

      // Should not have called yet (timer was reset)
      expect(handleSearch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);

      // Now it should have been called with the full input
      expect(handleSearch).toHaveBeenCalledWith('ab');
    });
  });

  describe('controlled value', () => {
    it('should accept controlled value', () => {
      render(<SearchInput onSearch={() => {}} value="controlled" onChange={() => {}} />);
      expect(screen.getByRole('searchbox')).toHaveValue('controlled');
    });

    it('should call onChange when typing', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const handleChange = vi.fn();
      render(<SearchInput onSearch={() => {}} onChange={handleChange} value="" />);

      await user.type(screen.getByRole('searchbox'), 'a');

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('clear button', () => {
    it('should show clear button when there is value', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(<SearchInput onSearch={() => {}} />);

      await user.type(screen.getByRole('searchbox'), 'test');

      expect(screen.getByRole('button', { name: /temizle|clear/i })).toBeInTheDocument();
    });

    it('should not show clear button when empty', () => {
      render(<SearchInput onSearch={() => {}} />);
      expect(screen.queryByRole('button', { name: /temizle|clear/i })).not.toBeInTheDocument();
    });

    it('should clear input and call onSearch when clear button clicked', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const handleSearch = vi.fn();
      render(<SearchInput onSearch={handleSearch} />);

      await user.type(screen.getByRole('searchbox'), 'test');
      vi.advanceTimersByTime(300);
      handleSearch.mockClear();

      const clearButton = screen.getByRole('button', { name: /temizle|clear/i });
      await user.click(clearButton);

      expect(screen.getByRole('searchbox')).toHaveValue('');
      vi.advanceTimersByTime(300);
      expect(handleSearch).toHaveBeenCalledWith('');
    });
  });

  describe('accessibility', () => {
    it('should have search role', () => {
      render(<SearchInput onSearch={() => {}} aria-label="Search items" />);
      expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label', 'Search items');
    });

    it('should accept custom className', () => {
      render(<SearchInput onSearch={() => {}} className="custom-search" data-testid="search" />);
      expect(screen.getByTestId('search')).toHaveClass('custom-search');
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when loading', () => {
      render(<SearchInput onSearch={() => {}} loading />);
      expect(document.querySelector('.search-input__loading')).toBeInTheDocument();
    });

    it('should hide search icon when loading', () => {
      render(<SearchInput onSearch={() => {}} loading />);
      expect(document.querySelector('.search-input__icon--hidden')).toBeInTheDocument();
    });
  });
});
