import { Test, TestingModule } from '@nestjs/testing';
import {
  StockRepository,
  BatchInfo,
  StockAvailability,
  MaterialRequirement,
} from './stock.repository';
import { HanaService } from '../hana.service';

describe('StockRepository', () => {
  let repository: StockRepository;
  let hanaService: jest.Mocked<HanaService>;

  const mockHanaService = {
    query: jest.fn(),
    queryOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StockRepository,
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
      ],
    }).compile();

    repository = module.get<StockRepository>(StockRepository);
    hanaService = module.get(HanaService);
  });

  describe('getAvailableBatches', () => {
    const mockBatches: BatchInfo[] = [
      {
        ItemCode: 'HM00000056',
        BatchNumber: 'BATCH-2026-003',
        BatchAbsEntry: 1050,
        InDate: new Date('2026-01-20'),
        Warehouse: 'ITH',
        AvailableQty: 80,
      },
      {
        ItemCode: 'HM00000056',
        BatchNumber: 'BATCH-2026-002',
        BatchAbsEntry: 1045,
        InDate: new Date('2026-01-15'),
        Warehouse: 'ITH',
        AvailableQty: 100,
      },
      {
        ItemCode: 'HM00000056',
        BatchNumber: 'BATCH-2026-001',
        BatchAbsEntry: 1040,
        InDate: new Date('2026-01-10'),
        Warehouse: 'ITH',
        AvailableQty: 200,
      },
    ];

    it('should return batches ordered by LIFO (InDate DESC, AbsEntry DESC)', async () => {
      hanaService.query.mockResolvedValue(mockBatches);

      const result = await repository.getAvailableBatches('HM00000056', 'ITH');

      expect(result).toEqual(mockBatches);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('"InDate" DESC');
      expect(sql).toContain('"AbsEntry" DESC');
    });

    it('should query OBTN and OBTQ tables', async () => {
      hanaService.query.mockResolvedValue(mockBatches);

      await repository.getAvailableBatches('HM00000056', 'ITH');

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"OBTN"');
      expect(sql).toContain('"OBTQ"');
    });

    it('should filter by itemCode and warehouse', async () => {
      hanaService.query.mockResolvedValue(mockBatches);

      await repository.getAvailableBatches('HM00000056', 'ITH');

      const params = hanaService.query.mock.calls[0][1] as unknown[];
      expect(params).toContain('HM00000056');
      expect(params).toContain('ITH');
    });

    it('should only return batches with positive quantity', async () => {
      hanaService.query.mockResolvedValue(mockBatches);

      await repository.getAvailableBatches('HM00000056', 'ITH');

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"Quantity" > 0');
    });

    it('should return empty array when no batches available', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.getAvailableBatches('HM00000056', 'ITH');

      expect(result).toEqual([]);
    });
  });

  describe('getTotalAvailableQty', () => {
    it('should return total quantity for item in warehouse', async () => {
      hanaService.queryOne.mockResolvedValue({ TotalQty: 380 });

      const result = await repository.getTotalAvailableQty('HM00000056', 'ITH');

      expect(result).toBe(380);
    });

    it('should sum quantities from OBTQ table', async () => {
      hanaService.queryOne.mockResolvedValue({ TotalQty: 380 });

      await repository.getTotalAvailableQty('HM00000056', 'ITH');

      const sql = hanaService.queryOne.mock.calls[0][0] as string;
      expect(sql).toContain('SUM');
      expect(sql).toContain('"OBTQ"');
    });

    it('should return 0 when no stock exists', async () => {
      hanaService.queryOne.mockResolvedValue(null);

      const result = await repository.getTotalAvailableQty('HM00000056', 'ITH');

      expect(result).toBe(0);
    });

    it('should handle null TotalQty as 0', async () => {
      hanaService.queryOne.mockResolvedValue({ TotalQty: null });

      const result = await repository.getTotalAvailableQty('HM00000056', 'ITH');

      expect(result).toBe(0);
    });
  });

  describe('getStockAvailabilityForWorkOrder', () => {
    const mockAvailability: StockAvailability[] = [
      {
        LineNum: 0,
        ItemCode: 'HM00000056',
        ItemName: 'EXXON MOBIL PP5032E5',
        SourceWarehouse: 'ITH',
        BaseQty: 0.962,
        PlannedQty: 6863.1,
        IssuedQty: 0,
        RemainingToIssue: 6863.1,
        AvailableInWarehouse: 164783.5,
        StockStatus: 'OK',
        Shortage: 0,
      },
      {
        LineNum: 1,
        ItemCode: 'YMZ00000147',
        ItemName: 'LL20203 FH LINEAR PE',
        SourceWarehouse: '03',
        BaseQty: 0.02,
        PlannedQty: 142.8,
        IssuedQty: 0,
        RemainingToIssue: 142.8,
        AvailableInWarehouse: 50,
        StockStatus: 'INSUFFICIENT',
        Shortage: 92.8,
      },
    ];

    it('should return stock availability for all materials in work order', async () => {
      hanaService.query.mockResolvedValue(mockAvailability);

      const result = await repository.getStockAvailabilityForWorkOrder(6393);

      expect(result).toEqual(mockAvailability);
    });

    it('should join WOR1, OITM tables', async () => {
      hanaService.query.mockResolvedValue(mockAvailability);

      await repository.getStockAvailabilityForWorkOrder(6393);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"WOR1"');
      expect(sql).toContain('"OITM"');
    });

    it('should filter to materials only (ItemType = 4)', async () => {
      hanaService.query.mockResolvedValue(mockAvailability);

      await repository.getStockAvailabilityForWorkOrder(6393);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"ItemType" = 4');
    });

    it('should filter to inventory items only (InvntItem = Y)', async () => {
      hanaService.query.mockResolvedValue(mockAvailability);

      await repository.getStockAvailabilityForWorkOrder(6393);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"InvntItem"');
    });

    it('should calculate stock status and shortage', async () => {
      hanaService.query.mockResolvedValue(mockAvailability);

      await repository.getStockAvailabilityForWorkOrder(6393);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('StockStatus');
      expect(sql).toContain('Shortage');
    });

    it('should include source warehouse from WOR1', async () => {
      hanaService.query.mockResolvedValue(mockAvailability);

      await repository.getStockAvailabilityForWorkOrder(6393);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"wareHouse"');
    });
  });

  describe('validateStockForEntry', () => {
    const mockRequirements: MaterialRequirement[] = [
      {
        ItemCode: 'HM00000056',
        ItemName: 'EXXON MOBIL PP5032E5',
        Warehouse: 'ITH',
        BaseQty: 0.962,
        RequiredQty: 96.2,
        AvailableQty: 164783.5,
        Shortage: 0,
        IsBatchManaged: true,
      },
    ];

    const mockInsufficientRequirements: MaterialRequirement[] = [
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

    it('should return materials with shortage when stock insufficient', async () => {
      hanaService.query.mockResolvedValue(mockInsufficientRequirements);

      const result = await repository.validateStockForEntry(6393, 100);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].Shortage).toBeGreaterThan(0);
    });

    it('should return empty array when all stock sufficient', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.validateStockForEntry(6393, 100);

      expect(result).toEqual([]);
    });

    it('should calculate required qty using entryQty * BaseQty', async () => {
      hanaService.query.mockResolvedValue([]);

      await repository.validateStockForEntry(6393, 100);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('BaseQty');
      // Verify entryQty is used in the calculation
      const params = hanaService.query.mock.calls[0][1] as unknown[];
      expect(params).toContain(100);
    });

    it('should filter to materials only (ItemType = 4)', async () => {
      hanaService.query.mockResolvedValue([]);

      await repository.validateStockForEntry(6393, 100);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"ItemType" = 4');
    });

    it('should include batch management status from OITM', async () => {
      hanaService.query.mockResolvedValue(mockRequirements);

      await repository.validateStockForEntry(6393, 100);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"ManBtchNum"');
    });
  });

  describe('getMaterialRequirements', () => {
    const mockRequirements: MaterialRequirement[] = [
      {
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

    it('should return all material requirements for entry quantity', async () => {
      hanaService.query.mockResolvedValue(mockRequirements);

      const result = await repository.getMaterialRequirements(6393, 100);

      expect(result).toEqual(mockRequirements);
      expect(result.length).toBe(2);
    });

    it('should pass docEntry and entryQty as parameters', async () => {
      hanaService.query.mockResolvedValue(mockRequirements);

      await repository.getMaterialRequirements(6393, 100);

      const params = hanaService.query.mock.calls[0][1] as unknown[];
      expect(params).toContain(6393);
      expect(params).toContain(100);
    });

    it('should include LineNum for OIGE creation', async () => {
      hanaService.query.mockResolvedValue(mockRequirements);

      await repository.getMaterialRequirements(6393, 100);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"LineNum"');
    });

    it('should differentiate batch-managed and non-batch-managed items', async () => {
      hanaService.query.mockResolvedValue(mockRequirements);

      const result = await repository.getMaterialRequirements(6393, 100);

      const batchManaged = result.filter((m) => m.IsBatchManaged);
      const nonBatchManaged = result.filter((m) => !m.IsBatchManaged);

      expect(batchManaged.length).toBe(1);
      expect(nonBatchManaged.length).toBe(1);
    });
  });

  describe('LIFO batch selection algorithm', () => {
    it('should consume from newest batch first when single batch sufficient', async () => {
      const batches: BatchInfo[] = [
        {
          ItemCode: 'MAT-001',
          BatchNumber: 'NEW-BATCH',
          BatchAbsEntry: 1050,
          InDate: new Date('2026-01-20'),
          Warehouse: 'ITH',
          AvailableQty: 100,
        },
        {
          ItemCode: 'MAT-001',
          BatchNumber: 'OLD-BATCH',
          BatchAbsEntry: 1040,
          InDate: new Date('2026-01-10'),
          Warehouse: 'ITH',
          AvailableQty: 200,
        },
      ];
      hanaService.query.mockResolvedValue(batches);

      const result = await repository.getAvailableBatches('MAT-001', 'ITH');

      // First batch should be the newest one
      expect(result[0].BatchNumber).toBe('NEW-BATCH');
      expect(result[0].InDate.getTime()).toBeGreaterThan(
        result[1].InDate.getTime()
      );
    });

    it('should order by AbsEntry DESC when dates are equal', async () => {
      const sameDate = new Date('2026-01-20');
      const batches: BatchInfo[] = [
        {
          ItemCode: 'MAT-001',
          BatchNumber: 'BATCH-HIGH-ENTRY',
          BatchAbsEntry: 1051,
          InDate: sameDate,
          Warehouse: 'ITH',
          AvailableQty: 50,
        },
        {
          ItemCode: 'MAT-001',
          BatchNumber: 'BATCH-LOW-ENTRY',
          BatchAbsEntry: 1050,
          InDate: sameDate,
          Warehouse: 'ITH',
          AvailableQty: 50,
        },
      ];
      hanaService.query.mockResolvedValue(batches);

      const result = await repository.getAvailableBatches('MAT-001', 'ITH');

      // Higher AbsEntry should come first when dates are equal
      expect(result[0].BatchAbsEntry).toBe(1051);
      expect(result[1].BatchAbsEntry).toBe(1050);
    });
  });
});
