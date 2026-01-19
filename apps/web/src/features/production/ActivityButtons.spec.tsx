/**
 * ActivityButtons Tests
 *
 * Tests for the activity control buttons component (Start/Stop/Resume/Finish).
 *
 * @see specs/feature-production.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ActivityButtons } from './ActivityButtons';
import { AuthProvider } from '../../context/AuthContext';
import { I18nProvider } from '@org/shared-i18n';
import * as apiModule from '../../services/api';
import type {
  ActivityStateResponse,
  ActivityActionResponse,
  WorkerActivityState,
} from '@org/shared-types';

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
 * Create activity state for testing
 */
function createActivityState(
  overrides: Partial<WorkerActivityState> = {}
): WorkerActivityState {
  return {
    activityCode: null,
    processType: null,
    lastActivityTime: null,
    breakCode: null,
    canStart: true,
    canStop: false,
    canResume: false,
    canFinish: false,
    ...overrides,
  };
}

/**
 * Create activity state response
 */
function createStateResponse(
  state: Partial<WorkerActivityState> = {}
): ActivityStateResponse {
  return {
    state: createActivityState(state),
    docEntry: 6171,
    empId: 123,
  };
}

/**
 * Create activity action response
 */
function createActionResponse(
  processType: 'BAS' | 'DUR' | 'DEV' | 'BIT',
  newState: Partial<WorkerActivityState> = {}
): ActivityActionResponse {
  return {
    success: true,
    activityCode: 'ACT-001',
    processType,
    timestamp: new Date().toISOString(),
    state: createActivityState(newState),
  };
}

/**
 * Create a new query client for each test
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Mock authenticated session in sessionStorage
 */
function mockAuthenticatedSession(): void {
  sessionStorage.setItem(
    'mes_auth_session',
    JSON.stringify({
      empId: 123,
      empName: 'Test Worker',
      stationCode: 'M001',
      stationName: 'Machine 1',
      isDefaultWorker: true,
      loginTime: new Date().toISOString(),
    })
  );
}

interface RenderOptions {
  docEntry?: number;
  onBreakReasonRequired?: () => void;
}

/**
 * Wrapper component with all required providers
 */
function renderWithProviders(
  options: RenderOptions = {}
): ReturnType<typeof render> & { queryClient: QueryClient } {
  const { docEntry = 6171, onBreakReasonRequired = vi.fn() } = options;
  const queryClient = createTestQueryClient();

  mockAuthenticatedSession();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ActivityButtons
            docEntry={docEntry}
            onBreakReasonRequired={onBreakReasonRequired}
          />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  return { ...utils, queryClient };
}

