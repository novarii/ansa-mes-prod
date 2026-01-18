import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ActivityService } from './activity.service';
import {
  ActivityRepository,
  BreakReasonRepository,
  WorkOrderRepository,
} from '@org/data-access';
import {
  WorkerActivityState,
  ActivityProcessType,
  Activity,
  ActivityWithDetails,
} from '@org/shared-types';

describe('ActivityService', () => {
  let service: ActivityService;
  let activityRepository: jest.Mocked<ActivityRepository>;
  let breakReasonRepository: jest.Mocked<BreakReasonRepository>;
  let workOrderRepository: jest.Mocked<WorkOrderRepository>;

  const mockActivityRepository = {
    create: jest.fn(),
    findByWorkOrderAndEmployee: jest.fn(),
    getWorkerCurrentState: jest.fn(),
    findByWorkOrder: jest.fn(),
  };

  const mockBreakReasonRepository = {
    findByCode: jest.fn(),
    findAll: jest.fn(),
    search: jest.fn(),
  };

  const mockWorkOrderRepository = {
    findByDocEntry: jest.fn(),
    findAll: jest.fn(),
    findCustomersWithActiveOrders: jest.fn(),
  };

  const mockWorkOrder = {
    DocEntry: 12345,
    DocNum: 67890,
    ItemCode: 'YM00001662',
    ProdName: 'Test Product',
    PlannedQty: 1000,
    CmpltQty: 500,
    RjctQty: 50,
    RemainingQty: 450,
    ProgressPercent: 50,
    StartDate: '2026-01-15T00:00:00.000Z',
    DueDate: '2026-01-25T00:00:00.000Z',
    RlsDate: '2026-01-10T00:00:00.000Z',
    Status: 'R',
    CardCode: 'C001',
    CustomerName: 'Test Customer',
    U_StationSortOrder: 10,
    Warehouse: '03',
    Comments: null,
    MachineCode: 'M001',
    MachineName: 'BARMAG 1',
  };

  const mockNoActivityState: WorkerActivityState = {
    activityCode: null,
    processType: null,
    lastActivityTime: null,
    breakCode: null,
    canStart: true,
    canStop: false,
    canResume: false,
    canFinish: false,
  };

  const mockWorkingState: WorkerActivityState = {
    activityCode: 'uuid-123',
    processType: 'BAS' as ActivityProcessType,
    lastActivityTime: '2026-01-18T10:00:00.000Z',
    breakCode: null,
    canStart: false,
    canStop: true,
    canResume: false,
    canFinish: true,
  };

  const mockPausedState: WorkerActivityState = {
    activityCode: 'uuid-456',
    processType: 'DUR' as ActivityProcessType,
    lastActivityTime: '2026-01-18T11:00:00.000Z',
    breakCode: '73',
    canStart: false,
    canStop: false,
    canResume: true,
    canFinish: true,
  };

  const mockFinishedState: WorkerActivityState = {
    activityCode: 'uuid-789',
    processType: 'BIT' as ActivityProcessType,
    lastActivityTime: '2026-01-18T12:00:00.000Z',
    breakCode: null,
    canStart: true,
    canStop: false,
    canResume: false,
    canFinish: false,
  };

  const mockCreatedActivity: Activity = {
    Code: 'uuid-new-123',
    Name: 'uuid-new-123',
    U_WorkOrder: '12345',
    U_ResCode: 'M001',
    U_EmpId: '100',
    U_ProcType: 'BAS',
    U_Start: new Date('2026-01-18T10:00:00.000Z'),
    U_BreakCode: null,
    U_Aciklama: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        {
          provide: ActivityRepository,
          useValue: mockActivityRepository,
        },
        {
          provide: BreakReasonRepository,
          useValue: mockBreakReasonRepository,
        },
        {
          provide: WorkOrderRepository,
          useValue: mockWorkOrderRepository,
        },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    activityRepository = module.get(ActivityRepository);
    breakReasonRepository = module.get(BreakReasonRepository);
    workOrderRepository = module.get(WorkOrderRepository);
  });

  describe('getWorkerState', () => {
    it('should return worker state for a work order', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockNoActivityState
      );

      const result = await service.getWorkerState(12345, 100);

      expect(result.state).toEqual(mockNoActivityState);
      expect(result.docEntry).toBe(12345);
      expect(result.empId).toBe(100);
    });

    it('should throw BadRequestException for invalid docEntry', async () => {
      await expect(service.getWorkerState(0, 100)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.getWorkerState(-1, 100)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for invalid empId', async () => {
      await expect(service.getWorkerState(12345, 0)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.getWorkerState(12345, -1)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when work order not found', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(null);

      await expect(service.getWorkerState(99999, 100)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('startWork', () => {
    it('should create BAS activity when no prior activity exists', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockNoActivityState
      );
      mockActivityRepository.create.mockResolvedValue(mockCreatedActivity);

      const result = await service.startWork(12345, 100, 'M001');

      expect(result.success).toBe(true);
      expect(result.processType).toBe('BAS');
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          U_WorkOrder: '12345',
          U_ResCode: 'M001',
          U_EmpId: '100',
          U_ProcType: 'BAS',
        })
      );
    });

    it('should create BAS activity after BIT (finished)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockFinishedState
      );
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'BAS',
      });

      const result = await service.startWork(12345, 100, 'M001');

      expect(result.success).toBe(true);
      expect(result.processType).toBe('BAS');
    });

    it('should throw ConflictException when already started (BAS state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockWorkingState
      );

      await expect(service.startWork(12345, 100, 'M001')).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw ConflictException when paused (DUR state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockPausedState
      );

      await expect(service.startWork(12345, 100, 'M001')).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw BadRequestException for empty resCode', async () => {
      await expect(service.startWork(12345, 100, '')).rejects.toThrow(
        BadRequestException
      );
    });

    it('should return updated state after starting', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockNoActivityState
      );
      mockActivityRepository.create.mockResolvedValue(mockCreatedActivity);

      const result = await service.startWork(12345, 100, 'M001');

      expect(result.state.canStart).toBe(false);
      expect(result.state.canStop).toBe(true);
      expect(result.state.canFinish).toBe(true);
    });
  });

  describe('stopWork', () => {
    it('should create DUR activity with break code when working', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockWorkingState
      );
      mockBreakReasonRepository.findByCode.mockResolvedValue({
        Code: '73',
        Name: 'Personel Degisimi',
      });
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'DUR',
        U_BreakCode: '73',
      });

      const result = await service.stopWork(12345, 100, 'M001', '73');

      expect(result.success).toBe(true);
      expect(result.processType).toBe('DUR');
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          U_ProcType: 'DUR',
          U_BreakCode: '73',
        })
      );
    });

    it('should create DUR activity with notes', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockWorkingState
      );
      mockBreakReasonRepository.findByCode.mockResolvedValue({
        Code: '73',
        Name: 'Personel Degisimi',
      });
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'DUR',
        U_BreakCode: '73',
        U_Aciklama: 'Test note',
      });

      const result = await service.stopWork(
        12345,
        100,
        'M001',
        '73',
        'Test note'
      );

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          U_Aciklama: 'Test note',
        })
      );
    });

    it('should throw BadRequestException when break code is empty', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockWorkingState
      );

      await expect(
        service.stopWork(12345, 100, 'M001', '')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when break code is invalid', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockWorkingState
      );
      mockBreakReasonRepository.findByCode.mockResolvedValue(null);

      await expect(
        service.stopWork(12345, 100, 'M001', 'INVALID')
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when not started (no activity)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockBreakReasonRepository.findByCode.mockResolvedValue({
        Code: '73',
        Name: 'Personel Degisimi',
      });
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockNoActivityState
      );

      await expect(
        service.stopWork(12345, 100, 'M001', '73')
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when already paused (DUR state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockBreakReasonRepository.findByCode.mockResolvedValue({
        Code: '73',
        Name: 'Personel Degisimi',
      });
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockPausedState
      );

      await expect(
        service.stopWork(12345, 100, 'M001', '73')
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when already finished (BIT state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockBreakReasonRepository.findByCode.mockResolvedValue({
        Code: '73',
        Name: 'Personel Degisimi',
      });
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockFinishedState
      );

      await expect(
        service.stopWork(12345, 100, 'M001', '73')
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resumeWork', () => {
    it('should create DEV activity when paused', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockPausedState
      );
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'DEV',
      });

      const result = await service.resumeWork(12345, 100, 'M001');

      expect(result.success).toBe(true);
      expect(result.processType).toBe('DEV');
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          U_ProcType: 'DEV',
          U_BreakCode: null,
        })
      );
    });

    it('should create DEV activity with notes', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockPausedState
      );
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'DEV',
        U_Aciklama: 'Back from break',
      });

      const result = await service.resumeWork(
        12345,
        100,
        'M001',
        'Back from break'
      );

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          U_Aciklama: 'Back from break',
        })
      );
    });

    it('should throw ConflictException when not paused (no activity)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockNoActivityState
      );

      await expect(service.resumeWork(12345, 100, 'M001')).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw ConflictException when currently working (BAS state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockWorkingState
      );

      await expect(service.resumeWork(12345, 100, 'M001')).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw ConflictException when already finished (BIT state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockFinishedState
      );

      await expect(service.resumeWork(12345, 100, 'M001')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('finishWork', () => {
    it('should create BIT activity when working (BAS state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockWorkingState
      );
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'BIT',
      });

      const result = await service.finishWork(12345, 100, 'M001');

      expect(result.success).toBe(true);
      expect(result.processType).toBe('BIT');
      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          U_ProcType: 'BIT',
        })
      );
    });

    it('should create BIT activity when paused (DUR state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockPausedState
      );
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'BIT',
      });

      const result = await service.finishWork(12345, 100, 'M001');

      expect(result.success).toBe(true);
      expect(result.processType).toBe('BIT');
    });

    it('should create BIT activity when resumed (DEV state)', async () => {
      const resumedState: WorkerActivityState = {
        ...mockWorkingState,
        processType: 'DEV' as ActivityProcessType,
      };
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        resumedState
      );
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'BIT',
      });

      const result = await service.finishWork(12345, 100, 'M001');

      expect(result.success).toBe(true);
      expect(result.processType).toBe('BIT');
    });

    it('should create BIT activity with notes', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockWorkingState
      );
      mockActivityRepository.create.mockResolvedValue({
        ...mockCreatedActivity,
        U_ProcType: 'BIT',
        U_Aciklama: 'Work completed',
      });

      await service.finishWork(12345, 100, 'M001', 'Work completed');

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          U_Aciklama: 'Work completed',
        })
      );
    });

    it('should throw ConflictException when not started (no activity)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockNoActivityState
      );

      await expect(service.finishWork(12345, 100, 'M001')).rejects.toThrow(
        ConflictException
      );
    });

    it('should throw ConflictException when already finished (BIT state)', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.getWorkerCurrentState.mockResolvedValue(
        mockFinishedState
      );

      await expect(service.finishWork(12345, 100, 'M001')).rejects.toThrow(
        ConflictException
      );
    });
  });

  describe('getActivityHistory', () => {
    const mockActivitiesWithDetails: ActivityWithDetails[] = [
      {
        Code: 'uuid-1',
        Name: 'uuid-1',
        U_WorkOrder: '12345',
        U_ResCode: 'M001',
        U_EmpId: '100',
        U_ProcType: 'BAS',
        U_Start: '2026-01-18T10:00:00.000Z',
        U_BreakCode: null,
        U_Aciklama: null,
        EmployeeName: 'John Doe',
        BreakReasonText: null,
      },
      {
        Code: 'uuid-2',
        Name: 'uuid-2',
        U_WorkOrder: '12345',
        U_ResCode: 'M001',
        U_EmpId: '100',
        U_ProcType: 'DUR',
        U_Start: '2026-01-18T11:00:00.000Z',
        U_BreakCode: '73',
        U_Aciklama: 'Taking a break',
        EmployeeName: 'John Doe',
        BreakReasonText: 'Personel Degisimi',
      },
    ];

    it('should return activity history for a work order', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.findByWorkOrder.mockResolvedValue(
        mockActivitiesWithDetails
      );

      const result = await service.getActivityHistory(12345);

      expect(result.docEntry).toBe(12345);
      expect(result.entries).toHaveLength(2);
    });

    it('should transform activity data to DTO format', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.findByWorkOrder.mockResolvedValue(
        mockActivitiesWithDetails
      );

      const result = await service.getActivityHistory(12345);

      expect(result.entries[0]).toEqual({
        code: 'uuid-1',
        processType: 'BAS',
        processTypeLabel: 'Basla',
        timestamp: '2026-01-18T10:00:00.000Z',
        empId: '100',
        empName: 'John Doe',
        breakCode: null,
        breakReasonText: null,
        notes: null,
      });
    });

    it('should include break reason text for DUR entries', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.findByWorkOrder.mockResolvedValue(
        mockActivitiesWithDetails
      );

      const result = await service.getActivityHistory(12345);

      expect(result.entries[1].breakCode).toBe('73');
      expect(result.entries[1].breakReasonText).toBe('Personel Degisimi');
    });

    it('should throw BadRequestException for invalid docEntry', async () => {
      await expect(service.getActivityHistory(0)).rejects.toThrow(
        BadRequestException
      );
      await expect(service.getActivityHistory(-1)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException when work order not found', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(null);

      await expect(service.getActivityHistory(99999)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should return empty entries when no activities exist', async () => {
      mockWorkOrderRepository.findByDocEntry.mockResolvedValue(mockWorkOrder);
      mockActivityRepository.findByWorkOrder.mockResolvedValue([]);

      const result = await service.getActivityHistory(12345);

      expect(result.entries).toHaveLength(0);
    });
  });
});
