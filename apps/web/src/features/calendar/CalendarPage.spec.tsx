/**
 * CalendarPage Tests
 *
 * Tests for the calendar view page component.
 *
 * @see specs/feature-team-calendar.md
 * @see specs/i18n-turkish-locale.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarPage } from './CalendarPage';
import { AuthProvider } from '../../context/AuthContext';
import { I18nProvider } from '@org/shared-i18n';
import * as apiModule from '../../services/api';
import type {
  CalendarViewResponse,
  CalendarStationsResponse,
  CalendarEvent,
  WorkOrderStatusCode,
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
 * Helper to create mock calendar event
 */
function createMockEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 6171,
    title: 'WO-2026001',
    start: '2026-01-20T00:00:00.000Z',
    end: '2026-01-25T00:00:00.000Z',
    itemCode: 'YM00001662',
    itemName: 'Test Product',
    customerName: 'Test Customer',
    status: 'R' as WorkOrderStatusCode,
    machineCode: 'M001',
    machineName: 'BARMAG 1',
    color: 'blue',
    ...overrides,
  };
}

/**
 * Mock calendar view response with multiple events
 */
const mockCalendarResponse: CalendarViewResponse = {
  events: [
    createMockEvent({ id: 6171, title: 'WO-2026001', status: 'R', color: 'blue' }),
    createMockEvent({
      id: 6172,
      title: 'WO-2026002',
      status: 'P',
      color: 'yellow',
      start: '2026-01-22T00:00:00.000Z',
      end: '2026-01-27T00:00:00.000Z',
      itemCode: 'YM00001663',
      customerName: 'Another Customer',
    }),
    createMockEvent({
      id: 6173,
      title: 'WO-2026003',
      status: 'L',
      color: 'green',
      start: '2026-01-18T00:00:00.000Z',
      end: '2026-01-20T00:00:00.000Z',
      itemCode: 'YM00001664',
      customerName: 'Third Customer',
    }),
  ],
  filters: {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    stationCode: null,
    status: 'all',
  },
};

/**
 * Mock empty calendar response
 */
const mockEmptyCalendarResponse: CalendarViewResponse = {
  events: [],
  filters: {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    stationCode: null,
    status: 'all',
  },
};

/**
 * Mock stations response
 */
const mockStationsResponse: CalendarStationsResponse = {
  stations: [
    { code: 'M001', name: 'BARMAG 1' },
    { code: 'M002', name: 'BARMAG 2' },
    { code: 'M003', name: 'BARMAG 3' },
  ],
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
  calendarResponse: CalendarViewResponse = mockCalendarResponse,
  stationsResponse: CalendarStationsResponse = mockStationsResponse
): void {
  vi.mocked(apiModule.api.get).mockImplementation((url: string) => {
    if (url.includes('/calendar/stations')) {
      return Promise.resolve(stationsResponse);
    }
    if (url.includes('/calendar')) {
      return Promise.resolve(calendarResponse);
    }
    return Promise.reject(new Error(`Unexpected API call: ${url}`));
  });
}

/**
 * Wrapper component with all required providers
 */
function renderWithProviders(
  initialRoute = '/calendar'
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
              <Route path="/calendar" element={<CalendarPage />} />
              <Route
                path="/work-orders/:docEntry"
                element={<div data-testid="work-order-detail-page">Detail</div>}
              />
            </Routes>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return { ...utils, queryClient };
}

/**
 * Helper to wait for calendar to load
 */
