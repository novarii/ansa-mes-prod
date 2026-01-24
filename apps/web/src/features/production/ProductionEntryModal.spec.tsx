/**
 * ProductionEntryModal Tests
 *
 * Tests for the production quantity entry modal component.
 * Used to report accepted and rejected quantities for a work order.
 *
 * @see specs/feature-production.md
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductionEntryModal } from './ProductionEntryModal';
import { AuthProvider } from '../../context/AuthContext';
import { I18nProvider } from '@org/shared-i18n';
import * as apiModule from '../../services/api';
import type { ProductionEntryResponse, WorkOrderDetailResponse } from '@org/shared-types';

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
 * Mock work order detail
 */
const mockWorkOrder: WorkOrderDetailResponse = {
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
  releaseDate: '2026-01-15T00:00:00.000Z',
  customerCode: 'C001',
  customerName: 'ABC Corporation',
  warehouse: '03',
  comments: null,
  sortOrder: 1,
};

/**
 * Mock production entry response
 */
const mockProductionEntryResponse: ProductionEntryResponse = {
  success: true,
  batchNumber: 'ANS20260119001',
  acceptedDocEntry: 12345,
  rejectedDocEntry: null,
  workOrder: {
    docEntry: 6171,
    completedQty: 15100,
    rejectedQty: 500,
    remainingQty: 6900,
    progressPercent: 67.1,
  },
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

interface RenderOptions {
  isOpen?: boolean;
  workOrder?: WorkOrderDetailResponse;
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
    workOrder = mockWorkOrder,
    onClose = vi.fn(),
    onSuccess = vi.fn(),
  } = options;
  const queryClient = createTestQueryClient();

  mockAuthenticatedSession();

  const utils = render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <ProductionEntryModal
            isOpen={isOpen}
            workOrder={workOrder}
            onClose={onClose}
            onSuccess={onSuccess}
          />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );

  return { ...utils, queryClient };
}

