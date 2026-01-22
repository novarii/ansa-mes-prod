import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { WorkOrderRepository, PickListRepository } from '@org/data-access';
import { WorkOrderWithDetails } from '@org/shared-types';

describe('WorkOrderService', () => {
  let service: WorkOrderService;
  let workOrderRepository: jest.Mocked<WorkOrderRepository>;
  let pickListRepository: jest.Mocked<PickListRepository>;

  const mockWorkOrderRepository = {
    findAll: jest.fn(),
    findByDocEntry: jest.fn(),
    findCustomersWithActiveOrders: jest.fn(),
  };

  const mockPickListRepository = {
    findByWorkOrder: jest.fn(),
    getPendingMaterials: jest.fn(),
  };

  const mockWorkOrder: WorkOrderWithDetails = {
    DocEntry: 12345,
    DocNum: 67890,
    ItemCode: 'YM00001662',
    ProdName: 'Test Product',
    PlannedQty: 1000,
    CmpltQty: 500,
    RjctQty: 50,
    RemainingQty: 500,
    ProgressPercent: 50,
    StartDate: '2026-01-15T00:00:00.000Z',
    DueDate: '2026-01-25T00:00:00.000Z',
    RlsDate: '2026-01-10T00:00:00.000Z',
    Status: 'R',
    CardCode: 'C001',
    CustomerName: 'Test Customer',
    U_StationSortOrder: 10,
    Warehouse: '03',
    Comments: 'Test comments',
    MachineCode: 'M001',
    MachineName: 'BARMAG 1',
  };

  const mockPickListItems = [
    {
      ItemCode: 'MAT001',
      ItemName: 'Material 1',
      PlannedQty: 100,
      IssuedQty: 50,
      RemainingQty: 50,
      Warehouse: '01',
      UoM: 'KG',
    },
    {
      ItemCode: 'MAT002',
      ItemName: 'Material 2',
      PlannedQty: 200,
      IssuedQty: 200,
      RemainingQty: 0,
      Warehouse: '01',
      UoM: 'KG',
    },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderService,
        {
          provide: WorkOrderRepository,
          useValue: mockWorkOrderRepository,
        },
        {
          provide: PickListRepository,
          useValue: mockPickListRepository,
        },
      ],
    }).compile();

    service = module.get<WorkOrderService>(WorkOrderService);
    workOrderRepository = module.get(WorkOrderRepository);
    pickListRepository = module.get(PickListRepository);
  });

  describe('getWorkOrders', () => {
    const mockWorkOrders: WorkOrderWithDetails[] = [
      mockWorkOrder,
      {
        ...mockWorkOrder,
        DocEntry: 12346,
        DocNum: 67891,
        ItemCode: 'YM00001663',
      },
    ];

    it('should return paginated work orders for a station', async () => {
      workOrderRepository.findAll.mockResolvedValue(mockWorkOrders);

      const result = await service.getWorkOrders('M001', {});

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });

    it('should pass station code as array to repository', async () => {
      workOrderRepository.findAll.mockResolvedValue([]);

      await service.getWorkOrders('M001', {});

      expect(workOrderRepository.findAll).toHaveBeenCalledWith(
        ['M001'],
        expect.objectContaining({ limit: 20, offset: 0 })
      );
    });

    it('should transform repository data to DTO format', async () => {
      workOrderRepository.findAll.mockResolvedValue([mockWorkOrder]);

      const result = await service.getWorkOrders('M001', {});

      expect(result.items[0]).toEqual({
        docEntry: 12345,
        docNum: 67890,
        itemCode: 'YM00001662',
        prodName: 'Test Product',
        plannedQty: 1000,
        completedQty: 500,
        rejectedQty: 50,
        remainingQty: 500,
        progressPercent: 50,
        dueDate: '2026-01-25T00:00:00.000Z',
        customerName: 'Test Customer',
        machineCode: 'M001',
        machineName: 'BARMAG 1',
      });
    });

    it('should apply customer filter', async () => {
      workOrderRepository.findAll.mockResolvedValue([]);

      await service.getWorkOrders('M001', { customerCode: 'C001' });

      expect(workOrderRepository.findAll).toHaveBeenCalledWith(
        ['M001'],
        expect.objectContaining({ customerCode: 'C001' })
      );
    });

    it('should apply search text filter', async () => {
      workOrderRepository.findAll.mockResolvedValue([]);

      await service.getWorkOrders('M001', { search: 'test search' });

      expect(workOrderRepository.findAll).toHaveBeenCalledWith(
        ['M001'],
        expect.objectContaining({ searchText: 'test search' })
      );
    });

    it('should handle pagination correctly', async () => {
      workOrderRepository.findAll.mockResolvedValue([]);

      await service.getWorkOrders('M001', { page: 3, limit: 10 });

      expect(workOrderRepository.findAll).toHaveBeenCalledWith(
        ['M001'],
        expect.objectContaining({ limit: 10, offset: 20 })
      );
    });

    it('should calculate total pages correctly', async () => {
      // Mock 45 items with limit 20 should give 3 pages
      const manyOrders = Array(45).fill(mockWorkOrder);
      workOrderRepository.findAll.mockResolvedValue(manyOrders);

      const result = await service.getWorkOrders('M001', { limit: 20 });

      expect(result.totalPages).toBe(3);
    });

    it('should use default pagination when not specified', async () => {
      workOrderRepository.findAll.mockResolvedValue([]);

      await service.getWorkOrders('M001', {});

      expect(workOrderRepository.findAll).toHaveBeenCalledWith(
        ['M001'],
        expect.objectContaining({ limit: 20, offset: 0 })
      );
    });

    it('should throw BadRequestException for empty stationCode', async () => {
      await expect(service.getWorkOrders('', {})).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle null customer name', async () => {
      workOrderRepository.findAll.mockResolvedValue([
        { ...mockWorkOrder, CustomerName: null },
      ]);

      const result = await service.getWorkOrders('M001', {});

      expect(result.items[0].customerName).toBeNull();
    });
  });

  describe('getWorkOrderDetail', () => {
    it('should return work order detail by docEntry', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.getWorkOrderDetail(12345);

      expect(result.docEntry).toBe(12345);
      expect(result.docNum).toBe(67890);
      expect(result.itemCode).toBe('YM00001662');
    });

    it('should transform all detail fields correctly', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.getWorkOrderDetail(12345);

      expect(result).toEqual({
        docEntry: 12345,
        docNum: 67890,
        itemCode: 'YM00001662',
        prodName: 'Test Product',
        plannedQty: 1000,
        completedQty: 500,
        rejectedQty: 50,
        remainingQty: 500,
        progressPercent: 50,
        startDate: '2026-01-15T00:00:00.000Z',
        dueDate: '2026-01-25T00:00:00.000Z',
        releaseDate: '2026-01-10T00:00:00.000Z',
        customerCode: 'C001',
        customerName: 'Test Customer',
        warehouse: '03',
        comments: 'Test comments',
        sortOrder: 10,
      });
    });

    it('should throw NotFoundException when work order not found', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue(null);

      await expect(service.getWorkOrderDetail(99999)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException for invalid docEntry', async () => {
      await expect(service.getWorkOrderDetail(0)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.getWorkOrderDetail(-1)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should handle null optional fields', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue({
        ...mockWorkOrder,
        RlsDate: null,
        CustomerName: null,
        CardCode: null,
        Comments: null,
        U_StationSortOrder: null,
      });

      const result = await service.getWorkOrderDetail(12345);

      expect(result.releaseDate).toBeNull();
      expect(result.customerName).toBeNull();
      expect(result.customerCode).toBeNull();
      expect(result.comments).toBeNull();
      expect(result.sortOrder).toBeNull();
    });
  });

  describe('getCustomerFilterOptions', () => {
    const mockCustomers = [
      { CardCode: 'C001', CardName: 'Customer A' },
      { CardCode: 'C002', CardName: 'Customer B' },
    ];

    it('should return customer filter options', async () => {
      workOrderRepository.findCustomersWithActiveOrders.mockResolvedValue(
        mockCustomers
      );

      const result = await service.getCustomerFilterOptions();

      expect(result).toHaveLength(2);
    });

    it('should transform customer data to DTO format', async () => {
      workOrderRepository.findCustomersWithActiveOrders.mockResolvedValue(
        mockCustomers
      );

      const result = await service.getCustomerFilterOptions();

      expect(result[0]).toEqual({
        code: 'C001',
        name: 'Customer A',
      });
      expect(result[1]).toEqual({
        code: 'C002',
        name: 'Customer B',
      });
    });

    it('should return empty array when no customers found', async () => {
      workOrderRepository.findCustomersWithActiveOrders.mockResolvedValue([]);

      const result = await service.getCustomerFilterOptions();

      expect(result).toHaveLength(0);
    });
  });

  describe('getPickList', () => {
    it('should return pick list for work order', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      pickListRepository.findByWorkOrder.mockResolvedValue(mockPickListItems);

      const result = await service.getPickList(12345);

      expect(result.docEntry).toBe(12345);
      expect(result.items).toHaveLength(2);
    });

    it('should transform pick list items to DTO format', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      pickListRepository.findByWorkOrder.mockResolvedValue(mockPickListItems);

      const result = await service.getPickList(12345);

      expect(result.items[0]).toEqual({
        itemCode: 'MAT001',
        itemName: 'Material 1',
        plannedQty: 100,
        issuedQty: 50,
        remainingQty: 50,
        warehouse: '01',
        uom: 'KG',
      });
    });

    it('should throw NotFoundException when work order not found', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue(null);

      await expect(service.getPickList(99999)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException for invalid docEntry', async () => {
      await expect(service.getPickList(0)).rejects.toThrow(BadRequestException);
      await expect(service.getPickList(-1)).rejects.toThrow(BadRequestException);
    });

    it('should return empty items when no materials', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      pickListRepository.findByWorkOrder.mockResolvedValue([]);

      const result = await service.getPickList(12345);

      expect(result.items).toHaveLength(0);
    });

    it('should verify work order exists before fetching pick list', async () => {
      workOrderRepository.findByDocEntry.mockResolvedValue(null);

      await expect(service.getPickList(12345)).rejects.toThrow(
        NotFoundException
      );

      expect(pickListRepository.findByWorkOrder).not.toHaveBeenCalled();
    });
  });
});
