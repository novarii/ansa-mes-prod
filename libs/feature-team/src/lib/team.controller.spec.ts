import { Test, TestingModule } from '@nestjs/testing';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import type {
  TeamViewResponse,
  ShiftListResponse,
  TeamMachineCard,
} from '@org/shared-types';

describe('TeamController', () => {
  let controller: TeamController;
  let teamService: jest.Mocked<TeamService>;

  const mockMachineCards: TeamMachineCard[] = [
    {
      machineCode: 'M001',
      machineName: 'BARMAG 1',
      assignedWorkers: [
        {
          empId: 100,
          fullName: 'Ali Yilmaz',
          status: 'assigned',
          currentWorkOrder: { docEntry: 12345, docNum: 12345, itemCode: 'YM001' },
        },
      ],
      pausedWorkers: [
        {
          empId: 101,
          fullName: 'Mehmet Kaya',
          status: 'paused',
          currentWorkOrder: { docEntry: 12346, docNum: 12346, itemCode: 'YM002' },
        },
      ],
      availableWorkers: [
        { empId: 102, fullName: 'Ahmet Demir', status: 'available' },
      ],
    },
  ];

  const mockTeamViewResponse: TeamViewResponse = {
    currentShift: 'A',
    shiftFilter: 'all',
    machines: mockMachineCards,
  };

  const mockShiftListResponse: ShiftListResponse = {
    shifts: [
      { code: 'A', name: 'A Vardiyasi', startTime: '08:00', endTime: '16:00' },
      { code: 'B', name: 'B Vardiyasi', startTime: '16:00', endTime: '00:00' },
      { code: 'C', name: 'C Vardiyasi', startTime: '00:00', endTime: '08:00' },
    ],
    currentShift: 'A',
  };

  const mockTeamService = {
    getMachinesWithWorkerStatus: jest.fn(),
    getShifts: jest.fn(),
    getCurrentShift: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamController],
      providers: [
        {
          provide: TeamService,
          useValue: mockTeamService,
        },
      ],
    }).compile();

    controller = module.get<TeamController>(TeamController);
    teamService = module.get(TeamService);
  });

  describe('getTeamView', () => {
    it('should return team view with all machines', async () => {
      teamService.getMachinesWithWorkerStatus.mockResolvedValue(
        mockTeamViewResponse
      );

      const result = await controller.getTeamView({});

      expect(result).toEqual(mockTeamViewResponse);
      expect(teamService.getMachinesWithWorkerStatus).toHaveBeenCalledWith({});
    });

    it('should pass shift filter to service', async () => {
      teamService.getMachinesWithWorkerStatus.mockResolvedValue({
        ...mockTeamViewResponse,
        shiftFilter: 'A',
      });

      await controller.getTeamView({ shift: 'A' });

      expect(teamService.getMachinesWithWorkerStatus).toHaveBeenCalledWith({
        shift: 'A',
      });
    });

    it('should handle all shift filter', async () => {
      teamService.getMachinesWithWorkerStatus.mockResolvedValue(
        mockTeamViewResponse
      );

      await controller.getTeamView({ shift: 'all' });

      expect(teamService.getMachinesWithWorkerStatus).toHaveBeenCalledWith({
        shift: 'all',
      });
    });

    it('should return empty machines when none exist', async () => {
      teamService.getMachinesWithWorkerStatus.mockResolvedValue({
        currentShift: 'A',
        shiftFilter: 'all',
        machines: [],
      });

      const result = await controller.getTeamView({});

      expect(result.machines).toHaveLength(0);
    });
  });

  describe('getShifts', () => {
    it('should return all shift definitions', () => {
      teamService.getShifts.mockReturnValue(mockShiftListResponse);

      const result = controller.getShifts();

      expect(result.shifts).toHaveLength(3);
      expect(result.currentShift).toBe('A');
    });

    it('should return shifts with correct Turkish names', () => {
      teamService.getShifts.mockReturnValue(mockShiftListResponse);

      const result = controller.getShifts();

      expect(result.shifts[0].name).toBe('A Vardiyasi');
      expect(result.shifts[1].name).toBe('B Vardiyasi');
      expect(result.shifts[2].name).toBe('C Vardiyasi');
    });

    it('should return shifts with correct time ranges', () => {
      teamService.getShifts.mockReturnValue(mockShiftListResponse);

      const result = controller.getShifts();

      expect(result.shifts[0]).toEqual({
        code: 'A',
        name: 'A Vardiyasi',
        startTime: '08:00',
        endTime: '16:00',
      });
      expect(result.shifts[1]).toEqual({
        code: 'B',
        name: 'B Vardiyasi',
        startTime: '16:00',
        endTime: '00:00',
      });
      expect(result.shifts[2]).toEqual({
        code: 'C',
        name: 'C Vardiyasi',
        startTime: '00:00',
        endTime: '08:00',
      });
    });
  });
});
