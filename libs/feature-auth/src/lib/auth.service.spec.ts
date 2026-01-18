import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmployeeRepository, ResourceRepository } from '@org/data-access';
import { MachineWithAuthStatus, EmployeeWithAuth } from '@org/shared-types';

describe('AuthService', () => {
  let service: AuthService;
  let employeeRepository: jest.Mocked<EmployeeRepository>;
  let resourceRepository: jest.Mocked<ResourceRepository>;

  const mockEmployeeRepository = {
    findByIdWithPassword: jest.fn(),
    findById: jest.fn(),
    validatePassword: jest.fn(),
  };

  const mockResourceRepository = {
    findAuthorizedMachinesForWorker: jest.fn(),
    isWorkerAuthorizedForMachine: jest.fn(),
    findByResCode: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: EmployeeRepository,
          useValue: mockEmployeeRepository,
        },
        {
          provide: ResourceRepository,
          useValue: mockResourceRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    employeeRepository = module.get(EmployeeRepository);
    resourceRepository = module.get(ResourceRepository);
  });

  describe('login', () => {
    const mockEmployee: EmployeeWithAuth = {
      empID: 200,
      firstName: 'Bulent',
      lastName: 'Ozguneyli',
      U_mainStation: '1001 - BARMAG 1',
      U_password: '1234',
    };

    const mockMachines: MachineWithAuthStatus[] = [
      {
        ResCode: 'M001',
        ResName: 'BARMAG 1',
        ResType: 'M',
        U_defaultEmp: '200',
        U_secondEmp: '200,310',
        IsDefault: true,
        IsAuthorized: true,
      },
      {
        ResCode: 'M002',
        ResName: 'BARMAG 2',
        ResType: 'M',
        U_defaultEmp: '310',
        U_secondEmp: '200,310,172',
        IsDefault: false,
        IsAuthorized: true,
      },
    ];

    it('should successfully login with valid credentials', async () => {
      employeeRepository.validatePassword.mockResolvedValue(true);
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployee);
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue(
        mockMachines
      );

      const result = await service.login(200, '1234');

      expect(result.success).toBe(true);
      expect(result.empId).toBe(200);
      expect(result.empName).toBe('Bulent Ozguneyli');
      expect(result.stationCount).toBe(2);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      employeeRepository.validatePassword.mockResolvedValue(false);

      await expect(service.login(200, 'wrong')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when employee not found', async () => {
      employeeRepository.validatePassword.mockResolvedValue(false);

      await expect(service.login(999, '1234')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should return stationCount of 0 when no authorized machines', async () => {
      employeeRepository.validatePassword.mockResolvedValue(true);
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployee);
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue([]);

      const result = await service.login(200, '1234');

      expect(result.stationCount).toBe(0);
    });

    it('should validate password using EmployeeRepository', async () => {
      employeeRepository.validatePassword.mockResolvedValue(true);
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployee);
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue(
        mockMachines
      );

      await service.login(200, '1234');

      expect(employeeRepository.validatePassword).toHaveBeenCalledWith(
        200,
        '1234'
      );
    });

    it('should throw BadRequestException for invalid empId', async () => {
      await expect(service.login(0, '1234')).rejects.toThrow(BadRequestException);
      await expect(service.login(-1, '1234')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for empty pin', async () => {
      await expect(service.login(200, '')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAuthorizedStations', () => {
    const mockMachines: MachineWithAuthStatus[] = [
      {
        ResCode: 'M001',
        ResName: 'BARMAG 1',
        ResType: 'M',
        U_defaultEmp: '200',
        U_secondEmp: '200,310',
        IsDefault: true,
        IsAuthorized: true,
      },
      {
        ResCode: 'M002',
        ResName: 'BARMAG 2',
        ResType: 'M',
        U_defaultEmp: '310',
        U_secondEmp: '200,310,172',
        IsDefault: false,
        IsAuthorized: true,
      },
    ];

    it('should return authorized stations for employee', async () => {
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue(
        mockMachines
      );

      const result = await service.getAuthorizedStations(200);

      expect(result.empId).toBe(200);
      expect(result.stations).toHaveLength(2);
    });

    it('should transform machines to StationOption format', async () => {
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue(
        mockMachines
      );

      const result = await service.getAuthorizedStations(200);

      expect(result.stations[0]).toEqual({
        code: 'M001',
        name: 'BARMAG 1',
        isDefault: true,
      });
      expect(result.stations[1]).toEqual({
        code: 'M002',
        name: 'BARMAG 2',
        isDefault: false,
      });
    });

    it('should return empty stations when no machines authorized', async () => {
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue([]);

      const result = await service.getAuthorizedStations(200);

      expect(result.stations).toHaveLength(0);
    });

    it('should throw BadRequestException for invalid empId', async () => {
      await expect(service.getAuthorizedStations(0)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('selectStation', () => {
    const mockEmployee: EmployeeWithAuth = {
      empID: 200,
      firstName: 'Bulent',
      lastName: 'Ozguneyli',
      U_mainStation: '1001 - BARMAG 1',
      U_password: '1234',
    };

    const mockMachine = {
      ResCode: 'M001',
      ResName: 'BARMAG 1',
      ResType: 'M',
      U_defaultEmp: '200',
      U_secondEmp: '200,310',
    };

    it('should successfully select an authorized station', async () => {
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(mockMachine);
      employeeRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.selectStation(200, 'M001');

      expect(result.success).toBe(true);
      expect(result.session.empID).toBe(200);
      expect(result.session.empName).toBe('Bulent Ozguneyli');
      expect(result.session.stationCode).toBe('M001');
      expect(result.session.stationName).toBe('BARMAG 1');
    });

    it('should set isDefaultWorker true when U_defaultEmp matches empId', async () => {
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(mockMachine);
      employeeRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.selectStation(200, 'M001');

      expect(result.session.isDefaultWorker).toBe(true);
    });

    it('should set isDefaultWorker false when not default worker', async () => {
      const nonDefaultMachine = {
        ...mockMachine,
        U_defaultEmp: '310', // Different worker is default
      };
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(nonDefaultMachine);
      employeeRepository.findById.mockResolvedValue(mockEmployee);

      const result = await service.selectStation(200, 'M001');

      expect(result.session.isDefaultWorker).toBe(false);
    });

    it('should set loginTime to current timestamp', async () => {
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(mockMachine);
      employeeRepository.findById.mockResolvedValue(mockEmployee);

      const beforeTime = new Date();
      const result = await service.selectStation(200, 'M001');
      const afterTime = new Date();

      const loginTime = new Date(result.session.loginTime);
      expect(loginTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(loginTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should throw UnauthorizedException when worker not authorized for machine', async () => {
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(false);

      await expect(service.selectStation(200, 'M001')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw BadRequestException when machine not found', async () => {
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(null);

      await expect(service.selectStation(200, 'INVALID')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when employee not found', async () => {
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(mockMachine);
      employeeRepository.findById.mockResolvedValue(null);

      await expect(service.selectStation(999, 'M001')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for invalid empId', async () => {
      await expect(service.selectStation(0, 'M001')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for empty stationCode', async () => {
      await expect(service.selectStation(200, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should validate authorization before fetching details', async () => {
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(false);

      await expect(service.selectStation(200, 'M001')).rejects.toThrow(
        UnauthorizedException
      );

      // Should not have fetched machine details
      expect(resourceRepository.findByResCode).not.toHaveBeenCalled();
    });
  });
});
