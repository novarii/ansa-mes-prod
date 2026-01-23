/**
 * BreakReasonModal Tests
 *
 * Tests for the break reason selection modal component.
 * Used when workers pause (DUR) their activity.
 *
 * @see specs/feature-production.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BreakReasonModal } from './BreakReasonModal';
import { AuthProvider } from '../../context/AuthContext';
import { I18nProvider } from '@org/shared-i18n';
import * as apiModule from '../../services/api';
import type { BreakReason } from '@org/shared-types';

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
 * Mock break reasons
 */
const mockBreakReasons: BreakReason[] = [
  { Code: '1', Name: 'Mola' },
  { Code: '2', Name: 'Yemek' },
  { Code: '4', Name: 'Urun Degisikligi' },
  { Code: '10', Name: 'Malzeme Bekleme' },
  { Code: '20', Name: 'Ariza' },
  { Code: '30', Name: 'Kalite Kontrol' },
  { Code: '73', Name: 'Personel Degisimi' },
];

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
  isOpen?: boolean;
  docEntry?: number;
  onClose?: () => void;
  onSuccess?: () => void;
}

/**
 * Wrapper component with all required providers
 */
function renderWithProviders(
  options: RenderOptions = {}
): ReturnType<typeof render> & { queryClient: QueryClient } {
  const {
    isOpen = true,
    docEntry = 6171,
    onClose = vi.fn(),
    onSuccess = vi.fn(),
  } = options;
  const queryClient = createTestQueryClient();

  mockAuthenticatedSession();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <BreakReasonModal
            isOpen={isOpen}
            docEntry={docEntry}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  return { ...utils, queryClient };
}

