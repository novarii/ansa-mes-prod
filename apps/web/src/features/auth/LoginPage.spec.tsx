/**
 * LoginPage Tests
 *
 * Tests for the login page component.
 *
 * @see specs/user-permission-model.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { LoginPage } from './LoginPage';
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
 * Wrapper component with all required providers
 */
function renderWithProviders(initialRoute = '/login'): ReturnType<typeof render> {
  // Placeholder for station select page - to verify navigation
  function StationSelectPage(): JSX.Element {
    return <div data-testid="station-select-page">Station Select Page</div>;
  }

  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <I18nProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/select-station" element={<StationSelectPage />} />
          </Routes>
        </AuthProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('rendering', () => {
    it('should render login form with all required fields', () => {
      renderWithProviders();

      // Check for title
      expect(screen.getByRole('heading', { name: /kullanici girisi/i })).toBeInTheDocument();

      // Check for employee ID input
      expect(screen.getByLabelText(/personel numarasi/i)).toBeInTheDocument();

      // Check for PIN input
      expect(screen.getByLabelText(/pin|sifre/i)).toBeInTheDocument();

      // Check for submit button
      expect(screen.getByRole('button', { name: /giris yap/i })).toBeInTheDocument();
    });

    it('should render employee ID input as numeric', () => {
      renderWithProviders();

      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      expect(empIdInput).toHaveAttribute('type', 'number');
    });

    it('should render PIN input as password field', () => {
      renderWithProviders();

      const pinInput = screen.getByLabelText(/pin|sifre/i);
      expect(pinInput).toHaveAttribute('type', 'password');
    });
  });

  describe('form validation', () => {
    it('should show error when employee ID is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Enter only PIN
      const pinInput = screen.getByLabelText(/pin|sifre/i);
      await user.type(pinInput, '1234');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText(/personel numarasi.*(zorunlu|gerekli)/i)).toBeInTheDocument();
      });
    });

    it('should show error when PIN is empty', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Enter only employee ID
      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      await user.type(empIdInput, '123');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // Check for validation error
      await waitFor(() => {
        expect(screen.getByText(/(pin|sifre).*(zorunlu|gerekli)/i)).toBeInTheDocument();
      });
    });

    it('should not submit when both fields are empty', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      // Submit form without entering anything
      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // API should not be called
      expect(apiModule.api.post).not.toHaveBeenCalled();
    });
  });

  describe('login flow', () => {
    it('should call login API with correct data on submit', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.post).mockResolvedValueOnce({
        success: true,
        empId: 123,
        empName: 'Test User',
        stationCount: 2,
      });

      renderWithProviders();

      // Fill in form
      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      const pinInput = screen.getByLabelText(/pin|sifre/i);
      await user.type(empIdInput, '123');
      await user.type(pinInput, '1234');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // Check API was called with correct data
      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith('/auth/login', {
          empId: 123,
          pin: '1234',
        });
      });
    });

    it('should show loading state during login', async () => {
      const user = userEvent.setup();
      // Delay the API response to verify loading state
      vi.mocked(apiModule.api.post).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  empId: 123,
                  empName: 'Test User',
                  stationCount: 1,
                }),
              100
            )
          )
      );

      renderWithProviders();

      // Fill in form
      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      const pinInput = screen.getByLabelText(/pin|sifre/i);
      await user.type(empIdInput, '123');
      await user.type(pinInput, '1234');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // Check loading state
      expect(screen.getByText(/giris yapiliyor/i)).toBeInTheDocument();

      // Wait for login to complete
      await waitFor(() => {
        expect(screen.queryByText(/giris yapiliyor/i)).not.toBeInTheDocument();
      });
    });

    it('should navigate to station selection on successful login', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.post).mockResolvedValueOnce({
        success: true,
        empId: 123,
        empName: 'Test User',
        stationCount: 2,
      });

      renderWithProviders();

      // Fill in form
      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      const pinInput = screen.getByLabelText(/pin|sifre/i);
      await user.type(empIdInput, '123');
      await user.type(pinInput, '1234');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // Should navigate to station selection page
      await waitFor(() => {
        expect(screen.getByTestId('station-select-page')).toBeInTheDocument();
      });
    });

    it('should display error message on login failure', async () => {
      const user = userEvent.setup();
      const mockError = new apiModule.ApiRequestError({
        statusCode: 401,
        message: 'Gecersiz kimlik bilgileri',
        error: 'UNAUTHORIZED',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/auth/login',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.post).mockRejectedValueOnce(mockError);

      renderWithProviders();

      // Fill in form
      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      const pinInput = screen.getByLabelText(/pin|sifre/i);
      await user.type(empIdInput, '123');
      await user.type(pinInput, 'wrong');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // Check error is displayed
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/gecersiz kimlik bilgileri/i)).toBeInTheDocument();
      });
    });

    it('should disable form inputs during login', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.post).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  empId: 123,
                  empName: 'Test User',
                  stationCount: 1,
                }),
              100
            )
          )
      );

      renderWithProviders();

      // Fill in form
      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      const pinInput = screen.getByLabelText(/pin|sifre/i);
      await user.type(empIdInput, '123');
      await user.type(pinInput, '1234');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // Check inputs are disabled during loading
      expect(empIdInput).toBeDisabled();
      expect(pinInput).toBeDisabled();
      expect(submitButton).toBeDisabled();

      // Wait for navigation to station select page after successful login
      await waitFor(() => {
        expect(screen.getByTestId('station-select-page')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper form labels', () => {
      renderWithProviders();

      // All inputs should have associated labels
      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      const pinInput = screen.getByLabelText(/pin|sifre/i);

      expect(empIdInput).toBeInTheDocument();
      expect(pinInput).toBeInTheDocument();
    });

    it('should focus employee ID input on mount', async () => {
      renderWithProviders();

      await waitFor(() => {
        const empIdInput = screen.getByLabelText(/personel numarasi/i);
        expect(empIdInput).toHaveFocus();
      });
    });

    it('should display errors with proper ARIA role', async () => {
      const user = userEvent.setup();
      const mockError = new apiModule.ApiRequestError({
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'UNAUTHORIZED',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/auth/login',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.post).mockRejectedValueOnce(mockError);

      renderWithProviders();

      // Fill in and submit form
      const empIdInput = screen.getByLabelText(/personel numarasi/i);
      const pinInput = screen.getByLabelText(/pin|sifre/i);
      await user.type(empIdInput, '123');
      await user.type(pinInput, '1234');

      const submitButton = screen.getByRole('button', { name: /giris yap/i });
      await user.click(submitButton);

      // Error should have alert role
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });
});
