/**
 * Layout Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';

// Mock useAuth hook
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    empName: 'Test User',
    stationName: 'Machine 1',
    isStationSelected: true,
    logout: vi.fn(),
  }),
}));

// Wrapper for router context
function renderWithRouter(
  ui: React.ReactElement,
  { route = '/' } = {}
): ReturnType<typeof render> {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('Layout', () => {
  describe('rendering', () => {
    it('should render children', () => {
      renderWithRouter(
        <Layout>
          <div data-testid="content">Page content</div>
        </Layout>
      );
      expect(screen.getByTestId('content')).toBeInTheDocument();
    });

    it('should render navigation', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render main element', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      expect(screen.getByRole('main')).toBeInTheDocument();
    });
  });

  describe('navigation links', () => {
    it('should render work orders link', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      expect(screen.getByRole('link', { name: /islerim|anasayfa/i })).toBeInTheDocument();
    });

    it('should render team link', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      expect(screen.getByRole('link', { name: /ekibim/i })).toBeInTheDocument();
    });

    it('should render calendar link', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      expect(screen.getByRole('link', { name: /takvim/i })).toBeInTheDocument();
    });
  });

  describe('user info', () => {
    it('should display station name', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      expect(screen.getByText('Machine 1')).toBeInTheDocument();
    });

    it('should display user name', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper landmark structure', () => {
      renderWithRouter(
        <Layout>
          <div>Content</div>
        </Layout>
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should accept className', () => {
      renderWithRouter(
        <Layout className="custom-layout">
          <div>Content</div>
        </Layout>
      );
      expect(document.querySelector('.custom-layout')).toBeInTheDocument();
    });
  });
});
