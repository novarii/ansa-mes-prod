import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ProductionEntryService } from './production-entry.service';
import {
  WorkOrderRepository,
  ServiceLayerService,
  HanaService,
} from '@org/data-access';
import { WorkOrderWithDetails } from '@org/shared-types';
import { BackflushService, InsufficientStockError } from './backflush.service';

describe('ProductionEntryService', () => {
  let service: ProductionEntryService;
  let serviceLayerService: jest.Mocked<ServiceLayerService>;
  let backflushService: jest.Mocked<BackflushService>;

  const mockWorkOrderRepository = {
    findByDocEntry: jest.fn(),
    findAll: jest.fn(),
    findCustomersWithActiveOrders: jest.fn(),
  };

  const mockServiceLayerService = {
    createGoodsReceipt: jest.fn(),
    updateProductionOrder: jest.fn(),
    login: jest.fn(),
    ensureSession: jest.fn(),
    request: jest.fn(),
  };

  const mockHanaService = {
    query: jest.fn(),
    queryOne: jest.fn(),
    execute: jest.fn(),
  };

  const mockBackflushService = {
    executeBackflush: jest.fn(),
    validateStockAvailability: jest.fn(),
    calculateMaterialRequirements: jest.fn(),
    selectBatchesLIFO: jest.fn(),
    createGoodsIssue: jest.fn(),
  };

  const mockWorkOrder: WorkOrderWithDetails = {
    DocEntry: 12345,
    DocNum: 67890,
    ItemCode: 'YM00001662',
    ProdName: 'Test Product',
    PlannedQty: 1000,
    CmpltQty: 500,
    RjctQty: 50,
    RemainingQty: 450,
    ProgressPercent: 50,
    StartDate: '2026-01-15T00:00:00.000Z',
    DueDate: '2026-01-25T00:00:00.000Z',
    RlsDate: '2026-01-10T00:00:00.000Z',
    Status: 'R',
    CardCode: 'C001',
    CustomerName: 'Test Customer',
    U_StationSortOrder: 10,
    Warehouse: '03',
    Comments: null,
    MachineCode: 'M001',
    MachineName: 'BARMAG 1',
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionEntryService,
        {
          provide: WorkOrderRepository,
          useValue: mockWorkOrderRepository,
        },
        {
          provide: ServiceLayerService,
          useValue: mockServiceLayerService,
        },
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
        {
          provide: BackflushService,
          useValue: mockBackflushService,
        },
      ],
    }).compile();

    service = module.get<ProductionEntryService>(ProductionEntryService);
    serviceLayerService = module.get(ServiceLayerService);
    backflushService = module.get(BackflushService);
  });

  describe('validateEntry', () => {
    it('should return valid for acceptable quantities', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 100, 10);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.newRemainingQty).toBe(340); // 450 - 100 - 10
    });

    it('should be valid with zero rejected quantity', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 100, 0);

      expect(result.isValid).toBe(true);
    });

    it('should be valid with zero accepted quantity', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 0, 100);

      expect(result.isValid).toBe(true);
    });

    it('should be invalid when both quantities are zero', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 0, 0);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Accepted or rejected quantity must be greater than zero'
      );
    });

    it('should be invalid with negative accepted quantity', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, -10, 0);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Accepted quantity cannot be negative');
    });

    it('should be invalid with negative rejected quantity', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 0, -10);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Rejected quantity cannot be negative');
    });

    it('should be invalid when accepted exceeds remaining', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 500, 0); // remaining is 450

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds remaining');
    });

    it('should be invalid when total exceeds remaining', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 400, 100); // total 500, remaining is 450

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('exceeds remaining');
    });

    it('should require confirmation when accepted > 50% of remaining', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 300, 0); // 300 > 225 (50% of 450)

      expect(result.isValid).toBe(true);
      expect(result.requiresConfirmation).toBe(true);
      expect(result.confirmationMessage).toBeDefined();
    });

    it('should not require confirmation when accepted <= 50% of remaining', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);

      const result = await service.validateEntry(12345, 200, 0); // 200 < 225 (50% of 450)

      expect(result.isValid).toBe(true);
      expect(result.requiresConfirmation).toBe(false);
    });

    it('should throw BadRequestException for invalid docEntry', async () => {
      await expect(service.validateEntry(0, 100, 0)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when work order not found', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(null);

      await expect(service.validateEntry(99999, 100, 0)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when work order not released', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue({
        ...mockWorkOrder,
        Status: 'L', // Closed
      });

      await expect(service.validateEntry(12345, 100, 0)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('generateBatchNumber', () => {
    it('should generate batch number with correct format', async () => {
      mockHanaService.queryOne.mockResolvedValue(null); // No existing batches

      const result = await service.generateBatchNumber();

      expect(result.batchNumber).toMatch(/^ANS\d{8}001$/);
      expect(result.sequence).toBe(1);
    });

    it('should increment sequence when batches exist for today', async () => {
      mockHanaService.queryOne.mockResolvedValue({ maxSeq: 5 });

      const result = await service.generateBatchNumber();

      expect(result.batchNumber).toMatch(/^ANS\d{8}006$/);
      expect(result.sequence).toBe(6);
    });

    it('should use current date in format YYYYMMDD', async () => {
      mockHanaService.queryOne.mockResolvedValue(null);

      const result = await service.generateBatchNumber();
      const today = new Date();
      const expectedDate = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

      expect(result.date).toBe(expectedDate);
      expect(result.batchNumber).toContain(expectedDate);
    });

    it('should pad sequence number to 3 digits', async () => {
      mockHanaService.queryOne.mockResolvedValue({ maxSeq: 7 });

      const result = await service.generateBatchNumber();

      expect(result.batchNumber).toMatch(/008$/);
    });
  });

  describe('reportQuantity', () => {
    beforeEach(() => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockHanaService.queryOne.mockResolvedValue(null);
      mockServiceLayerService.createGoodsReceipt.mockResolvedValue({
        DocEntry: 1001,
      });
      mockServiceLayerService.updateProductionOrder.mockResolvedValue(undefined);
      // Default: backflush succeeds with no materials to issue
      mockBackflushService.executeBackflush.mockResolvedValue({
        success: true,
        oigeDocEntry: null,
        materialsIssued: [],
      });
    });

    it('should create goods receipt for accepted quantity', async () => {
      const result = await service.reportQuantity(12345, 100, 0, 100);

      expect(result.success).toBe(true);
      expect(result.acceptedDocEntry).toBe(1001);
      expect(result.rejectedDocEntry).toBeNull();
      expect(serviceLayerService.createGoodsReceipt).toHaveBeenCalledTimes(1);
    });

    it('should create goods receipt for rejected quantity', async () => {
      const result = await service.reportQuantity(12345, 0, 50, 100);

      expect(result.success).toBe(true);
      expect(result.acceptedDocEntry).toBeNull();
      expect(result.rejectedDocEntry).toBe(1001);
      expect(serviceLayerService.createGoodsReceipt).toHaveBeenCalledTimes(1);
    });

    it('should create two goods receipts for both quantities', async () => {
      mockServiceLayerService.createGoodsReceipt
        .mockResolvedValueOnce({ DocEntry: 1001 })
        .mockResolvedValueOnce({ DocEntry: 1002 });

      const result = await service.reportQuantity(12345, 100, 50, 100);

      expect(result.success).toBe(true);
      expect(result.acceptedDocEntry).toBe(1001);
      expect(result.rejectedDocEntry).toBe(1002);
      expect(serviceLayerService.createGoodsReceipt).toHaveBeenCalledTimes(2);
    });

    it('should generate batch number for accepted goods', async () => {
      const result = await service.reportQuantity(12345, 100, 0, 100);

      expect(result.batchNumber).toBeDefined();
    });

    it('should use correct warehouse for accepted goods', async () => {
      await service.reportQuantity(12345, 100, 0, 100);

      expect(serviceLayerService.createGoodsReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          DocumentLines: expect.arrayContaining([
            expect.objectContaining({
              WarehouseCode: '03', // From work order
            }),
          ]),
        })
      );
    });

    it('should use FRD warehouse for rejected goods', async () => {
      await service.reportQuantity(12345, 0, 50, 100);

      expect(serviceLayerService.createGoodsReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          DocumentLines: expect.arrayContaining([
            expect.objectContaining({
              WarehouseCode: 'FRD',
            }),
          ]),
        })
      );
    });

    it('should return updated work order quantities', async () => {
      const result = await service.reportQuantity(12345, 100, 50, 100);

      expect(result.workOrder.docEntry).toBe(12345);
      expect(result.workOrder.completedQty).toBe(600); // 500 + 100
      expect(result.workOrder.rejectedQty).toBe(100); // 50 + 50
      // Remaining = Planned - Completed = 1000 - 600 = 400
      expect(result.workOrder.remainingQty).toBe(400);
    });

    it('should throw BadRequestException for invalid input', async () => {
      await expect(
        service.reportQuantity(12345, 0, 0, 100)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid docEntry', async () => {
      await expect(
        service.reportQuantity(0, 100, 0, 100)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid empId', async () => {
      await expect(
        service.reportQuantity(12345, 100, 0, 0)
      ).rejects.toThrow(BadRequestException);
    });

    it('should include base document reference in goods receipt', async () => {
      await service.reportQuantity(12345, 100, 0, 100);

      expect(serviceLayerService.createGoodsReceipt).toHaveBeenCalledWith(
        expect.objectContaining({
          DocumentLines: expect.arrayContaining([
            expect.objectContaining({
              BaseEntry: 12345,
              BaseType: 202, // Production Order
            }),
          ]),
        })
      );
    });

    it('should handle Service Layer errors gracefully', async () => {
      mockServiceLayerService.createGoodsReceipt.mockRejectedValue(
        new Error('DI API Error')
      );

      await expect(
        service.reportQuantity(12345, 100, 0, 100)
      ).rejects.toThrow('DI API Error');
    });

    it('should execute backflush before creating goods receipt', async () => {
      mockBackflushService.executeBackflush.mockResolvedValue({
        success: true,
        oigeDocEntry: 5001,
        materialsIssued: [
          {
            itemCode: 'MAT-001',
            warehouse: 'ITH',
            quantity: 96.2,
            lineNum: 0,
            batches: [{ BatchNumber: 'BATCH-001', Quantity: 96.2 }],
          },
        ],
      });

      const result = await service.reportQuantity(12345, 100, 0, 100);

      expect(backflushService.executeBackflush).toHaveBeenCalledWith(
        12345,
        100, // totalEntryQty
        100  // empId
      );
      expect(result.oigeDocEntry).toBe(5001);
    });

    it('should throw InsufficientStockError when backflush fails due to stock shortage', async () => {
      const shortages = [
        {
          ItemCode: 'MAT-001',
          ItemName: 'Raw Material',
          Warehouse: 'ITH',
          BaseQty: 0.5,
          RequiredQty: 50,
          AvailableQty: 30,
          Shortage: 20,
          IsBatchManaged: true,
        },
      ];
      mockBackflushService.executeBackflush.mockRejectedValue(
        new InsufficientStockError(shortages)
      );

      await expect(
        service.reportQuantity(12345, 100, 0, 100)
      ).rejects.toThrow(InsufficientStockError);
    });

    it('should throw BadRequestException when backflush fails for other reasons', async () => {
      mockBackflushService.executeBackflush.mockRejectedValue(
        new Error('Service Layer connection failed')
      );

      await expect(
        service.reportQuantity(12345, 100, 0, 100)
      ).rejects.toThrow(BadRequestException);
    });

    it('should use total quantity (accepted + rejected) for backflush', async () => {
      mockServiceLayerService.createGoodsReceipt
        .mockResolvedValueOnce({ DocEntry: 1001 })
        .mockResolvedValueOnce({ DocEntry: 1002 });

      await service.reportQuantity(12345, 80, 20, 100);

      expect(backflushService.executeBackflush).toHaveBeenCalledWith(
        12345,
        100, // 80 + 20 = 100
        100
      );
    });
  });
});
