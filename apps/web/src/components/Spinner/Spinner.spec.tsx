/**
 * Spinner Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  describe('rendering', () => {
    it('should render spinner', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should have loading text for screen readers', () => {
      render(<Spinner />);
      expect(screen.getByText('Yukleniyor...')).toBeInTheDocument();
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      render(<Spinner size="small" data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner--small');
    });

    it('should render medium size by default', () => {
      render(<Spinner data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner--medium');
    });

    it('should render large size', () => {
      render(<Spinner size="large" data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner--large');
    });
  });

  describe('colors', () => {
    it('should render primary color by default', () => {
      render(<Spinner data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner--primary');
    });

    it('should render white color', () => {
      render(<Spinner color="white" data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner--white');
    });

    it('should render inherit color', () => {
      render(<Spinner color="inherit" data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('spinner--inherit');
    });
  });

  describe('centered', () => {
    it('should render centered when centered prop is true', () => {
      render(<Spinner centered data-testid="spinner" />);
      expect(screen.getByTestId('spinner').parentElement).toHaveClass(
        'spinner-container--centered'
      );
    });
  });

  describe('label', () => {
    it('should render visible label when showLabel is true', () => {
      render(<Spinner showLabel />);
      const label = screen.getByText('Yukleniyor...');
      expect(label).not.toHaveClass('spinner__sr-only');
    });

    it('should render custom label', () => {
      render(<Spinner showLabel label="Please wait..." />);
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have aria-live attribute', () => {
      render(<Spinner />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('should pass additional props', () => {
      render(<Spinner data-testid="spinner" aria-label="Custom loading" />);
      expect(screen.getByTestId('spinner')).toHaveAttribute(
        'aria-label',
        'Custom loading'
      );
    });

    it('should pass custom className', () => {
      render(<Spinner className="custom-class" data-testid="spinner" />);
      expect(screen.getByTestId('spinner')).toHaveClass('custom-class');
    });
  });
});
