import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import type {
  CalendarViewResponse,
  CalendarStationsResponse,
  CalendarEvent,
} from '@org/shared-types';

describe('CalendarController', () => {
  let controller: CalendarController;
  let calendarService: jest.Mocked<CalendarService>;

  const mockEvents: CalendarEvent[] = [
    {
      id: 12345,
      title: 'WO-67890',
      start: '2026-01-15T00:00:00.000Z',
      end: '2026-01-20T00:00:00.000Z',
      itemCode: 'YM00001662',
      itemName: 'Test Product 1',
      customerName: 'Test Customer A',
      status: 'R',
      machineCode: 'M001',
      machineName: 'BARMAG 1',
      color: 'blue',
    },
    {
      id: 12346,
      title: 'WO-67891',
      start: '2026-01-18T00:00:00.000Z',
      end: '2026-01-25T00:00:00.000Z',
      itemCode: 'YM00001663',
      itemName: 'Test Product 2',
      customerName: 'Test Customer B',
      status: 'P',
      machineCode: 'M002',
      machineName: 'BARMAG 2',
      color: 'yellow',
    },
  ];

  const mockCalendarViewResponse: CalendarViewResponse = {
    events: mockEvents,
    filters: {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
      stationCode: null,
      status: 'all',
    },
  };

  const mockStationsResponse: CalendarStationsResponse = {
    stations: [
      { code: 'M001', name: 'BARMAG 1' },
      { code: 'M002', name: 'BARMAG 2' },
      { code: 'M003', name: 'BARMAG 3' },
    ],
  };

  const mockCalendarService = {
    getOrdersForDateRange: jest.fn(),
    getStations: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CalendarController],
      providers: [
        {
          provide: CalendarService,
          useValue: mockCalendarService,
        },
      ],
    }).compile();

    controller = module.get<CalendarController>(CalendarController);
    calendarService = module.get(CalendarService);
  });

  describe('getCalendarView', () => {
    it('should return calendar events for date range', async () => {
      calendarService.getOrdersForDateRange.mockResolvedValue(
        mockCalendarViewResponse
      );

      const result = await controller.getCalendarView({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(result).toEqual(mockCalendarViewResponse);
      expect(calendarService.getOrdersForDateRange).toHaveBeenCalledWith({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        stationCode: undefined,
        status: undefined,
      });
    });

    it('should pass station filter to service', async () => {
      calendarService.getOrdersForDateRange.mockResolvedValue({
        ...mockCalendarViewResponse,
        filters: { ...mockCalendarViewResponse.filters, stationCode: 'M001' },
      });

      await controller.getCalendarView({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        stationCode: 'M001',
      });

      expect(calendarService.getOrdersForDateRange).toHaveBeenCalledWith(
        expect.objectContaining({
          stationCode: 'M001',
        })
      );
    });

    it('should pass status filter to service', async () => {
      calendarService.getOrdersForDateRange.mockResolvedValue({
        ...mockCalendarViewResponse,
        filters: { ...mockCalendarViewResponse.filters, status: 'R' },
      });

      await controller.getCalendarView({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        status: 'R',
      });

      expect(calendarService.getOrdersForDateRange).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'R',
        })
      );
    });

    it('should handle all status filter', async () => {
      calendarService.getOrdersForDateRange.mockResolvedValue(
        mockCalendarViewResponse
      );

      await controller.getCalendarView({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        status: 'all',
      });

      expect(calendarService.getOrdersForDateRange).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'all',
        })
      );
    });

    it('should return empty events when no work orders found', async () => {
      calendarService.getOrdersForDateRange.mockResolvedValue({
        events: [],
        filters: mockCalendarViewResponse.filters,
      });

      const result = await controller.getCalendarView({
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      });

      expect(result.events).toHaveLength(0);
    });

    it('should propagate service exceptions', async () => {
      calendarService.getOrdersForDateRange.mockRejectedValue(
        new BadRequestException('Baslangic tarihi gereklidir')
      );

      await expect(
        controller.getCalendarView({
          startDate: '',
          endDate: '2026-01-31',
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStations', () => {
    it('should return all stations', async () => {
      calendarService.getStations.mockResolvedValue(mockStationsResponse);

      const result = await controller.getStations();

      expect(result.stations).toHaveLength(3);
    });

    it('should return stations with code and name', async () => {
      calendarService.getStations.mockResolvedValue(mockStationsResponse);

      const result = await controller.getStations();

      expect(result.stations[0]).toEqual({
        code: 'M001',
        name: 'BARMAG 1',
      });
    });

    it('should return empty array when no stations exist', async () => {
      calendarService.getStations.mockResolvedValue({ stations: [] });

      const result = await controller.getStations();

      expect(result.stations).toHaveLength(0);
    });
  });
});
