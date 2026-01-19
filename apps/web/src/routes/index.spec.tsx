/**
 * Routes Tests
 *
 * Tests for application routing and auth guards.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './index';
import { I18nProvider } from '@org/shared-i18n';
import * as AuthContext from '../context/AuthContext';

// Mock the auth context
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Helper to render routes with a specific path
function renderWithRouter(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <I18nProvider>
        <AppRoutes />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('unauthenticated user', () => {
    beforeEach(() => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isAuthenticated: false,
        isStationSelected: false,
        empId: null,
        empName: null,
        stationCode: null,
        stationName: null,
        isDefaultWorker: false,
        loginTime: null,
        isLoading: false,
        error: null,
        login: vi.fn(),
        getAuthorizedStations: vi.fn(),
        selectStation: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });
    });

    it('should show login page at /login', () => {
      renderWithRouter('/login');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should redirect to login from protected route /', () => {
      renderWithRouter('/');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should redirect to login from /work-orders/:docEntry', () => {
      renderWithRouter('/work-orders/123');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should redirect to login from /team', () => {
      renderWithRouter('/team');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should redirect to login from /calendar', () => {
      renderWithRouter('/calendar');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('should redirect to login from /select-station', () => {
      renderWithRouter('/select-station');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  describe('authenticated user without station', () => {
    beforeEach(() => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isAuthenticated: true,
        isStationSelected: false,
        empId: 123,
        empName: 'Test User',
        stationCode: null,
        stationName: null,
        isDefaultWorker: false,
        loginTime: '2026-01-19T10:00:00Z',
        isLoading: false,
        error: null,
        login: vi.fn(),
        getAuthorizedStations: vi.fn().mockResolvedValue([
          { code: 'M001', name: 'Machine 1', isDefault: false },
        ]),
        selectStation: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });
    });

    it('should show station select page at /select-station', async () => {
      renderWithRouter('/select-station');
      await waitFor(() => {
        expect(screen.getByTestId('station-select-page')).toBeInTheDocument();
      });
    });

    it('should redirect to station select from /', async () => {
      renderWithRouter('/');
      await waitFor(() => {
        expect(screen.getByTestId('station-select-page')).toBeInTheDocument();
      });
    });

    it('should redirect to station select from /login', async () => {
      renderWithRouter('/login');
      await waitFor(() => {
        expect(screen.getByTestId('station-select-page')).toBeInTheDocument();
      });
    });

    it('should redirect to station select from /team', async () => {
      renderWithRouter('/team');
      await waitFor(() => {
        expect(screen.getByTestId('station-select-page')).toBeInTheDocument();
      });
    });
  });

  describe('fully authenticated user (with station)', () => {
    beforeEach(() => {
      vi.mocked(AuthContext.useAuth).mockReturnValue({
        isAuthenticated: true,
        isStationSelected: true,
        empId: 123,
        empName: 'Test User',
        stationCode: 'M001',
        stationName: 'Machine 1',
        isDefaultWorker: true,
        loginTime: '2026-01-19T10:00:00Z',
        isLoading: false,
        error: null,
        login: vi.fn(),
        getAuthorizedStations: vi.fn(),
        selectStation: vi.fn(),
        logout: vi.fn(),
        clearError: vi.fn(),
      });
    });

    it('should show work order list at /', () => {
      renderWithRouter('/');
      expect(screen.getByTestId('work-order-list-page')).toBeInTheDocument();
    });

    it('should show work order detail at /work-orders/:docEntry', () => {
      renderWithRouter('/work-orders/123');
      expect(screen.getByTestId('work-order-detail-page')).toBeInTheDocument();
    });

    it('should show team page at /team', () => {
      renderWithRouter('/team');
      expect(screen.getByTestId('team-page')).toBeInTheDocument();
    });

    it('should show calendar page at /calendar', () => {
      renderWithRouter('/calendar');
      expect(screen.getByTestId('calendar-page')).toBeInTheDocument();
    });

    it('should redirect to / from /login', () => {
      renderWithRouter('/login');
      expect(screen.getByTestId('work-order-list-page')).toBeInTheDocument();
    });

    it('should redirect to / from unknown routes', () => {
      renderWithRouter('/unknown-route');
      expect(screen.getByTestId('work-order-list-page')).toBeInTheDocument();
    });
  });
});
