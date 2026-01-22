import { Controller, Get, Query } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import type {
  CalendarViewFilters,
  CalendarViewResponse,
  CalendarStationsResponse,
  WorkOrderStatusCode,
} from '@org/shared-types';

/**
 * Query parameters for calendar view endpoint
 */
interface CalendarViewQuery {
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
 * Calendar Controller handles calendar view API endpoints.
 *
 * Endpoints:
 * - GET /calendar - Get work orders for calendar view
 * - GET /calendar/stations - Get station list for filter dropdown
 *
 * All endpoints require authentication.
 *
 * @see specs/feature-team-calendar.md
 */
@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Get work orders for calendar view within a date range
   *
   * Work orders are returned as calendar events with color-coded status:
   * - Released (R): Blue
   * - Planned (P): Yellow
   * - Closed (L): Green
   * - Cancelled (C): Gray (not shown by default)
   *
   * @param query - Query parameters (startDate, endDate, stationCode, status)
   * @returns Calendar view response with events
   */
  @Get()
  async getCalendarView(
    @Query() query: CalendarViewQuery
  ): Promise<CalendarViewResponse> {
    const filters: CalendarViewFilters = {
      startDate: query.startDate,
      endDate: query.endDate,
      stationCode: query.stationCode,
      status: query.status,
    };

    return this.calendarService.getOrdersForDateRange(filters);
  }

  /**
   * Get stations for calendar filter dropdown
   *
   * Returns all machines that can be used to filter work orders.
   *
   * @returns List of station options
   */
  @Get('stations')
  async getStations(): Promise<CalendarStationsResponse> {
    return this.calendarService.getStations();
  }
}
