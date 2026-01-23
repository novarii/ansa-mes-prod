/**
 * NavBar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NavBar } from './NavBar';

// Mock the auth context
const mockLogout = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    empName: 'Test User',
    stationName: 'Machine 1',
    stationCode: 'M001',
    isStationSelected: true,
    logout: mockLogout,
  }),
}));

// Wrapper for router context
function renderWithRouter(
  ui: React.ReactElement,
  { route = '/' } = {}
): ReturnType<typeof render> {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('NavBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render navigation', () => {
      renderWithRouter(<NavBar />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should render logo/brand', () => {
      renderWithRouter(<NavBar />);
      expect(screen.getByText(/ansa|mes/i)).toBeInTheDocument();
    });

    it('should render navigation links', () => {
      renderWithRouter(<NavBar />);

      // Main navigation links
      expect(screen.getByRole('link', { name: /anasayfa/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /ekibim/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /takvim/i })).toBeInTheDocument();
    });
  });

  describe('user info display', () => {
    it('should display station name', () => {
      renderWithRouter(<NavBar />);
      expect(screen.getByText('Machine 1')).toBeInTheDocument();
    });

    it('should display user name', () => {
      renderWithRouter(<NavBar />);
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('logout', () => {
    it('should call logout when logout button clicked', async () => {
      const user = userEvent.setup();
      renderWithRouter(<NavBar />);

      const logoutButton = screen.getByRole('button', { name: /cikis|logout/i });
      await user.click(logoutButton);

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('active link highlighting', () => {
    it('should highlight home link when on home route', () => {
      renderWithRouter(<NavBar />, { route: '/' });
      const homeLink = screen.getByRole('link', { name: /anasayfa/i });
      // Active link has bg-accent class (Tailwind)
      expect(homeLink).toHaveClass('bg-accent');
    });

    it('should highlight team link when on team route', () => {
      renderWithRouter(<NavBar />, { route: '/team' });
      const teamLink = screen.getByRole('link', { name: /ekibim/i });
      expect(teamLink).toHaveClass('bg-accent');
    });

    it('should highlight calendar link when on calendar route', () => {
      renderWithRouter(<NavBar />, { route: '/calendar' });
      const calendarLink = screen.getByRole('link', { name: /takvim/i });
      expect(calendarLink).toHaveClass('bg-accent');
    });
  });

  describe('accessibility', () => {
    it('should have navigation landmark', () => {
      renderWithRouter(<NavBar />);
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should accept className', () => {
      renderWithRouter(<NavBar className="custom-nav" />);
      expect(screen.getByRole('navigation')).toHaveClass('custom-nav');
    });
  });
});
