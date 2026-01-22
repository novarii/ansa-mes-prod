import { Test, TestingModule } from '@nestjs/testing';
import { PickListRepository, PickListItem } from './pick-list.repository';
import { HanaService } from '../hana.service';

describe('PickListRepository', () => {
  let repository: PickListRepository;
  let hanaService: jest.Mocked<HanaService>;

  const mockHanaService = {
    query: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickListRepository,
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
      ],
    }).compile();

    repository = module.get<PickListRepository>(PickListRepository);
    hanaService = module.get(HanaService);
  });

  describe('findByWorkOrder', () => {
    const mockPickList: PickListItem[] = [
      {
        ItemCode: 'MAT-001',
        ItemName: 'Celik Levha',
        PlannedQty: 100,
        IssuedQty: 80,
        RemainingQty: 20,
        Warehouse: '01',
        UoM: 'KG',
      },
      {
        ItemCode: 'MAT-002',
        ItemName: 'Vida M8',
        PlannedQty: 400,
        IssuedQty: 400,
        RemainingQty: 0,
        Warehouse: '01',
        UoM: 'ADET',
      },
      {
        ItemCode: 'MAT-003',
        ItemName: 'Boya RAL7035',
        PlannedQty: 5,
        IssuedQty: 2,
        RemainingQty: 3,
        Warehouse: '03',
        UoM: 'LT',
      },
    ];

    it('should return pick list items for work order', async () => {
      hanaService.query.mockResolvedValue(mockPickList);

      const result = await repository.findByWorkOrder(1001);

      expect(result).toEqual(mockPickList);
      expect(hanaService.query).toHaveBeenCalledTimes(1);

      const params = hanaService.query.mock.calls[0][1] as unknown[];
      expect(params).toContain(1001);
    });

    it('should join OWOR, WOR1, and OITM tables', async () => {
      hanaService.query.mockResolvedValue(mockPickList);

      await repository.findByWorkOrder(1001);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"OWOR"');
      expect(sql).toContain('"WOR1"');
      expect(sql).toContain('"OITM"');
    });

    it('should filter to materials only (ItemType = 4)', async () => {
      hanaService.query.mockResolvedValue(mockPickList);

      await repository.findByWorkOrder(1001);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"ItemType" = 4');
    });

    it('should calculate RemainingQty', async () => {
      hanaService.query.mockResolvedValue(mockPickList);

      await repository.findByWorkOrder(1001);

      const sql = hanaService.query.mock.calls[0][0] as string;
      // Should have calculation: PlannedQty - IssuedQty as RemainingQty
      expect(sql).toContain('"PlannedQty"');
      expect(sql).toContain('"IssuedQty"');
      expect(sql).toContain('"RemainingQty"');
    });

    it('should order by LineNum', async () => {
      hanaService.query.mockResolvedValue(mockPickList);

      await repository.findByWorkOrder(1001);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('"LineNum"');
    });

    it('should return empty array when no materials found', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.findByWorkOrder(9999);

      expect(result).toEqual([]);
    });

    it('should include warehouse from WOR1', async () => {
      hanaService.query.mockResolvedValue(mockPickList);

      await repository.findByWorkOrder(1001);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"wareHouse"');
    });

    it('should include UoM from OITM', async () => {
      hanaService.query.mockResolvedValue(mockPickList);

      await repository.findByWorkOrder(1001);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"InvntryUom"');
    });
  });

  describe('getPendingMaterials', () => {
    const mockPendingMaterials: PickListItem[] = [
      {
        ItemCode: 'MAT-001',
        ItemName: 'Celik Levha',
        PlannedQty: 100,
        IssuedQty: 80,
        RemainingQty: 20,
        Warehouse: '01',
        UoM: 'KG',
      },
      {
        ItemCode: 'MAT-003',
        ItemName: 'Boya RAL7035',
        PlannedQty: 5,
        IssuedQty: 2,
        RemainingQty: 3,
        Warehouse: '03',
        UoM: 'LT',
      },
    ];

    it('should return only materials with remaining quantity > 0', async () => {
      hanaService.query.mockResolvedValue(mockPendingMaterials);

      const result = await repository.getPendingMaterials(1001);

      expect(result).toEqual(mockPendingMaterials);

      const sql = hanaService.query.mock.calls[0][0] as string;
      // Should filter where PlannedQty > IssuedQty
      expect(sql).toContain('"PlannedQty"');
      expect(sql).toContain('"IssuedQty"');
    });

    it('should return empty array when all materials issued', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.getPendingMaterials(1001);

      expect(result).toEqual([]);
    });
  });
});
