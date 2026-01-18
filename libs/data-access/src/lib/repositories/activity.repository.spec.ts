import { Test, TestingModule } from '@nestjs/testing';
import { ActivityRepository } from './activity.repository';
import { HanaService } from '../hana.service';
import { Activity, ActivityWithDetails, WorkerActivityState } from '@org/shared-types';

describe('ActivityRepository', () => {
  let repository: ActivityRepository;
  let hanaService: jest.Mocked<HanaService>;

  const mockHanaService = {
    query: jest.fn(),
    queryOne: jest.fn(),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityRepository,
        {
          provide: HanaService,
          useValue: mockHanaService,
        },
      ],
    }).compile();

    repository = module.get<ActivityRepository>(ActivityRepository);
    hanaService = module.get(HanaService);
  });

  describe('create', () => {
    const createActivityData = {
      U_WorkOrder: '1001',
      U_ResCode: '1001 - BARMAG 1',
      U_EmpId: '200',
      U_ProcType: 'BAS' as const,
      U_Start: new Date('2026-01-18T08:00:00Z'),
      U_BreakCode: null,
      U_Aciklama: null,
    };

    it('should insert activity record and return the created activity', async () => {
      hanaService.execute.mockResolvedValue({ affectedRows: 1 });

      const result = await repository.create(createActivityData);

      expect(hanaService.execute).toHaveBeenCalledTimes(1);

      const sql = hanaService.execute.mock.calls[0][0] as string;
      expect(sql).toContain('INSERT INTO "@ATELIERATTN"');
      expect(sql).toContain('"Code"');
      expect(sql).toContain('"Name"');
      expect(sql).toContain('"U_WorkOrder"');
      expect(sql).toContain('"U_ProcType"');

      // Should return an activity with generated Code and Name
      expect(result.Code).toBeDefined();
      expect(result.Name).toBe(result.Code); // SAP UDT requirement
      expect(result.U_WorkOrder).toBe('1001');
      expect(result.U_ProcType).toBe('BAS');
    });

    it('should generate UUID for Code field', async () => {
      hanaService.execute.mockResolvedValue({ affectedRows: 1 });

      const result = await repository.create(createActivityData);

      // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
      expect(result.Code).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should include break code when provided for DUR action', async () => {
      hanaService.execute.mockResolvedValue({ affectedRows: 1 });

      const durActivity = {
        ...createActivityData,
        U_ProcType: 'DUR' as const,
        U_BreakCode: '73',
        U_Aciklama: 'Personel degisimi',
      };

      await repository.create(durActivity);

      const params = hanaService.execute.mock.calls[0][1] as unknown[];
      expect(params).toContain('73');
      expect(params).toContain('Personel degisimi');
    });
  });

  describe('findByWorkOrderAndEmployee', () => {
    const mockActivities: Activity[] = [
      {
        Code: 'uuid-1',
        Name: 'uuid-1',
        U_WorkOrder: '1001',
        U_ResCode: '1001 - BARMAG 1',
        U_EmpId: '200',
        U_ProcType: 'BAS',
        U_Start: '2026-01-18T08:00:00Z',
        U_BreakCode: null,
        U_Aciklama: null,
      },
      {
        Code: 'uuid-2',
        Name: 'uuid-2',
        U_WorkOrder: '1001',
        U_ResCode: '1001 - BARMAG 1',
        U_EmpId: '200',
        U_ProcType: 'DUR',
        U_Start: '2026-01-18T10:00:00Z',
        U_BreakCode: '1',
        U_Aciklama: 'Mola',
      },
    ];

    it('should return activities for work order and employee', async () => {
      hanaService.query.mockResolvedValue(mockActivities);

      const result = await repository.findByWorkOrderAndEmployee(1001, 200);

      expect(result).toEqual(mockActivities);
      expect(hanaService.query).toHaveBeenCalledTimes(1);

      const params = hanaService.query.mock.calls[0][1] as unknown[];
      expect(params).toContain('1001');
      expect(params).toContain('200');
    });

    it('should order by start time descending', async () => {
      hanaService.query.mockResolvedValue(mockActivities);

      await repository.findByWorkOrderAndEmployee(1001, 200);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('ORDER BY');
      expect(sql).toContain('"U_Start"');
      expect(sql).toContain('DESC');
    });
  });

  describe('getWorkerCurrentState', () => {
    it('should return state with canStart when no activities exist', async () => {
      hanaService.queryOne.mockResolvedValue(null);

      const result = await repository.getWorkerCurrentState(1001, 200);

      expect(result).toEqual<WorkerActivityState>({
        activityCode: null,
        processType: null,
        lastActivityTime: null,
        breakCode: null,
        canStart: true,
        canStop: false,
        canResume: false,
        canFinish: false,
      });
    });

    it('should return state with canStart after BIT', async () => {
      hanaService.queryOne.mockResolvedValue({
        Code: 'uuid-1',
        U_ProcType: 'BIT',
        U_Start: '2026-01-18T12:00:00Z',
        U_BreakCode: null,
      });

      const result = await repository.getWorkerCurrentState(1001, 200);

      expect(result.canStart).toBe(true);
      expect(result.canStop).toBe(false);
      expect(result.canResume).toBe(false);
      expect(result.canFinish).toBe(false);
    });

    it('should return state with canStop and canFinish after BAS', async () => {
      hanaService.queryOne.mockResolvedValue({
        Code: 'uuid-1',
        U_ProcType: 'BAS',
        U_Start: '2026-01-18T08:00:00Z',
        U_BreakCode: null,
      });

      const result = await repository.getWorkerCurrentState(1001, 200);

      expect(result.canStart).toBe(false);
      expect(result.canStop).toBe(true);
      expect(result.canResume).toBe(false);
      expect(result.canFinish).toBe(true);
    });

    it('should return state with canResume and canFinish after DUR', async () => {
      hanaService.queryOne.mockResolvedValue({
        Code: 'uuid-1',
        U_ProcType: 'DUR',
        U_Start: '2026-01-18T10:00:00Z',
        U_BreakCode: '1',
      });

      const result = await repository.getWorkerCurrentState(1001, 200);

      expect(result.canStart).toBe(false);
      expect(result.canStop).toBe(false);
      expect(result.canResume).toBe(true);
      expect(result.canFinish).toBe(true);
      expect(result.breakCode).toBe('1');
    });

    it('should return state with canStop and canFinish after DEV', async () => {
      hanaService.queryOne.mockResolvedValue({
        Code: 'uuid-1',
        U_ProcType: 'DEV',
        U_Start: '2026-01-18T10:30:00Z',
        U_BreakCode: null,
      });

      const result = await repository.getWorkerCurrentState(1001, 200);

      expect(result.canStart).toBe(false);
      expect(result.canStop).toBe(true);
      expect(result.canResume).toBe(false);
      expect(result.canFinish).toBe(true);
    });
  });

  describe('findByWorkOrder', () => {
    const mockActivitiesWithDetails: ActivityWithDetails[] = [
      {
        Code: 'uuid-1',
        Name: 'uuid-1',
        U_WorkOrder: '1001',
        U_ResCode: '1001 - BARMAG 1',
        U_EmpId: '200',
        U_ProcType: 'BAS',
        U_Start: '2026-01-18T08:00:00Z',
        U_BreakCode: null,
        U_Aciklama: null,
        EmployeeName: 'Bulent Ozguneyli',
        BreakReasonText: null,
      },
    ];

    it('should return all activities for a work order with employee names', async () => {
      hanaService.query.mockResolvedValue(mockActivitiesWithDetails);

      const result = await repository.findByWorkOrder(1001);

      expect(result).toEqual(mockActivitiesWithDetails);

      const sql = hanaService.query.mock.calls[0][0] as string;
      expect(sql).toContain('"OHEM"');
      expect(sql).toContain('"firstName"');
      expect(sql).toContain('"lastName"');
    });
  });
});