describe('BreakReasonModal', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.resetAllMocks();
    sessionStorage.clear();
  });

  describe('rendering', () => {
    it('should not render when closed', () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders({ isOpen: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal when open', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders({ isOpen: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should render modal title', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        // The title is "Dur - Mola Nedeni Secin"
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toHaveTextContent(/mola nedeni/i);
      });
    });

    it('should render search input', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ara/i)).toBeInTheDocument();
      });
    });

    it('should render break reason list', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
        expect(screen.getByText('Yemek')).toBeInTheDocument();
        expect(screen.getByText('Ariza')).toBeInTheDocument();
      });
    });

    it('should render notes textarea', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: /aciklama|not/i })).toBeInTheDocument();
      });
    });

    it('should render cancel and save buttons', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iptal/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /kaydet/i })).toBeInTheDocument();
      });
    });

    it('should disable save button when no reason selected', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        const saveButton = screen.getByRole('button', { name: /kaydet/i });
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('search functionality', () => {
    it('should filter break reasons based on search input', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/ara/i);
      await user.type(searchInput, 'Ariza');

      await waitFor(() => {
        expect(screen.getByText('Ariza')).toBeInTheDocument();
        expect(screen.queryByText('Mola')).not.toBeInTheDocument();
        expect(screen.queryByText('Yemek')).not.toBeInTheDocument();
      });
    });

    it('should show all reasons when search is cleared', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/ara/i);
      await user.type(searchInput, 'Ariza');

      await waitFor(() => {
        expect(screen.queryByText('Mola')).not.toBeInTheDocument();
      });

      await user.clear(searchInput);

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
        expect(screen.getByText('Ariza')).toBeInTheDocument();
      });
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/ara/i);
      await user.type(searchInput, 'xxxnonexistentxxx');

      await waitFor(() => {
        expect(screen.getByText(/bulunamadi/i)).toBeInTheDocument();
      });
    });
  });

  describe('selection', () => {
    it('should select break reason when clicked', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Ariza')).toBeInTheDocument();
      });

      const reasonItem = screen.getByText('Ariza').closest('[data-testid^="break-reason-item"]');
      await user.click(reasonItem!);

      await waitFor(() => {
        expect(reasonItem).toHaveAttribute('data-selected', 'true');
      });
    });

    it('should enable save button after selection', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      // Wait for break reasons to load first
      await waitFor(() => {
        expect(screen.getByText('Ariza')).toBeInTheDocument();
      });

      // Verify save button is initially disabled
      expect(screen.getByRole('button', { name: /kaydet/i })).toBeDisabled();

      const reasonItem = screen.getByText('Ariza').closest('[data-testid^="break-reason-item"]');
      await user.click(reasonItem!);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /kaydet/i })).not.toBeDisabled();
      });
    });

    it('should allow changing selection', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Ariza')).toBeInTheDocument();
      });

      const arizaItem = screen.getByText('Ariza').closest('[data-testid^="break-reason-item"]');
      await user.click(arizaItem!);

      const molaItem = screen.getByText('Mola').closest('[data-testid^="break-reason-item"]');
      await user.click(molaItem!);

      await waitFor(() => {
        expect(molaItem).toHaveAttribute('data-selected', 'true');
        expect(arizaItem).toHaveAttribute('data-selected', 'false');
      });
    });
  });

  describe('submit', () => {
    it('should call stop API with selected break code on save', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);
      vi.mocked(apiModule.api.post).mockResolvedValue({
        success: true,
        activityCode: 'ACT-001',
        processType: 'DUR',
        timestamp: new Date().toISOString(),
        state: {
          activityCode: 'ACT-001',
          processType: 'DUR',
          canStart: false,
          canStop: false,
          canResume: true,
          canFinish: true,
        },
      });

      renderWithProviders({ docEntry: 6171, onSuccess });

      await waitFor(() => {
        expect(screen.getByText('Ariza')).toBeInTheDocument();
      });

      // Select Ariza (code: '20')
      const reasonItem = screen.getByText('Ariza').closest('[data-testid^="break-reason-item"]');
      await user.click(reasonItem!);

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith(
          '/work-orders/6171/activity/stop',
          { breakCode: '20', notes: '' }
        );
      });
    });

    it('should include notes in API call', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);
      vi.mocked(apiModule.api.post).mockResolvedValue({
        success: true,
        activityCode: 'ACT-001',
        processType: 'DUR',
        timestamp: new Date().toISOString(),
        state: {},
      });

      renderWithProviders({ docEntry: 6171 });

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
      });

      // Select Mola (code: '1')
      const reasonItem = screen.getByText('Mola').closest('[data-testid^="break-reason-item"]');
      await user.click(reasonItem!);

      // Add notes
      const notesInput = screen.getByRole('textbox', { name: /aciklama|not/i });
      await user.type(notesInput, 'Ogle yemegi molasi');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith(
          '/work-orders/6171/activity/stop',
          { breakCode: '1', notes: 'Ogle yemegi molasi' }
        );
      });
    });

    it('should call onSuccess callback on successful submit', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();

      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);
      vi.mocked(apiModule.api.post).mockResolvedValue({
        success: true,
        activityCode: 'ACT-001',
        processType: 'DUR',
        timestamp: new Date().toISOString(),
        state: {},
      });

      renderWithProviders({ onSuccess });

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
      });

      const reasonItem = screen.getByText('Mola').closest('[data-testid^="break-reason-item"]');
      await user.click(reasonItem!);

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should show error message on submit failure', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      const mockError = new apiModule.ApiRequestError({
        statusCode: 400,
        message: 'Durdurma islemi basarisiz',
        error: 'BAD_REQUEST',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/work-orders/6171/activity/stop',
        correlationId: 'abc-123',
      });
      vi.mocked(apiModule.api.post).mockRejectedValue(mockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
      });

      const reasonItem = screen.getByText('Mola').closest('[data-testid^="break-reason-item"]');
      await user.click(reasonItem!);

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/basarisiz/i)).toBeInTheDocument();
      });
    });

    it('should disable save button during submission', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);
      vi.mocked(apiModule.api.post).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  activityCode: 'ACT-001',
                  processType: 'DUR',
                  timestamp: new Date().toISOString(),
                  state: {},
                }),
              100
            )
          )
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
      });

      const reasonItem = screen.getByText('Mola').closest('[data-testid^="break-reason-item"]');
      await user.click(reasonItem!);

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
    });
  });

  describe('close behavior', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders({ onClose });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iptal/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /iptal/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should reset state when modal is closed and reopened', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      const { rerender, queryClient } = renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Mola')).toBeInTheDocument();
      });

      // Select a reason
      const reasonItem = screen.getByText('Mola').closest('[data-testid^="break-reason-item"]');
      await user.click(reasonItem!);

      // Type in search
      const searchInput = screen.getByPlaceholderText(/ara/i);
      await user.type(searchInput, 'test');

      // Type notes
      const notesInput = screen.getByRole('textbox', { name: /aciklama|not/i });
      await user.type(notesInput, 'Some notes');

      // Close modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <AuthProvider>
              <BreakReasonModal
                isOpen={false}
                docEntry={6171}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
              />
            </AuthProvider>
          </I18nProvider>
        </QueryClientProvider>
      );

      // Reopen modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <AuthProvider>
              <BreakReasonModal
                isOpen={true}
                docEntry={6171}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
              />
            </AuthProvider>
          </I18nProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        // Search should be cleared
        const newSearchInput = screen.getByPlaceholderText(/ara/i);
        expect(newSearchInput).toHaveValue('');

        // Notes should be cleared
        const newNotesInput = screen.getByRole('textbox', { name: /aciklama|not/i });
        expect(newNotesInput).toHaveValue('');

        // Save button should be disabled (no selection)
        expect(screen.getByRole('button', { name: /kaydet/i })).toBeDisabled();
      });
    });
  });

  describe('loading and error states', () => {
    it('should show loading state while fetching break reasons', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      expect(screen.getByTestId('break-reasons-loading')).toBeInTheDocument();
    });

    it('should show error state on fetch failure', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 500,
        message: 'Sunucu hatasi',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/break-reasons',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.get).mockRejectedValue(mockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog role', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAccessibleName();
      });
    });

    it('should have keyboard-accessible list items', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValue(mockBreakReasons);

      renderWithProviders();

      await waitFor(() => {
        const listItems = screen.getAllByRole('option');
        expect(listItems.length).toBeGreaterThan(0);
      });
    });
  });
});
