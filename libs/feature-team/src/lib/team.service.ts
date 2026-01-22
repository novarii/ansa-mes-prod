import { Injectable, Logger } from '@nestjs/common';
import { ResourceRepository, ActivityRepository } from '@org/data-access';
import type {
  ShiftCode,
  ShiftDefinition,
  ShiftListResponse,
  TeamViewFilters,
  TeamViewResponse,
  TeamMachineCard,
  TeamWorker,
} from '@org/shared-types';

/**
 * Activity record from today for worker status determination
 */
interface TodayActivity {
  U_EmpId: string;
  U_ResCode: string;
  U_ProcType: string;
  U_WorkOrder: string;
  U_Start: Date | string;
}

/**
 * Team Service handles team view operations.
 *
 * Provides:
 * - Machine listing with worker status
 * - Shift determination based on current time
 * - Worker classification (assigned/paused/available)
 *
 * @see specs/feature-team-calendar.md
 */
@Injectable()
export class TeamService {
  private readonly logger = new Logger(TeamService.name);

  /**
   * Shift definitions per specs/feature-team-calendar.md
   */
  private readonly shifts: Record<ShiftCode, ShiftDefinition> = {
    A: { code: 'A', name: 'A Vardiyasi', startTime: '08:00', endTime: '16:00' },
    B: { code: 'B', name: 'B Vardiyasi', startTime: '16:00', endTime: '00:00' },
    C: { code: 'C', name: 'C Vardiyasi', startTime: '00:00', endTime: '08:00' },
  };

  constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly activityRepository: ActivityRepository
  ) {}

  /**
   * Get the current shift based on system time
   *
   * Shift schedule:
   * - A: 08:00 - 16:00
   * - B: 16:00 - 00:00
   * - C: 00:00 - 08:00
   *
   * @returns Current shift code (A, B, or C)
   */
  getCurrentShift(): ShiftCode {
    const now = new Date();
    const hour = now.getHours();

    if (hour >= 8 && hour < 16) {
      return 'A';
    } else if (hour >= 16 && hour < 24) {
      return 'B';
    } else {
      return 'C';
    }
  }

  /**
   * Get all shift definitions with current shift
   *
   * @returns Shift list with current shift indicator
   */
  getShifts(): ShiftListResponse {
    return {
      shifts: Object.values(this.shifts),
      currentShift: this.getCurrentShift(),
    };
  }

  /**
   * Get all machines with their worker status
   *
   * Uses OHEM.U_mainStation to determine WHO IS ASSIGNED to each machine.
   * Workers with NULL U_mainStation are "Bosta" (idle/unassigned).
   *
   * Activity status from @ATELIERATTN determines working state:
   * - Assigned + BAS/DEV: Currently working (green)
   * - Assigned + DUR: Paused/on break (yellow)
   * - Assigned + no activity or BIT: Assigned but not started (gray)
   *
   * @param filters - Optional filters (shift)
   * @returns Team view response with machines and worker status
   */
  async getMachinesWithWorkerStatus(
    filters?: TeamViewFilters
  ): Promise<TeamViewResponse> {
    const startTime = Date.now();
    this.logger.debug('getMachinesWithWorkerStatus: starting');

    const currentShift = this.getCurrentShift();
    const shiftFilter = filters?.shift ?? 'all';

    // BATCH QUERY 1: Get all machines
    this.logger.debug('getMachinesWithWorkerStatus: fetching all machines');
    const machines = await this.resourceRepository.findAllMachines();
    this.logger.debug(
      `getMachinesWithWorkerStatus: found ${machines.length} machines in ${Date.now() - startTime}ms`
    );

    // BATCH QUERY 2: Get ALL workers with their current assignment (OHEM.U_mainStation)
    this.logger.debug('getMachinesWithWorkerStatus: fetching all assigned workers');
    const allWorkers = await this.resourceRepository.findAllAssignedWorkers();
    this.logger.debug(
      `getMachinesWithWorkerStatus: found ${allWorkers.length} employees in ${Date.now() - startTime}ms`
    );

    // BATCH QUERY 3: Get ALL today's activities for working status
    this.logger.debug('getMachinesWithWorkerStatus: fetching all activities');
    const allActivities = await this.activityRepository.findAllTodayActivities();
    this.logger.debug(
      `getMachinesWithWorkerStatus: found ${allActivities.length} activities in ${Date.now() - startTime}ms`
    );

    // Create machine code -> machine name lookup
    const machineNameMap = new Map<string, string>();
    for (const machine of machines) {
      machineNameMap.set(machine.ResCode, machine.ResName);
    }

    // Group workers by their mainStation (U_mainStation from OHEM)
    // Key is the full U_mainStation value like "1126 - SAURER 1"
    const workersByStation = new Map<string, typeof allWorkers>();
    const idleWorkers: typeof allWorkers = []; // Workers with NULL mainStation ("Bosta")

    for (const worker of allWorkers) {
      if (worker.mainStation) {
        if (!workersByStation.has(worker.mainStation)) {
          workersByStation.set(worker.mainStation, []);
        }
        workersByStation.get(worker.mainStation)!.push(worker);
      } else {
        idleWorkers.push(worker);
      }
    }

    // Build activity map: empId -> latest activity (for working status)
    const activityByEmployee = new Map<number, TodayActivity>();
    for (const activity of allActivities) {
      const empId = parseInt(activity.U_EmpId, 10);
      // Activities are sorted by U_Start DESC, so first one is latest
      if (!activityByEmployee.has(empId)) {
        activityByEmployee.set(empId, activity);
      }
    }

    // Build machine cards
    const machineCards: TeamMachineCard[] = [];

    for (const machine of machines) {
      // Workers assigned to this machine via U_mainStation
      const assignedToMachine = workersByStation.get(machine.ResCode) ?? [];

      const assignedWorkers: TeamWorker[] = [];
      const pausedWorkers: TeamWorker[] = [];
      const availableWorkers: TeamWorker[] = [];

      for (const worker of assignedToMachine) {
        const activity = activityByEmployee.get(worker.empID);
        const fullName = `${worker.firstName} ${worker.lastName}`;

        // Determine working status from activity
        let status: 'assigned' | 'paused' | 'available' = 'available';
        if (activity) {
          switch (activity.U_ProcType) {
            case 'BAS':
            case 'DEV':
              status = 'assigned'; // Currently working
              break;
            case 'DUR':
              status = 'paused'; // On break
              break;
            default:
              status = 'available'; // BIT or unknown = finished/idle
          }
        }

        const teamWorker: TeamWorker = {
          empId: worker.empID,
          fullName,
          status,
          jobTitle: worker.jobTitle ?? undefined,
        };

        // Add work order info if actively working or paused
        if (activity && (status === 'assigned' || status === 'paused')) {
          teamWorker.currentWorkOrder = {
            docEntry: parseInt(activity.U_WorkOrder, 10),
            docNum: parseInt(activity.U_WorkOrder, 10),
            itemCode: '',
          };
        }

        switch (status) {
          case 'assigned':
            assignedWorkers.push(teamWorker);
            break;
          case 'paused':
            pausedWorkers.push(teamWorker);
            break;
          default:
            availableWorkers.push(teamWorker);
        }
      }

      machineCards.push({
        machineCode: machine.ResCode,
        machineName: machine.ResName,
        assignedWorkers,
        pausedWorkers,
        availableWorkers,
      });
    }

    // Add "Bosta" (idle) card for unassigned workers
    if (idleWorkers.length > 0) {
      const bostaWorkers: TeamWorker[] = idleWorkers.map((worker) => ({
        empId: worker.empID,
        fullName: `${worker.firstName} ${worker.lastName}`,
        status: 'available' as const,
        jobTitle: worker.jobTitle ?? undefined,
      }));

      machineCards.push({
        machineCode: 'BOSTA',
        machineName: 'Boşta',
        assignedWorkers: [],
        pausedWorkers: [],
        availableWorkers: bostaWorkers,
      });
    }

    // Sort machines alphabetically by name (Turkish locale), but keep "Boşta" at the end
    machineCards.sort((a, b) => {
      if (a.machineCode === 'BOSTA') return 1;
      if (b.machineCode === 'BOSTA') return -1;
      return a.machineName.localeCompare(b.machineName, 'tr-TR');
    });

    this.logger.debug(
      `getMachinesWithWorkerStatus: completed in ${Date.now() - startTime}ms (3 queries total)`
    );

    return {
      currentShift,
      shiftFilter,
      machines: machineCards,
    };
  }

}
