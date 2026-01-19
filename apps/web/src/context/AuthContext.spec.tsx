/**
 * AuthContext Tests
 *
 * Tests for authentication state management.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as apiModule from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
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
    constructor(data: {
      statusCode: number;
      message: string;
      error: string;
      timestamp: string;
      path: string;
      correlationId: string;
    }) {
      super(data.message);
      this.statusCode = data.statusCode;
      this.errorType = data.error;
      this.timestamp = data.timestamp;
      this.path = data.path;
      this.correlationId = data.correlationId;
    }
  },
}));

// Test component that exposes auth state
function TestComponent(): JSX.Element {
  const auth = useAuth();

  const handleLogin = (): void => {
    auth.login(123, '1234').catch(() => {
      // Error is stored in auth state
    });
  };

  const handleGetStations = (): void => {
    auth.getAuthorizedStations().catch(() => {
      // Error is stored in auth state
    });
  };

  const handleSelectStation = (): void => {
    auth.selectStation('M001').catch(() => {
      // Error is stored in auth state
    });
  };

  return (
    <div>
      <span data-testid="is-authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="is-station-selected">{String(auth.isStationSelected)}</span>
      <span data-testid="emp-id">{auth.empId ?? 'null'}</span>
      <span data-testid="emp-name">{auth.empName ?? 'null'}</span>
      <span data-testid="station-code">{auth.stationCode ?? 'null'}</span>
      <span data-testid="is-loading">{String(auth.isLoading)}</span>
      <span data-testid="error">{auth.error?.message ?? 'null'}</span>
      <button onClick={handleLogin}>Login</button>
      <button onClick={handleGetStations}>Get Stations</button>
      <button onClick={handleSelectStation}>Select Station</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('initial state', () => {
    it('should start with unauthenticated state', () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('is-station-selected')).toHaveTextContent('false');
      expect(screen.getByTestId('emp-id')).toHaveTextContent('null');
    });

    it('should restore session from sessionStorage', () => {
      sessionStorage.setItem(
        'mes_auth_session',
        JSON.stringify({
          empId: 123,
          empName: 'Test User',
          stationCode: 'M001',
          stationName: 'Machine 1',
          isDefaultWorker: true,
          loginTime: '2026-01-19T10:00:00Z',
        })
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      expect(screen.getByTestId('is-station-selected')).toHaveTextContent('true');
      expect(screen.getByTestId('emp-id')).toHaveTextContent('123');
      expect(screen.getByTestId('emp-name')).toHaveTextContent('Test User');
      expect(screen.getByTestId('station-code')).toHaveTextContent('M001');
    });
  });

  describe('login', () => {
    it('should update state on successful login', async () => {
      vi.mocked(apiModule.api.post).mockResolvedValueOnce({
        success: true,
        empId: 456,
        empName: 'John Doe',
        stationCount: 2,
        token: 'test-login-token',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('emp-id')).toHaveTextContent('456');
      expect(screen.getByTestId('emp-name')).toHaveTextContent('John Doe');
      expect(screen.getByTestId('is-station-selected')).toHaveTextContent('false');
    });

    it('should store token in sessionStorage on successful login', async () => {
      vi.mocked(apiModule.api.post).mockResolvedValueOnce({
        success: true,
        empId: 456,
        empName: 'John Doe',
        stationCount: 2,
        token: 'login-token-xyz',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Verify token is stored
      expect(sessionStorage.getItem('mes_auth_token')).toBe('login-token-xyz');
    });

    it('should set error state on login failure', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'UNAUTHORIZED',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/auth/login',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.post).mockRejectedValueOnce(mockError);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      });

      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
    });
  });

  describe('selectStation', () => {
    it('should update state on successful station selection', async () => {
      // First login
      vi.mocked(apiModule.api.post).mockResolvedValueOnce({
        success: true,
        empId: 123,
        empName: 'Test User',
        stationCount: 1,
        token: 'login-token',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');
      });

      // Then select station
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
        token: 'station-token',
      });

      await act(async () => {
        screen.getByText('Select Station').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-station-selected')).toHaveTextContent('true');
      });

      expect(screen.getByTestId('station-code')).toHaveTextContent('M001');
    });

    it('should replace token on successful station selection', async () => {
      // First login
      vi.mocked(apiModule.api.post).mockResolvedValueOnce({
        success: true,
        empId: 123,
        empName: 'Test User',
        stationCount: 1,
        token: 'old-login-token',
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await act(async () => {
        screen.getByText('Login').click();
      });

      await waitFor(() => {
        expect(sessionStorage.getItem('mes_auth_token')).toBe('old-login-token');
      });

      // Then select station - backend issues new token
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
        token: 'new-station-token',
      });

      await act(async () => {
        screen.getByText('Select Station').click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('is-station-selected')).toHaveTextContent('true');
      });

      // Verify token was replaced
      expect(sessionStorage.getItem('mes_auth_token')).toBe('new-station-token');
    });
  });

  describe('logout', () => {
    it('should clear state and session storage including token', async () => {
      // Start with authenticated state
      sessionStorage.setItem(
        'mes_auth_session',
        JSON.stringify({
          empId: 123,
          empName: 'Test User',
          stationCode: 'M001',
          stationName: 'Machine 1',
          isDefaultWorker: true,
          loginTime: '2026-01-19T10:00:00Z',
        })
      );
      sessionStorage.setItem('mes_auth_token', 'some-token');

      vi.mocked(apiModule.api.post).mockResolvedValueOnce({ success: true });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('true');

      await act(async () => {
        screen.getByText('Logout').click();
      });

      expect(screen.getByTestId('is-authenticated')).toHaveTextContent('false');
      expect(screen.getByTestId('is-station-selected')).toHaveTextContent('false');
      expect(screen.getByTestId('emp-id')).toHaveTextContent('null');
      expect(sessionStorage.getItem('mes_auth_session')).toBeNull();
      expect(sessionStorage.getItem('mes_auth_token')).toBeNull();
    });
  });

  describe('useAuth outside provider', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        render(<TestComponent />);
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
