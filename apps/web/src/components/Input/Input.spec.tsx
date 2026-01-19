/**
 * Input Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';
import { I18nProvider } from '@org/shared-i18n';

// Wrapper for i18n context
function renderWithI18n(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('Input', () => {
  describe('rendering', () => {
    it('should render text input by default', () => {
      renderWithI18n(<Input aria-label="Test input" />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render with placeholder', () => {
      renderWithI18n(<Input placeholder="Enter text" />);
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
    });

    it('should render with value', () => {
      renderWithI18n(<Input value="Test value" onChange={() => {}} />);
      expect(screen.getByDisplayValue('Test value')).toBeInTheDocument();
    });
  });

  describe('types', () => {
    it('should render text type', () => {
      renderWithI18n(<Input type="text" aria-label="Text" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text');
    });

    it('should render password type', () => {
      renderWithI18n(<Input type="password" aria-label="Password" />);
      const input = document.querySelector('input[type="password"]');
      expect(input).toBeInTheDocument();
    });

    it('should render number type', () => {
      renderWithI18n(<Input type="number" aria-label="Number" />);
      expect(screen.getByRole('spinbutton')).toHaveAttribute('type', 'number');
    });
  });

  describe('number formatting', () => {
    it('should accept numeric value prop', () => {
      renderWithI18n(
        <Input type="number" numericValue={1234.56} onNumericChange={() => {}} />
      );
      // Turkish format: 1.234,56
      expect(screen.getByRole('spinbutton')).toHaveValue(1234.56);
    });

    it('should call onNumericChange with parsed value', async () => {
      const user = userEvent.setup();
      const handleNumericChange = vi.fn();
      renderWithI18n(
        <Input
          type="number"
          numericValue={0}
          onNumericChange={handleNumericChange}
          aria-label="Number input"
        />
      );

      const input = screen.getByRole('spinbutton');
      await user.clear(input);
      await user.type(input, '42');

      expect(handleNumericChange).toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      renderWithI18n(<Input disabled aria-label="Disabled" />);
      expect(screen.getByRole('textbox')).toBeDisabled();
    });

    it('should be readonly when readOnly prop is true', () => {
      renderWithI18n(<Input readOnly aria-label="Readonly" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
    });

    it('should show error state', () => {
      renderWithI18n(<Input error aria-label="Error" />);
      expect(screen.getByRole('textbox')).toHaveClass('input--error');
    });
  });

  describe('interactions', () => {
    it('should call onChange when typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      renderWithI18n(<Input onChange={handleChange} aria-label="Test" />);

      await user.type(screen.getByRole('textbox'), 'hello');

      expect(handleChange).toHaveBeenCalled();
    });

    it('should call onFocus when focused', async () => {
      const user = userEvent.setup();
      const handleFocus = vi.fn();
      renderWithI18n(<Input onFocus={handleFocus} aria-label="Test" />);

      await user.click(screen.getByRole('textbox'));

      expect(handleFocus).toHaveBeenCalled();
    });

    it('should call onBlur when blurred', async () => {
      const user = userEvent.setup();
      const handleBlur = vi.fn();
      renderWithI18n(<Input onBlur={handleBlur} aria-label="Test" />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.tab();

      expect(handleBlur).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should accept custom aria-label', () => {
      renderWithI18n(<Input aria-label="Custom label" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-label', 'Custom label');
    });

    it('should accept aria-describedby', () => {
      renderWithI18n(<Input aria-describedby="help-text" aria-label="Test" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should have aria-invalid when error is true', () => {
      renderWithI18n(<Input error aria-label="Error input" />);
      expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    });
  });
});
