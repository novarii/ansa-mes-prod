import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmployeeRepository, ResourceRepository } from '@org/data-access';
import { Machine, MachineWithAuthStatus, EmployeeWithAuth } from '@org/shared-types';

describe('AuthService', () => {
  let service: AuthService;
  let employeeRepository: jest.Mocked<EmployeeRepository>;
  let resourceRepository: jest.Mocked<ResourceRepository>;

  const mockEmployeeRepository = {
    findByIdWithPassword: jest.fn(),
    findById: jest.fn(),
    findByLoginCode: jest.fn(),
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
    // Mock employee where U_password is the login code (e.g., '200')
    // Note: empID (51) is different from U_password (200) in real data
    const mockEmployee: EmployeeWithAuth = {
      empID: 51,
      firstName: 'Haci',
      lastName: 'Yilmaz',
      U_mainStation: '1001 - BARMAG 1',
      U_password: '200', // Login code - this is what's stored in ORSC.U_secondEmp
    };

    const mockMachines: MachineWithAuthStatus[] = [
      {
        ResCode: 'M001',
        ResName: 'BARMAG 1',
        ResType: 'M',
        U_defaultEmp: '200', // U_password value, not empID
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
      // Login uses findByLoginCode (U_password) to find employee
      employeeRepository.findByLoginCode.mockResolvedValue(mockEmployee);
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue(
        mockMachines
      );

      // User enters '200' as both login code and PIN
      const result = await service.login(200, '200');

      expect(result.success).toBe(true);
      expect(result.empId).toBe(51); // Returns actual empID
      expect(result.empName).toBe('Haci Yilmaz');
      expect(result.stationCount).toBe(2);
      // Verify authorization used U_password, not empID
      expect(resourceRepository.findAuthorizedMachinesForWorker).toHaveBeenCalledWith('200');
    });

    it('should throw UnauthorizedException for invalid PIN', async () => {
      // Employee found but PIN doesn't match U_password
      employeeRepository.findByLoginCode.mockResolvedValue(mockEmployee);

      await expect(service.login(200, 'wrong')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException when employee not found', async () => {
      employeeRepository.findByLoginCode.mockResolvedValue(null);

      await expect(service.login(999, '999')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should return stationCount of 0 when no authorized machines', async () => {
      employeeRepository.findByLoginCode.mockResolvedValue(mockEmployee);
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue([]);

      const result = await service.login(200, '200');

      expect(result.stationCount).toBe(0);
    });

    it('should find employee by login code (U_password)', async () => {
      employeeRepository.findByLoginCode.mockResolvedValue(mockEmployee);
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue(
        mockMachines
      );

      await service.login(200, '200');

      expect(employeeRepository.findByLoginCode).toHaveBeenCalledWith('200');
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
    // Employee with empID=51 and U_password='200'
    const mockEmployeeForStations = {
      empID: 51,
      firstName: 'Haci',
      lastName: 'Yilmaz',
      U_mainStation: '1001 - BARMAG 1',
      U_password: '200',
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

    it('should return authorized stations for employee', async () => {
      // First looks up employee by empID to get U_password
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForStations);
      // Then uses U_password for authorization
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue(
        mockMachines
      );

      const result = await service.getAuthorizedStations(51);

      expect(result.empId).toBe(51);
      expect(result.stations).toHaveLength(2);
      // Verify authorization used U_password, not empID
      expect(resourceRepository.findAuthorizedMachinesForWorker).toHaveBeenCalledWith('200');
    });

    it('should transform machines to StationOption format', async () => {
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForStations);
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue(
        mockMachines
      );

      const result = await service.getAuthorizedStations(51);

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
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForStations);
      resourceRepository.findAuthorizedMachinesForWorker.mockResolvedValue([]);

      const result = await service.getAuthorizedStations(51);

      expect(result.stations).toHaveLength(0);
    });

    it('should throw BadRequestException for invalid empId', async () => {
      await expect(service.getAuthorizedStations(0)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when employee not found', async () => {
      employeeRepository.findByIdWithPassword.mockResolvedValue(null);

      await expect(service.getAuthorizedStations(999)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when employee has no U_password', async () => {
      const employeeWithoutPassword = { ...mockEmployeeForStations, U_password: null };
      employeeRepository.findByIdWithPassword.mockResolvedValue(employeeWithoutPassword);

      await expect(service.getAuthorizedStations(51)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('selectStation', () => {
    // Employee with empID=51 and U_password='200'
    const mockEmployeeForSelect: EmployeeWithAuth = {
      empID: 51,
      firstName: 'Haci',
      lastName: 'Yilmaz',
      U_mainStation: '1001 - BARMAG 1',
      U_password: '200',
    };

    const mockMachine: Machine = {
      ResCode: 'M001',
      ResName: 'BARMAG 1',
      ResType: 'M',
      U_defaultEmp: '200', // U_password value, not empID
      U_secondEmp: '200,310',
    };

    it('should successfully select an authorized station', async () => {
      // First looks up employee to get U_password
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForSelect);
      // Authorization check uses U_password
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(mockMachine);

      const result = await service.selectStation(51, 'M001');

      expect(result.success).toBe(true);
      expect(result.session.empID).toBe(51);
      expect(result.session.empName).toBe('Haci Yilmaz');
      expect(result.session.stationCode).toBe('M001');
      expect(result.session.stationName).toBe('BARMAG 1');
      // Verify authorization used U_password, not empID
      expect(resourceRepository.isWorkerAuthorizedForMachine).toHaveBeenCalledWith('200', 'M001');
    });

    it('should set isDefaultWorker true when U_defaultEmp matches U_password', async () => {
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForSelect);
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(mockMachine);

      const result = await service.selectStation(51, 'M001');

      // U_defaultEmp='200' matches U_password='200'
      expect(result.session.isDefaultWorker).toBe(true);
    });

    it('should set isDefaultWorker false when not default worker', async () => {
      const nonDefaultMachine = {
        ...mockMachine,
        U_defaultEmp: '310', // Different worker's U_password is default
      };
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForSelect);
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(nonDefaultMachine);

      const result = await service.selectStation(51, 'M001');

      expect(result.session.isDefaultWorker).toBe(false);
    });

    it('should set loginTime to current timestamp', async () => {
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForSelect);
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(mockMachine);

      const beforeTime = new Date();
      const result = await service.selectStation(51, 'M001');
      const afterTime = new Date();

      const loginTime = new Date(result.session.loginTime);
      expect(loginTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(loginTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should throw UnauthorizedException when worker not authorized for machine', async () => {
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForSelect);
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(false);

      await expect(service.selectStation(51, 'M001')).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw BadRequestException when machine not found', async () => {
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForSelect);
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(true);
      resourceRepository.findByResCode.mockResolvedValue(null);

      await expect(service.selectStation(51, 'INVALID')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when employee not found', async () => {
      employeeRepository.findByIdWithPassword.mockResolvedValue(null);

      await expect(service.selectStation(999, 'M001')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when employee has no U_password', async () => {
      const employeeWithoutPassword = { ...mockEmployeeForSelect, U_password: null };
      employeeRepository.findByIdWithPassword.mockResolvedValue(employeeWithoutPassword);

      await expect(service.selectStation(51, 'M001')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for invalid empId', async () => {
      await expect(service.selectStation(0, 'M001')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for empty stationCode', async () => {
      await expect(service.selectStation(51, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should look up employee before checking authorization', async () => {
      employeeRepository.findByIdWithPassword.mockResolvedValue(mockEmployeeForSelect);
      resourceRepository.isWorkerAuthorizedForMachine.mockResolvedValue(false);

      await expect(service.selectStation(51, 'M001')).rejects.toThrow(
        UnauthorizedException
      );

      // Employee lookup should happen first
      expect(employeeRepository.findByIdWithPassword).toHaveBeenCalledWith(51);
      // Then authorization check with U_password
      expect(resourceRepository.isWorkerAuthorizedForMachine).toHaveBeenCalledWith('200', 'M001');
      // Machine details not fetched since not authorized
      expect(resourceRepository.findByResCode).not.toHaveBeenCalled();
    });
  });
});
