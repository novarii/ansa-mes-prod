/**
 * Card Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Card } from './Card';

describe('Card', () => {
  describe('rendering', () => {
    it('should render with children', () => {
      render(<Card>Card content</Card>);
      expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(<Card title="Card Title">Content</Card>);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should render with subtitle', () => {
      render(
        <Card title="Title" subtitle="Subtitle">
          Content
        </Card>
      );
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });

    it('should render header actions', () => {
      render(
        <Card
          title="Title"
          headerActions={<button>Action</button>}
        >
          Content
        </Card>
      );
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('should render footer', () => {
      render(
        <Card footer={<div>Footer content</div>}>
          Body content
        </Card>
      );
      expect(screen.getByText('Footer content')).toBeInTheDocument();
    });
  });

  describe('padding variants', () => {
    it('should render with default padding', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--padding-default');
    });

    it('should render with none padding', () => {
      render(<Card padding="none" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--padding-none');
    });

    it('should render with compact padding', () => {
      render(<Card padding="compact" data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('card--padding-compact');
    });
  });

  describe('clickable behavior', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(<Card onClick={handleClick}>Click me</Card>);

      await user.click(screen.getByText('Click me'));

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have clickable class when onClick is provided', () => {
      render(
        <Card onClick={() => {}} data-testid="card">
          Content
        </Card>
      );
      expect(screen.getByTestId('card')).toHaveClass('card--clickable');
    });

    it('should be keyboard accessible when clickable', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick} data-testid="card">
          Content
        </Card>
      );

      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');

      card.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('border variants', () => {
    it('should render with border by default', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('border');
    });

    it('should render without border when noBorder is true', () => {
      render(<Card noBorder data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).not.toHaveClass('border');
    });
  });

  describe('shadow variants', () => {
    it('should render with shadow by default', () => {
      render(<Card data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).toHaveClass('shadow-xs');
    });

    it('should render without shadow when noShadow is true', () => {
      render(<Card noShadow data-testid="card">Content</Card>);
      expect(screen.getByTestId('card')).not.toHaveClass('shadow-xs');
    });
  });

  describe('accessibility', () => {
    it('should pass custom className', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      );
      expect(screen.getByTestId('card')).toHaveClass('custom-class');
    });

    it('should pass additional props', () => {
      render(
        <Card data-testid="card" aria-label="Custom card">
          Content
        </Card>
      );
      expect(screen.getByTestId('card')).toHaveAttribute('aria-label', 'Custom card');
    });
  });
});
