import { describe, it, expect } from 'vitest';
import {
  WorkOrderStatusMap,
  type WorkOrder,
  type WorkOrderWithDetails,
} from './work-order.entity.js';
import {
  ActivityProcessTypeMap,
  type Activity,
  type WorkerActivityState,
} from './activity.entity.js';
import {
  type Resource,
  type Machine,
  type MachineWithAuthStatus,
  type WorkerStatus,
} from './resource.entity.js';
import {
  type Employee,
  type EmployeeWithAuth,
  type MESSession,
} from './employee.entity.js';
import {
  CommonBreakCodes,
  type BreakReason,
} from './break-reason.entity.js';

describe('Work Order Entity', () => {
  describe('WorkOrderStatusMap', () => {
    it('should map P to planned', () => {
      expect(WorkOrderStatusMap.P).toBe('planned');
    });

    it('should map R to released', () => {
      expect(WorkOrderStatusMap.R).toBe('released');
    });

    it('should map L to closed', () => {
      expect(WorkOrderStatusMap.L).toBe('closed');
    });

    it('should map C to cancelled', () => {
      expect(WorkOrderStatusMap.C).toBe('cancelled');
    });
  });

  describe('WorkOrder interface', () => {
    it('should allow creating a valid work order object', () => {
      const workOrder: WorkOrder = {
        DocEntry: 12345,
        DocNum: 67890,
        ItemCode: 'WIDGET-A',
        ProdName: 'Widget Type A',
        PlannedQty: 100,
        CmpltQty: 50,
        RjctQty: 5,
        StartDate: '2026-01-15',
        DueDate: '2026-01-20',
        RlsDate: '2026-01-14',
        Status: 'R',
        CardCode: 'C001',
        U_StationSortOrder: 1,
        Warehouse: '03',
        Comments: 'Test work order',
      };

      expect(workOrder.DocEntry).toBe(12345);
      expect(workOrder.Status).toBe('R');
      expect(workOrder.PlannedQty).toBe(100);
    });

    it('should allow nullable fields to be null', () => {
      const workOrder: WorkOrder = {
        DocEntry: 1,
        DocNum: 1,
        ItemCode: 'TEST',
        ProdName: 'Test',
        PlannedQty: 10,
        CmpltQty: 0,
        RjctQty: 0,
        StartDate: new Date(),
        DueDate: new Date(),
        RlsDate: null,
        Status: 'P',
        CardCode: null,
        U_StationSortOrder: null,
        Warehouse: '01',
        Comments: null,
      };

      expect(workOrder.RlsDate).toBeNull();
      expect(workOrder.CardCode).toBeNull();
      expect(workOrder.U_StationSortOrder).toBeNull();
    });
  });

  describe('WorkOrderWithDetails interface', () => {
    it('should include calculated fields', () => {
      const workOrderWithDetails: WorkOrderWithDetails = {
        DocEntry: 1,
        DocNum: 1,
        ItemCode: 'TEST',
        ProdName: 'Test',
        PlannedQty: 100,
        CmpltQty: 75,
        RjctQty: 5,
        StartDate: new Date(),
        DueDate: new Date(),
        RlsDate: null,
        Status: 'R',
        CardCode: 'C001',
        U_StationSortOrder: 1,
        Warehouse: '03',
        Comments: null,
        RemainingQty: 25,
        ProgressPercent: 75,
        CustomerName: 'Test Customer',
        MachineCode: '1001',
        MachineName: 'BARMAG 1',
      };

      expect(workOrderWithDetails.RemainingQty).toBe(25);
      expect(workOrderWithDetails.ProgressPercent).toBe(75);
      expect(workOrderWithDetails.CustomerName).toBe('Test Customer');
    });
  });
});

