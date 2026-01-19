/**
 * StationSelectPage Tests
 *
 * Tests for the station selection page component.
 *
 * @see specs/user-permission-model.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StationSelectPage } from './StationSelectPage';
import { AuthProvider } from '../../context/AuthContext';
import { I18nProvider } from '@org/shared-i18n';
import * as apiModule from '../../services/api';

// Mock the API module
vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  ApiRequestError: class ApiRequestError extends Error {
    statusCode: number;
    errorType: string;
    timestamp: string;
    path: string;
    correlationId: string;
    messageKey?: string;
    constructor(data: {
      statusCode: number;
      message: string;
      error: string;
      timestamp: string;
      path: string;
      correlationId: string;
      messageKey?: string;
    }) {
      super(data.message);
      this.statusCode = data.statusCode;
      this.errorType = data.error;
      this.timestamp = data.timestamp;
      this.path = data.path;
      this.correlationId = data.correlationId;
      this.messageKey = data.messageKey;
    }
  },
}));

/**
 * Helper to set up authenticated session
 */
function setupAuthenticatedSession(): void {
  sessionStorage.setItem(
    'mes_auth_session',
    JSON.stringify({
      empId: 123,
      empName: 'Test User',
      stationCode: null,
      stationName: null,
      isDefaultWorker: false,
      loginTime: '2026-01-19T10:00:00Z',
    })
  );
}

/**
 * Wrapper component with all required providers
 */
