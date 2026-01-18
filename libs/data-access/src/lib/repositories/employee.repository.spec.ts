import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeRepository } from './employee.repository';
import { HanaService } from '../hana.service';
import { EmployeeWithAuth, EmployeeInfo } from '@org/shared-types';

describe('EmployeeRepository', () => {
  let repository: EmployeeRepository;
  let hanaService: jest.Mocked<HanaService>;

  const mockHanaService = {
    query: jest.fn(),
    queryOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeRepository,
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
      ],
    }).compile();

    repository = module.get<EmployeeRepository>(EmployeeRepository);
    hanaService = module.get(HanaService);
  });

  describe('findByIdWithPassword', () => {
    const mockEmployeeWithAuth: EmployeeWithAuth = {
      empID: 200,
      firstName: 'Bulent',
      lastName: 'Ozguneyli',
      U_mainStation: '1001 - BARMAG 1',
      U_password: 'hashed_password_123',
    };

    it('should return employee with password for authentication', async () => {
      hanaService.queryOne.mockResolvedValue(mockEmployeeWithAuth);

      const result = await repository.findByIdWithPassword(200);

      expect(result).toEqual(mockEmployeeWithAuth);
      expect(hanaService.queryOne).toHaveBeenCalledTimes(1);

      const params = hanaService.queryOne.mock.calls[0][1] as unknown[];
      expect(params).toContain(200);
    });

    it('should return null when employee not found', async () => {
      hanaService.queryOne.mockResolvedValue(null);

      const result = await repository.findByIdWithPassword(999);

      expect(result).toBeNull();
    });

    it('should query OHEM table with U_password field', async () => {
      hanaService.queryOne.mockResolvedValue(mockEmployeeWithAuth);

      await repository.findByIdWithPassword(200);

      const sql = hanaService.queryOne.mock.calls[0][0] as string;
      expect(sql).toContain('"OHEM"');
      expect(sql).toContain('"U_password"');
    });
  });

  describe('findById', () => {
    const mockEmployee = {
      empID: 200,
      firstName: 'Bulent',
      lastName: 'Ozguneyli',
      U_mainStation: '1001 - BARMAG 1',
    };

    it('should return employee without password', async () => {
      hanaService.queryOne.mockResolvedValue(mockEmployee);

      const result = await repository.findById(200);

      expect(result).toEqual(mockEmployee);
    });

    it('should not include password in result', async () => {
      hanaService.queryOne.mockResolvedValue(mockEmployee);

      await repository.findById(200);

      const sql = hanaService.queryOne.mock.calls[0][0] as string;
      expect(sql).not.toContain('"U_password"');
    });
  });

  describe('findByIds', () => {
    const mockEmployees: EmployeeInfo[] = [
      {
        empID: 200,
        fullName: 'Bulent Ozguneyli',
        mainStation: '1001 - BARMAG 1',
      },
      {
        empID: 310,
        fullName: 'Ahmet Yilmaz',
        mainStation: '1002 - BARMAG 2',
      },
    ];

    it('should return employees for given IDs', async () => {
      hanaService.query.mockResolvedValue(mockEmployees);

      const result = await repository.findByIds([200, 310]);

      expect(result).toEqual(mockEmployees);
      expect(hanaService.query).toHaveBeenCalledTimes(1);
    });

    it('should build fullName from firstName and lastName', async () => {
      hanaService.query.mockResolvedValue(mockEmployees);

      await repository.findByIds([200, 310]);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"firstName"');
      expect(sql).toContain('"lastName"');
      // Check for string concatenation
      expect(sql).toContain('||');
    });

    it('should return empty array when no IDs provided', async () => {
      const result = await repository.findByIds([]);

      expect(result).toEqual([]);
      expect(hanaService.query).not.toHaveBeenCalled();
    });

    it('should use IN clause for multiple IDs', async () => {
      hanaService.query.mockResolvedValue(mockEmployees);

      await repository.findByIds([200, 310, 172]);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('IN (?, ?, ?)');
    });
  });

  describe('findAll', () => {
    const mockEmployees = [
      {
        empID: 200,
        firstName: 'Bulent',
        lastName: 'Ozguneyli',
        U_mainStation: '1001 - BARMAG 1',
      },
      {
        empID: 310,
        firstName: 'Ahmet',
        lastName: 'Yilmaz',
        U_mainStation: '1002 - BARMAG 2',
      },
    ];

    it('should return all employees', async () => {
      hanaService.query.mockResolvedValue(mockEmployees);

      const result = await repository.findAll();

      expect(result).toEqual(mockEmployees);
    });

    it('should order by lastName, firstName', async () => {
      hanaService.query.mockResolvedValue(mockEmployees);

      await repository.findAll();

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('"lastName"');
      expect(sql).toContain('"firstName"');
    });
  });

  describe('validatePassword', () => {
    it('should return true when password matches', async () => {
      hanaService.queryOne.mockResolvedValue({
        empID: 200,
        firstName: 'Bulent',
        lastName: 'Ozguneyli',
        U_mainStation: null,
        U_password: '1234',
      });

      const result = await repository.validatePassword(200, '1234');

      expect(result).toBe(true);
    });

    it('should return false when password does not match', async () => {
      hanaService.queryOne.mockResolvedValue({
        empID: 200,
        firstName: 'Bulent',
        lastName: 'Ozguneyli',
        U_mainStation: null,
        U_password: '1234',
      });

      const result = await repository.validatePassword(200, 'wrong');

      expect(result).toBe(false);
    });

    it('should return false when employee not found', async () => {
      hanaService.queryOne.mockResolvedValue(null);

      const result = await repository.validatePassword(999, '1234');

      expect(result).toBe(false);
    });

    it('should return false when employee has no password', async () => {
      hanaService.queryOne.mockResolvedValue({
        empID: 200,
        firstName: 'Bulent',
        lastName: 'Ozguneyli',
        U_mainStation: null,
        U_password: null,
      });

      const result = await repository.validatePassword(200, '1234');

      expect(result).toBe(false);
    });
  });
});
