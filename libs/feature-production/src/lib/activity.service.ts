import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  ActivityRepository,
  BreakReasonRepository,
  WorkOrderRepository,
} from '@org/data-access';
import {
  ActivityProcessType,
  ActivityProcessTypeMap,
  WorkerActivityState,
  ActivityActionResponse,
  ActivityStateResponse,
  ActivityHistoryResponse,
  ActivityLogEntry,
  CreateActivity,
} from '@org/shared-types';

/**
 * Activity Service
 *
 * Manages worker activity tracking on work orders.
 * Handles state transitions: Start (BAS), Stop (DUR), Resume (DEV), Finish (BIT).
 *
 * @see specs/feature-production.md
 */
@Injectable()
export class ActivityService {
  constructor(
    private readonly activityRepository: ActivityRepository,
    private readonly breakReasonRepository: BreakReasonRepository,
    private readonly workOrderRepository: WorkOrderRepository
  ) {}

  /**
   * Get current activity state for a worker on a work order
   *
   * @param docEntry - Work order DocEntry
   * @param empId - Employee ID
   * @returns Activity state response with available actions
   */
  async getWorkerState(
    docEntry: number,
    empId: number
  ): Promise<ActivityStateResponse> {
    this.validateDocEntry(docEntry);
    this.validateEmpId(empId);

    await this.verifyWorkOrderExists(docEntry);

    const state = await this.activityRepository.getWorkerCurrentState(
      docEntry,
      empId
    );

    return {
      state,
      docEntry,
      empId,
    };
  }

  /**
   * Start work on a work order (BAS)
   *
   * Can only start if:
   * - No prior activity exists
   * - Last activity was BIT (finished)
   *
   * @param docEntry - Work order DocEntry
   * @param empId - Employee ID
   * @param resCode - Machine/resource code
   * @returns Activity action response
   */
  async startWork(
    docEntry: number,
    empId: number,
    resCode: string
  ): Promise<ActivityActionResponse> {
    this.validateDocEntry(docEntry);
    this.validateEmpId(empId);
    this.validateResCode(resCode);

    await this.verifyWorkOrderExists(docEntry);

    const currentState = await this.activityRepository.getWorkerCurrentState(
      docEntry,
      empId
    );

    if (!currentState.canStart) {
      throw new ConflictException(
        'Cannot start work. Work is already in progress or paused. ' +
          'Use resume to continue or finish to complete current work.'
      );
    }

    const activity = await this.createActivity(
      docEntry,
      empId,
      resCode,
      'BAS',
      null,
      null
    );

    return this.buildActionResponse(activity);
  }

  /**
   * Stop work on a work order (DUR)
   *
   * Can only stop if:
   * - Currently working (BAS)
   * - Currently resumed (DEV)
   *
   * Requires a break reason code.
   *
   * @param docEntry - Work order DocEntry
   * @param empId - Employee ID
   * @param resCode - Machine/resource code
   * @param breakCode - Break reason code (required)
   * @param notes - Optional notes
   * @returns Activity action response
   */
  async stopWork(
    docEntry: number,
    empId: number,
    resCode: string,
    breakCode: string,
    notes?: string
  ): Promise<ActivityActionResponse> {
    this.validateDocEntry(docEntry);
    this.validateEmpId(empId);
    this.validateResCode(resCode);

    if (!breakCode || breakCode.trim() === '') {
      throw new BadRequestException(
        'Break reason code is required when stopping work'
      );
    }

    await this.verifyWorkOrderExists(docEntry);

    // Validate break code exists
    const breakReason = await this.breakReasonRepository.findByCode(breakCode);
    if (!breakReason) {
      throw new BadRequestException(
        `Invalid break reason code: ${breakCode}`
      );
    }

    const currentState = await this.activityRepository.getWorkerCurrentState(
      docEntry,
      empId
    );

    if (!currentState.canStop) {
      throw new ConflictException(
        'Cannot stop work. Work must be started or resumed before stopping.'
      );
    }

    const activity = await this.createActivity(
      docEntry,
      empId,
      resCode,
      'DUR',
      breakCode,
      notes ?? null
    );

    return this.buildActionResponse(activity);
  }

  /**
   * Resume work on a work order (DEV)
   *
   * Can only resume if:
   * - Currently paused (DUR)
   *
   * @param docEntry - Work order DocEntry
   * @param empId - Employee ID
   * @param resCode - Machine/resource code
   * @param notes - Optional notes
   * @returns Activity action response
   */
  async resumeWork(
    docEntry: number,
    empId: number,
    resCode: string,
    notes?: string
  ): Promise<ActivityActionResponse> {
    this.validateDocEntry(docEntry);
    this.validateEmpId(empId);
    this.validateResCode(resCode);

    await this.verifyWorkOrderExists(docEntry);

    const currentState = await this.activityRepository.getWorkerCurrentState(
      docEntry,
      empId
    );

    if (!currentState.canResume) {
      throw new ConflictException(
        'Cannot resume work. Work must be paused before resuming.'
      );
    }

    const activity = await this.createActivity(
      docEntry,
      empId,
      resCode,
      'DEV',
      null,
      notes ?? null
    );

    return this.buildActionResponse(activity);
  }

