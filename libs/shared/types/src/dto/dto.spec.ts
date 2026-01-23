import { describe, it, expect } from 'vitest';
import type {
  WorkOrderListFilters,
  WorkOrderListItem,
  WorkOrderListResponse,
  PickListItem,
} from './work-order.dto.js';
import type {
  ProductionEntryRequest,
  ProductionEntryResponse,
  ProductionEntryValidation,
} from './production-entry.dto.js';
import type {
  StartActivityRequest,
  StopActivityRequest,
  ActivityActionResponse,
} from './activity.dto.js';
import type {
  LoginRequest,
  LoginResponse,
  StationOption,
  SessionInfoResponse,
} from './auth.dto.js';
import { DefaultShifts, type TeamViewFilters, type TeamMachineCard } from './team.dto.js';
import {
  CalendarStatusColors,
  CalendarLabels,
  type CalendarViewFilters,
  type CalendarEvent,
} from './calendar.dto.js';

describe('Work Order DTOs', () => {
  describe('WorkOrderListFilters', () => {
    it('should allow minimal required filter', () => {
      const filters: WorkOrderListFilters = {
        stationCode: '1001',
      };
      expect(filters.stationCode).toBe('1001');
      expect(filters.customerCode).toBeUndefined();
    });

    it('should allow all optional filters', () => {
      const filters: WorkOrderListFilters = {
        stationCode: '1001',
        customerCode: 'C001',
        search: 'widget',
        page: 1,
        limit: 20,
      };
      expect(filters.customerCode).toBe('C001');
      expect(filters.search).toBe('widget');
    });
  });

  describe('WorkOrderListItem', () => {
    it('should represent a list item correctly', () => {
      const item: WorkOrderListItem = {
        docEntry: 12345,
        docNum: 67890,
        itemCode: 'WIDGET-A',
        prodName: 'Widget Type A',
        plannedQty: 100,
        completedQty: 50,
        rejectedQty: 5,
        remainingQty: 50,
        progressPercent: 50,
        dueDate: '2026-01-20',
        customerName: 'Test Customer',
        machineCode: '1001',
        machineName: 'BARMAG 1',
      };

      expect(item.progressPercent).toBe(50);
      expect(item.remainingQty).toBe(50);
    });
  });

  describe('WorkOrderListResponse', () => {
    it('should support pagination', () => {
      const response: WorkOrderListResponse = {
        items: [],
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
      };

      expect(response.totalPages).toBe(5);
      expect(response.total).toBe(100);
    });
  });

  describe('PickListItem', () => {
    it('should represent BOM component correctly', () => {
      const item: PickListItem = {
        itemCode: 'MAT-001',
        itemName: 'Steel Sheet',
        plannedQty: 100,
        issuedQty: 80,
        remainingQty: 20,
        warehouse: '01',
        uom: 'kg',
      };

      expect(item.remainingQty).toBe(20);
      expect(item.uom).toBe('kg');
    });
  });
});

describe('Production Entry DTOs', () => {
  describe('ProductionEntryRequest', () => {
    it('should have accepted and rejected quantities', () => {
      const request: ProductionEntryRequest = {
        acceptedQty: 50,
        rejectedQty: 5,
      };

      expect(request.acceptedQty).toBe(50);
      expect(request.rejectedQty).toBe(5);
    });
  });

  describe('ProductionEntryResponse', () => {
    it('should include batch number and doc entries', () => {
      const response: ProductionEntryResponse = {
        success: true,
        batchNumber: 'ANS20261218042',
        acceptedDocEntry: 1001,
        rejectedDocEntry: 1002,
        workOrder: {
          docEntry: 12345,
          completedQty: 50,
          rejectedQty: 5,
          remainingQty: 50,
          progressPercent: 50,
        },
      };

      expect(response.batchNumber).toBe('ANS20261218042');
      expect(response.workOrder.remainingQty).toBe(50);
    });
  });

  describe('ProductionEntryValidation', () => {
    it('should indicate valid entry', () => {
      const validation: ProductionEntryValidation = {
        isValid: true,
        errors: [],
        newRemainingQty: 25,
      };

      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should include errors for invalid entry', () => {
      const validation: ProductionEntryValidation = {
        isValid: false,
        errors: ['Quantity exceeds remaining'],
      };

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBe(1);
    });

    it('should request confirmation when needed', () => {
      const validation: ProductionEntryValidation = {
        isValid: true,
        errors: [],
        newRemainingQty: 10,
        requiresConfirmation: true,
        confirmationMessage: 'You are entering more than 50% of remaining quantity',
      };

      expect(validation.requiresConfirmation).toBe(true);
    });
  });
});

describe('Activity DTOs', () => {
  describe('StartActivityRequest', () => {
    it('should only require docEntry', () => {
      const request: StartActivityRequest = {
        docEntry: 12345,
      };

      expect(request.docEntry).toBe(12345);
    });
  });

  describe('StopActivityRequest', () => {
    it('should require break code', () => {
      const request: StopActivityRequest = {
        breakCode: '1',
        notes: 'Taking a break',
      };

      expect(request.breakCode).toBe('1');
    });
  });

  describe('ActivityActionResponse', () => {
    it('should include state information', () => {
      const response: ActivityActionResponse = {
        success: true,
        activityCode: 'uuid-123',
        processType: 'BAS',
        timestamp: '2026-01-18T10:00:00.000Z',
        state: {
          activityCode: 'uuid-123',
          processType: 'BAS',
          lastActivityTime: '2026-01-18T10:00:00.000Z',
          breakCode: null,
          canStart: false,
          canStop: true,
          canResume: false,
          canFinish: true,
        },
      };

      expect(response.state.canStop).toBe(true);
      expect(response.state.canStart).toBe(false);
    });
  });
});

