import { Injectable } from '@nestjs/common';
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
 * Worker info from resource repository
 */
interface WorkerInfo {
  empID: number;
  firstName: string;
  lastName: string;
  IsDefault: boolean;
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
   * For each machine, workers are classified as:
   * - Assigned: Latest activity is BAS or DEV (currently working)
   * - Paused: Latest activity is DUR (on break)
   * - Available: No activity today or latest is BIT (finished)
   *
   * @param filters - Optional filters (shift)
   * @returns Team view response with machines and worker status
   */
  async getMachinesWithWorkerStatus(
    filters?: TeamViewFilters
  ): Promise<TeamViewResponse> {
    const currentShift = this.getCurrentShift();
    const shiftFilter = filters?.shift ?? 'all';

    // Get all machines
    const machines = await this.resourceRepository.findAllMachines();

    if (machines.length === 0) {
      return {
        currentShift,
        shiftFilter,
        machines: [],
      };
    }

    // Get workers for each machine
    const machineCards: TeamMachineCard[] = [];

    for (const machine of machines) {
      const workers = await this.resourceRepository.findWorkersForMachine(
        machine.ResCode
      );

      if (workers.length === 0) {
        machineCards.push({
          machineCode: machine.ResCode,
          machineName: machine.ResName,
          assignedWorkers: [],
          pausedWorkers: [],
          availableWorkers: [],
        });
        continue;
      }

      // Get today's activities for these workers
      const workerIds = workers.map((w) => w.empID);
      const activities =
        await this.activityRepository.findTodayActivitiesForWorkers(
          workerIds,
          machine.ResCode
        );

      // Build worker status map (latest activity per worker)
      const workerActivityMap = this.buildWorkerActivityMap(activities);

      // Classify workers
      const assignedWorkers: TeamWorker[] = [];
      const pausedWorkers: TeamWorker[] = [];
      const availableWorkers: TeamWorker[] = [];

      for (const worker of workers) {
        const activity = workerActivityMap.get(worker.empID);
        const teamWorker = this.buildTeamWorker(worker, activity);

        switch (teamWorker.status) {
          case 'assigned':
            assignedWorkers.push(teamWorker);
            break;
          case 'paused':
            pausedWorkers.push(teamWorker);
            break;
          case 'available':
          default:
            availableWorkers.push(teamWorker);
            break;
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

    // Sort machines alphabetically by name (Turkish locale)
    machineCards.sort((a, b) =>
      a.machineName.localeCompare(b.machineName, 'tr-TR')
    );

    return {
      currentShift,
      shiftFilter,
      machines: machineCards,
    };
  }

  /**
   * Build a map of worker ID to their latest activity
   */
  private buildWorkerActivityMap(
    activities: TodayActivity[]
  ): Map<number, TodayActivity> {
    const map = new Map<number, TodayActivity>();

    // Activities should already be sorted by start time descending
    // We take the first (latest) activity for each worker
    for (const activity of activities) {
      const empId = parseInt(activity.U_EmpId, 10);
      if (!map.has(empId)) {
        map.set(empId, activity);
      }
    }

    return map;
  }

  /**
   * Build a TeamWorker object from worker info and activity
   */
  private buildTeamWorker(
    worker: WorkerInfo,
    activity?: TodayActivity
  ): TeamWorker {
    const fullName = `${worker.firstName} ${worker.lastName}`;

    // No activity today - available
    if (!activity) {
      return {
        empId: worker.empID,
        fullName,
        status: 'available',
      };
    }

    // Determine status based on process type
    const status = this.getWorkerStatus(activity.U_ProcType);

    const teamWorker: TeamWorker = {
      empId: worker.empID,
      fullName,
      status,
    };

    // Add work order info if assigned or paused
    if (status === 'assigned' || status === 'paused') {
      teamWorker.currentWorkOrder = {
        docEntry: parseInt(activity.U_WorkOrder, 10),
        docNum: parseInt(activity.U_WorkOrder, 10), // Will be replaced with actual docNum
        itemCode: '', // Will be replaced with actual itemCode
      };
    }

    return teamWorker;
  }

  /**
   * Get worker status from activity process type
   */
  private getWorkerStatus(
    processType: string
  ): 'assigned' | 'paused' | 'available' {
    switch (processType) {
      case 'BAS':
      case 'DEV':
        return 'assigned';
      case 'DUR':
        return 'paused';
      case 'BIT':
      default:
        return 'available';
    }
  }
}