  /**
   * Finish work on a work order (BIT)
   *
   * Can finish if:
   * - Currently working (BAS)
   * - Currently resumed (DEV)
   * - Currently paused (DUR)
   *
   * @param docEntry - Work order DocEntry
   * @param empId - Employee ID
   * @param resCode - Machine/resource code
   * @param notes - Optional notes
   * @returns Activity action response
   */
  async finishWork(
    docEntry: number,
    empId: number,
    resCode: string,
    notes?: string
  ): Promise<ActivityActionResponse> {
    this.validateDocEntry(docEntry);
    this.validateEmpId(empId);
    this.validateResCode(resCode);

    await this.verifyWorkOrderExists(docEntry);

    const currentState = await this.activityRepository.getWorkerCurrentState(
      docEntry,
      empId
    );

    if (!currentState.canFinish) {
      throw new ConflictException(
        'Cannot finish work. Work must be started before finishing.'
      );
    }

    const activity = await this.createActivity(
      docEntry,
      empId,
      resCode,
      'BIT',
      null,
      notes ?? null
    );

    return this.buildActionResponse(activity);
  }

  /**
   * Get activity history for a work order
   *
   * @param docEntry - Work order DocEntry
   * @returns Activity history response with all entries
   */
  async getActivityHistory(docEntry: number): Promise<ActivityHistoryResponse> {
    this.validateDocEntry(docEntry);
    await this.verifyWorkOrderExists(docEntry);

    const activities = await this.activityRepository.findByWorkOrder(docEntry);

    const entries: ActivityLogEntry[] = activities.map((activity) => ({
      code: activity.Code,
      processType: activity.U_ProcType,
      processTypeLabel: this.getProcessTypeLabel(activity.U_ProcType),
      timestamp:
        typeof activity.U_Start === 'string'
          ? activity.U_Start
          : activity.U_Start.toISOString(),
      empId: activity.U_EmpId,
      empName: activity.EmployeeName ?? 'Unknown',
      breakCode: activity.U_BreakCode,
      breakReasonText: activity.BreakReasonText,
      notes: activity.U_Aciklama,
    }));

    return {
      docEntry,
      entries,
    };
  }

  /**
   * Create a new activity record
   */
  private async createActivity(
    docEntry: number,
    empId: number,
    resCode: string,
    processType: ActivityProcessType,
    breakCode: string | null,
    notes: string | null
  ): Promise<{
    activity: { Code: string; U_ProcType: ActivityProcessType; U_Start: Date | string };
    state: WorkerActivityState;
  }> {
    const activityData: CreateActivity = {
      U_WorkOrder: String(docEntry),
      U_ResCode: resCode,
      U_EmpId: String(empId),
      U_ProcType: processType,
      U_Start: new Date(),
      U_BreakCode: breakCode,
      U_Aciklama: notes,
    };

    const activity = await this.activityRepository.create(activityData);

    // Build the new state based on the created activity
    const state = this.buildStateFromProcessType(activity.Code, processType);

    return { activity, state };
  }

  /**
   * Build action response from created activity
   */
  private buildActionResponse(result: {
    activity: { Code: string; U_ProcType: ActivityProcessType; U_Start: Date | string };
    state: WorkerActivityState;
  }): ActivityActionResponse {
    const timestamp =
      typeof result.activity.U_Start === 'string'
        ? result.activity.U_Start
        : result.activity.U_Start.toISOString();

    return {
      success: true,
      activityCode: result.activity.Code,
      processType: result.activity.U_ProcType,
      timestamp,
      state: result.state,
    };
  }

  /**
   * Build worker state from the process type of a newly created activity
   */
  private buildStateFromProcessType(
    activityCode: string,
    processType: ActivityProcessType
  ): WorkerActivityState {
    const baseState: WorkerActivityState = {
      activityCode,
      processType,
      lastActivityTime: new Date().toISOString(),
      breakCode: null,
      canStart: false,
      canStop: false,
      canResume: false,
      canFinish: false,
    };

    switch (processType) {
      case 'BIT':
        return { ...baseState, canStart: true };
      case 'BAS':
      case 'DEV':
        return { ...baseState, canStop: true, canFinish: true };
      case 'DUR':
        return { ...baseState, canResume: true, canFinish: true };
      default:
        return { ...baseState, canStart: true };
    }
  }

  /**
   * Get Turkish label for process type
   */
  private getProcessTypeLabel(processType: ActivityProcessType): string {
    return ActivityProcessTypeMap[processType]?.tr ?? processType;
  }

  /**
   * Validate docEntry is a positive number
   */
  private validateDocEntry(docEntry: number): void {
    if (!docEntry || docEntry <= 0) {
      throw new BadRequestException('Invalid work order DocEntry');
    }
  }

  /**
   * Validate empId is a positive number
   */
  private validateEmpId(empId: number): void {
    if (!empId || empId <= 0) {
      throw new BadRequestException('Invalid employee ID');
    }
  }

  /**
   * Validate resCode is not empty
   */
  private validateResCode(resCode: string): void {
    if (!resCode || resCode.trim() === '') {
      throw new BadRequestException('Machine code (resCode) is required');
    }
  }

  /**
   * Verify work order exists
   */
  private async verifyWorkOrderExists(docEntry: number): Promise<void> {
    const workOrder = await this.workOrderRepository.findByDocEntry(docEntry);
    if (!workOrder) {
      throw new BadRequestException(`Work order not found: ${docEntry}`);
    }
  }
}
