import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkOrderController } from './work-order.controller';
import { WorkOrderService } from './work-order.service';
import {
  MESSession,
  WorkOrderListResponse,
  WorkOrderDetailResponse,
  CustomerFilterOption,
  PickListResponse,
} from '@org/shared-types';

describe('WorkOrderController', () => {
  let controller: WorkOrderController;
  let workOrderService: jest.Mocked<WorkOrderService>;

  const mockSession: MESSession = {
    empID: 200,
    empName: 'Bulent Ozguneyli',
    stationCode: 'M001',
    stationName: 'BARMAG 1',
    isDefaultWorker: true,
    loginTime: new Date().toISOString(),
  };

  const mockWorkOrderListResponse: WorkOrderListResponse = {
    items: [
      {
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
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
    totalPages: 1,
  };

  const mockWorkOrderDetailResponse: WorkOrderDetailResponse = {
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
  };

  const mockCustomerOptions: CustomerFilterOption[] = [
    { code: 'C001', name: 'Customer A' },
    { code: 'C002', name: 'Customer B' },
  ];

  const mockPickListResponse: PickListResponse = {
    docEntry: 12345,
    items: [
      {
        itemCode: 'MAT001',
        itemName: 'Material 1',
        plannedQty: 100,
        issuedQty: 50,
        remainingQty: 50,
        warehouse: '01',
        uom: 'KG',
      },
    ],
  };

  const mockWorkOrderService = {
    getWorkOrders: jest.fn(),
    getWorkOrderDetail: jest.fn(),
    getCustomerFilterOptions: jest.fn(),
    getPickList: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkOrderController],
      providers: [
        {
          provide: WorkOrderService,
          useValue: mockWorkOrderService,
        },
      ],
    }).compile();

    controller = module.get<WorkOrderController>(WorkOrderController);
    workOrderService = module.get(WorkOrderService);
  });

  describe('getWorkOrders', () => {
    it('should return work orders for the current station', async () => {
      workOrderService.getWorkOrders.mockResolvedValue(
        mockWorkOrderListResponse
      );

      const result = await controller.getWorkOrders(mockSession, {});

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should use stationCode from session', async () => {
      workOrderService.getWorkOrders.mockResolvedValue(
        mockWorkOrderListResponse
      );

      await controller.getWorkOrders(mockSession, {});

      expect(workOrderService.getWorkOrders).toHaveBeenCalledWith(
        'M001',
        expect.any(Object)
      );
    });

    it('should pass customer filter to service', async () => {
      workOrderService.getWorkOrders.mockResolvedValue(
        mockWorkOrderListResponse
      );

      await controller.getWorkOrders(mockSession, { customerCode: 'C001' });

      expect(workOrderService.getWorkOrders).toHaveBeenCalledWith(
        'M001',
        expect.objectContaining({ customerCode: 'C001' })
      );
    });

    it('should pass search filter to service', async () => {
      workOrderService.getWorkOrders.mockResolvedValue(
        mockWorkOrderListResponse
      );

      await controller.getWorkOrders(mockSession, { search: 'test' });

      expect(workOrderService.getWorkOrders).toHaveBeenCalledWith(
        'M001',
        expect.objectContaining({ search: 'test' })
      );
    });

    it('should pass pagination parameters to service', async () => {
      workOrderService.getWorkOrders.mockResolvedValue(
        mockWorkOrderListResponse
      );

      await controller.getWorkOrders(mockSession, { page: 2, limit: 10 });

      expect(workOrderService.getWorkOrders).toHaveBeenCalledWith(
        'M001',
        expect.objectContaining({ page: 2, limit: 10 })
      );
    });

    it('should throw BadRequestException when station not selected', async () => {
      const sessionWithoutStation: MESSession = {
        ...mockSession,
        stationCode: '',
      };

      await expect(
        controller.getWorkOrders(sessionWithoutStation, {})
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate service exceptions', async () => {
      workOrderService.getWorkOrders.mockRejectedValue(
        new BadRequestException('Test error')
      );

      await expect(controller.getWorkOrders(mockSession, {})).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getWorkOrderDetail', () => {
    it('should return work order detail', async () => {
      workOrderService.getWorkOrderDetail.mockResolvedValue(
        mockWorkOrderDetailResponse
      );

      const result = await controller.getWorkOrderDetail(12345);

      expect(result.docEntry).toBe(12345);
      expect(result.docNum).toBe(67890);
    });

    it('should call service with docEntry parameter', async () => {
      workOrderService.getWorkOrderDetail.mockResolvedValue(
        mockWorkOrderDetailResponse
      );

      await controller.getWorkOrderDetail(12345);

      expect(workOrderService.getWorkOrderDetail).toHaveBeenCalledWith(12345);
    });

    it('should propagate NotFoundException from service', async () => {
      workOrderService.getWorkOrderDetail.mockRejectedValue(
        new NotFoundException('Is emri bulunamadi')
      );

      await expect(controller.getWorkOrderDetail(99999)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should propagate BadRequestException for invalid docEntry', async () => {
      workOrderService.getWorkOrderDetail.mockRejectedValue(
        new BadRequestException('Gecersiz is emri numarasi')
      );

      await expect(controller.getWorkOrderDetail(0)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getPickList', () => {
    it('should return pick list for work order', async () => {
      workOrderService.getPickList.mockResolvedValue(mockPickListResponse);

      const result = await controller.getPickList(12345);

      expect(result.docEntry).toBe(12345);
      expect(result.items).toHaveLength(1);
    });

    it('should call service with docEntry parameter', async () => {
      workOrderService.getPickList.mockResolvedValue(mockPickListResponse);

      await controller.getPickList(12345);

      expect(workOrderService.getPickList).toHaveBeenCalledWith(12345);
    });

    it('should propagate NotFoundException from service', async () => {
      workOrderService.getPickList.mockRejectedValue(
        new NotFoundException('Is emri bulunamadi')
      );

      await expect(controller.getPickList(99999)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getCustomerFilterOptions', () => {
    it('should return customer filter options', async () => {
      workOrderService.getCustomerFilterOptions.mockResolvedValue(
        mockCustomerOptions
      );

      const result = await controller.getCustomerFilterOptions();

      expect(result).toHaveLength(2);
      expect(result[0].code).toBe('C001');
    });

    it('should call service without parameters', async () => {
      workOrderService.getCustomerFilterOptions.mockResolvedValue(
        mockCustomerOptions
      );

      await controller.getCustomerFilterOptions();

      expect(workOrderService.getCustomerFilterOptions).toHaveBeenCalledWith();
    });

    it('should return empty array when no customers', async () => {
      workOrderService.getCustomerFilterOptions.mockResolvedValue([]);

      const result = await controller.getCustomerFilterOptions();

      expect(result).toHaveLength(0);
    });
  });
});