describe('ProductionEntryModal', () => {
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
      renderWithProviders({ isOpen: false });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal when open', async () => {
      renderWithProviders({ isOpen: true });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should render modal title', async () => {
      renderWithProviders();

      await waitFor(() => {
        const title = screen.getByRole('heading', { level: 2 });
        expect(title).toHaveTextContent(/miktar|uretim/i);
      });
    });

    it('should display work order info', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByText(/2026001/)).toBeInTheDocument();
        expect(screen.getByText(/YM00001662/)).toBeInTheDocument();
      });
    });

    it('should display remaining quantity', async () => {
      renderWithProviders();

      await waitFor(() => {
        // Remaining qty is 7000, should be displayed with Turkish formatting (7.000)
        expect(screen.getByText(/7[.,]000/)).toBeInTheDocument();
      });
    });

    it('should render accepted quantity input', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });
    });

    it('should render rejected quantity input', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/red/i)).toBeInTheDocument();
      });
    });

    it('should render cancel and save buttons', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iptal/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /kaydet/i })).toBeInTheDocument();
      });
    });

    it('should disable save button initially (no quantity entered)', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /kaydet/i })).toBeDisabled();
      });
    });
  });

  describe('input handling', () => {
    it('should accept numeric input for accepted quantity', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      await user.type(acceptedInput, '100');

      expect(acceptedInput).toHaveValue(100);
    });

    it('should accept numeric input for rejected quantity', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/red/i)).toBeInTheDocument();
      });

      const rejectedInput = screen.getByLabelText(/red/i);
      await user.type(rejectedInput, '50');

      expect(rejectedInput).toHaveValue(50);
    });

    it('should enable save button when valid quantity entered', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /kaydet/i })).toBeDisabled();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      await user.type(acceptedInput, '100');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /kaydet/i })).not.toBeDisabled();
      });
    });

    it('should enable save button with only rejected quantity', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /kaydet/i })).toBeDisabled();
      });

      const rejectedInput = screen.getByLabelText(/red/i);
      await user.type(rejectedInput, '50');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /kaydet/i })).not.toBeDisabled();
      });
    });
  });

  describe('validation', () => {
    it('should show error when accepted quantity exceeds remaining', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      // Enter more than remaining (7000)
      await user.type(acceptedInput, '8000');

      await waitFor(() => {
        expect(screen.getByText(/kalan miktardan buyuk/i)).toBeInTheDocument();
      });
    });

    it('should disable save when accepted exceeds remaining', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      await user.type(acceptedInput, '8000');

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /kaydet/i })).toBeDisabled();
      });
    });

    it('should not allow negative values', async () => {
      const user = userEvent.setup();
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      // HTML number inputs don't accept negative with min=0, but let's verify
      await user.type(acceptedInput, '-100');

      // Input should reject or show validation error
      // The input value should not be -100
      const value = Number((acceptedInput as HTMLInputElement).value);
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  describe('confirmation dialog', () => {
    it('should show confirmation when accepted > 50% of remaining', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.post).mockResolvedValue(mockProductionEntryResponse);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      // Enter more than 50% of remaining (7000), so > 3500
      await user.type(acceptedInput, '4000');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/50.*devam.*istiyor/i)).toBeInTheDocument();
      });
    });

    it('should submit when confirmation is accepted', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      vi.mocked(apiModule.api.post).mockResolvedValue(mockProductionEntryResponse);

      renderWithProviders({ onSuccess });

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      await user.type(acceptedInput, '4000');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/50.*devam.*istiyor/i)).toBeInTheDocument();
      });

      // Click confirm
      const confirmButton = screen.getByRole('button', { name: /onayla|evet|devam/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith(
          '/work-orders/6171/production-entry',
          { acceptedQty: 4000, rejectedQty: 0 }
        );
      });
    });

    it('should not submit when confirmation is cancelled', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.post).mockResolvedValue(mockProductionEntryResponse);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      await user.type(acceptedInput, '4000');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      // Wait for confirmation dialog
      await waitFor(() => {
        expect(screen.getByText(/50.*devam.*istiyor/i)).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: /iptal|hayir|vazgec/i });
      await user.click(cancelButton);

      // API should not be called
      expect(apiModule.api.post).not.toHaveBeenCalled();
    });

    it('should not show confirmation when accepted <= 50% of remaining', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      vi.mocked(apiModule.api.post).mockResolvedValue(mockProductionEntryResponse);

      renderWithProviders({ onSuccess });

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      // Enter 50% or less of remaining (7000), so <= 3500
      await user.type(acceptedInput, '3000');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      // Should submit directly without confirmation
      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith(
          '/work-orders/6171/production-entry',
          { acceptedQty: 3000, rejectedQty: 0 }
        );
      });
    });
  });

  describe('submit', () => {
    it('should call production entry API on submit', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.post).mockResolvedValue(mockProductionEntryResponse);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      const acceptedInput = screen.getByLabelText(/kabul/i);
      const rejectedInput = screen.getByLabelText(/red/i);

      await user.type(acceptedInput, '100');
      await user.type(rejectedInput, '10');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(apiModule.api.post).toHaveBeenCalledWith(
          '/work-orders/6171/production-entry',
          { acceptedQty: 100, rejectedQty: 10 }
        );
      });
    });

    it('should call onSuccess callback on successful submit', async () => {
      const user = userEvent.setup();
      const onSuccess = vi.fn();
      vi.mocked(apiModule.api.post).mockResolvedValue(mockProductionEntryResponse);

      renderWithProviders({ onSuccess });

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/kabul/i), '100');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
      });
    });

    it('should show error message on submit failure', async () => {
      const user = userEvent.setup();

      const mockError = new apiModule.ApiRequestError({
        statusCode: 400,
        message: 'Miktar girisi basarisiz',
        error: 'BAD_REQUEST',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/work-orders/6171/production-entry',
        correlationId: 'abc-123',
      });
      vi.mocked(apiModule.api.post).mockRejectedValue(mockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/kabul/i), '100');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText(/basarisiz/i)).toBeInTheDocument();
      });
    });

    it('should show detailed error for insufficient stock', async () => {
      const user = userEvent.setup();

      // Create error with INSUFFICIENT_STOCK type and details
      const mockStockError = Object.assign(
        new apiModule.ApiRequestError({
          statusCode: 400,
          message: 'Yetersiz hammadde stogu',
          error: 'INSUFFICIENT_STOCK',
          timestamp: '2026-01-24T10:00:00Z',
          path: '/api/work-orders/6171/production-entry',
          correlationId: 'abc-456',
        }),
        {
          details: [
            {
              itemCode: 'HM00000056',
              itemName: 'EXXON MOBIL PP5032E5',
              required: 96.2,
              available: 50.0,
              shortage: 46.2,
              warehouse: 'ITH',
              uom: 'Kilogram',
            },
          ],
        }
      );
      vi.mocked(apiModule.api.post).mockRejectedValue(mockStockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/kabul/i), '100');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        // Should show stock error alert
        expect(screen.getByTestId('submit-error')).toBeInTheDocument();
        // Should show header
        expect(screen.getByText(/yetersiz hammadde stogu/i)).toBeInTheDocument();
        // Should show material code
        expect(screen.getByText(/HM00000056/)).toBeInTheDocument();
        // Should show material name
        expect(screen.getByText(/EXXON MOBIL PP5032E5/)).toBeInTheDocument();
        // Should show shortage detail item
        expect(screen.getByTestId('shortage-item-HM00000056')).toBeInTheDocument();
        // Should show contact message
        expect(screen.getByText(/depo sorumlusu/i)).toBeInTheDocument();
      });
    });

    it('should show multiple materials in stock error', async () => {
      const user = userEvent.setup();

      const mockStockError = Object.assign(
        new apiModule.ApiRequestError({
          statusCode: 400,
          message: 'Yetersiz hammadde stogu',
          error: 'INSUFFICIENT_STOCK',
          timestamp: '2026-01-24T10:00:00Z',
          path: '/api/work-orders/6171/production-entry',
          correlationId: 'abc-789',
        }),
        {
          details: [
            {
              itemCode: 'HM00000056',
              itemName: 'Material A',
              required: 100,
              available: 50,
              shortage: 50,
              warehouse: '03',
              uom: 'KG',
            },
            {
              itemCode: 'YMZ00000140',
              itemName: 'Material B',
              required: 200,
              available: 100,
              shortage: 100,
              warehouse: '03',
              uom: 'KG',
            },
          ],
        }
      );
      vi.mocked(apiModule.api.post).mockRejectedValue(mockStockError);

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/kabul/i), '100');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      await waitFor(() => {
        // Should show both materials
        expect(screen.getByTestId('shortage-item-HM00000056')).toBeInTheDocument();
        expect(screen.getByTestId('shortage-item-YMZ00000140')).toBeInTheDocument();
        expect(screen.getByText(/Material A/)).toBeInTheDocument();
        expect(screen.getByText(/Material B/)).toBeInTheDocument();
      });
    });

    it('should disable save button during submission', async () => {
      const user = userEvent.setup();
      vi.mocked(apiModule.api.post).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve(mockProductionEntryResponse), 100)
          )
      );

      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      await user.type(screen.getByLabelText(/kabul/i), '100');

      const saveButton = screen.getByRole('button', { name: /kaydet/i });
      await user.click(saveButton);

      expect(saveButton).toBeDisabled();
    });
  });

  describe('close behavior', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      renderWithProviders({ onClose });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /iptal/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /iptal/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('should reset input values when modal is reopened', async () => {
      const user = userEvent.setup();

      const { rerender, queryClient } = renderWithProviders();

      await waitFor(() => {
        expect(screen.getByLabelText(/kabul/i)).toBeInTheDocument();
      });

      // Enter some values
      await user.type(screen.getByLabelText(/kabul/i), '100');
      await user.type(screen.getByLabelText(/red/i), '50');

      // Close modal
      rerender(
        <QueryClientProvider client={queryClient}>
          <I18nProvider>
            <AuthProvider>
              <ProductionEntryModal
                isOpen={false}
                workOrder={mockWorkOrder}
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
              <ProductionEntryModal
                isOpen={true}
                workOrder={mockWorkOrder}
                onClose={vi.fn()}
                onSuccess={vi.fn()}
              />
            </AuthProvider>
          </I18nProvider>
        </QueryClientProvider>
      );

      await waitFor(() => {
        // Inputs should be reset
        expect(screen.getByLabelText(/kabul/i)).toHaveValue(null);
        expect(screen.getByLabelText(/red/i)).toHaveValue(null);

        // Save button should be disabled
        expect(screen.getByRole('button', { name: /kaydet/i })).toBeDisabled();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper dialog role', async () => {
      renderWithProviders();

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper labels on inputs', async () => {
      renderWithProviders();

      await waitFor(() => {
        const acceptedInput = screen.getByLabelText(/kabul/i);
        const rejectedInput = screen.getByLabelText(/red/i);

        expect(acceptedInput).toHaveAccessibleName();
        expect(rejectedInput).toHaveAccessibleName();
      });
    });
  });
});
