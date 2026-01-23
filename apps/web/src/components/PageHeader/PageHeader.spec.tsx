/**
 * PageHeader Component Tests
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PageHeader } from './PageHeader';

// Wrapper for router context
function renderWithRouter(
  ui: React.ReactElement,
  { route = '/' } = {}
): ReturnType<typeof render> {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('PageHeader', () => {
  describe('rendering', () => {
    it('should render title', () => {
      renderWithRouter(<PageHeader title="Page Title" />);
      expect(screen.getByRole('heading', { name: 'Page Title' })).toBeInTheDocument();
    });

    it('should render subtitle', () => {
      renderWithRouter(<PageHeader title="Title" subtitle="Subtitle text" />);
      expect(screen.getByText('Subtitle text')).toBeInTheDocument();
    });

    it('should render actions', () => {
      renderWithRouter(
        <PageHeader
          title="Title"
          actions={<button>Action Button</button>}
        />
      );
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });
  });

  describe('back navigation', () => {
    it('should not render back button by default', () => {
      renderWithRouter(<PageHeader title="Title" />);
      expect(screen.queryByRole('link', { name: /geri|back/i })).not.toBeInTheDocument();
    });

    it('should render back button when backTo is provided', () => {
      renderWithRouter(<PageHeader title="Title" backTo="/" />);
      expect(screen.getByRole('link', { name: /geri|back/i })).toBeInTheDocument();
    });

    it('should link to correct path', () => {
      renderWithRouter(<PageHeader title="Title" backTo="/work-orders" />);
      const backLink = screen.getByRole('link', { name: /geri|back/i });
      expect(backLink).toHaveAttribute('href', '/work-orders');
    });

    it('should render custom back label', () => {
      renderWithRouter(
        <PageHeader title="Title" backTo="/" backLabel="Go Home" />
      );
      expect(screen.getByRole('link', { name: 'Go Home' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should use correct heading level', () => {
      renderWithRouter(<PageHeader title="Title" />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Title');
    });

    it('should accept className', () => {
      renderWithRouter(<PageHeader title="Title" className="custom-header" />);
      expect(document.querySelector('.custom-header')).toBeInTheDocument();
    });
  });

  describe('layout', () => {
    it('should render with proper structure', () => {
      renderWithRouter(
        <PageHeader
          title="Title"
          subtitle="Subtitle"
          backTo="/"
          actions={<button>Action</button>}
        />
      );

      // All elements present
      expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /geri|back/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
  });
});
