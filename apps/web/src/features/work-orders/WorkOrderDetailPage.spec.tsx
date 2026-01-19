/**
 * WorkOrderDetailPage Tests
 *
 * Tests for the work order detail page component with tabs for
 * General, Documents, and Pick List.
 *
 * @see specs/feature-production.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkOrderDetailPage } from './WorkOrderDetailPage';
import { AuthProvider } from '../../context/AuthContext';
import { I18nProvider } from '@org/shared-i18n';
import * as apiModule from '../../services/api';
import type {
  WorkOrderDetailResponse,
  PickListResponse,
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
 * Mock work order detail response
 */
const mockWorkOrderDetail: WorkOrderDetailResponse = {
  docEntry: 6171,
  docNum: 2026001,
  itemCode: 'YM00001662',
  prodName: 'Test Product Widget A',
  plannedQty: 22500,
  completedQty: 15000,
  rejectedQty: 500,
  remainingQty: 7000,
  progressPercent: 66.7,
  startDate: '2026-01-15T00:00:00.000Z',
  dueDate: '2026-01-25T00:00:00.000Z',
  releaseDate: '2026-01-14T00:00:00.000Z',
  customerCode: 'C001',
  customerName: 'ABC Corporation',
  warehouse: '03',
  comments: 'Rush order - priority customer',
  sortOrder: 1,
};

/**
 * Mock pick list response
 */
