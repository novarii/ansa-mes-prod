/**
 * TeamPage Tests
 *
 * Tests for the team view page component.
 *
 * @see specs/feature-team-calendar.md
 * @see specs/i18n-turkish-locale.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TeamPage } from './TeamPage';
import { AuthProvider } from '../../context/AuthContext';
import { I18nProvider } from '@org/shared-i18n';
import * as apiModule from '../../services/api';
import type { TeamViewResponse, ShiftListResponse } from '@org/shared-types';

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
 * Mock team view response with multiple machines and workers
 */
const mockTeamResponse: TeamViewResponse = {
  currentShift: 'A',
  shiftFilter: 'all',
  machines: [
    {
      machineCode: 'M001',
      machineName: 'BARMAG 1',
      assignedWorkers: [
        {
          empId: 101,
          fullName: 'Ali Yilmaz',
          status: 'assigned',
          currentWorkOrder: {
            docEntry: 6171,
            docNum: 2026001,
            itemCode: 'YM00001662',
          },
        },
      ],
      pausedWorkers: [
        {
          empId: 102,
          fullName: 'Mehmet Demir',
          status: 'paused',
          currentWorkOrder: {
            docEntry: 6172,
            docNum: 2026002,
            itemCode: 'YM00001663',
          },
        },
      ],
      availableWorkers: [
        {
          empId: 103,
          fullName: 'Ayse Kaya',
          status: 'available',
        },
      ],
    },
    {
      machineCode: 'M002',
      machineName: 'BARMAG 2',
      assignedWorkers: [
        {
          empId: 104,
          fullName: 'Fatma Ozturk',
          status: 'assigned',
          currentWorkOrder: {
            docEntry: 6173,
            docNum: 2026003,
            itemCode: 'YM00001664',
          },
        },
      ],
      pausedWorkers: [],
      availableWorkers: [
        {
          empId: 105,
          fullName: 'Mustafa Celik',
          status: 'available',
        },
        {
          empId: 106,
          fullName: 'Zeynep Arslan',
          status: 'available',
        },
      ],
    },
    {
      machineCode: 'M003',
      machineName: 'BARMAG 3',
      assignedWorkers: [],
      pausedWorkers: [],
      availableWorkers: [],
    },
  ],
};

/**
 * Mock empty team response
 */
const mockEmptyTeamResponse: TeamViewResponse = {
  currentShift: 'A',
  shiftFilter: 'all',
  machines: [],
};

/**
 * Mock shift list response
 */
const mockShiftsResponse: ShiftListResponse = {
  shifts: [
    { code: 'A', name: 'A Vardiyasi', startTime: '08:00', endTime: '16:00' },
    { code: 'B', name: 'B Vardiyasi', startTime: '16:00', endTime: '00:00' },
    { code: 'C', name: 'C Vardiyasi', startTime: '00:00', endTime: '08:00' },
  ],
  currentShift: 'A',
};

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

/**
 * Standard API mock setup
 */
function setupApiMock(
  teamResponse: TeamViewResponse = mockTeamResponse,
  shiftsResponse: ShiftListResponse = mockShiftsResponse
): void {
  vi.mocked(apiModule.api.get).mockImplementation((url: string) => {
    if (url.includes('/team/shifts')) {
      return Promise.resolve(shiftsResponse);
    }
    if (url.includes('/team')) {
      return Promise.resolve(teamResponse);
    }
    return Promise.reject(new Error(`Unexpected API call: ${url}`));
  });
}

/**
 * Wrapper component with all required providers
 */
function renderWithProviders(
  initialRoute = '/team'
): ReturnType<typeof render> & { queryClient: QueryClient } {
  const queryClient = createTestQueryClient();

  // Mock auth session
  mockAuthenticatedSession();

  const utils = render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <Routes>
              <Route path="/team" element={<TeamPage />} />
              <Route path="/work-orders/:docEntry" element={<div data-testid="work-order-detail-page">Detail</div>} />
            </Routes>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return { ...utils, queryClient };
}