describe('Auth DTOs', () => {
  describe('LoginRequest', () => {
    it('should have empId and pin', () => {
      const request: LoginRequest = {
        empId: 200,
        pin: '1234',
      };

      expect(request.empId).toBe(200);
      expect(request.pin).toBe('1234');
    });
  });

  describe('LoginResponse', () => {
    it('should include station count', () => {
      const response: LoginResponse = {
        success: true,
        empId: 200,
        empName: 'Bulent Ozguneyli',
        stationCount: 5,
      };

      expect(response.stationCount).toBe(5);
    });

    it('should optionally include token', () => {
      const response: LoginResponse = {
        success: true,
        empId: 200,
        empName: 'Test User',
        stationCount: 2,
        token: 'jwt-token-here',
      };

      expect(response.token).toBe('jwt-token-here');
    });
  });

  describe('StationOption', () => {
    it('should indicate default station', () => {
      const option: StationOption = {
        code: '1001',
        name: 'BARMAG 1',
        isDefault: true,
      };

      expect(option.isDefault).toBe(true);
    });
  });

  describe('SessionInfoResponse', () => {
    it('should indicate unauthenticated state', () => {
      const response: SessionInfoResponse = {
        isAuthenticated: false,
        isStationSelected: false,
        session: null,
      };

      expect(response.isAuthenticated).toBe(false);
      expect(response.session).toBeNull();
    });

    it('should indicate authenticated with station', () => {
      const response: SessionInfoResponse = {
        isAuthenticated: true,
        isStationSelected: true,
        session: {
          empID: 200,
          empName: 'Test User',
          stationCode: '1001',
          stationName: 'BARMAG 1',
          isDefaultWorker: true,
          loginTime: new Date().toISOString(),
        },
      };

      expect(response.isAuthenticated).toBe(true);
      expect(response.session?.stationCode).toBe('1001');
    });
  });
});

describe('Team DTOs', () => {
  describe('DefaultShifts', () => {
    it('should have correct shift A definition', () => {
      expect(DefaultShifts.A.startTime).toBe('08:00');
      expect(DefaultShifts.A.endTime).toBe('16:00');
    });

    it('should have correct shift B definition', () => {
      expect(DefaultShifts.B.startTime).toBe('16:00');
      expect(DefaultShifts.B.endTime).toBe('00:00');
    });

    it('should have correct shift C definition', () => {
      expect(DefaultShifts.C.startTime).toBe('00:00');
      expect(DefaultShifts.C.endTime).toBe('08:00');
    });
  });

  describe('TeamViewFilters', () => {
    it('should allow shift filter', () => {
      const filters: TeamViewFilters = {
        shift: 'A',
      };
      expect(filters.shift).toBe('A');
    });

    it('should allow all filter', () => {
      const filters: TeamViewFilters = {
        shift: 'all',
      };
      expect(filters.shift).toBe('all');
    });
  });

  describe('TeamMachineCard', () => {
    it('should have worker categories', () => {
      const card: TeamMachineCard = {
        machineCode: '1001',
        machineName: 'BARMAG 1',
        assignedWorkers: [
          { empId: 200, fullName: 'John Doe', status: 'assigned', currentWorkOrder: { docEntry: 1, docNum: 100, itemCode: 'ITEM-1' } },
        ],
        pausedWorkers: [],
        availableWorkers: [
          { empId: 201, fullName: 'Jane Doe', status: 'available' },
        ],
      };

      expect(card.assignedWorkers.length).toBe(1);
      expect(card.availableWorkers.length).toBe(1);
    });
  });
});

describe('Calendar DTOs', () => {
  describe('CalendarStatusColors', () => {
    it('should map R to blue', () => {
      expect(CalendarStatusColors.R).toBe('blue');
    });

    it('should map P to yellow', () => {
      expect(CalendarStatusColors.P).toBe('yellow');
    });

    it('should map L to green', () => {
      expect(CalendarStatusColors.L).toBe('green');
    });

    it('should map C to gray', () => {
      expect(CalendarStatusColors.C).toBe('gray');
    });
  });

  describe('CalendarLabels', () => {
    it('should have Turkish day names', () => {
      expect(CalendarLabels.days.short).toContain('Pts');
      expect(CalendarLabels.days.short).toContain('Paz');
    });

    it('should have Turkish month names', () => {
      expect(CalendarLabels.months[0]).toBe('Ocak');
      expect(CalendarLabels.months[11]).toBe('Aralik');
    });

    it('should have view mode labels', () => {
      expect(CalendarLabels.viewModes.month).toBe('Ay');
      expect(CalendarLabels.viewModes.week).toBe('Hafta');
      expect(CalendarLabels.viewModes.day).toBe('Gun');
    });
  });

  describe('CalendarViewFilters', () => {
    it('should require date range', () => {
      const filters: CalendarViewFilters = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };

      expect(filters.startDate).toBe('2026-01-01');
      expect(filters.endDate).toBe('2026-01-31');
    });

    it('should allow optional filters', () => {
      const filters: CalendarViewFilters = {
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        stationCode: '1001',
        status: 'R',
      };

      expect(filters.stationCode).toBe('1001');
      expect(filters.status).toBe('R');
    });
  });

  describe('CalendarEvent', () => {
    it('should have event properties', () => {
      const event: CalendarEvent = {
        id: 12345,
        title: 'WO-67890',
        start: '2026-01-15',
        end: '2026-01-20',
        itemCode: 'WIDGET-A',
        itemName: 'Widget Type A',
        customerName: 'Test Customer',
        status: 'R',
        machineCode: '1001',
        machineName: 'BARMAG 1',
        color: 'blue',
      };

      expect(event.color).toBe('blue');
      expect(event.status).toBe('R');
    });
  });
});
