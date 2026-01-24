/**
 * WorkOrderCard Tests
 *
 * Tests for the work order card component.
 *
 * @see specs/feature-production.md
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkOrderCard } from './WorkOrderCard';
import { I18nProvider } from '@org/shared-i18n';
import type { WorkOrderListItem } from '@org/shared-types';

/**
 * Mock work order data for testing
 */
const mockWorkOrder: WorkOrderListItem = {
  docEntry: 6171,
  docNum: 2026001,
  itemCode: 'YM00001662',
  prodName: 'Test Product Widget',
  plannedQty: 22500,
  completedQty: 15000,
  rejectedQty: 500,
  remainingQty: 7500,
  progressPercent: 66.7,
  dueDate: '2026-01-25T00:00:00.000Z',
  customerName: 'ABC Corporation',
  machineCode: 'M001',
  machineName: 'Machine 1',
};

/**
 * Wrapper component with required providers
 */
function renderWithProviders(
  workOrder: WorkOrderListItem = mockWorkOrder,
  onClick?: (docEntry: number) => void
): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <I18nProvider>
        <WorkOrderCard workOrder={workOrder} onClick={onClick} />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('WorkOrderCard', () => {
  describe('rendering', () => {
    it('should render work order number', () => {
      renderWithProviders();

      expect(screen.getByText(/2026001/)).toBeInTheDocument();
    });

    it('should render product code and name', () => {
      renderWithProviders();

      expect(screen.getByText('YM00001662')).toBeInTheDocument();
      expect(screen.getByText('Test Product Widget')).toBeInTheDocument();
    });

    it('should render customer name', () => {
      renderWithProviders();

      expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    });

    it('should render machine name badge', () => {
      renderWithProviders();

      expect(screen.getByText('Machine 1')).toBeInTheDocument();
    });

    it('should render quantity information with Turkish formatting', () => {
      renderWithProviders();

      // Planned quantity: 22.500 (Turkish format)
      expect(screen.getByText(/22\.500/)).toBeInTheDocument();
      // Remaining quantity: 7.500 (Turkish format)
      expect(screen.getByText(/7\.500/)).toBeInTheDocument();
    });

    it('should render progress percentage', () => {
      renderWithProviders();

      // 66.7% or 66,7% (Turkish)
      expect(screen.getByText(/66[,.]7/)).toBeInTheDocument();
    });

    it('should render due date in Turkish format', () => {
      renderWithProviders();

      // 25.01.2026 (DD.MM.YYYY)
      expect(screen.getByText(/25\.01\.2026/)).toBeInTheDocument();
    });

    it('should handle null customer name', () => {
      const workOrderWithNoCustomer: WorkOrderListItem = {
        ...mockWorkOrder,
        customerName: null,
      };

      renderWithProviders(workOrderWithNoCustomer);

      // Should not throw error and should render dash or empty
      expect(screen.queryByText('null')).not.toBeInTheDocument();
    });

    it('should render with proper test id', () => {
      renderWithProviders();

      expect(screen.getByTestId('work-order-card-6171')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('should render progress bar with correct width', () => {
      renderWithProviders();

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '66.7');
    });

    it('should render progress bar at 0% when no progress', () => {
      const workOrderNoProgress: WorkOrderListItem = {
        ...mockWorkOrder,
        completedQty: 0,
        progressPercent: 0,
        remainingQty: 22500,
      };

      renderWithProviders(workOrderNoProgress);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    it('should render progress bar at 100% when completed', () => {
      const workOrderCompleted: WorkOrderListItem = {
        ...mockWorkOrder,
        completedQty: 22500,
        progressPercent: 100,
        remainingQty: 0,
      };

      renderWithProviders(workOrderCompleted);

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });
  });

  describe('interactions', () => {
    it('should call onClick with docEntry when clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      renderWithProviders(mockWorkOrder, handleClick);

      const card = screen.getByTestId('work-order-card-6171');
      await user.click(card);

      expect(handleClick).toHaveBeenCalledWith(6171);
    });

    it('should have cursor pointer style when clickable', () => {
      const handleClick = vi.fn();
      renderWithProviders(mockWorkOrder, handleClick);

      const card = screen.getByTestId('work-order-card-6171');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should not throw when clicked without onClick handler', async () => {
      const user = userEvent.setup();
      renderWithProviders(mockWorkOrder);

      const card = screen.getByTestId('work-order-card-6171');
      await expect(user.click(card)).resolves.not.toThrow();
    });
  });

  describe('visual indicators', () => {
    it('should show urgency indicator for near due date', () => {
      // Create a work order with tomorrow's due date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const urgentWorkOrder: WorkOrderListItem = {
        ...mockWorkOrder,
        dueDate: tomorrow.toISOString(),
      };

      renderWithProviders(urgentWorkOrder);

      // Should have urgent styling (red/warning)
      const card = screen.getByTestId('work-order-card-6171');
      expect(card).toHaveClass('border-destructive');
    });

    it('should show overdue indicator for past due date', () => {
      // Create a work order with yesterday's due date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const overdueWorkOrder: WorkOrderListItem = {
        ...mockWorkOrder,
        dueDate: yesterday.toISOString(),
      };

      renderWithProviders(overdueWorkOrder);

      // Should have overdue text/badge
      expect(screen.getByText(/gecikmi(s|ş)/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      renderWithProviders(mockWorkOrder, handleClick);

      const card = screen.getByTestId('work-order-card-6171');
      card.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledWith(6171);
    });

    it('should have proper ARIA labels', () => {
      renderWithProviders();

      const card = screen.getByTestId('work-order-card-6171');
      expect(card).toHaveAttribute('aria-label');
    });
  });

  describe('stock warning', () => {
    it('should show stock warning when hasStockWarning is true', () => {
      const workOrderWithWarning: WorkOrderListItem = {
        ...mockWorkOrder,
        hasStockWarning: true,
      };

      renderWithProviders(workOrderWithWarning);

      expect(screen.getByTestId('stock-warning')).toBeInTheDocument();
      expect(screen.getByText(/yetersiz hammadde stogu/i)).toBeInTheDocument();
    });

    it('should not show stock warning when hasStockWarning is false', () => {
      const workOrderNoWarning: WorkOrderListItem = {
        ...mockWorkOrder,
        hasStockWarning: false,
      };

      renderWithProviders(workOrderNoWarning);

      expect(screen.queryByTestId('stock-warning')).not.toBeInTheDocument();
    });

    it('should not show stock warning when hasStockWarning is undefined', () => {
      renderWithProviders(mockWorkOrder);

      expect(screen.queryByTestId('stock-warning')).not.toBeInTheDocument();
    });
  });
});
