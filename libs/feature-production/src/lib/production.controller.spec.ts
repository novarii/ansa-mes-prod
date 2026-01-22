import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { ProductionController } from './production.controller';
import { ActivityService } from './activity.service';
import { ProductionEntryService } from './production-entry.service';
import { BreakReasonService } from './break-reason.service';
import {
  MESSession,
  WorkerActivityState,
  ActivityStateResponse,
  ActivityActionResponse,
  ActivityHistoryResponse,
  ProductionEntryResponse,
  ProductionEntryValidation,
} from '@org/shared-types';

describe('ProductionController', () => {
  let controller: ProductionController;
  let activityService: jest.Mocked<ActivityService>;
  let productionEntryService: jest.Mocked<ProductionEntryService>;
  let breakReasonService: jest.Mocked<BreakReasonService>;

  const mockSession: MESSession = {
    empID: 200,
    empName: 'Bulent Ozguneyli',
    stationCode: 'M001',
    stationName: 'BARMAG 1',
    isDefaultWorker: true,
    loginTime: new Date().toISOString(),
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
    processType: 'BAS',
    lastActivityTime: '2026-01-18T10:00:00.000Z',
    breakCode: null,
    canStart: false,
    canStop: true,
    canResume: false,
    canFinish: true,
  };

  const mockActivityStateResponse: ActivityStateResponse = {
    state: mockNoActivityState,
    docEntry: 12345,
    empId: 200,
  };

  const mockActivityActionResponse: ActivityActionResponse = {
    success: true,
    activityCode: 'uuid-new-123',
    processType: 'BAS',
    timestamp: '2026-01-18T10:00:00.000Z',
    state: mockWorkingState,
  };

  const mockActivityHistoryResponse: ActivityHistoryResponse = {
    docEntry: 12345,
    entries: [
      {
        code: 'uuid-1',
        processType: 'BAS',
        processTypeLabel: 'Basla',
        timestamp: '2026-01-18T10:00:00.000Z',
        empId: '200',
        empName: 'Bulent Ozguneyli',
        breakCode: null,
        breakReasonText: null,
        notes: null,
      },
    ],
  };

  const mockBreakReasons = [
    { code: '1', name: 'Mola' },
    { code: '2', name: 'Yemek' },
    { code: '73', name: 'Personel Degisimi' },
  ];

  const mockProductionEntryResponse: ProductionEntryResponse = {
    success: true,
    batchNumber: 'ANS20261218001',
    acceptedDocEntry: 1001,
    rejectedDocEntry: null,
    workOrder: {
      docEntry: 12345,
      completedQty: 600,
      rejectedQty: 50,
      remainingQty: 400,
      progressPercent: 60,
    },
  };

  const mockValidation: ProductionEntryValidation = {
    isValid: true,
    errors: [],
    newRemainingQty: 400,
    requiresConfirmation: false,
  };

  const mockActivityService = {
    getWorkerState: jest.fn(),
    startWork: jest.fn(),
    stopWork: jest.fn(),
    resumeWork: jest.fn(),
    finishWork: jest.fn(),
    getActivityHistory: jest.fn(),
  };

  const mockProductionEntryService = {
    validateEntry: jest.fn(),
    reportQuantity: jest.fn(),
    generateBatchNumber: jest.fn(),
  };

  const mockBreakReasonService = {
    getAllBreakReasons: jest.fn(),
    searchBreakReasons: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductionController],
      providers: [
        { provide: ActivityService, useValue: mockActivityService },
        { provide: ProductionEntryService, useValue: mockProductionEntryService },
        { provide: BreakReasonService, useValue: mockBreakReasonService },
      ],
    }).compile();

    controller = module.get<ProductionController>(ProductionController);
    activityService = module.get(ActivityService);
    productionEntryService = module.get(ProductionEntryService);
    breakReasonService = module.get(BreakReasonService);
  });

  describe('getActivityState', () => {
    it('should return activity state for work order', async () => {
      activityService.getWorkerState.mockResolvedValue(mockActivityStateResponse);

      const result = await controller.getActivityState(mockSession, 12345);

      expect(result.state).toEqual(mockNoActivityState);
      expect(result.docEntry).toBe(12345);
      expect(result.empId).toBe(200);
    });

    it('should use empID from session', async () => {
      activityService.getWorkerState.mockResolvedValue(mockActivityStateResponse);

      await controller.getActivityState(mockSession, 12345);

      expect(activityService.getWorkerState).toHaveBeenCalledWith(12345, 200);
    });

    it('should propagate BadRequestException from service', async () => {
      activityService.getWorkerState.mockRejectedValue(
        new BadRequestException('Invalid docEntry')
      );

      await expect(
        controller.getActivityState(mockSession, 0)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('startActivity', () => {
    it('should start activity and return response', async () => {
      activityService.startWork.mockResolvedValue(mockActivityActionResponse);

      const result = await controller.startActivity(mockSession, 12345);

      expect(result.success).toBe(true);
      expect(result.processType).toBe('BAS');
    });

    it('should use session empID and stationCode', async () => {
      activityService.startWork.mockResolvedValue(mockActivityActionResponse);

      await controller.startActivity(mockSession, 12345);

      expect(activityService.startWork).toHaveBeenCalledWith(12345, 200, 'M001');
    });

    it('should throw ConflictException when already working', async () => {
      activityService.startWork.mockRejectedValue(
        new ConflictException('Cannot start work')
      );

      await expect(
        controller.startActivity(mockSession, 12345)
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when station not selected', async () => {
      const sessionWithoutStation: MESSession = {
        ...mockSession,
        stationCode: '',
      };

      await expect(
        controller.startActivity(sessionWithoutStation, 12345)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('stopActivity', () => {
    it('should stop activity with break code', async () => {
      const stopResponse: ActivityActionResponse = {
        ...mockActivityActionResponse,
        processType: 'DUR',
      };
      activityService.stopWork.mockResolvedValue(stopResponse);

      const result = await controller.stopActivity(mockSession, 12345, {
        breakCode: '73',
      });

      expect(result.success).toBe(true);
      expect(result.processType).toBe('DUR');
    });

    it('should pass break code and notes to service', async () => {
      activityService.stopWork.mockResolvedValue(mockActivityActionResponse);

      await controller.stopActivity(mockSession, 12345, {
        breakCode: '73',
        notes: 'Taking a break',
      });

      expect(activityService.stopWork).toHaveBeenCalledWith(
        12345,
        200,
        'M001',
        '73',
        'Taking a break'
      );
    });

    it('should throw BadRequestException when breakCode is missing', async () => {
      await expect(
        controller.stopActivity(mockSession, 12345, { breakCode: '' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when not working', async () => {
      activityService.stopWork.mockRejectedValue(
        new ConflictException('Cannot stop work')
      );

      await expect(
        controller.stopActivity(mockSession, 12345, { breakCode: '73' })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('resumeActivity', () => {
    it('should resume activity', async () => {
      const resumeResponse: ActivityActionResponse = {
        ...mockActivityActionResponse,
        processType: 'DEV',
      };
      activityService.resumeWork.mockResolvedValue(resumeResponse);

      const result = await controller.resumeActivity(mockSession, 12345, {});

      expect(result.success).toBe(true);
      expect(result.processType).toBe('DEV');
    });

    it('should pass notes to service', async () => {
      activityService.resumeWork.mockResolvedValue(mockActivityActionResponse);

      await controller.resumeActivity(mockSession, 12345, {
        notes: 'Back from break',
      });

      expect(activityService.resumeWork).toHaveBeenCalledWith(
        12345,
        200,
        'M001',
        'Back from break'
      );
    });

    it('should throw ConflictException when not paused', async () => {
      activityService.resumeWork.mockRejectedValue(
        new ConflictException('Cannot resume work')
      );

      await expect(
        controller.resumeActivity(mockSession, 12345, {})
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('finishActivity', () => {
    it('should finish activity', async () => {
      const finishResponse: ActivityActionResponse = {
        ...mockActivityActionResponse,
        processType: 'BIT',
      };
      activityService.finishWork.mockResolvedValue(finishResponse);

      const result = await controller.finishActivity(mockSession, 12345, {});

      expect(result.success).toBe(true);
      expect(result.processType).toBe('BIT');
    });

    it('should pass notes to service', async () => {
      activityService.finishWork.mockResolvedValue(mockActivityActionResponse);

      await controller.finishActivity(mockSession, 12345, {
        notes: 'Work completed',
      });

      expect(activityService.finishWork).toHaveBeenCalledWith(
        12345,
        200,
        'M001',
        'Work completed'
      );
    });

    it('should throw ConflictException when not working', async () => {
      activityService.finishWork.mockRejectedValue(
        new ConflictException('Cannot finish work')
      );

      await expect(
        controller.finishActivity(mockSession, 12345, {})
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('getActivityHistory', () => {
    it('should return activity history', async () => {
      activityService.getActivityHistory.mockResolvedValue(
        mockActivityHistoryResponse
      );

      const result = await controller.getActivityHistory(12345);

      expect(result.docEntry).toBe(12345);
      expect(result.entries).toHaveLength(1);
    });

    it('should propagate BadRequestException from service', async () => {
      activityService.getActivityHistory.mockRejectedValue(
        new BadRequestException('Invalid docEntry')
      );

      await expect(controller.getActivityHistory(0)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('createProductionEntry', () => {
    it('should create production entry', async () => {
      productionEntryService.validateEntry.mockResolvedValue(mockValidation);
      productionEntryService.reportQuantity.mockResolvedValue(
        mockProductionEntryResponse
      );

      const result = await controller.createProductionEntry(mockSession, 12345, {
        acceptedQty: 100,
        rejectedQty: 0,
      });

      expect(result.success).toBe(true);
      expect(result.batchNumber).toBe('ANS20261218001');
    });

    it('should pass quantities and empID to service', async () => {
      productionEntryService.validateEntry.mockResolvedValue(mockValidation);
      productionEntryService.reportQuantity.mockResolvedValue(
        mockProductionEntryResponse
      );

      await controller.createProductionEntry(mockSession, 12345, {
        acceptedQty: 100,
        rejectedQty: 50,
      });

      expect(productionEntryService.reportQuantity).toHaveBeenCalledWith(
        12345,
        100,
        50,
        200
      );
    });

    it('should throw BadRequestException for invalid quantities', async () => {
      productionEntryService.validateEntry.mockResolvedValue({
        isValid: false,
        errors: ['Accepted quantity exceeds remaining'],
      });

      await expect(
        controller.createProductionEntry(mockSession, 12345, {
          acceptedQty: 1000,
          rejectedQty: 0,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero quantities', async () => {
      productionEntryService.validateEntry.mockResolvedValue({
        isValid: false,
        errors: ['Accepted or rejected quantity must be greater than zero'],
      });

      await expect(
        controller.createProductionEntry(mockSession, 12345, {
          acceptedQty: 0,
          rejectedQty: 0,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBreakReasons', () => {
    it('should return all break reasons', async () => {
      breakReasonService.getAllBreakReasons.mockResolvedValue(mockBreakReasons);

      const result = await controller.getBreakReasons();

      expect(result).toHaveLength(3);
      expect(result[0].code).toBe('1');
    });

    it('should return empty array when no break reasons', async () => {
      breakReasonService.getAllBreakReasons.mockResolvedValue([]);

      const result = await controller.getBreakReasons();

      expect(result).toHaveLength(0);
    });
  });
});
