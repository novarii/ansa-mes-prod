import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import {
  BackflushService,
  BatchAllocation,
  MaterialIssue,
  BackflushResult,
  InsufficientStockError,
} from './backflush.service';
import { StockRepository, MaterialRequirement, BatchInfo } from '@org/data-access';
import { ServiceLayerService } from '@org/data-access';

describe('BackflushService', () => {
  let service: BackflushService;
  let stockRepository: jest.Mocked<StockRepository>;
  let serviceLayerService: jest.Mocked<ServiceLayerService>;

  const mockStockRepository = {
    validateStockForEntry: jest.fn(),
    getMaterialRequirements: jest.fn(),
    getAvailableBatches: jest.fn(),
    getTotalAvailableQty: jest.fn(),
  };

  const mockServiceLayerService = {
    createGoodsIssue: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackflushService,
        {
          provide: StockRepository,
          useValue: mockStockRepository,
        },
        {
          provide: ServiceLayerService,
          useValue: mockServiceLayerService,
        },
      ],
    }).compile();

    service = module.get<BackflushService>(BackflushService);
    stockRepository = module.get(StockRepository);
    serviceLayerService = module.get(ServiceLayerService);
  });

  describe('validateStockAvailability', () => {
    it('should return true when all stock is sufficient', async () => {
      stockRepository.validateStockForEntry.mockResolvedValue([]);

      const result = await service.validateStockAvailability(6393, 100);

      expect(result.isValid).toBe(true);
      expect(result.shortages).toEqual([]);
    });

    it('should return false with shortage details when stock insufficient', async () => {
      const shortages: MaterialRequirement[] = [
        {
          ItemCode: 'YMZ00000147',
          ItemName: 'LL20203 FH LINEAR PE',
          Warehouse: '03',
          BaseQty: 0.02,
          RequiredQty: 2.0,
          AvailableQty: 0.5,
          Shortage: 1.5,
          IsBatchManaged: true,
        },
      ];
      stockRepository.validateStockForEntry.mockResolvedValue(shortages);

      const result = await service.validateStockAvailability(6393, 100);

      expect(result.isValid).toBe(false);
      expect(result.shortages).toHaveLength(1);
      expect(result.shortages[0].ItemCode).toBe('YMZ00000147');
      expect(result.shortages[0].Shortage).toBe(1.5);
    });

    it('should calculate total entry quantity (accepted + rejected)', async () => {
      stockRepository.validateStockForEntry.mockResolvedValue([]);

      await service.validateStockAvailability(6393, 100);

      expect(stockRepository.validateStockForEntry).toHaveBeenCalledWith(
        6393,
        100
      );
    });
  });

  describe('selectBatchesLIFO', () => {
    const batches: BatchInfo[] = [
      {
        ItemCode: 'MAT-001',
        BatchNumber: 'BATCH-003',
        BatchAbsEntry: 1050,
        InDate: new Date('2026-01-20'),
        Warehouse: 'ITH',
        AvailableQty: 80,
      },
      {
        ItemCode: 'MAT-001',
        BatchNumber: 'BATCH-002',
        BatchAbsEntry: 1045,
        InDate: new Date('2026-01-15'),
        Warehouse: 'ITH',
        AvailableQty: 100,
      },
      {
        ItemCode: 'MAT-001',
        BatchNumber: 'BATCH-001',
        BatchAbsEntry: 1040,
        InDate: new Date('2026-01-10'),
        Warehouse: 'ITH',
        AvailableQty: 200,
      },
    ];

    it('should consume from newest batch first', async () => {
      stockRepository.getAvailableBatches.mockResolvedValue(batches);

      const allocation = await service.selectBatchesLIFO(
        'MAT-001',
        'ITH',
        50
      );

      expect(allocation.batches).toHaveLength(1);
      expect(allocation.batches[0].BatchNumber).toBe('BATCH-003');
      expect(allocation.batches[0].Quantity).toBe(50);
    });

    it('should consume from multiple batches when first is insufficient', async () => {
      stockRepository.getAvailableBatches.mockResolvedValue(batches);

      const allocation = await service.selectBatchesLIFO(
        'MAT-001',
        'ITH',
        150
      );

      expect(allocation.batches).toHaveLength(2);
      // First batch: take all 80
      expect(allocation.batches[0].BatchNumber).toBe('BATCH-003');
      expect(allocation.batches[0].Quantity).toBe(80);
      // Second batch: take remaining 70
      expect(allocation.batches[1].BatchNumber).toBe('BATCH-002');
      expect(allocation.batches[1].Quantity).toBe(70);
    });

    it('should return isSufficient=false when total stock insufficient', async () => {
      stockRepository.getAvailableBatches.mockResolvedValue([
        {
          ItemCode: 'MAT-001',
          BatchNumber: 'BATCH-001',
          BatchAbsEntry: 1040,
          InDate: new Date('2026-01-10'),
          Warehouse: 'ITH',
          AvailableQty: 50,
        },
      ]);

      const allocation = await service.selectBatchesLIFO(
        'MAT-001',
        'ITH',
        100
      );

      expect(allocation.isSufficient).toBe(false);
      expect(allocation.allocatedQty).toBe(50);
      expect(allocation.shortageQty).toBe(50);
    });

    it('should return empty allocation when no batches available', async () => {
      stockRepository.getAvailableBatches.mockResolvedValue([]);

      const allocation = await service.selectBatchesLIFO(
        'MAT-001',
        'ITH',
        100
      );

      expect(allocation.batches).toHaveLength(0);
      expect(allocation.isSufficient).toBe(false);
      expect(allocation.allocatedQty).toBe(0);
      expect(allocation.shortageQty).toBe(100);
    });
  });

  describe('createGoodsIssue', () => {
    const materialIssues: MaterialIssue[] = [
      {
        itemCode: 'HM00000056',
        warehouse: 'ITH',
        quantity: 96.2,
        lineNum: 0,
        batches: [
          { BatchNumber: 'BATCH-001', Quantity: 80 },
          { BatchNumber: 'BATCH-002', Quantity: 16.2 },
        ],
      },
      {
        itemCode: 'YMZ00000140',
        warehouse: '03',
        quantity: 1.0,
        lineNum: 1,
        batches: [{ BatchNumber: 'UV-BATCH-001', Quantity: 1.0 }],
      },
    ];

    it('should create OIGE document via Service Layer', async () => {
      serviceLayerService.createGoodsIssue.mockResolvedValue({
        DocEntry: 12345,
      });

      const result = await service.createGoodsIssue(6393, materialIssues, 101);

      expect(serviceLayerService.createGoodsIssue).toHaveBeenCalledTimes(1);
      expect(result.DocEntry).toBe(12345);
    });

    it('should include BaseType=202 and BaseEntry=docEntry', async () => {
      serviceLayerService.createGoodsIssue.mockResolvedValue({
        DocEntry: 12345,
      });

      await service.createGoodsIssue(6393, materialIssues, 101);

      const payload = serviceLayerService.createGoodsIssue.mock
        .calls[0][0] as Record<string, unknown>;
      const lines = payload.DocumentLines as Array<Record<string, unknown>>;

      expect(lines[0].BaseType).toBe(202);
      expect(lines[0].BaseEntry).toBe(6393);
      expect(lines[0].BaseLine).toBe(0);
    });

    it('should include batch numbers for each material line', async () => {
      serviceLayerService.createGoodsIssue.mockResolvedValue({
        DocEntry: 12345,
      });

      await service.createGoodsIssue(6393, materialIssues, 101);

      const payload = serviceLayerService.createGoodsIssue.mock
        .calls[0][0] as Record<string, unknown>;
      const lines = payload.DocumentLines as Array<Record<string, unknown>>;

      expect(lines[0].BatchNumbers).toHaveLength(2);
      expect(lines[0].BatchNumbers[0]).toEqual({
        BatchNumber: 'BATCH-001',
        Quantity: 80,
      });
    });

    it('should include comment with work order and employee info', async () => {
      serviceLayerService.createGoodsIssue.mockResolvedValue({
        DocEntry: 12345,
      });

      await service.createGoodsIssue(6393, materialIssues, 101);

      const payload = serviceLayerService.createGoodsIssue.mock
        .calls[0][0] as Record<string, unknown>;

      expect(payload.Comments).toContain('MES Backflush');
      expect(payload.Comments).toContain('6393');
      expect(payload.Comments).toContain('101');
    });

    it('should omit batch numbers for non-batch-managed items', async () => {
      const nonBatchIssues: MaterialIssue[] = [
        {
          itemCode: 'ITEM-NO-BATCH',
          warehouse: '03',
          quantity: 50,
          lineNum: 0,
          batches: [], // Empty for non-batch items
        },
      ];
      serviceLayerService.createGoodsIssue.mockResolvedValue({
        DocEntry: 12346,
      });

      await service.createGoodsIssue(6393, nonBatchIssues, 101);

      const payload = serviceLayerService.createGoodsIssue.mock
        .calls[0][0] as Record<string, unknown>;
      const lines = payload.DocumentLines as Array<Record<string, unknown>>;

      expect(lines[0].BatchNumbers).toBeUndefined();
    });
  });

  describe('executeBackflush', () => {
    const mockRequirements: MaterialRequirement[] = [
      {
        LineNum: 0,
        ItemCode: 'HM00000056',
        ItemName: 'EXXON MOBIL PP5032E5',
        Warehouse: 'ITH',
        BaseQty: 0.962,
        RequiredQty: 96.2,
        AvailableQty: 164783.5,
        Shortage: 0,
        IsBatchManaged: true,
      },
      {
        LineNum: 1,
        ItemCode: 'YMZ00000140',
        ItemName: 'UV Stabilizer',
        Warehouse: '03',
        BaseQty: 0.01,
        RequiredQty: 1.0,
        AvailableQty: 857,
        Shortage: 0,
        IsBatchManaged: false,
      },
    ];

    const mockBatches: BatchInfo[] = [
      {
        ItemCode: 'HM00000056',
        BatchNumber: 'BATCH-001',
        BatchAbsEntry: 1050,
        InDate: new Date('2026-01-20'),
        Warehouse: 'ITH',
        AvailableQty: 200,
      },
    ];

    it('should validate stock, select batches, and create OIGE', async () => {
      stockRepository.validateStockForEntry.mockResolvedValue([]);
      stockRepository.getMaterialRequirements.mockResolvedValue(mockRequirements);
      stockRepository.getAvailableBatches.mockResolvedValue(mockBatches);
      stockRepository.getTotalAvailableQty.mockResolvedValue(857);
      serviceLayerService.createGoodsIssue.mockResolvedValue({
        DocEntry: 12345,
      });

      const result = await service.executeBackflush(6393, 100, 101);

      expect(result.success).toBe(true);
      expect(result.oigeDocEntry).toBe(12345);
      expect(result.materialsIssued).toHaveLength(2);
    });

    it('should throw InsufficientStockError when stock validation fails', async () => {
      const shortages: MaterialRequirement[] = [
        {
          ItemCode: 'YMZ00000147',
          ItemName: 'LL20203 FH LINEAR PE',
          Warehouse: '03',
          BaseQty: 0.02,
          RequiredQty: 2.0,
          AvailableQty: 0.5,
          Shortage: 1.5,
          IsBatchManaged: true,
        },
      ];
      stockRepository.validateStockForEntry.mockResolvedValue(shortages);

      await expect(service.executeBackflush(6393, 100, 101)).rejects.toThrow(
        InsufficientStockError
      );
    });

    it('should handle batch-managed items with batch selection', async () => {
      stockRepository.validateStockForEntry.mockResolvedValue([]);
      stockRepository.getMaterialRequirements.mockResolvedValue([
        mockRequirements[0], // Only batch-managed item
      ]);
      stockRepository.getAvailableBatches.mockResolvedValue(mockBatches);
      serviceLayerService.createGoodsIssue.mockResolvedValue({
        DocEntry: 12345,
      });

      const result = await service.executeBackflush(6393, 100, 101);

      expect(stockRepository.getAvailableBatches).toHaveBeenCalledWith(
        'HM00000056',
        'ITH'
      );
      expect(result.materialsIssued[0].batches.length).toBeGreaterThan(0);
    });

    it('should handle non-batch-managed items without batch selection', async () => {
      stockRepository.validateStockForEntry.mockResolvedValue([]);
      stockRepository.getMaterialRequirements.mockResolvedValue([
        mockRequirements[1], // Non-batch-managed item
      ]);
      stockRepository.getTotalAvailableQty.mockResolvedValue(857);
      serviceLayerService.createGoodsIssue.mockResolvedValue({
        DocEntry: 12345,
      });

      const result = await service.executeBackflush(6393, 100, 101);

      expect(stockRepository.getAvailableBatches).not.toHaveBeenCalled();
      expect(result.materialsIssued[0].batches).toEqual([]);
    });

    it('should not create OIGE when no materials to issue', async () => {
      stockRepository.validateStockForEntry.mockResolvedValue([]);
      stockRepository.getMaterialRequirements.mockResolvedValue([]);

      const result = await service.executeBackflush(6393, 100, 101);

      expect(serviceLayerService.createGoodsIssue).not.toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.oigeDocEntry).toBeNull();
    });
  });

  describe('calculateMaterialRequirements', () => {
    it('should return requirements with correct quantities', async () => {
      const mockRequirements: MaterialRequirement[] = [
        {
          LineNum: 0,
          ItemCode: 'HM00000056',
          ItemName: 'Raw Material 1',
          Warehouse: 'ITH',
          BaseQty: 0.962,
          RequiredQty: 96.2,
          AvailableQty: 200,
          Shortage: 0,
          IsBatchManaged: true,
        },
      ];
      stockRepository.getMaterialRequirements.mockResolvedValue(mockRequirements);

      const result = await service.calculateMaterialRequirements(6393, 100);

      expect(result).toEqual(mockRequirements);
      expect(stockRepository.getMaterialRequirements).toHaveBeenCalledWith(
        6393,
        100
      );
    });
  });

  describe('error handling', () => {
    it('should map Service Layer errors to user-friendly Turkish messages', async () => {
      stockRepository.validateStockForEntry.mockResolvedValue([]);
      stockRepository.getMaterialRequirements.mockResolvedValue([
        {
          LineNum: 0,
          ItemCode: 'HM00000056',
          ItemName: 'Raw Material',
          Warehouse: 'ITH',
          BaseQty: 0.5,
          RequiredQty: 50,
          AvailableQty: 100,
          Shortage: 0,
          IsBatchManaged: true,
        },
      ]);
      stockRepository.getAvailableBatches.mockResolvedValue([
        {
          ItemCode: 'HM00000056',
          BatchNumber: 'BATCH-001',
          BatchAbsEntry: 1,
          InDate: new Date(),
          Warehouse: 'ITH',
          AvailableQty: 100,
        },
      ]);
      serviceLayerService.createGoodsIssue.mockRejectedValue(
        new Error('Some Service Layer error')
      );

      await expect(service.executeBackflush(6393, 100, 101)).rejects.toThrow(
        BadRequestException
      );
    });
  });
});