function renderWithProviders(initialRoute = '/select-station'): ReturnType<typeof render> {
  // Placeholder for dashboard page - to verify navigation
  function DashboardPage(): JSX.Element {
    return <div data-testid="dashboard-page">Dashboard Page</div>;
  }

  function LoginPage(): JSX.Element {
    return <div data-testid="login-page">Login Page</div>;
  }

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <I18nProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/select-station" element={<StationSelectPage />} />
            <Route path="/" element={<DashboardPage />} />
          </Routes>
        </AuthProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('StationSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('rendering', () => {
    it('should render station selection page with title', async () => {
      setupAuthenticatedSession();

      // Mock stations API
      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Machine 1', isDefault: true },
        { code: 'M002', name: 'Machine 2', isDefault: false },
      ] });

      renderWithProviders();

      // Check for title
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /istasyon secimi/i })).toBeInTheDocument();
      });
    });

    it('should render station list from API', async () => {
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Makine 1', isDefault: false },
        { code: 'M002', name: 'Makine 2', isDefault: true },
        { code: 'M003', name: 'Makine 3', isDefault: false },
      ] });

      renderWithProviders();

      // Check stations are displayed
      await waitFor(() => {
        expect(screen.getByText('Makine 1')).toBeInTheDocument();
        expect(screen.getByText('Makine 2')).toBeInTheDocument();
        expect(screen.getByText('Makine 3')).toBeInTheDocument();
      });
    });

    it('should mark default station with badge', async () => {
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Machine 1', isDefault: false },
        { code: 'M002', name: 'Machine 2', isDefault: true },
      ] });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Machine 2')).toBeInTheDocument();
      });

      // Find the default badge near Machine 2
      expect(screen.getByText(/varsayilan/i)).toBeInTheDocument();
    });

    it('should show loading state while fetching stations', async () => {
      setupAuthenticatedSession();

      // Delay the API response
      vi.mocked(apiModule.api.get).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  empId: 123,
                  stations: [{ code: 'M001', name: 'Machine 1', isDefault: false }],
                }),
              100
            )
          )
      );

      renderWithProviders();

      // Check for loading indicator
      expect(screen.getByText(/yukleniyor/i)).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText(/yukleniyor/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('station selection', () => {
    it('should call select station API when station is clicked', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Machine 1', isDefault: false },
        { code: 'M002', name: 'Machine 2', isDefault: false },
      ] });

      vi.mocked(apiModule.api.post).mockResolvedValueOnce({
        success: true,
        session: {
          empID: 123,
          empName: 'Test User',
          stationCode: 'M001',
          stationName: 'Machine 1',
          isDefaultWorker: false,
          loginTime: '2026-01-19T10:00:00Z',
        },
      });

      renderWithProviders();

      // Wait for stations to load
      await waitFor(() => {
        expect(screen.getByText('Machine 1')).toBeInTheDocument();
      });

      // Click on a station
      await user.click(screen.getByText('Machine 1'));

      // Find and click confirm button
      const confirmButton = screen.getByRole('button', { name: /onayla|sec/i });
      await user.click(confirmButton);

      // Check API was called
      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith('/auth/select-station', {
          stationCode: 'M001',
        });
      });
    });

    it('should navigate to dashboard on successful selection', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Machine 1', isDefault: false },
      ] });

      vi.mocked(apiModule.api.post).mockResolvedValueOnce({
        success: true,
        session: {
          empID: 123,
          empName: 'Test User',
          stationCode: 'M001',
          stationName: 'Machine 1',
          isDefaultWorker: false,
          loginTime: '2026-01-19T10:00:00Z',
        },
      });

      renderWithProviders();

      // Wait for stations to load
      await waitFor(() => {
        expect(screen.getByText('Machine 1')).toBeInTheDocument();
      });

      // Select station
      await user.click(screen.getByText('Machine 1'));

      // Confirm selection
      const confirmButton = screen.getByRole('button', { name: /onayla|sec/i });
      await user.click(confirmButton);

      // Should navigate to dashboard
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
      });
    });

    it('should display error on selection failure', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Machine 1', isDefault: false },
      ] });

      const mockError = new apiModule.ApiRequestError({
        statusCode: 401,
        message: 'Bu istasyona erisim yetkiniz yok',
        error: 'UNAUTHORIZED',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/auth/select-station',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.post).mockRejectedValueOnce(mockError);

      renderWithProviders();

      // Wait for stations to load
      await waitFor(() => {
        expect(screen.getByText('Machine 1')).toBeInTheDocument();
      });

      // Select and confirm
      await user.click(screen.getByText('Machine 1'));
      const confirmButton = screen.getByRole('button', { name: /onayla|sec/i });
      await user.click(confirmButton);

      // Check error is displayed
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/bu istasyona erisim yetkiniz yok/i)).toBeInTheDocument();
      });
    });

    it('should pre-select default station', async () => {
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Machine 1', isDefault: false },
        { code: 'M002', name: 'Machine 2', isDefault: true },
      ] });

      renderWithProviders();

      // Wait for stations to load
      await waitFor(() => {
        expect(screen.getByText('Machine 2')).toBeInTheDocument();
      });

      // Check Machine 2 (default) is pre-selected
      // This could be indicated by aria-selected, a checked radio, or visual styling
      const machine2Item = screen.getByText('Machine 2').closest('[data-selected]');
      expect(machine2Item).toHaveAttribute('data-selected', 'true');
    });
  });

  describe('empty state', () => {
    it('should show message when user has no authorized stations', async () => {
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [] });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/yetkili istasyon bulunamadi/i)).toBeInTheDocument();
      });
    });
  });

  describe('error state', () => {
    it('should show error when fetching stations fails', async () => {
      setupAuthenticatedSession();

      const mockError = new apiModule.ApiRequestError({
        statusCode: 500,
        message: 'Server error',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/auth/stations',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.get).mockRejectedValueOnce(mockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('user display', () => {
    it('should display logged in user name', async () => {
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Machine 1', isDefault: false },
      ] });

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/test user/i)).toBeInTheDocument();
      });
    });
  });

  describe('logout', () => {
    it('should allow user to logout from station selection', async () => {
      const user = userEvent.setup();
      setupAuthenticatedSession();

      vi.mocked(apiModule.api.get).mockResolvedValueOnce({ empId: 123, stations: [
        { code: 'M001', name: 'Machine 1', isDefault: false },
      ] });

      vi.mocked(apiModule.api.post).mockResolvedValueOnce({ success: true });

      renderWithProviders();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Machine 1')).toBeInTheDocument();
      });

      // Find and click logout button
      const logoutButton = screen.getByRole('button', { name: /cikis|logout/i });
      await user.click(logoutButton);

      // Should navigate to login page
      await waitFor(() => {
        expect(screen.getByTestId('login-page')).toBeInTheDocument();
      });
    });
  });
});
