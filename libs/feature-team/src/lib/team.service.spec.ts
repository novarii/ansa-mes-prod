import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from './team.service';
import { ResourceRepository, ActivityRepository } from '@org/data-access';

describe('TeamService', () => {
  let service: TeamService;
  let resourceRepository: jest.Mocked<ResourceRepository>;
  let activityRepository: jest.Mocked<ActivityRepository>;

  const mockResourceRepository = {
    findAllMachines: jest.fn(),
    findWorkersForMachine: jest.fn(),
    findAllAssignedWorkers: jest.fn(),
  };

  const mockActivityRepository = {
    findTodayActivitiesForWorkers: jest.fn(),
    findAllTodayActivities: jest.fn(),
  };

  const mockMachines = [
    {
      ResCode: 'M001',
      ResName: 'BARMAG 1',
      ResType: 'M',
      U_defaultEmp: '100',
      U_secondEmp: '101,102,103',
    },
    {
      ResCode: 'M002',
      ResName: 'BARMAG 2',
      ResType: 'M',
      U_defaultEmp: '200',
      U_secondEmp: '201, 202',
    },
    {
      ResCode: 'M003',
      ResName: 'BARMAG 3',
      ResType: 'M',
      U_defaultEmp: null,
      U_secondEmp: null,
    },
  ];

  const mockWorkersM001 = [
    { empID: 100, firstName: 'Ali', lastName: 'Yilmaz', IsDefault: true },
    { empID: 101, firstName: 'Mehmet', lastName: 'Kaya', IsDefault: false },
    { empID: 102, firstName: 'Ahmet', lastName: 'Demir', IsDefault: false },
    { empID: 103, firstName: 'Veli', lastName: 'Ozturk', IsDefault: false },
  ];

  const mockWorkersM002 = [
    { empID: 200, firstName: 'Fatma', lastName: 'Yildiz', IsDefault: true },
    { empID: 201, firstName: 'Ayse', lastName: 'Can', IsDefault: false },
    { empID: 202, firstName: 'Zeynep', lastName: 'Arslan', IsDefault: false },
  ];

  const mockActivities = [
    // Worker 100 is currently working (BAS) on M001
    {
      U_EmpId: '100',
      U_ResCode: 'M001',
      U_ProcType: 'BAS',
      U_WorkOrder: '12345',
      U_Start: new Date('2026-01-18T09:00:00'),
    },
    // Worker 101 is paused (DUR) on M001
    {
      U_EmpId: '101',
      U_ResCode: 'M001',
      U_ProcType: 'DUR',
      U_WorkOrder: '12346',
      U_Start: new Date('2026-01-18T10:00:00'),
    },
    // Worker 200 resumed work (DEV) on M002
    {
      U_EmpId: '200',
      U_ResCode: 'M002',
      U_ProcType: 'DEV',
      U_WorkOrder: '12347',
      U_Start: new Date('2026-01-18T11:00:00'),
    },
    // Worker 201 finished (BIT) on M002 - should be available
    {
      U_EmpId: '201',
      U_ResCode: 'M002',
      U_ProcType: 'BIT',
      U_WorkOrder: '12348',
      U_Start: new Date('2026-01-18T08:00:00'),
    },
  ];

  // All workers from OHEM with their current machine assignment (U_mainStation)
  const mockAllAssignedWorkers = [
    { empID: 100, firstName: 'Ali', lastName: 'Yilmaz', jobTitle: null, mainStation: 'M001' },
    { empID: 101, firstName: 'Mehmet', lastName: 'Kaya', jobTitle: null, mainStation: 'M001' },
    { empID: 102, firstName: 'Ahmet', lastName: 'Demir', jobTitle: null, mainStation: 'M001' },
    { empID: 103, firstName: 'Veli', lastName: 'Ozturk', jobTitle: null, mainStation: 'M001' },
    { empID: 200, firstName: 'Fatma', lastName: 'Yildiz', jobTitle: null, mainStation: 'M002' },
    { empID: 201, firstName: 'Ayse', lastName: 'Can', jobTitle: null, mainStation: 'M002' },
    { empID: 202, firstName: 'Zeynep', lastName: 'Arslan', jobTitle: null, mainStation: 'M002' },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: ResourceRepository,
          useValue: mockResourceRepository,
        },
        {
          provide: ActivityRepository,
          useValue: mockActivityRepository,
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
    resourceRepository = module.get(ResourceRepository);
    activityRepository = module.get(ActivityRepository);
  });

  describe('getCurrentShift', () => {
    it('should return shift A during 08:00-16:00', () => {
      // Mock Date to return 10:00 AM
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = service.getCurrentShift();

      expect(result).toBe('A');

      jest.useRealTimers();
    });

    it('should return shift B during 16:00-00:00', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T18:00:00'));

      const result = service.getCurrentShift();

      expect(result).toBe('B');

      jest.useRealTimers();
    });

    it('should return shift C during 00:00-08:00', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T04:00:00'));

      const result = service.getCurrentShift();

      expect(result).toBe('C');

      jest.useRealTimers();
    });

    it('should return shift A at exactly 08:00', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T08:00:00'));

      const result = service.getCurrentShift();

      expect(result).toBe('A');

      jest.useRealTimers();
    });

    it('should return shift B at exactly 16:00', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T16:00:00'));

      const result = service.getCurrentShift();

      expect(result).toBe('B');

      jest.useRealTimers();
    });

    it('should return shift C at exactly 00:00', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T00:00:00'));

      const result = service.getCurrentShift();

      expect(result).toBe('C');

      jest.useRealTimers();
    });
  });

  describe('getShifts', () => {
    it('should return all shift definitions with current shift', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = service.getShifts();

      expect(result.shifts).toHaveLength(3);
      expect(result.currentShift).toBe('A');
      expect(result.shifts[0]).toEqual({
        code: 'A',
        name: 'A Vardiyasi',
        startTime: '08:00',
        endTime: '16:00',
      });

      jest.useRealTimers();
    });
  });

  describe('getMachinesWithWorkerStatus', () => {
    beforeEach(() => {
      resourceRepository.findAllMachines.mockResolvedValue(mockMachines);
      resourceRepository.findAllAssignedWorkers.mockResolvedValue(mockAllAssignedWorkers);
      resourceRepository.findWorkersForMachine
        .mockResolvedValueOnce(mockWorkersM001)
        .mockResolvedValueOnce(mockWorkersM002)
        .mockResolvedValueOnce([]);
      activityRepository.findTodayActivitiesForWorkers.mockResolvedValue(
        mockActivities
      );
      activityRepository.findAllTodayActivities.mockResolvedValue(mockActivities);
    });

    it('should return team view response with all machines', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus();

      expect(result.machines).toHaveLength(3);
      expect(result.currentShift).toBe('A');
      expect(result.shiftFilter).toBe('all');

      jest.useRealTimers();
    });

    it('should classify workers as assigned when BAS/DEV', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus();

      const m001 = result.machines.find((m) => m.machineCode === 'M001');
      expect(m001?.assignedWorkers).toContainEqual(
        expect.objectContaining({
          empId: 100,
          status: 'assigned',
        })
      );

      const m002 = result.machines.find((m) => m.machineCode === 'M002');
      expect(m002?.assignedWorkers).toContainEqual(
        expect.objectContaining({
          empId: 200,
          status: 'assigned',
        })
      );

      jest.useRealTimers();
    });

    it('should classify workers as paused when DUR', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus();

      const m001 = result.machines.find((m) => m.machineCode === 'M001');
      expect(m001?.pausedWorkers).toContainEqual(
        expect.objectContaining({
          empId: 101,
          status: 'paused',
        })
      );

      jest.useRealTimers();
    });

    it('should classify workers as available when BIT or no activity', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus();

      const m001 = result.machines.find((m) => m.machineCode === 'M001');
      // Workers 102, 103 have no activities - should be available
      expect(m001?.availableWorkers).toContainEqual(
        expect.objectContaining({
          empId: 102,
          status: 'available',
        })
      );
      expect(m001?.availableWorkers).toContainEqual(
        expect.objectContaining({
          empId: 103,
          status: 'available',
        })
      );

      const m002 = result.machines.find((m) => m.machineCode === 'M002');
      // Worker 201 has BIT status - should be available
      expect(m002?.availableWorkers).toContainEqual(
        expect.objectContaining({
          empId: 201,
          status: 'available',
        })
      );

      jest.useRealTimers();
    });

    it('should include work order info for assigned/paused workers', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus();

      const m001 = result.machines.find((m) => m.machineCode === 'M001');
      const assignedWorker = m001?.assignedWorkers.find((w) => w.empId === 100);
      expect(assignedWorker?.currentWorkOrder).toBeDefined();
      expect(assignedWorker?.currentWorkOrder?.docEntry).toBe(12345);

      jest.useRealTimers();
    });

    it('should handle machines with no authorized workers', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus();

      const m003 = result.machines.find((m) => m.machineCode === 'M003');
      expect(m003?.assignedWorkers).toHaveLength(0);
      expect(m003?.pausedWorkers).toHaveLength(0);
      expect(m003?.availableWorkers).toHaveLength(0);

      jest.useRealTimers();
    });

    it('should apply shift filter when provided', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus({ shift: 'A' });

      expect(result.shiftFilter).toBe('A');

      jest.useRealTimers();
    });

    it('should sort machines alphabetically by name', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus();

      const machineNames = result.machines.map((m) => m.machineName);
      const sortedNames = [...machineNames].sort((a, b) =>
        a.localeCompare(b, 'tr-TR')
      );
      expect(machineNames).toEqual(sortedNames);

      jest.useRealTimers();
    });

    it('should format worker full name correctly', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-18T10:00:00'));

      const result = await service.getMachinesWithWorkerStatus();

      const m001 = result.machines.find((m) => m.machineCode === 'M001');
      const worker = m001?.assignedWorkers.find((w) => w.empId === 100);
      expect(worker?.fullName).toBe('Ali Yilmaz');

      jest.useRealTimers();
    });

    it('should return empty machines array when no machines exist', async () => {
      resourceRepository.findAllMachines.mockResolvedValue([]);

      const result = await service.getMachinesWithWorkerStatus();

      expect(result.machines).toHaveLength(0);
    });
  });
});