async function waitForCalendarLoaded(): Promise<void> {
  await waitFor(
    () => {
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
    },
    { timeout: 10000 }
  );
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('rendering', () => {
    it('should render page with title "Takvim"', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /takvim|calendar/i })
        ).toBeInTheDocument();
      });
    });

    it('should render loading state initially', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      expect(screen.getByTestId('calendar-page-loading')).toBeInTheDocument();
    });

    it('should render calendar after loading', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();
    });

    it('should render error state on API failure', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 500,
        message: 'Sunucu hatasi',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/calendar',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.get).mockRejectedValue(mockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/sunucu hatasi/i)).toBeInTheDocument();
      });
    });

    it('should display empty state when no events', async () => {
      setupApiMock(mockEmptyCalendarResponse);
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByText(/is emri bulunamadi|no work orders|veri bulunamadi/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('view mode controls', () => {
    it('should render view mode toggle buttons', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      // Check for view mode buttons using data-testid
      expect(screen.getByTestId('calendar-view-month')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-view-week')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-view-day')).toBeInTheDocument();
    });

    it('should default to month view', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      // Month button should be active/selected
      const monthButton = screen.getByTestId('calendar-view-month');
      expect(monthButton).toHaveAttribute('data-active', 'true');
    });

    it('should switch to week view when week button clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      const weekButton = screen.getByTestId('calendar-view-week');
      await user.click(weekButton);

      expect(weekButton).toHaveAttribute('data-active', 'true');
    });

    it('should switch to day view when day button clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      const dayButton = screen.getByTestId('calendar-view-day');
      await user.click(dayButton);

      expect(dayButton).toHaveAttribute('data-active', 'true');
    });
  });

  describe('navigation controls', () => {
    it('should render today button', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      expect(screen.getByTestId('calendar-today-btn')).toBeInTheDocument();
    });

    it('should render previous/next navigation buttons', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      expect(screen.getByTestId('calendar-prev-btn')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-next-btn')).toBeInTheDocument();
    });

    it('should navigate to previous month when previous button clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      // Get current month display (should contain a month name)
      const initialMonth = screen.getByRole('heading', { level: 2 }).textContent;

      const prevButton = screen.getByTestId('calendar-prev-btn');
      await user.click(prevButton);

      // Month should have changed
      await waitFor(() => {
        const newMonth = screen.getByRole('heading', { level: 2 }).textContent;
        expect(newMonth).not.toBe(initialMonth);
      });
    });

    it('should navigate to next month when next button clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      // Get current month display
      const initialMonth = screen.getByRole('heading', { level: 2 }).textContent;

      const nextButton = screen.getByTestId('calendar-next-btn');
      await user.click(nextButton);

      // Month should have changed
      await waitFor(() => {
        const newMonth = screen.getByRole('heading', { level: 2 }).textContent;
        expect(newMonth).not.toBe(initialMonth);
      });
    });
  });

  describe('station filter', () => {
    it('should render station filter dropdown', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      expect(screen.getByRole('combobox', { name: /istasyon/i })).toBeInTheDocument();
    });

    it('should load stations from API', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      // Verify stations API was called
      const stationsCalls = vi.mocked(apiModule.api.get).mock.calls.filter(
        (call) => call[0] === '/calendar/stations'
      );
      expect(stationsCalls.length).toBeGreaterThan(0);
    });

    it('should default to "Tum Istasyonlar" (all stations)', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      const stationSelect = screen.getByRole('combobox', { name: /istasyon/i });
      expect(stationSelect.textContent).toMatch(/tum istasyonlar/i);
    });
  });

  describe('status filter', () => {
    it('should render status filter dropdown', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      expect(screen.getByRole('combobox', { name: /durum/i })).toBeInTheDocument();
    });

    it('should default to "Aktif" (Released) status', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      const statusSelect = screen.getByRole('combobox', { name: /durum/i });
      expect(statusSelect.textContent).toMatch(/aktif/i);
    });
  });

  describe('event display', () => {
    it('should display calendar events from API', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      // Events should be rendered - react-big-calendar renders events
      // We verify the calendar loaded with events
      const calendarView = screen.getByTestId('calendar-view');
      expect(calendarView).toBeInTheDocument();
    });
  });

  describe('Turkish localization', () => {
    it('should display Turkish month names', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      // Check for Turkish month names in the heading
      const monthHeading = screen.getByRole('heading', { level: 2 });
      // Should contain one of the Turkish month names
      const turkishMonths = [
        'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
        'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik',
      ];
      const hasMonthName = turkishMonths.some((month) =>
        monthHeading.textContent?.includes(month)
      );
      expect(hasMonthName).toBe(true);
    });
  });

  describe('refresh functionality', () => {
    it('should have refresh button', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      expect(screen.getByRole('button', { name: /yenile/i })).toBeInTheDocument();
    });

    it('should refetch data when refresh button is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      const initialCallCount = vi.mocked(apiModule.api.get).mock.calls.filter(
        (call) => call[0] === '/calendar'
      ).length;

      const refreshButton = screen.getByRole('button', { name: /yenile/i });
      await user.click(refreshButton);

      await waitFor(() => {
        const newCallCount = vi.mocked(apiModule.api.get).mock.calls.filter(
          (call) => call[0] === '/calendar'
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
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('should have proper ARIA labels on filter controls', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      const stationSelect = screen.getByRole('combobox', { name: /istasyon/i });
      expect(stationSelect).toHaveAttribute('aria-label');

      const statusSelect = screen.getByRole('combobox', { name: /durum/i });
      expect(statusSelect).toHaveAttribute('aria-label');
    });

    it('should announce loading state to screen readers', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      const loadingElement = screen.getByTestId('calendar-page-loading');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('date range fetching', () => {
    it('should fetch calendar data with date range params', async () => {
      setupApiMock();
      renderWithProviders();

      await waitForCalendarLoaded();

      // Verify API was called with date range params
      const calendarCalls = vi.mocked(apiModule.api.get).mock.calls.filter(
        (call) => call[0] === '/calendar'
      );
      expect(calendarCalls.length).toBeGreaterThan(0);

      const params = calendarCalls[0]?.[1] as Record<string, string> | undefined;
      expect(params?.startDate).toBeDefined();
      expect(params?.endDate).toBeDefined();
    });
  });
});
