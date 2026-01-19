/**
 * Auth Context for MES Application
 *
 * Manages authentication state including employee login
 * and station selection. Persists to sessionStorage.
 *
 * @see specs/user-permission-model.md
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { api, ApiRequestError } from '../services/api';
import type {
  LoginRequest,
  LoginResponse,
  StationSelectRequest,
  StationSelectResponse,
  StationOption,
} from '@org/shared-types';

/**
 * Session storage key
 */
const SESSION_STORAGE_KEY = 'mes_auth_session';

/**
 * Auth session state
 */
interface AuthSession {
  empId: number;
  empName: string;
  stationCode: string | null;
  stationName: string | null;
  isDefaultWorker: boolean;
  loginTime: string;
}

/**
 * Auth context state
 */
interface AuthState {
  /** Whether user is authenticated (logged in) */
  isAuthenticated: boolean;
  /** Whether station is selected */
  isStationSelected: boolean;
  /** Employee ID */
  empId: number | null;
  /** Employee full name */
  empName: string | null;
  /** Selected station code */
  stationCode: string | null;
  /** Selected station name */
  stationName: string | null;
  /** Whether employee is default worker for selected station */
  isDefaultWorker: boolean;
  /** Login timestamp */
  loginTime: string | null;
  /** Loading state for auth operations */
  isLoading: boolean;
  /** Error from last auth operation */
  error: ApiRequestError | null;
}

/**
 * Auth context actions
 */
interface AuthActions {
  /** Login with employee ID and PIN */
  login: (empId: number, pin: string) => Promise<void>;
  /** Get authorized stations for logged-in user */
  getAuthorizedStations: () => Promise<StationOption[]>;
  /** Select a station */
  selectStation: (resCode: string) => Promise<void>;
  /** Logout and clear session */
  logout: () => void;
  /** Clear error state */
  clearError: () => void;
}

/**
 * Combined auth context value
 */
export type AuthContextValue = AuthState & AuthActions;

/**
 * Initial auth state
 */
const initialState: AuthState = {
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
};

/**
 * Auth context
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Load session from sessionStorage
 */
function loadSession(): Partial<AuthState> | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return null;

    const session: AuthSession = JSON.parse(stored);
    return {
      isAuthenticated: true,
      isStationSelected: session.stationCode !== null,
      empId: session.empId,
      empName: session.empName,
      stationCode: session.stationCode,
      stationName: session.stationName,
      isDefaultWorker: session.isDefaultWorker,
      loginTime: session.loginTime,
    };
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

/**
 * Save session to sessionStorage
 */
function saveSession(state: AuthState): void {
  if (!state.isAuthenticated || state.empId === null || state.empName === null) {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  const session: AuthSession = {
    empId: state.empId,
    empName: state.empName,
    stationCode: state.stationCode,
    stationName: state.stationName,
    isDefaultWorker: state.isDefaultWorker,
    loginTime: state.loginTime ?? new Date().toISOString(),
  };

  sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Clear session from sessionStorage
 */
function clearSession(): void {
  sessionStorage.removeItem(SESSION_STORAGE_KEY);
}

/**
 * Auth provider props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component
 */
export function AuthProvider({ children }: AuthProviderProps): JSX.Element {
  const [state, setState] = useState<AuthState>(() => {
    const savedSession = loadSession();
    return savedSession ? { ...initialState, ...savedSession } : initialState;
  });

  // Persist session changes to sessionStorage
  useEffect(() => {
    saveSession(state);
  }, [state]);

  const login = useCallback(async (empId: number, pin: string): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const request: LoginRequest = { empId, pin };
      const response = await api.post<LoginResponse>('/auth/login', request);

      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isStationSelected: false,
        empId: response.empId,
        empName: response.empName,
        stationCode: null,
        stationName: null,
        isDefaultWorker: false,
        loginTime: new Date().toISOString(),
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof ApiRequestError ? error : null,
      }));
      throw error;
    }
  }, []);

  const getAuthorizedStations = useCallback(async (): Promise<StationOption[]> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const stations = await api.get<StationOption[]>('/auth/stations');
      setState((prev) => ({ ...prev, isLoading: false }));
      return stations;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof ApiRequestError ? error : null,
      }));
      throw error;
    }
  }, []);

  const selectStation = useCallback(async (resCode: string): Promise<void> => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const request: StationSelectRequest = { stationCode: resCode };
      const response = await api.post<StationSelectResponse>(
        '/auth/select-station',
        request
      );

      setState((prev) => ({
        ...prev,
        isStationSelected: true,
        stationCode: response.session.stationCode,
        stationName: response.session.stationName,
        isDefaultWorker: response.session.isDefaultWorker,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof ApiRequestError ? error : null,
      }));
      throw error;
    }
  }, []);

  const logout = useCallback((): void => {
    // Call logout API (fire and forget)
    api.post('/auth/logout').catch(() => {
      // Ignore errors - we're logging out anyway
    });

    clearSession();
    setState(initialState);
  }, []);

  const clearError = useCallback((): void => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login,
      getAuthorizedStations,
      selectStation,
      logout,
      clearError,
    }),
    [state, login, getAuthorizedStations, selectStation, logout, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
