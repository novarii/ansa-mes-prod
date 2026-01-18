import { Test, TestingModule } from '@nestjs/testing';
import { ResourceRepository } from './resource.repository';
import { HanaService } from '../hana.service';
import { MachineWithAuthStatus } from '@org/shared-types';

describe('ResourceRepository', () => {
  let repository: ResourceRepository;
  let hanaService: jest.Mocked<HanaService>;

  const mockHanaService = {
    query: jest.fn(),
    queryOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceRepository,
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
      ],
    }).compile();

    repository = module.get<ResourceRepository>(ResourceRepository);
    hanaService = module.get(HanaService);
  });

  describe('findAuthorizedMachinesForWorker', () => {
    const mockMachines: MachineWithAuthStatus[] = [
      {
        ResCode: '1001 - BARMAG 1',
        ResName: 'BARMAG 1',
        ResType: 'M',
        U_defaultEmp: '200',
        U_secondEmp: '200,310,172',
        IsDefault: true,
        IsAuthorized: true,
      },
      {
        ResCode: '1002 - BARMAG 2',
        ResName: 'BARMAG 2',
        ResType: 'M',
        U_defaultEmp: '310',
        U_secondEmp: '200,310,172',
        IsDefault: false,
        IsAuthorized: true,
      },
    ];

    it('should return authorized machines for worker', async () => {
      hanaService.query.mockResolvedValue(mockMachines);

      const result = await repository.findAuthorizedMachinesForWorker(200);

      expect(result).toEqual(mockMachines);
      expect(hanaService.query).toHaveBeenCalledTimes(1);
    });

    it('should use CSV membership pattern for U_secondEmp', async () => {
      hanaService.query.mockResolvedValue(mockMachines);

      await repository.findAuthorizedMachinesForWorker(200);

      const sql = hanaService.query.mock.calls[0][0] as string;
      // Should use the CSV membership pattern: ',' || "U_secondEmp" || ',' LIKE '%,' || ? || ',%'
      expect(sql).toContain("',' ||");
      expect(sql).toContain('|| \',\'');
      expect(sql).toContain('LIKE');
    });

    it('should check both U_defaultEmp and U_secondEmp', async () => {
      hanaService.query.mockResolvedValue(mockMachines);

      await repository.findAuthorizedMachinesForWorker(200);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"U_defaultEmp"');
      expect(sql).toContain('"U_secondEmp"');
    });

    it('should filter to only machine type (ResType=M)', async () => {
      hanaService.query.mockResolvedValue(mockMachines);

      await repository.findAuthorizedMachinesForWorker(200);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"ResType" = \'M\'');
    });

    it('should return empty array when worker has no authorized machines', async () => {
      hanaService.query.mockResolvedValue([]);

      const result = await repository.findAuthorizedMachinesForWorker(999);

      expect(result).toEqual([]);
    });

    it('should order results by ResName', async () => {
      hanaService.query.mockResolvedValue(mockMachines);

      await repository.findAuthorizedMachinesForWorker(200);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('"ResName"');
    });
  });

  describe('findWorkersForMachine', () => {
    const mockWorkers = [
      {
        empID: 200,
        firstName: 'Bulent',
        lastName: 'Ozguneyli',
        IsDefault: true,
      },
      {
        empID: 310,
        firstName: 'Ahmet',
        lastName: 'Yilmaz',
        IsDefault: false,
      },
    ];

    it('should return workers authorized for machine', async () => {
      hanaService.query.mockResolvedValue(mockWorkers);

      const result = await repository.findWorkersForMachine('1001 - BARMAG 1');

      expect(result).toEqual(mockWorkers);
      expect(hanaService.query).toHaveBeenCalledTimes(1);
    });

    it('should join OHEM for employee details', async () => {
      hanaService.query.mockResolvedValue(mockWorkers);

      await repository.findWorkersForMachine('1001 - BARMAG 1');

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"OHEM"');
      expect(sql).toContain('"firstName"');
      expect(sql).toContain('"lastName"');
    });

    it('should order default worker first, then by name', async () => {
      hanaService.query.mockResolvedValue(mockWorkers);

      await repository.findWorkersForMachine('1001 - BARMAG 1');

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('"IsDefault"');
    });
  });

  describe('isWorkerAuthorizedForMachine', () => {
    it('should return true when worker is authorized', async () => {
      hanaService.queryOne.mockResolvedValue({ count: 1 });

      const result = await repository.isWorkerAuthorizedForMachine(
        200,
        '1001 - BARMAG 1'
      );

      expect(result).toBe(true);
    });

    it('should return false when worker is not authorized', async () => {
      hanaService.queryOne.mockResolvedValue({ count: 0 });

      const result = await repository.isWorkerAuthorizedForMachine(
        999,
        '1001 - BARMAG 1'
      );

      expect(result).toBe(false);
    });

    it('should use CSV membership pattern for authorization check', async () => {
      hanaService.queryOne.mockResolvedValue({ count: 1 });

      await repository.isWorkerAuthorizedForMachine(200, '1001 - BARMAG 1');

      const sql = hanaService.queryOne.mock.calls[0][0] as string;
      expect(sql).toContain("',' ||");
      expect(sql).toContain('|| \',\'');
    });
  });

  describe('findAllMachines', () => {
    const mockMachines = [
      {
        ResCode: '1001 - BARMAG 1',
        ResName: 'BARMAG 1',
        ResType: 'M',
        U_defaultEmp: '200',
        U_secondEmp: '200,310',
      },
      {
        ResCode: '1002 - BARMAG 2',
        ResName: 'BARMAG 2',
        ResType: 'M',
        U_defaultEmp: '310',
        U_secondEmp: '310,200',
      },
    ];

    it('should return all machines', async () => {
      hanaService.query.mockResolvedValue(mockMachines);

      const result = await repository.findAllMachines();

      expect(result).toEqual(mockMachines);
    });

    it('should filter to only machine type', async () => {
      hanaService.query.mockResolvedValue(mockMachines);

      await repository.findAllMachines();

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"ResType" = \'M\'');
    });
  });
});