describe('Activity Entity', () => {
  describe('ActivityProcessTypeMap', () => {
    it('should have correct Turkish translations', () => {
      expect(ActivityProcessTypeMap.BAS.tr).toBe('Basla');
      expect(ActivityProcessTypeMap.DUR.tr).toBe('Dur');
      expect(ActivityProcessTypeMap.DEV.tr).toBe('Devam');
      expect(ActivityProcessTypeMap.BIT.tr).toBe('Bitir');
    });

    it('should have correct English translations', () => {
      expect(ActivityProcessTypeMap.BAS.en).toBe('Start');
      expect(ActivityProcessTypeMap.DUR.en).toBe('Stop');
      expect(ActivityProcessTypeMap.DEV.en).toBe('Resume');
      expect(ActivityProcessTypeMap.BIT.en).toBe('Finish');
    });
  });

  describe('Activity interface', () => {
    it('should allow creating a valid activity object', () => {
      const activity: Activity = {
        Code: 'uuid-123',
        Name: 'uuid-123',
        U_WorkOrder: '12345',
        U_ResCode: '1001',
        U_EmpId: '200',
        U_ProcType: 'BAS',
        U_Start: new Date(),
        U_BreakCode: null,
        U_Aciklama: 'Started work',
      };

      expect(activity.U_ProcType).toBe('BAS');
      expect(activity.Code).toBe(activity.Name);
    });

    it('should require break code for DUR type conceptually', () => {
      const durActivity: Activity = {
        Code: 'uuid-456',
        Name: 'uuid-456',
        U_WorkOrder: '12345',
        U_ResCode: '1001',
        U_EmpId: '200',
        U_ProcType: 'DUR',
        U_Start: new Date(),
        U_BreakCode: '1', // Required for DUR
        U_Aciklama: 'Taking a break',
      };

      expect(durActivity.U_ProcType).toBe('DUR');
      expect(durActivity.U_BreakCode).toBe('1');
    });
  });

  describe('WorkerActivityState interface', () => {
    it('should represent a worker who can start', () => {
      const state: WorkerActivityState = {
        activityCode: null,
        processType: null,
        lastActivityTime: null,
        breakCode: null,
        canStart: true,
        canStop: false,
        canResume: false,
        canFinish: false,
      };

      expect(state.canStart).toBe(true);
      expect(state.canStop).toBe(false);
    });

    it('should represent a worker who is currently working', () => {
      const state: WorkerActivityState = {
        activityCode: 'uuid-123',
        processType: 'BAS',
        lastActivityTime: new Date().toISOString(),
        breakCode: null,
        canStart: false,
        canStop: true,
        canResume: false,
        canFinish: true,
      };

      expect(state.canStart).toBe(false);
      expect(state.canStop).toBe(true);
      expect(state.canFinish).toBe(true);
    });

    it('should represent a worker who is paused', () => {
      const state: WorkerActivityState = {
        activityCode: 'uuid-456',
        processType: 'DUR',
        lastActivityTime: new Date().toISOString(),
        breakCode: '1',
        canStart: false,
        canStop: false,
        canResume: true,
        canFinish: true,
      };

      expect(state.canResume).toBe(true);
      expect(state.canFinish).toBe(true);
      expect(state.breakCode).toBe('1');
    });
  });
});

describe('Resource Entity', () => {
  describe('Resource interface', () => {
    it('should allow creating a machine resource', () => {
      const machine: Machine = {
        ResCode: '1001 - BARMAG 1',
        ResName: 'BARMAG 1',
        ResType: 'M',
        U_defaultEmp: '200',
        U_secondEmp: '200,310,172',
      };

      expect(machine.ResType).toBe('M');
      expect(machine.U_secondEmp).toContain('200');
    });

    it('should allow nullable authorization fields', () => {
      const machine: Resource = {
        ResCode: '1002',
        ResName: 'Machine 2',
        ResType: 'M',
        U_defaultEmp: null,
        U_secondEmp: null,
      };

      expect(machine.U_defaultEmp).toBeNull();
      expect(machine.U_secondEmp).toBeNull();
    });
  });

  describe('MachineWithAuthStatus interface', () => {
    it('should indicate authorization status', () => {
      const machineAuth: MachineWithAuthStatus = {
        ResCode: '1001',
        ResName: 'BARMAG 1',
        ResType: 'M',
        U_defaultEmp: '200',
        U_secondEmp: '200,310',
        IsDefault: true,
        IsAuthorized: true,
      };

      expect(machineAuth.IsDefault).toBe(true);
      expect(machineAuth.IsAuthorized).toBe(true);
    });
  });

  describe('WorkerStatus interface', () => {
    it('should represent worker status correctly', () => {
      const workerStatus: WorkerStatus = {
        empId: 200,
        fullName: 'John Doe',
        status: 'assigned',
        currentWorkOrder: 12345,
      };

      expect(workerStatus.status).toBe('assigned');
      expect(workerStatus.currentWorkOrder).toBe(12345);
    });

    it('should allow available status with no work order', () => {
      const workerStatus: WorkerStatus = {
        empId: 201,
        fullName: 'Jane Doe',
        status: 'available',
        currentWorkOrder: null,
      };

      expect(workerStatus.status).toBe('available');
      expect(workerStatus.currentWorkOrder).toBeNull();
    });
  });
});

