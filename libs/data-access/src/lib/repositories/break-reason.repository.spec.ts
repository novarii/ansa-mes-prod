import { Test, TestingModule } from '@nestjs/testing';
import { BreakReasonRepository } from './break-reason.repository';
import { HanaService } from '../hana.service';
import { BreakReason } from '@org/shared-types';

describe('BreakReasonRepository', () => {
  let repository: BreakReasonRepository;
  let hanaService: jest.Mocked<HanaService>;

  const mockHanaService = {
    query: jest.fn(),
    queryOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakReasonRepository,
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
      ],
    }).compile();

    repository = module.get<BreakReasonRepository>(BreakReasonRepository);
    hanaService = module.get(HanaService);
  });

  describe('findAll', () => {
    const mockBreakReasons: BreakReason[] = [
      { Code: '1', Name: 'Mola' },
      { Code: '2', Name: 'Yemek' },
      { Code: '4', Name: 'Urun Degisikligi' },
      { Code: '10', Name: 'Malzeme Bekleme' },
      { Code: '20', Name: 'Ariza' },
      { Code: '30', Name: 'Kalite Kontrol' },
      { Code: '73', Name: 'Personel Degisimi' },
    ];

    it('should return all break reasons', async () => {
      hanaService.query.mockResolvedValue(mockBreakReasons);

      const result = await repository.findAll();

      expect(result).toEqual(mockBreakReasons);
      expect(hanaService.query).toHaveBeenCalledTimes(1);
    });

    it('should query @BREAKREASON table', async () => {
      hanaService.query.mockResolvedValue(mockBreakReasons);

      await repository.findAll();

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"@BREAKREASON"');
    });

    it('should select Code and Name fields', async () => {
      hanaService.query.mockResolvedValue(mockBreakReasons);

      await repository.findAll();

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"Code"');
      expect(sql).toContain('"Name"');
    });

    it('should order by Name', async () => {
      hanaService.query.mockResolvedValue(mockBreakReasons);

      await repository.findAll();

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('"Name"');
    });

    it('should return empty array when no break reasons exist', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findByCode', () => {
    it('should return break reason by code', async () => {
      const mockBreakReason: BreakReason = { Code: '73', Name: 'Personel Degisimi' };
      hanaService.queryOne.mockResolvedValue(mockBreakReason);

      const result = await repository.findByCode('73');

      expect(result).toEqual(mockBreakReason);
      expect(hanaService.queryOne).toHaveBeenCalledTimes(1);

      const params = hanaService.queryOne.mock.calls[0][1] as unknown[];
      expect(params).toContain('73');
    });

    it('should return null when code not found', async () => {
      hanaService.queryOne.mockResolvedValue(null);

      const result = await repository.findByCode('999');

      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    const mockBreakReasons: BreakReason[] = [
      { Code: '1', Name: 'Mola' },
      { Code: '10', Name: 'Malzeme Bekleme' },
    ];

    it('should search break reasons by name', async () => {
      hanaService.query.mockResolvedValue(mockBreakReasons);

      const result = await repository.search('mal');

      expect(result).toEqual(mockBreakReasons);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('LIKE');
    });

    it('should be case-insensitive', async () => {
      hanaService.query.mockResolvedValue(mockBreakReasons);

      await repository.search('MAL');

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('LOWER');
    });

    it('should return empty array when no matches', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.search('xyz');

      expect(result).toEqual([]);
    });
  });
});