const mockPickListResponse: PickListResponse = {
  docEntry: 6171,
  items: [
    {
      itemCode: 'MAT-001',
      itemName: 'Celik Levha',
      plannedQty: 100,
      issuedQty: 80,
      remainingQty: 20,
      warehouse: '01',
      uom: 'KG',
    },
    {
      itemCode: 'MAT-002',
      itemName: 'Vida M8',
      plannedQty: 400,
      issuedQty: 400,
      remainingQty: 0,
      warehouse: '01',
      uom: 'ADET',
    },
    {
      itemCode: 'MAT-003',
      itemName: 'Boya RAL7035',
      plannedQty: 5,
      issuedQty: 2,
      remainingQty: 3,
      warehouse: '02',
      uom: 'LT',
    },
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
function setupApiMock(): void {
  vi.mocked(apiModule.api.get).mockImplementation((url: string) => {
    if (url.includes('/pick-list')) {
      return Promise.resolve(mockPickListResponse);
    }
    if (url.includes('/work-orders/')) {
      return Promise.resolve(mockWorkOrderDetail);
    }
    return Promise.reject(new Error('Unknown endpoint'));
  });
}

/**
 * Wrapper component with all required providers
 */
function renderWithProviders(
  docEntry = '6171'
): ReturnType<typeof render> & { queryClient: QueryClient } {
  const queryClient = createTestQueryClient();

  // Mock auth session
  mockAuthenticatedSession();

  // Work order list page placeholder for back navigation
  function WorkOrderListPage(): JSX.Element {
    return <div data-testid="work-order-list-page">Work Order List Page</div>;
  }

  const utils = render(
    <MemoryRouter initialEntries={[`/work-orders/${docEntry}`]}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<WorkOrderListPage />} />
              <Route
                path="/work-orders/:docEntry"
                element={<WorkOrderDetailPage />}
              />
            </Routes>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </MemoryRouter>
  );

  return { ...utils, queryClient };
}

describe('WorkOrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('rendering', () => {
    it('should render page with work order title', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /test product widget a/i })
        ).toBeInTheDocument();
      });
    });

    it('should render loading state initially', () => {
      vi.mocked(apiModule.api.get).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      renderWithProviders();

      expect(
        screen.getByTestId('work-order-detail-loading')
      ).toBeInTheDocument();
    });

    it('should render error state on API failure', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 404,
        message: 'Is emri bulunamadi',
        error: 'NOT_FOUND',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/work-orders/9999',
        correlationId: 'abc-123',
      });

      vi.mocked(apiModule.api.get).mockRejectedValue(mockError);

      renderWithProviders('9999');

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/is emri bulunamadi/i)).toBeInTheDocument();
      });
    });

    it('should render back button linking to work orders list', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /geri/i })).toHaveAttribute(
          'href',
          '/'
        );
      });
    });

    it('should display work order number in subtitle', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        // Should show item code and doc number (appears in subtitle and detail section)
        const itemCodeElements = screen.getAllByText(/ym00001662/i);
        expect(itemCodeElements.length).toBeGreaterThanOrEqual(1);
        const docNumElements = screen.getAllByText(/2026001/i);
        expect(docNumElements.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('tabs', () => {
    it('should render three tabs: Genel, Resimler, Malzeme Listesi', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /genel/i })).toBeInTheDocument();
        expect(
          screen.getByRole('tab', { name: /resimler/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });
    });

    it('should show General tab as default active', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        const generalTab = screen.getByRole('tab', { name: /genel/i });
        expect(generalTab).toHaveAttribute('aria-selected', 'true');
      });
    });

    it('should switch to Documents tab when clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /resimler/i })).toBeInTheDocument();
      });

      const documentsTab = screen.getByRole('tab', { name: /resimler/i });
      await user.click(documentsTab);

      expect(documentsTab).toHaveAttribute('aria-selected', 'true');
    });

    it('should switch to Pick List tab when clicked', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      expect(pickListTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('General Tab', () => {
    it('should display work order quantities', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        // Should show planned, completed, rejected, remaining quantities
        expect(screen.getByText(/22\.500/)).toBeInTheDocument(); // Turkish format: 22.500
        expect(screen.getByText(/15\.000/)).toBeInTheDocument();
        expect(screen.getByText(/7\.000/)).toBeInTheDocument();
      });
    });

    it('should display dates in Turkish format', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        // Due date: 25.01.2026
        expect(screen.getByText(/25\.01\.2026/)).toBeInTheDocument();
        // Start date: 15.01.2026
        expect(screen.getByText(/15\.01\.2026/)).toBeInTheDocument();
      });
    });

    it('should display customer name', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/abc corporation/i)).toBeInTheDocument();
      });
    });

    it('should display warehouse', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText('03')).toBeInTheDocument();
      });
    });

    it('should display progress percentage', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        // Progress: 66.7%
        expect(screen.getByText(/66,7/)).toBeInTheDocument();
      });
    });

    it('should display progress bar', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
        expect(progressBar).toHaveAttribute('aria-valuenow', '66.7');
      });
    });

    it('should display comments when available', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByText(/rush order - priority customer/i)
        ).toBeInTheDocument();
      });
    });

    it('should handle missing customer gracefully', async () => {
      vi.mocked(apiModule.api.get).mockImplementation((url: string) => {
        if (url.includes('/pick-list')) {
          return Promise.resolve(mockPickListResponse);
        }
        return Promise.resolve({
          ...mockWorkOrderDetail,
          customerName: null,
          customerCode: null,
        });
      });

      renderWithProviders();

      await waitFor(() => {
        // Should show dash or empty state for customer
        const customerSection = screen.getByTestId('customer-value');
        expect(customerSection).toHaveTextContent('-');
      });
    });
  });

  describe('Documents Tab', () => {
    it('should show PDF viewer placeholder when tab is active', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /resimler/i })).toBeInTheDocument();
      });

      const documentsTab = screen.getByRole('tab', { name: /resimler/i });
      await user.click(documentsTab);

      await waitFor(() => {
        expect(screen.getByTestId('documents-tab-content')).toBeInTheDocument();
      });
    });

    it('should show message when no documents available', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /resimler/i })).toBeInTheDocument();
      });

      const documentsTab = screen.getByRole('tab', { name: /resimler/i });
      await user.click(documentsTab);

      await waitFor(() => {
        // Should show "no documents" message
        expect(
          screen.getByText(/dokuman bulunamadi|no documents/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('Pick List Tab', () => {
    it('should fetch and display pick list items', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        // Should show material codes
        expect(screen.getByText('MAT-001')).toBeInTheDocument();
        expect(screen.getByText('MAT-002')).toBeInTheDocument();
        expect(screen.getByText('MAT-003')).toBeInTheDocument();
      });
    });

    it('should display pick list columns', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        // Should show column headers
        expect(screen.getByRole('columnheader', { name: /stok kodu|malzeme kodu/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /stok adi|malzeme adi/i })).toBeInTheDocument();
        expect(screen.getByRole('columnheader', { name: /planlanan/i })).toBeInTheDocument();
      });
    });

    it('should show read-only SAP notice', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        // Should show SAP notice
        expect(
          screen.getByText(/malzeme cikislari sap uzerinden yapilmaktadir/i)
        ).toBeInTheDocument();
      });
    });

    it('should highlight rows with remaining quantity', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        // MAT-001 has remaining qty (20), should have highlight class
        const mat001Row = screen.getByTestId('pick-list-row-MAT-001');
        expect(mat001Row).toHaveClass('bg-warning/10');

        // MAT-002 has 0 remaining, should not be highlighted
        const mat002Row = screen.getByTestId('pick-list-row-MAT-002');
        expect(mat002Row).not.toHaveClass('bg-warning/10');
      });
    });

    it('should display quantities in Turkish format', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        // Should format quantities (400 appears twice in MAT-002 row - planned and issued)
        const mat002Row = screen.getByTestId('pick-list-row-MAT-002');
        const quantityCells = within(mat002Row).getAllByText('400');
        expect(quantityCells.length).toBe(2); // plannedQty and issuedQty
      });
    });

    it('should display unit of measure', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        // Should show UoM
        expect(screen.getByText('KG')).toBeInTheDocument();
        expect(screen.getByText('ADET')).toBeInTheDocument();
        expect(screen.getByText('LT')).toBeInTheDocument();
      });
    });

    it('should show loading state for pick list', async () => {
      const user = userEvent.setup();

      // Mock detail to resolve immediately, pick list to be slow
      vi.mocked(apiModule.api.get).mockImplementation((url: string) => {
        if (url.includes('/pick-list')) {
          return new Promise(() => {}); // Never resolves
        }
        return Promise.resolve(mockWorkOrderDetail);
      });

      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        expect(screen.getByTestId('pick-list-loading')).toBeInTheDocument();
      });
    });

    it('should show empty state when no materials', async () => {
      const user = userEvent.setup();

      vi.mocked(apiModule.api.get).mockImplementation((url: string) => {
        if (url.includes('/pick-list')) {
          return Promise.resolve({ docEntry: 6171, items: [] });
        }
        return Promise.resolve(mockWorkOrderDetail);
      });

      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        expect(
          screen.getByText(/malzeme bulunamadi|no materials/i)
        ).toBeInTheDocument();
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

    it('should have proper tab panel roles', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('tablist')).toBeInTheDocument();
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('tab', { name: /genel/i })).toBeInTheDocument();
      });

      const generalTab = screen.getByRole('tab', { name: /genel/i });
      await user.click(generalTab);
      await user.keyboard('{ArrowRight}');

      // Focus should move to next tab
      const documentsTab = screen.getByRole('tab', { name: /resimler/i });
      expect(documentsTab).toHaveFocus();
    });

    it('should have proper aria-labels on data sections', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        // Progress bar should have proper labeling
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-label');
      });
    });
  });

  describe('data fetching', () => {
    it('should fetch work order detail on mount', async () => {
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(apiModule.api.get).toHaveBeenCalledWith(
          '/work-orders/6171',
          undefined
        );
      });
    });

    it('should fetch pick list when pick list tab is accessed', async () => {
      const user = userEvent.setup();
      setupApiMock();
      renderWithProviders();

      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /cekme listesi|malzeme/i })
        ).toBeInTheDocument();
      });

      const pickListTab = screen.getByRole('tab', {
        name: /cekme listesi|malzeme/i,
      });
      await user.click(pickListTab);

      await waitFor(() => {
        expect(apiModule.api.get).toHaveBeenCalledWith(
          '/work-orders/6171/pick-list',
          undefined
        );
      });
    });
  });
});
