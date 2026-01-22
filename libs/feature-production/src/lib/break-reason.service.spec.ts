import { Test, TestingModule } from '@nestjs/testing';
import { BreakReasonService } from './break-reason.service';
import { BreakReasonRepository } from '@org/data-access';
import { BreakReason } from '@org/shared-types';

describe('BreakReasonService', () => {
  let service: BreakReasonService;
  let breakReasonRepository: jest.Mocked<BreakReasonRepository>;

  const mockBreakReasonRepository = {
    findAll: jest.fn(),
    findByCode: jest.fn(),
    search: jest.fn(),
  };

  const mockBreakReasons: BreakReason[] = [
    { Code: '1', Name: 'Mola' },
    { Code: '2', Name: 'Yemek' },
    { Code: '4', Name: 'Urun Degisikligi' },
    { Code: '10', Name: 'Malzeme Bekleme' },
    { Code: '20', Name: 'Ariza' },
    { Code: '30', Name: 'Kalite Kontrol' },
    { Code: '73', Name: 'Personel Degisimi' },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BreakReasonService,
        {
          provide: BreakReasonRepository,
          useValue: mockBreakReasonRepository,
        },
      ],
    }).compile();

    service = module.get<BreakReasonService>(BreakReasonService);
    breakReasonRepository = module.get(BreakReasonRepository);
  });

  describe('getAllBreakReasons', () => {
    it('should return all break reasons', async () => {
      mockBreakReasonRepository.findAll.mockResolvedValue(mockBreakReasons);

      const result = await service.getAllBreakReasons();

      expect(result).toHaveLength(7);
      expect(breakReasonRepository.findAll).toHaveBeenCalled();
    });

    it('should transform break reasons to DTO format', async () => {
      mockBreakReasonRepository.findAll.mockResolvedValue(mockBreakReasons);

      const result = await service.getAllBreakReasons();

      expect(result[0]).toEqual({
        code: '1',
        name: 'Mola',
      });
    });

    it('should return empty array when no break reasons exist', async () => {
      mockBreakReasonRepository.findAll.mockResolvedValue([]);

      const result = await service.getAllBreakReasons();

      expect(result).toHaveLength(0);
    });
  });

  describe('searchBreakReasons', () => {
    it('should return matching break reasons', async () => {
      mockBreakReasonRepository.search.mockResolvedValue([
        { Code: '1', Name: 'Mola' },
      ]);

      const result = await service.searchBreakReasons('mola');

      expect(result).toHaveLength(1);
      expect(breakReasonRepository.search).toHaveBeenCalledWith('mola');
    });

    it('should return empty array when no matches', async () => {
      mockBreakReasonRepository.search.mockResolvedValue([]);

      const result = await service.searchBreakReasons('nonexistent');

      expect(result).toHaveLength(0);
    });
  });
});
