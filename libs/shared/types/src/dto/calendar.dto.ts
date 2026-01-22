/**
 * Calendar View DTOs
 *
 * Data Transfer Objects for calendar view.
 *
 * @see specs/feature-team-calendar.md
 */

import type { WorkOrderStatusCode } from '../entities/work-order.entity.js';

/**
 * Calendar view request filters
 */
export interface CalendarViewFilters {
  /** Start date (ISO format, required) */
  startDate: string;
  /** End date (ISO format, required) */
  endDate: string;
  /** Station/machine filter (optional) */
  stationCode?: string;
  /** Status filter (optional) */
  status?: WorkOrderStatusCode | 'all';
}

/**
 * Calendar event (work order)
 */
export interface CalendarEvent {
  /** Work order doc entry (used as event ID) */
  id: number;
  /** Event title (WO-{DocNum}) */
  title: string;
  /** Start date (ISO format) */
  start: string;
  /** End date (ISO format) - same as due date */
  end: string;
  /** Product code */
  itemCode: string;
  /** Product name */
  itemName: string;
  /** Customer name */
  customerName: string | null;
  /** Work order status */
  status: WorkOrderStatusCode;
  /** Machine code */
  machineCode: string | null;
  /** Machine name */
  machineName: string | null;
  /** Color based on status */
  color: CalendarEventColor;
}

/**
 * Calendar event colors based on status
 */
export type CalendarEventColor = 'blue' | 'yellow' | 'green' | 'gray';

/**
 * Status to color mapping
 */
export const CalendarStatusColors: Record<WorkOrderStatusCode, CalendarEventColor> = {
  R: 'blue',    // Released - active
  P: 'yellow',  // Planned - pending
  L: 'green',   // Closed - completed
  C: 'gray',    // Cancelled
};

/**
 * Calendar view response
 */
export interface CalendarViewResponse {
  /** List of calendar events */
  events: CalendarEvent[];
  /** Applied filters */
  filters: {
    startDate: string;
    endDate: string;
    stationCode: string | null;
    status: WorkOrderStatusCode | 'all';
  };
}

/**
 * Station option for calendar filter
 */
export interface CalendarStationOption {
  /** Machine code */
  code: string;
  /** Machine name */
  name: string;
}

/**
 * Calendar stations response
 */
export interface CalendarStationsResponse {
  /** List of stations with work orders */
  stations: CalendarStationOption[];
}

/**
 * Calendar view mode
 */
export type CalendarViewMode = 'month' | 'week' | 'day';

/**
 * Turkish calendar labels
 */
export const CalendarLabels = {
  viewModes: {
    month: 'Ay',
    week: 'Hafta',
    day: 'Gun',
  },
  navigation: {
    today: 'Bugun',
    previous: 'Onceki',
    next: 'Sonraki',
  },
  days: {
    short: ['Pts', 'Sal', 'Car', 'Per', 'Cum', 'Cts', 'Paz'],
    long: ['Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi', 'Pazar'],
  },
  months: [
    'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
    'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik',
  ],
} as const;