describe('Employee Entity', () => {
  describe('Employee interface', () => {
    it('should allow creating a valid employee object', () => {
      const employee: Employee = {
        empID: 200,
        firstName: 'Bulent',
        lastName: 'Ozguneyli',
        U_mainStation: '1001 - BARMAG 1',
      };

      expect(employee.empID).toBe(200);
      expect(employee.firstName).toBe('Bulent');
    });

    it('should allow main station to be null', () => {
      const employee: Employee = {
        empID: 201,
        firstName: 'Test',
        lastName: 'User',
        U_mainStation: null,
      };

      expect(employee.U_mainStation).toBeNull();
    });
  });

  describe('EmployeeWithAuth interface', () => {
    it('should include password field', () => {
      const employeeAuth: EmployeeWithAuth = {
        empID: 200,
        firstName: 'Test',
        lastName: 'User',
        U_mainStation: null,
        U_password: 'hashed_password',
      };

      expect(employeeAuth.U_password).toBe('hashed_password');
    });
  });

  describe('MESSession interface', () => {
    it('should represent a complete session', () => {
      const session: MESSession = {
        empID: 200,
        empName: 'Bulent Ozguneyli',
        stationCode: '1001',
        stationName: 'BARMAG 1',
        isDefaultWorker: true,
        loginTime: new Date().toISOString(),
      };

      expect(session.empID).toBe(200);
      expect(session.isDefaultWorker).toBe(true);
    });

    it('should allow optional shift ID', () => {
      const session: MESSession = {
        empID: 200,
        empName: 'Test User',
        stationCode: '1001',
        stationName: 'Machine 1',
        isDefaultWorker: false,
        loginTime: new Date(),
        shiftId: 'A',
      };

      expect(session.shiftId).toBe('A');
    });
  });
});

describe('Break Reason Entity', () => {
  describe('BreakReason interface', () => {
    it('should allow creating a valid break reason', () => {
      const breakReason: BreakReason = {
        Code: '1',
        Name: 'Mola',
      };

      expect(breakReason.Code).toBe('1');
      expect(breakReason.Name).toBe('Mola');
    });
  });

  describe('CommonBreakCodes', () => {
    it('should have correct break code values', () => {
      expect(CommonBreakCodes.BREAK).toBe('1');
      expect(CommonBreakCodes.MEAL).toBe('2');
      expect(CommonBreakCodes.PRODUCT_CHANGE).toBe('4');
      expect(CommonBreakCodes.WAITING_MATERIAL).toBe('10');
      expect(CommonBreakCodes.BREAKDOWN).toBe('20');
      expect(CommonBreakCodes.QUALITY_CHECK).toBe('30');
      expect(CommonBreakCodes.PERSONNEL_CHANGE).toBe('73');
    });

    it('should be a const object (readonly)', () => {
      // TypeScript would prevent mutation at compile time
      // This test verifies the values are consistent
      const codes = { ...CommonBreakCodes };
      expect(Object.keys(codes).length).toBe(7);
    });
  });
});