describe('TeamPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('rendering', () => {
    it('should render page with title', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /uretim bandi calisanlari|production line workers/i })
        ).toBeInTheDocument();
      });
    });

    it('should render loading state initially', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      expect(screen.getByTestId('team-page-loading')).toBeInTheDocument();
    });

    it('should render machine cards after loading', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
        expect(screen.getByTestId('machine-card-M002')).toBeInTheDocument();
        expect(screen.getByTestId('machine-card-M003')).toBeInTheDocument();
      });
    });

    it('should render machine names correctly', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('BARMAG 1')).toBeInTheDocument();
        expect(screen.getByText('BARMAG 2')).toBeInTheDocument();
        expect(screen.getByText('BARMAG 3')).toBeInTheDocument();
      });
    });

    it('should render empty state when no machines', async () => {
      setupApiMock(mockEmptyTeamResponse);
      renderWithProviders();

      await waitFor(() => {
        // Either translated or fallback
        expect(screen.getByText(/makine bulunamadi|no machines/i)).toBeInTheDocument();
      });
    });

    it('should render error state on API failure', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 500,
        message: 'Sunucu hatasi',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/team',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.get).mockRejectedValue(mockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/sunucu hatasi/i)).toBeInTheDocument();
      });
    });
  });

  describe('shift filter', () => {
    it('should render shift filter dropdown', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      // Should have a shift filter control - aria-label contains "Vardiya Filtresi"
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should display shift filter with default "Tumu" value', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      // Should have a shift filter combobox
      const shiftSelect = screen.getByRole('combobox');
      expect(shiftSelect).toBeInTheDocument();

      // Default value should show "Tumu" or similar
      // The SelectValue displays the selected option's text
      expect(shiftSelect.textContent).toMatch(/tumu|all/i);
    });

    it('should fetch shift definitions from API', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      // Should have called the shifts API
      const shiftsCalls = vi.mocked(apiModule.api.get).mock.calls.filter(
        (call) => call[0] === '/team/shifts'
      );
      expect(shiftsCalls.length).toBeGreaterThan(0);
    });

    it('should default to "all" shift filter', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      // Initial API call should be with 'all' or no shift filter
      const teamCalls = vi.mocked(apiModule.api.get).mock.calls.filter(
        (call) => call[0] === '/team'
      );
      expect(teamCalls.length).toBeGreaterThan(0);
      const firstTeamCall = teamCalls[0];
      const params = firstTeamCall[1] as Record<string, string> | undefined;
      // Either no shift param or shift='all'
      expect(params?.shift === undefined || params?.shift === 'all').toBe(true);
    });
  });

  describe('worker display', () => {
    it('should display assigned workers with their names', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Ali Yilmaz')).toBeInTheDocument();
        expect(screen.getByText('Fatma Ozturk')).toBeInTheDocument();
      });
    });

    it('should display paused workers', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Mehmet Demir')).toBeInTheDocument();
      });
    });

    it('should display available workers', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('Ayse Kaya')).toBeInTheDocument();
        expect(screen.getByText('Mustafa Celik')).toBeInTheDocument();
        expect(screen.getByText('Zeynep Arslan')).toBeInTheDocument();
      });
    });

    it('should show "Calisanlar" section header for machines with assigned workers', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      // The machine card should have a section for assigned workers
      const machineCard = screen.getByTestId('machine-card-M001');
      const assignedSection = machineCard.querySelector('[data-section="assigned"]');
      expect(assignedSection).toBeInTheDocument();
    });

    it('should show "Musait" section header for machines with available workers', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      // The machine card should have a section for available workers
      const machineCard = screen.getByTestId('machine-card-M001');
      const availableSection = machineCard.querySelector('[data-section="available"]');
      expect(availableSection).toBeInTheDocument();
    });
  });

  describe('empty machine handling', () => {
    it('should render machine card even with no workers', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        // M003 has no workers
        expect(screen.getByTestId('machine-card-M003')).toBeInTheDocument();
      });
    });

    it('should show appropriate message for empty machine', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        const emptyMachineCard = screen.getByTestId('machine-card-M003');
        // Either translated text or the fallback
        expect(
          emptyMachineCard.textContent?.toLowerCase().includes('calisan yok') ||
          emptyMachineCard.textContent?.toLowerCase().includes('no workers') ||
          emptyMachineCard.textContent?.includes('team.noWorkers')
        ).toBe(true);
      });
    });
  });

  describe('refresh functionality', () => {
    it('should have refresh button', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /yenile/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should refetch data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      const initialCallCount = vi.mocked(apiModule.api.get).mock.calls.filter(
        (call) => call[0] === '/team'
      ).length;

      const refreshButton = screen.getByRole('button', { name: /yenile/i });
      await user.click(refreshButton);

      await waitFor(() => {
        const newCallCount = vi.mocked(apiModule.api.get).mock.calls.filter(
          (call) => call[0] === '/team'
        ).length;
        expect(newCallCount).toBeGreaterThan(initialCallCount);
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper heading structure', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels on filter controls', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      const shiftSelect = screen.getByRole('combobox');
      expect(shiftSelect).toBeInTheDocument();
      expect(shiftSelect).toHaveAttribute('aria-label');
    });

    it('should announce loading state to screen readers', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      const loadingElement = screen.getByTestId('team-page-loading');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('current shift indicator', () => {
    it('should display current shift information', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      // Should show current shift indicator somewhere on the page
      expect(screen.getByText(/a vardiyasi/i)).toBeInTheDocument();
    });
  });

  describe('responsive grid', () => {
    it('should render machine cards in a grid layout', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('machine-card-M001')).toBeInTheDocument();
      });

      // Check that the grid container exists
      const gridContainer = screen.getByTestId('team-page').querySelector('.grid');
      expect(gridContainer).toBeInTheDocument();
    });
  });
});
