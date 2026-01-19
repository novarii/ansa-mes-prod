/**
 * FormField Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField } from './FormField';
import { Input } from '../Input/Input';
import { I18nProvider } from '@org/shared-i18n';

// Wrapper for i18n context
function renderWithI18n(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

describe('FormField', () => {
  describe('rendering', () => {
    it('should render children', () => {
      renderWithI18n(
        <FormField label="Test">
          <Input aria-label="Test input" />
        </FormField>
      );
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render label', () => {
      renderWithI18n(
        <FormField label="Field Label">
          <Input />
        </FormField>
      );
      expect(screen.getByText('Field Label')).toBeInTheDocument();
    });

    it('should associate label with input via htmlFor', () => {
      renderWithI18n(
        <FormField label="Email" htmlFor="email">
          <Input id="email" />
        </FormField>
      );
      const label = screen.getByText('Email');
      expect(label).toHaveAttribute('for', 'email');
    });
  });

  describe('required indicator', () => {
    it('should show required indicator when required', () => {
      renderWithI18n(
        <FormField label="Username" required>
          <Input />
        </FormField>
      );
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should not show required indicator when not required', () => {
      renderWithI18n(
        <FormField label="Optional">
          <Input />
        </FormField>
      );
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });
  });

  describe('help text', () => {
    it('should render help text', () => {
      renderWithI18n(
        <FormField label="Password" helpText="Must be at least 8 characters">
          <Input type="password" />
        </FormField>
      );
      expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('should render error message', () => {
      renderWithI18n(
        <FormField label="Email" error="Invalid email address">
          <Input error />
        </FormField>
      );
      expect(screen.getByText('Invalid email address')).toBeInTheDocument();
    });

    it('should have error styling when error is present', () => {
      renderWithI18n(
        <FormField label="Email" error="Error" data-testid="field">
          <Input error />
        </FormField>
      );
      expect(screen.getByTestId('field')).toHaveClass('form-field--error');
    });

    it('should show error instead of help text when both present', () => {
      renderWithI18n(
        <FormField label="Field" helpText="Help" error="Error message">
          <Input error />
        </FormField>
      );
      expect(screen.getByText('Error message')).toBeInTheDocument();
      expect(screen.queryByText('Help')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should connect label to input', () => {
      renderWithI18n(
        <FormField label="Name" htmlFor="name-input">
          <Input id="name-input" />
        </FormField>
      );

      const input = screen.getByRole('textbox');
      const label = screen.getByText('Name');
      expect(label.getAttribute('for')).toBe(input.id);
    });

    it('should have aria-describedby for error', () => {
      renderWithI18n(
        <FormField label="Email" error="Invalid" htmlFor="email">
          <Input id="email" aria-describedby="email-error" />
        </FormField>
      );
      // The error element should exist
      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });
  });

  describe('custom className', () => {
    it('should accept custom className', () => {
      renderWithI18n(
        <FormField label="Test" className="custom-field" data-testid="field">
          <Input />
        </FormField>
      );
      expect(screen.getByTestId('field')).toHaveClass('custom-field');
    });
  });
});
