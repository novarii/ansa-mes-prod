/**
 * WorkOrderListPage Tests
 *
 * Tests for the work order list page component.
 *
 * @see specs/feature-production.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkOrderListPage } from './WorkOrderListPage';
import { AuthProvider } from '../../context/AuthContext';
import { I18nProvider } from '@org/shared-i18n';
import * as apiModule from '../../services/api';
import type { WorkOrderListResponse, CustomerFilterOption } from '@org/shared-types';

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
 * Mock work orders response
 */
const mockWorkOrdersResponse: WorkOrderListResponse = {
  items: [
    {
      docEntry: 6171,
      docNum: 2026001,
      itemCode: 'YM00001662',
      prodName: 'Test Product Widget A',
      plannedQty: 22500,
      completedQty: 15000,
      rejectedQty: 500,
      remainingQty: 7500,
      progressPercent: 66.7,
      dueDate: '2026-01-25T00:00:00.000Z',
      customerName: 'ABC Corporation',
      machineCode: 'M001',
      machineName: 'Machine 1',
    },
    {
      docEntry: 6172,
      docNum: 2026002,
      itemCode: 'YM00001663',
      prodName: 'Test Product Widget B',
      plannedQty: 10000,
      completedQty: 2000,
      rejectedQty: 0,
      remainingQty: 8000,
      progressPercent: 20.0,
      dueDate: '2026-01-30T00:00:00.000Z',
      customerName: 'XYZ Industries',
      machineCode: 'M001',
      machineName: 'Machine 1',
    },
    {
      docEntry: 6173,
      docNum: 2026003,
      itemCode: 'YM00001664',
      prodName: 'Test Product Widget C',
      plannedQty: 5000,
      completedQty: 0,
      rejectedQty: 0,
      remainingQty: 5000,
      progressPercent: 0,
      dueDate: '2026-02-01T00:00:00.000Z',
      customerName: null,
      machineCode: 'M002',
      machineName: 'Machine 2',
    },
  ],
  total: 3,
  page: 1,
  limit: 20,
  totalPages: 1,
};

const mockEmptyResponse: WorkOrderListResponse = {
  items: [],
  total: 0,
  page: 1,
  limit: 20,
  totalPages: 0,
};

/**
 * Mock customer filter options
 */
const mockCustomerOptions: CustomerFilterOption[] = [
  { code: 'C001', name: 'ABC Corporation' },
  { code: 'C002', name: 'XYZ Industries' },
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

/**
 * Standard API mock setup
 */
function setupApiMock(workOrdersResponse: WorkOrderListResponse = mockWorkOrdersResponse): void {
  vi.mocked(apiModule.api.get).mockImplementation((url: string) => {
    if (url.includes('/work-orders/filters/customers')) {
      return Promise.resolve(mockCustomerOptions);
    }
    return Promise.resolve(workOrdersResponse);
  });
}

/**
 * Wrapper component with all required providers
 */
function renderWithProviders(
  initialRoute = '/'
): ReturnType<typeof render> & { queryClient: QueryClient } {
  const queryClient = createTestQueryClient();

  // Mock auth session
  mockAuthenticatedSession();

  // Placeholder for work order detail page
  function WorkOrderDetailPage(): JSX.Element {
    return <div data-testid="work-order-detail-page">Work Order Detail Page</div>;
  }

  const utils = render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<WorkOrderListPage />} />
              <Route path="/work-orders/:docEntry" element={<WorkOrderDetailPage />} />
            </Routes>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return { ...utils, queryClient };
}

describe('WorkOrderListPage', () => {
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
        expect(screen.getByRole('heading', { name: /is emirleri|work orders/i })).toBeInTheDocument();
      });
    });

    it('should render loading state initially', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      expect(screen.getByTestId('work-order-list-loading')).toBeInTheDocument();
    });

    it('should render work order cards after loading', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
        expect(screen.getByTestId('work-order-card-6172')).toBeInTheDocument();
        expect(screen.getByTestId('work-order-card-6173')).toBeInTheDocument();
      });
    });

    it('should render empty state when no work orders', async () => {
      setupApiMock(mockEmptyResponse);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/is emri bulunamadi/i)).toBeInTheDocument();
      });
    });

    it('should render error state on API failure', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 500,
        message: 'Sunucu hatasi',
        error: 'INTERNAL_SERVER_ERROR',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/work-orders',
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

  describe('filters', () => {
    it('should render search input', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/ara/i)).toBeInTheDocument();
      });
    });

    it('should render customer filter dropdown', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /musteri/i })).toBeInTheDocument();
      });
    });

    it('should update search input value when typing', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/ara/i);
      await user.type(searchInput, 'Widget A');

      // Input value should be updated (internal state of uncontrolled SearchInput)
      await waitFor(() => {
        expect(searchInput).toHaveValue('Widget A');
      });
    });

    it('should render clear filters button when filters are active', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/ara/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /filtreleri temizle/i })).toBeInTheDocument();
      });
    });

    it('should clear filter state when clear button is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/ara/i);
      await user.type(searchInput, 'test');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /filtreleri temizle/i })).toBeInTheDocument();
      });

      const clearButton = screen.getByRole('button', { name: /filtreleri temizle/i });
      await user.click(clearButton);

      // Clear filters button should disappear after clearing
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /filtreleri temizle/i })).not.toBeInTheDocument();
      });
    });
  });

  describe('navigation', () => {
    it('should navigate to detail page when card is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      const card = screen.getByTestId('work-order-card-6171');
      await user.click(card);

      await waitFor(() => {
        expect(screen.getByTestId('work-order-detail-page')).toBeInTheDocument();
      });
    });
  });

  describe('pagination', () => {
    it('should display total count', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      // Should show "3 is emri" text
      expect(screen.getByText(/3 is emri/i)).toBeInTheDocument();
    });

    it('should hide load more button when on last page', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      // Should not show load more button when on last page
      expect(screen.queryByRole('button', { name: /daha fazla/i })).not.toBeInTheDocument();
    });

    it('should show load more button when there are more pages', async () => {
      const multiPageResponse: WorkOrderListResponse = {
        ...mockWorkOrdersResponse,
        total: 40,
        totalPages: 2,
      };

      setupApiMock(multiPageResponse);
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      // Button text is "Daha Fazla Yukle"
      expect(screen.getByText(/daha fazla/i)).toBeInTheDocument();
    });
  });

  describe('station context', () => {
    it('should display current station name in page header', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      // Station name should appear in the page subtitle
      const heading = screen.getByRole('heading', { name: /is emirleri/i });
      const headerSection = heading.closest('header');
      expect(headerSection).toHaveTextContent('Machine 1');
    });

    it('should fetch work orders for current station', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        // Should have called API - station is automatically applied by backend
        expect(apiModule.api.get).toHaveBeenCalledWith(
          '/work-orders',
          expect.any(Object)
        );
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
        expect(screen.getByRole('searchbox')).toHaveAttribute('aria-label');
      });
    });

    it('should announce loading state to screen readers', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      const loadingElement = screen.getByTestId('work-order-list-loading');
      expect(loadingElement).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('refresh', () => {
    it('should have refresh button', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      const refreshButton = screen.getByRole('button', { name: /yenile/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should call refetch when refresh button is clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
      });

      const initialCallCount = vi.mocked(apiModule.api.get).mock.calls.length;

      const refreshButton = screen.getByRole('button', { name: /yenile/i });
      await user.click(refreshButton);

      // Should have called API more times after refresh
      await waitFor(() => {
        expect(vi.mocked(apiModule.api.get).mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});
