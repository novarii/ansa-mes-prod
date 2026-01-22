import { Injectable, BadRequestException } from '@nestjs/common';
import { WorkOrderRepository, ResourceRepository } from '@org/data-access';
import type {
  CalendarViewFilters,
  CalendarViewResponse,
  CalendarEvent,
  CalendarEventColor,
  CalendarStationsResponse,
  CalendarStationOption,
  WorkOrderStatusCode,
} from '@org/shared-types';

/**
 * Status to color mapping per specs/feature-team-calendar.md
 */
const STATUS_COLORS: Record<WorkOrderStatusCode, CalendarEventColor> = {
  R: 'blue', // Released - active
  P: 'yellow', // Planned - pending
  L: 'green', // Closed - completed
  C: 'gray', // Cancelled
};

/**
 * Calendar Service handles calendar view operations.
 *
 * Provides:
 * - Work orders for date range (calendar events)
 * - Station list for filter dropdown
 *
 * @see specs/feature-team-calendar.md
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly workOrderRepository: WorkOrderRepository,
    private readonly resourceRepository: ResourceRepository
  ) {}

  /**
   * Get work orders for calendar view within a date range
   *
   * Work orders are displayed as calendar events with:
   * - Title: WO-{DocNum}
   * - Start/End dates from work order
   * - Color based on status (R=blue, P=yellow, L=green, C=gray)
   *
   * @param filters - Calendar filters (startDate, endDate, stationCode, status)
   * @returns Calendar view response with events
   * @throws BadRequestException when dates are invalid
   */
  async getOrdersForDateRange(
    filters: CalendarViewFilters
  ): Promise<CalendarViewResponse> {
    // Validate date range
    this.validateDateRange(filters.startDate, filters.endDate);

    // Query work orders
    const workOrders = await this.workOrderRepository.findForCalendar({
      startDate: filters.startDate,
      endDate: filters.endDate,
      stationCode: filters.stationCode,
      status: filters.status,
    });

    // Transform to calendar events
    const events: CalendarEvent[] = workOrders.map((wo) =>
      this.toCalendarEvent(wo)
    );

    return {
      events,
      filters: {
        startDate: filters.startDate,
        endDate: filters.endDate,
        stationCode: filters.stationCode ?? null,
        status: filters.status ?? 'all',
      },
    };
  }

  /**
   * Get all stations for calendar filter dropdown
   *
   * @returns List of stations (machines)
   */
  async getStations(): Promise<CalendarStationsResponse> {
    const machines = await this.resourceRepository.findAllMachines();

    const stations: CalendarStationOption[] = machines.map((m) => ({
      code: m.ResCode,
      name: m.ResName,
    }));

    return { stations };
  }

  /**
   * Validate date range inputs
   */
  private validateDateRange(startDate: string, endDate: string): void {
    if (!startDate || startDate.trim() === '') {
      throw new BadRequestException('Baslangic tarihi gereklidir');
    }

    if (!endDate || endDate.trim() === '') {
      throw new BadRequestException('Bitis tarihi gereklidir');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime())) {
      throw new BadRequestException('Gecersiz baslangic tarihi');
    }

    if (isNaN(end.getTime())) {
      throw new BadRequestException('Gecersiz bitis tarihi');
    }

    if (start > end) {
      throw new BadRequestException(
        'Baslangic tarihi bitis tarihinden sonra olamaz'
      );
    }
  }

  /**
   * Transform work order to calendar event
   */
  private toCalendarEvent(wo: {
    DocEntry: number;
    DocNum: number;
    ItemCode: string;
    ItemName: string;
    StartDate: string | Date;
    DueDate: string | Date;
    Status: WorkOrderStatusCode;
    CustomerName: string | null;
    MachineCode: string | null;
    MachineName: string | null;
  }): CalendarEvent {
    return {
      id: wo.DocEntry,
      title: `WO-${wo.DocNum}`,
      start: this.toISOString(wo.StartDate),
      end: this.toISOString(wo.DueDate),
      itemCode: wo.ItemCode,
      itemName: wo.ItemName,
      customerName: wo.CustomerName,
      status: wo.Status,
      machineCode: wo.MachineCode,
      machineName: wo.MachineName,
      color: STATUS_COLORS[wo.Status] ?? 'gray',
    };
  }

  /**
   * Convert date to ISO string format
   */
  private toISOString(value: Date | string): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }
}
