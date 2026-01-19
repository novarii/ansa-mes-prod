/**
 * Select Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

const options = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
];

describe('Select', () => {
  describe('rendering', () => {
    it('should render select element', () => {
      render(<Select options={options} aria-label="Test select" />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render options', () => {
      render(<Select options={options} aria-label="Test" />);

      expect(screen.getByRole('option', { name: 'Option 1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option 2' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Option 3' })).toBeInTheDocument();
    });

    it('should render placeholder option when provided', () => {
      render(<Select options={options} placeholder="Select an option" />);

      expect(screen.getByRole('option', { name: 'Select an option' })).toBeInTheDocument();
    });

    it('should not render placeholder option when not provided', () => {
      render(<Select options={options} aria-label="Test" />);

      const allOptions = screen.getAllByRole('option');
      expect(allOptions).toHaveLength(3);
    });
  });

  describe('value handling', () => {
    it('should select correct value', () => {
      render(<Select options={options} value="option2" onChange={() => {}} />);

      expect(screen.getByRole('combobox')).toHaveValue('option2');
    });

    it('should call onChange when selection changes', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<Select options={options} onChange={handleChange} aria-label="Test" />);

      await user.selectOptions(screen.getByRole('combobox'), 'option2');

      expect(handleChange).toHaveBeenCalled();
    });
  });

  describe('states', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Select options={options} disabled aria-label="Test" />);
      expect(screen.getByRole('combobox')).toBeDisabled();
    });

    it('should show error state', () => {
      render(<Select options={options} error data-testid="select" aria-label="Test" />);
      expect(screen.getByTestId('select')).toHaveClass('select--error');
    });
  });

  describe('option groups', () => {
    it('should render options with disabled state', () => {
      const optionsWithDisabled = [
        { value: 'a', label: 'Available' },
        { value: 'b', label: 'Disabled', disabled: true },
      ];
      render(<Select options={optionsWithDisabled} aria-label="Test" />);

      const disabledOption = screen.getByRole('option', { name: 'Disabled' });
      expect(disabledOption).toBeDisabled();
    });
  });

  describe('accessibility', () => {
    it('should accept aria-label', () => {
      render(<Select options={options} aria-label="Select a country" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-label', 'Select a country');
    });

    it('should accept aria-describedby', () => {
      render(
        <Select options={options} aria-describedby="help-text" aria-label="Test" />
      );
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-describedby', 'help-text');
    });

    it('should have aria-invalid when error is true', () => {
      render(<Select options={options} error aria-label="Test" />);
      expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('styling', () => {
    it('should accept custom className', () => {
      render(<Select options={options} className="custom-class" data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveClass('custom-class');
    });

    it('should render full width when fullWidth is true', () => {
      render(<Select options={options} fullWidth data-testid="select" />);
      expect(screen.getByTestId('select')).toHaveClass('select--full-width');
    });
  });
});