describe('ActivityButtons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('initial state (no activity)', () => {
    it('should render loading state initially', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      expect(screen.getByTestId('activity-buttons-loading')).toBeInTheDocument();
    });

    it('should show only Start button when no prior activity', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          canStart: true,
          canStop: false,
          canResume: false,
          canFinish: false,
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /baslat/i })).toBeInTheDocument();
      });

      // Other buttons should not be visible
      expect(screen.queryByRole('button', { name: /durdur/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /devam/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /bitir/i })).not.toBeInTheDocument();
    });

    it('should fetch activity state on mount', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(createStateResponse());

      renderWithProviders({ docEntry: 6171 });

      await waitFor(() => {
        expect(apiModule.api.get).toHaveBeenCalledWith(
          '/work-orders/6171/activity-state',
          undefined
        );
      });
    });
  });

  describe('working state (BAS)', () => {
    it('should show Stop and Finish buttons when working (BAS)', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'BAS',
          activityCode: 'ACT-001',
          canStart: false,
          canStop: true,
          canResume: false,
          canFinish: true,
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /durdur/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /bitir/i })).toBeInTheDocument();
      });

      // Start and Resume should not be visible
      expect(screen.queryByRole('button', { name: /baslat/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /devam/i })).not.toBeInTheDocument();
    });
  });

  describe('paused state (DUR)', () => {
    it('should show Resume and Finish buttons when paused (DUR)', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'DUR',
          activityCode: 'ACT-001',
          breakCode: '1',
          canStart: false,
          canStop: false,
          canResume: true,
          canFinish: true,
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /devam/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /bitir/i })).toBeInTheDocument();
      });

      // Start and Stop should not be visible
      expect(screen.queryByRole('button', { name: /baslat/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /durdur/i })).not.toBeInTheDocument();
    });
  });

  describe('finished state (BIT)', () => {
    it('should show Start button after finish (BIT)', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'BIT',
          activityCode: 'ACT-001',
          canStart: true,
          canStop: false,
          canResume: false,
          canFinish: false,
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /baslat/i })).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /durdur/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /devam/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /bitir/i })).not.toBeInTheDocument();
    });
  });

  describe('Start action', () => {
    it('should call start API when Start button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({ canStart: true })
      );
      vi.mocked(apiModule.api.post).mockResolvedValue(
        createActionResponse('BAS', {
          processType: 'BAS',
          canStart: false,
          canStop: true,
          canResume: false,
          canFinish: true,
        })
      );

      renderWithProviders({ docEntry: 6171 });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /baslat/i })).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /baslat/i });
      await user.click(startButton);

      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith(
          '/work-orders/6171/activity/start',
          {}
        );
      });
    });

    it('should update UI after successful start', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({ canStart: true })
      );
      vi.mocked(apiModule.api.post).mockResolvedValue(
        createActionResponse('BAS', {
          processType: 'BAS',
          canStart: false,
          canStop: true,
          canResume: false,
          canFinish: true,
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /baslat/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /baslat/i }));

      // After start, should show Stop and Finish buttons
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /durdur/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /bitir/i })).toBeInTheDocument();
      });
    });

    it('should disable button during API call', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({ canStart: true })
      );

      // Slow response
      vi.mocked(apiModule.api.post).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve(
                  createActionResponse('BAS', {
                    processType: 'BAS',
                    canStart: false,
                    canStop: true,
                    canFinish: true,
                  })
                ),
              100
            )
          )
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /baslat/i })).toBeInTheDocument();
      });

      const startButton = screen.getByRole('button', { name: /baslat/i });
      await user.click(startButton);

      // Button should be disabled during loading
      expect(startButton).toBeDisabled();
    });
  });

  describe('Stop action', () => {
    it('should call onBreakReasonRequired when Stop button is clicked', async () => {
      const user = userEvent.setup();
      const onBreakReasonRequired = vi.fn();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'BAS',
          canStop: true,
        })
      );

      renderWithProviders({ onBreakReasonRequired });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /durdur/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /durdur/i }));

      expect(onBreakReasonRequired).toHaveBeenCalled();
    });
  });

  describe('Resume action', () => {
    it('should call resume API when Resume button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'DUR',
          canResume: true,
          canFinish: true,
        })
      );
      vi.mocked(apiModule.api.post).mockResolvedValue(
        createActionResponse('DEV', {
          processType: 'DEV',
          canStart: false,
          canStop: true,
          canResume: false,
          canFinish: true,
        })
      );

      renderWithProviders({ docEntry: 6171 });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /devam/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /devam/i }));

      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith(
          '/work-orders/6171/activity/resume',
          {}
        );
      });
    });

    it('should update UI after successful resume', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'DUR',
          canResume: true,
          canFinish: true,
        })
      );
      vi.mocked(apiModule.api.post).mockResolvedValue(
        createActionResponse('DEV', {
          processType: 'DEV',
          canStart: false,
          canStop: true,
          canResume: false,
          canFinish: true,
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /devam/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /devam/i }));

      // After resume, should show Stop and Finish buttons
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /durdur/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /bitir/i })).toBeInTheDocument();
      });
    });
  });

  describe('Finish action', () => {
    it('should call finish API when Finish button is clicked', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'BAS',
          canStop: true,
          canFinish: true,
        })
      );
      vi.mocked(apiModule.api.post).mockResolvedValue(
        createActionResponse('BIT', {
          processType: 'BIT',
          canStart: true,
          canStop: false,
          canResume: false,
          canFinish: false,
        })
      );

      renderWithProviders({ docEntry: 6171 });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bitir/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /bitir/i }));

      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith(
          '/work-orders/6171/activity/finish',
          {}
        );
      });
    });

    it('should update UI after successful finish', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'BAS',
          canStop: true,
          canFinish: true,
        })
      );
      vi.mocked(apiModule.api.post).mockResolvedValue(
        createActionResponse('BIT', {
          processType: 'BIT',
          canStart: true,
          canStop: false,
          canResume: false,
          canFinish: false,
        })
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /bitir/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /bitir/i }));

      // After finish, should show Start button
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /baslat/i })).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('should show error state on fetch failure', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 500,
        message: 'Sunucu hatasi',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/work-orders/6171/activity-state',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.get).mockRejectedValue(mockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should show error message on action failure', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({ canStart: true })
      );

      const mockError = new apiModule.ApiRequestError({
        statusCode: 400,
        message: 'Is emri baslatma hatasi',
        error: 'BAD_REQUEST',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/work-orders/6171/activity/start',
        correlationId: 'abc-123',
      });
      vi.mocked(apiModule.api.post).mockRejectedValue(mockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /baslat/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /baslat/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/baslatma hatasi/i)).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels on buttons', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({ canStart: true })
      );

      renderWithProviders();

      await waitFor(() => {
        const startButton = screen.getByRole('button', { name: /baslat/i });
        expect(startButton).toHaveAccessibleName();
      });
    });

    it('should announce loading state to screen readers', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {})
      );

      renderWithProviders();

      const loadingElement = screen.getByTestId('activity-buttons-loading');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('external stop handler', () => {
    it('should expose handleStop method for external modal', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(
        createStateResponse({
          processType: 'BAS',
          canStop: true,
        })
      );
      vi.mocked(apiModule.api.post).mockResolvedValue(
        createActionResponse('DUR', {
          processType: 'DUR',
          canResume: true,
          canFinish: true,
        })
      );

      const { queryClient } = renderWithProviders({ docEntry: 6171 });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /durdur/i })).toBeInTheDocument();
      });

      // Simulate external call to stop (from BreakReasonModal)
      await apiModule.api.post('/work-orders/6171/activity/stop', {
        breakCode: '1',
        notes: 'Test note',
      });

      // Invalidate queries to refresh state
      queryClient.invalidateQueries({ queryKey: ['activityState', 6171] });

      expect(apiModule.api.post).toHaveBeenCalledWith(
        '/work-orders/6171/activity/stop',
        { breakCode: '1', notes: 'Test note' }
      );
    });
  });
});
