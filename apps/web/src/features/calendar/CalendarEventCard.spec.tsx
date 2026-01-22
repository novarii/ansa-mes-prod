/**
 * CalendarEventCard Tests
 *
 * Tests for the calendar event card component used to display work orders
 * on the calendar view.
 *
 * @see specs/feature-team-calendar.md
 * @see specs/i18n-turkish-locale.md
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CalendarEventCard } from './CalendarEventCard';
import { I18nProvider } from '@org/shared-i18n';
import type { CalendarEvent, WorkOrderStatusCode } from '@org/shared-types';

/**
 * Wrapper component with required providers
 */
function renderWithProviders(ui: React.ReactElement): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <I18nProvider>{ui}</I18nProvider>
    </MemoryRouter>
  );
}

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

describe('CalendarEventCard', () => {
  describe('rendering', () => {
    it('should render work order title (WO-DocNum)', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} />);

      expect(screen.getByText('WO-2026001')).toBeInTheDocument();
    });

    it('should render item code', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} />);

      expect(screen.getByText('YM00001662')).toBeInTheDocument();
    });

    it('should render customer name', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} />);

      expect(screen.getByText('Test Customer')).toBeInTheDocument();
    });

    it('should have correct test id', () => {
      const event = createMockEvent({ id: 6171 });
      renderWithProviders(<CalendarEventCard event={event} />);

      expect(screen.getByTestId('calendar-event-6171')).toBeInTheDocument();
    });

    it('should have data-color attribute', () => {
      const event = createMockEvent({ color: 'blue' });
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6171');
      expect(card).toHaveAttribute('data-color', 'blue');
    });
  });

  describe('status color coding', () => {
    it('should have blue styling for Released (R) status', () => {
      const event = createMockEvent({ status: 'R', color: 'blue' });
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6171');
      expect(card).toHaveAttribute('data-color', 'blue');
      // Should have blue-related class
      expect(card.className).toMatch(/blue|primary/);
    });

    it('should have yellow styling for Planned (P) status', () => {
      const event = createMockEvent({ id: 6172, status: 'P', color: 'yellow' });
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6172');
      expect(card).toHaveAttribute('data-color', 'yellow');
      // Should have yellow-related class
      expect(card.className).toMatch(/yellow|warning/);
    });

    it('should have green styling for Closed (L) status', () => {
      const event = createMockEvent({ id: 6173, status: 'L', color: 'green' });
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6173');
      expect(card).toHaveAttribute('data-color', 'green');
      // Should have green-related class
      expect(card.className).toMatch(/green|success/);
    });

    it('should have gray styling for Cancelled (C) status', () => {
      const event = createMockEvent({ id: 6174, status: 'C', color: 'gray' });
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6174');
      expect(card).toHaveAttribute('data-color', 'gray');
      // Should have gray-related class
      expect(card.className).toMatch(/gray|muted/);
    });
  });

  describe('compact mode', () => {
    it('should render in compact mode by default (for calendar cells)', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} />);

      // In compact mode, should show limited info
      const card = screen.getByTestId('calendar-event-6171');
      expect(card).toHaveAttribute('data-compact', 'true');
    });

    it('should show full details when compact is false', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} compact={false} />);

      const card = screen.getByTestId('calendar-event-6171');
      expect(card).toHaveAttribute('data-compact', 'false');

      // Full mode should show more details
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.getByText('BARMAG 1')).toBeInTheDocument();
    });

    it('should truncate long customer names in compact mode', () => {
      const event = createMockEvent({
        customerName: 'Very Long Customer Name That Should Be Truncated In Compact Mode',
      });
      renderWithProviders(<CalendarEventCard event={event} />);

      // In compact mode, long text should be truncated (CSS handles this)
      const card = screen.getByTestId('calendar-event-6171');
      const customerText = card.querySelector('[data-field="customer"]');
      expect(customerText).toHaveClass('truncate');
    });
  });

  describe('click handling', () => {
    it('should call onClick when event card is clicked', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const event = createMockEvent();

      renderWithProviders(<CalendarEventCard event={event} onClick={handleClick} />);

      const card = screen.getByTestId('calendar-event-6171');
      await user.click(card);

      expect(handleClick).toHaveBeenCalledWith(6171);
    });

    it('should have cursor-pointer when onClick is provided', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} onClick={() => {}} />);

      const card = screen.getByTestId('calendar-event-6171');
      expect(card).toHaveClass('cursor-pointer');
    });

    it('should not have cursor-pointer when onClick is not provided', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6171');
      expect(card).not.toHaveClass('cursor-pointer');
    });
  });

  describe('null values handling', () => {
    it('should handle null customer name gracefully', () => {
      const event = createMockEvent({ customerName: null });
      renderWithProviders(<CalendarEventCard event={event} />);

      // Should not crash and should render without customer name
      expect(screen.getByTestId('calendar-event-6171')).toBeInTheDocument();
      expect(screen.queryByText('Test Customer')).not.toBeInTheDocument();
    });

    it('should handle null machine name gracefully', () => {
      const event = createMockEvent({ machineName: null, machineCode: null });
      renderWithProviders(<CalendarEventCard event={event} compact={false} />);

      // Should not crash and should render without machine name
      expect(screen.getByTestId('calendar-event-6171')).toBeInTheDocument();
      expect(screen.queryByText('BARMAG 1')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6171');
      expect(card).toHaveAttribute('aria-label');
      expect(card.getAttribute('aria-label')).toMatch(/wo-2026001/i);
    });

    it('should be keyboard accessible when clickable', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} onClick={() => {}} />);

      const card = screen.getByTestId('calendar-event-6171');
      expect(card).toHaveAttribute('role', 'button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should handle keyboard Enter press when clickable', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const event = createMockEvent();

      renderWithProviders(<CalendarEventCard event={event} onClick={handleClick} />);

      const card = screen.getByTestId('calendar-event-6171');
      card.focus();
      await user.keyboard('{Enter}');

      expect(handleClick).toHaveBeenCalledWith(6171);
    });

    it('should handle keyboard Space press when clickable', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();
      const event = createMockEvent();

      renderWithProviders(<CalendarEventCard event={event} onClick={handleClick} />);

      const card = screen.getByTestId('calendar-event-6171');
      card.focus();
      await user.keyboard(' ');

      expect(handleClick).toHaveBeenCalledWith(6171);
    });
  });

  describe('visual styling', () => {
    it('should have border indicating status color', () => {
      const event = createMockEvent({ color: 'blue' });
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6171');
      // Should have left border or background indicating color
      expect(card.className).toMatch(/border|bg/);
    });

    it('should have proper text hierarchy', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} />);

      // Title should be bold/semibold
      const title = screen.getByText('WO-2026001');
      expect(title.className).toMatch(/font-medium|font-semibold|font-bold/);
    });

    it('should have hover effect when clickable', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} onClick={() => {}} />);

      const card = screen.getByTestId('calendar-event-6171');
      // Should have hover effect class
      expect(card.className).toMatch(/hover:/);
    });
  });

  describe('edge cases', () => {
    it('should handle very long work order title', () => {
      const event = createMockEvent({ title: 'WO-9999999999' });
      renderWithProviders(<CalendarEventCard event={event} />);

      expect(screen.getByText('WO-9999999999')).toBeInTheDocument();
    });

    it('should handle very long item code', () => {
      const event = createMockEvent({ itemCode: 'VERYLONGITEMCODE12345678' });
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6171');
      // Should be truncated in compact mode
      const itemCodeElement = card.querySelector('[data-field="itemCode"]');
      expect(itemCodeElement).toHaveClass('truncate');
    });

    it('should handle empty item name', () => {
      const event = createMockEvent({ itemName: '' });
      renderWithProviders(<CalendarEventCard event={event} compact={false} />);

      expect(screen.getByTestId('calendar-event-6171')).toBeInTheDocument();
    });
  });

  describe('tooltip/title', () => {
    it('should show full details on hover via title attribute', () => {
      const event = createMockEvent();
      renderWithProviders(<CalendarEventCard event={event} />);

      const card = screen.getByTestId('calendar-event-6171');
      expect(card).toHaveAttribute('title');
      // Title should contain full details
      const titleAttr = card.getAttribute('title');
      expect(titleAttr).toContain('WO-2026001');
      expect(titleAttr).toContain('YM00001662');
    });
  });
});
