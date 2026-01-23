import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { WorkOrderRepository, ResourceRepository } from '@org/data-access';
import type { CalendarViewFilters, WorkOrderStatusCode, Machine } from '@org/shared-types';

describe('CalendarService', () => {
  let service: CalendarService;
  let workOrderRepository: jest.Mocked<WorkOrderRepository>;
  let resourceRepository: jest.Mocked<ResourceRepository>;

  const mockWorkOrderRepository = {
    findForCalendar: jest.fn(),
  };

  const mockResourceRepository = {
    findAllMachines: jest.fn(),
  };

  const mockCalendarWorkOrders = [
    {
      DocEntry: 12345,
      DocNum: 67890,
      ItemCode: 'YM00001662',
      ItemName: 'Test Product 1',
      StartDate: '2026-01-15T00:00:00.000Z',
      DueDate: '2026-01-20T00:00:00.000Z',
      Status: 'R' as WorkOrderStatusCode,
      CardCode: 'C001',
      CustomerName: 'Test Customer A',
      MachineCode: 'M001',
      MachineName: 'BARMAG 1',
    },
    {
      DocEntry: 12346,
      DocNum: 67891,
      ItemCode: 'YM00001663',
      ItemName: 'Test Product 2',
      StartDate: '2026-01-18T00:00:00.000Z',
      DueDate: '2026-01-25T00:00:00.000Z',
      Status: 'P' as WorkOrderStatusCode,
      CardCode: 'C002',
      CustomerName: 'Test Customer B',
      MachineCode: 'M002',
      MachineName: 'BARMAG 2',
    },
    {
      DocEntry: 12347,
      DocNum: 67892,
      ItemCode: 'YM00001664',
      ItemName: 'Test Product 3',
      StartDate: '2026-01-10T00:00:00.000Z',
      DueDate: '2026-01-15T00:00:00.000Z',
      Status: 'L' as WorkOrderStatusCode,
      CardCode: 'C001',
      CustomerName: 'Test Customer A',
      MachineCode: null,
      MachineName: null,
    },
  ];

  const mockMachines: Machine[] = [
    { ResCode: 'M001', ResName: 'BARMAG 1', ResType: 'M', U_defaultEmp: '100', U_secondEmp: '101' },
    { ResCode: 'M002', ResName: 'BARMAG 2', ResType: 'M', U_defaultEmp: '200', U_secondEmp: null },
    { ResCode: 'M003', ResName: 'BARMAG 3', ResType: 'M', U_defaultEmp: null, U_secondEmp: null },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: WorkOrderRepository,
          useValue: mockWorkOrderRepository,
        },
        {
          provide: ResourceRepository,
          useValue: mockResourceRepository,
        },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    workOrderRepository = module.get(WorkOrderRepository);
    resourceRepository = module.get(ResourceRepository);
  });

  describe('getOrdersForDateRange', () => {
    const validFilters: CalendarViewFilters = {
      startDate: '2026-01-01',
      endDate: '2026-01-31',
    };

    it('should return calendar events for date range', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue(
        mockCalendarWorkOrders
      );

      const result = await service.getOrdersForDateRange(validFilters);

      expect(result.events).toHaveLength(3);
      expect(result.filters.startDate).toBe('2026-01-01');
      expect(result.filters.endDate).toBe('2026-01-31');
    });

    it('should transform work orders to calendar events', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue([
        mockCalendarWorkOrders[0],
      ]);

      const result = await service.getOrdersForDateRange(validFilters);

      const event = result.events[0];
      expect(event).toEqual({
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
      });
    });

    it('should assign correct colors based on status', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue(
        mockCalendarWorkOrders
      );

      const result = await service.getOrdersForDateRange(validFilters);

      // Released (R) = blue
      expect(result.events[0].color).toBe('blue');
      // Planned (P) = yellow
      expect(result.events[1].color).toBe('yellow');
      // Closed (L) = green
      expect(result.events[2].color).toBe('green');
    });

    it('should pass station filter to repository', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue([]);

      await service.getOrdersForDateRange({
        ...validFilters,
        stationCode: 'M001',
      });

      expect(workOrderRepository.findForCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          stationCode: 'M001',
        })
      );
    });

    it('should pass status filter to repository', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue([]);

      await service.getOrdersForDateRange({
        ...validFilters,
        status: 'R',
      });

      expect(workOrderRepository.findForCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'R',
        })
      );
    });

    it('should handle status filter "all"', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue(
        mockCalendarWorkOrders
      );

      const result = await service.getOrdersForDateRange({
        ...validFilters,
        status: 'all',
      });

      expect(result.filters.status).toBe('all');
    });

    it('should return null station filter when not provided', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue([]);

      const result = await service.getOrdersForDateRange(validFilters);

      expect(result.filters.stationCode).toBeNull();
    });

    it('should handle work orders with null machine info', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue([
        mockCalendarWorkOrders[2],
      ]);

      const result = await service.getOrdersForDateRange(validFilters);

      expect(result.events[0].machineCode).toBeNull();
      expect(result.events[0].machineName).toBeNull();
    });

    it('should handle work orders with null customer name', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue([
        { ...mockCalendarWorkOrders[0], CustomerName: null },
      ]);

      const result = await service.getOrdersForDateRange(validFilters);

      expect(result.events[0].customerName).toBeNull();
    });

    it('should return empty events when no work orders found', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue([]);

      const result = await service.getOrdersForDateRange(validFilters);

      expect(result.events).toHaveLength(0);
    });

    it('should throw BadRequestException when startDate is missing', async () => {
      await expect(
        service.getOrdersForDateRange({
          startDate: '',
          endDate: '2026-01-31',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when endDate is missing', async () => {
      await expect(
        service.getOrdersForDateRange({
          startDate: '2026-01-01',
          endDate: '',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when startDate is after endDate', async () => {
      await expect(
        service.getOrdersForDateRange({
          startDate: '2026-01-31',
          endDate: '2026-01-01',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should assign gray color to cancelled status', async () => {
      workOrderRepository.findForCalendar.mockResolvedValue([
        { ...mockCalendarWorkOrders[0], Status: 'C' as WorkOrderStatusCode },
      ]);

      const result = await service.getOrdersForDateRange(validFilters);

      expect(result.events[0].color).toBe('gray');
    });
  });

  describe('getStations', () => {
    it('should return all machines as station options', async () => {
      resourceRepository.findAllMachines.mockResolvedValue(mockMachines);

      const result = await service.getStations();

      expect(result.stations).toHaveLength(3);
    });

    it('should transform machines to station options', async () => {
      resourceRepository.findAllMachines.mockResolvedValue(mockMachines);

      const result = await service.getStations();

      expect(result.stations[0]).toEqual({
        code: 'M001',
        name: 'BARMAG 1',
      });
    });

    it('should return empty array when no machines exist', async () => {
      resourceRepository.findAllMachines.mockResolvedValue([]);

      const result = await service.getStations();

      expect(result.stations).toHaveLength(0);
    });
  });
});
