import { Test, TestingModule } from '@nestjs/testing';
import { WorkOrderRepository } from './work-order.repository';
import { HanaService } from '../hana.service';
import { WorkOrderWithDetails } from '@org/shared-types';

describe('WorkOrderRepository', () => {
  let repository: WorkOrderRepository;
  let hanaService: jest.Mocked<HanaService>;

  const mockHanaService = {
    query: jest.fn(),
    queryOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkOrderRepository,
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
      ],
    }).compile();

    repository = module.get<WorkOrderRepository>(WorkOrderRepository);
    hanaService = module.get(HanaService);
  });

  describe('findAll', () => {
    const mockWorkOrders: WorkOrderWithDetails[] = [
      {
        DocEntry: 1001,
        DocNum: 5001,
        ItemCode: 'PROD-001',
        ProdName: 'Product One',
        PlannedQty: 100,
        CmpltQty: 50,
        RjctQty: 5,
        RemainingQty: 50,
        ProgressPercent: 50,
        StartDate: '2026-01-15',
        DueDate: '2026-01-20',
        RlsDate: '2026-01-14',
        Status: 'R',
        CardCode: 'C001',
        CustomerName: 'Customer One',
        U_StationSortOrder: 1,
        Warehouse: '03',
        Comments: null,
        MachineCode: '1001 - BARMAG 1',
        MachineName: 'BARMAG 1',
      },
      {
        DocEntry: 1002,
        DocNum: 5002,
        ItemCode: 'PROD-002',
        ProdName: 'Product Two',
        PlannedQty: 200,
        CmpltQty: 100,
        RjctQty: 10,
        RemainingQty: 100,
        ProgressPercent: 50,
        StartDate: '2026-01-16',
        DueDate: '2026-01-21',
        RlsDate: '2026-01-15',
        Status: 'R',
        CardCode: 'C002',
        CustomerName: 'Customer Two',
        U_StationSortOrder: 2,
        Warehouse: '03',
        Comments: null,
        MachineCode: '1001 - BARMAG 1',
        MachineName: 'BARMAG 1',
      },
    ];

    it('should return work orders for specified station codes', async () => {
      hanaService.query.mockResolvedValue(mockWorkOrders);

      const result = await repository.findAll(['1001 - BARMAG 1']);

      expect(result).toEqual(mockWorkOrders);
      expect(hanaService.query).toHaveBeenCalledTimes(1);

      // Verify SQL contains Status = 'R' filter
      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"Status" = \'R\'');
    });

    it('should apply customer filter when provided', async () => {
      hanaService.query.mockResolvedValue([mockWorkOrders[0]]);

      await repository.findAll(['1001 - BARMAG 1'], { customerCode: 'C001' });

      const sql = hanaService.query.mock.calls[0][0] as string;
      const params = hanaService.query.mock.calls[0][1] as unknown[];

      expect(sql).toContain('"CardCode" = ?');
      expect(params).toContain('C001');
    });

    it('should apply search filter when provided', async () => {
      hanaService.query.mockResolvedValue([mockWorkOrders[0]]);

      await repository.findAll(['1001 - BARMAG 1'], { searchText: 'PROD' });

      const sql = hanaService.query.mock.calls[0][0] as string;

      // Should search in DocNum, ItemCode, ProdName, CustomerName
      expect(sql).toContain('LOWER(CAST(T0."DocNum" AS VARCHAR))');
      expect(sql).toContain('LOWER(T0."ItemCode")');
      expect(sql).toContain('LOWER(T0."ProdName")');
    });

    it('should return empty array when no work orders found', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.findAll(['UNKNOWN-MACHINE']);

      expect(result).toEqual([]);
    });

    it('should apply pagination when provided', async () => {
      hanaService.query.mockResolvedValue(mockWorkOrders);

      await repository.findAll(['1001 - BARMAG 1'], { limit: 10, offset: 20 });

      const sql = hanaService.query.mock.calls[0][0] as string;

      expect(sql).toContain('LIMIT');
      expect(sql).toContain('OFFSET');
    });

    it('should order by ResCode, StationSortOrder, then DueDate', async () => {
      hanaService.query.mockResolvedValue(mockWorkOrders);

      await repository.findAll(['1001 - BARMAG 1']);

      const sql = hanaService.query.mock.calls[0][0] as string;

      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('"ResCode"');
      expect(sql).toContain('"U_StationSortOrder"');
      expect(sql).toContain('"DueDate"');
    });
  });

  describe('findByDocEntry', () => {
    const mockWorkOrder: WorkOrderWithDetails = {
      DocEntry: 1001,
      DocNum: 5001,
      ItemCode: 'PROD-001',
      ProdName: 'Product One',
      PlannedQty: 100,
      CmpltQty: 50,
      RjctQty: 5,
      RemainingQty: 50,
      ProgressPercent: 50,
      StartDate: '2026-01-15',
      DueDate: '2026-01-20',
      RlsDate: '2026-01-14',
      Status: 'R',
      CardCode: 'C001',
      CustomerName: 'Customer One',
      U_StationSortOrder: 1,
      Warehouse: '03',
      Comments: 'Some notes',
      MachineCode: '1001 - BARMAG 1',
      MachineName: 'BARMAG 1',
    };

    it('should return work order by DocEntry', async () => {
      hanaService.queryOne.mockResolvedValue(mockWorkOrder);

      const result = await repository.findByDocEntry(1001);

      expect(result).toEqual(mockWorkOrder);
      expect(hanaService.queryOne).toHaveBeenCalledTimes(1);

      const params = hanaService.queryOne.mock.calls[0][1] as unknown[];
      expect(params).toContain(1001);
    });

    it('should return null when work order not found', async () => {
      hanaService.queryOne.mockResolvedValue(null);

      const result = await repository.findByDocEntry(9999);

      expect(result).toBeNull();
    });
  });

  describe('findCustomersWithActiveOrders', () => {
    const mockCustomers = [
      { CardCode: 'C001', CardName: 'Customer One' },
      { CardCode: 'C002', CardName: 'Customer Two' },
    ];

    it('should return distinct customers with active orders', async () => {
      hanaService.query.mockResolvedValue(mockCustomers);

      const result = await repository.findCustomersWithActiveOrders();

      expect(result).toEqual(mockCustomers);
      expect(hanaService.query).toHaveBeenCalledTimes(1);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('DISTINCT');
      expect(sql).toContain('"Status" = \'R\'');
    });

    it('should return empty array when no customers found', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.findCustomersWithActiveOrders();

      expect(result).toEqual([]);
    });
  });
});
