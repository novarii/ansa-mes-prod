import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HanaService } from '../hana.service';
import { ServiceLayerService } from '../service-layer.service';
import {
  Activity,
  ActivityWithDetails,
  CreateActivity,
  WorkerActivityState,
  ActivityProcessType,
} from '@org/shared-types';

/**
 * Raw query result for latest activity
 */
interface LatestActivityResult {
  Code: string;
  U_ProcType: ActivityProcessType;
  U_Start: Date | string;
  U_BreakCode: string | null;
}

/**
 * Activity result for today's team view
 */
export interface TodayActivityResult {
  U_EmpId: string;
  U_ResCode: string;
  U_ProcType: string;
  U_WorkOrder: string;
  U_Start: Date | string;
}

/**
 * Activity Repository
 *
 * Provides data access for activity tracking records in @ATELIERATTN table.
 * Activities track worker start/stop/resume/finish events on work orders.
 *
 * @see specs/feature-production.md
 * @see specs/data-access-layer.md
 */
@Injectable()
export class ActivityRepository {
  constructor(
    private readonly hanaService: HanaService,
    private readonly serviceLayerService: ServiceLayerService
  ) {}

  /**
   * Create a new activity record via Service Layer
   *
   * Uses Service Layer POST /ATELIERATTN (UDO endpoint) to auto-generate
   * DocEntry and other SAP-managed system fields.
   *
   * @param data - Activity data without Code/Name (auto-generated)
   * @returns Created activity with generated Code
   */
  async create(data: CreateActivity): Promise<Activity> {
    const code = randomUUID();

    // Format date for Service Layer (date only, time stored separately)
    const startDate =
      data.U_Start instanceof Date ? data.U_Start : new Date(data.U_Start);

    // U_Start = date only (ISO date string)
    const startDateStr = startDate.toISOString().split('T')[0];

    // U_StartTime = HHMM as integer (e.g., 1754 for 17:54)
    const hours = startDate.getHours();
    const minutes = startDate.getMinutes();
    const startTime = hours * 100 + minutes;

    const payload = {
      Code: code,
      Name: code, // SAP UDT requirement: Name = Code
      U_WorkOrder: data.U_WorkOrder,
      U_ResCode: data.U_ResCode,
      U_EmpId: data.U_EmpId,
      U_ProcType: data.U_ProcType,
      U_Start: startDateStr,
      U_StartTime: startTime,
      U_BreakCode: data.U_BreakCode,
      U_Aciklama: data.U_Aciklama,
    };

    // Use createUDO (not createUDT) - ATELIERATTN is a registered UDO
    await this.serviceLayerService.createUDO('ATELIERATTN', payload);

    // Return the activity object (Service Layer auto-generated DocEntry)
    const activity: Activity = {
      Code: code,
      Name: code,
      ...data,
    };

    return activity;
  }

  /**
   * Find all activities for a work order and employee
   *
   * @param docEntry - Work order DocEntry
   * @param empId - Employee ID
   * @returns Array of activities ordered by start time (descending)
   */
  async findByWorkOrderAndEmployee(
    docEntry: number,
    empId: number
  ): Promise<Activity[]> {
    const sql = `
      SELECT
        "Code",
        "Name",
        "U_WorkOrder",
        "U_ResCode",
        "U_EmpId",
        "U_ProcType",
        "U_Start",
        "U_BreakCode",
        "U_Aciklama"
      FROM "@ATELIERATTN"
      WHERE "U_WorkOrder" = ?
        AND "U_EmpId" = ?
      ORDER BY "U_Start" DESC
    `;

    return this.hanaService.query<Activity>(sql, [
      String(docEntry),
      String(empId),
    ]);
  }

  /**
   * Get the current activity state for a worker on a work order
   *
   * Used to determine which action buttons to show (Start, Stop, Resume, Finish).
   *
   * State transition rules:
   * - No state or BIT -> can BAS (Start)
   * - BAS or DEV -> can DUR (Stop) or BIT (Finish)
   * - DUR -> can DEV (Resume) or BIT (Finish)
   *
   * @param docEntry - Work order DocEntry
   * @param empId - Employee ID
   * @returns Worker's current activity state with available actions
   */
  async getWorkerCurrentState(
    docEntry: number,
    empId: number
  ): Promise<WorkerActivityState> {
    const sql = `
      SELECT TOP 1
        "Code",
        "U_ProcType",
        "U_Start",
        "U_BreakCode"
      FROM "@ATELIERATTN"
      WHERE "U_WorkOrder" = ?
        AND "U_EmpId" = ?
      ORDER BY "U_Start" DESC
    `;

    const latest = await this.hanaService.queryOne<LatestActivityResult>(sql, [
      String(docEntry),
      String(empId),
    ]);

    if (!latest) {
      return {
        activityCode: null,
        processType: null,
        lastActivityTime: null,
        breakCode: null,
        canStart: true,
        canStop: false,
        canResume: false,
        canFinish: false,
      };
    }

    return this.buildStateFromActivity(latest);
  }

  /**
   * Find all activities for a work order with employee and break reason details
   *
   * Used for displaying activity log/history on work order detail page.
   *
   * @param docEntry - Work order DocEntry
   * @returns Array of activities with joined employee and break reason details
   */
  async findByWorkOrder(docEntry: number): Promise<ActivityWithDetails[]> {
    const sql = `
      SELECT
        T0."Code",
        T0."Name",
        T0."U_WorkOrder",
        T0."U_ResCode",
        T0."U_EmpId",
        T0."U_ProcType",
        T0."U_Start",
        T0."U_BreakCode",
        T0."U_Aciklama",
        (T1."firstName" || ' ' || T1."lastName") AS "EmployeeName",
        T2."Name" AS "BreakReasonText"
      FROM "@ATELIERATTN" T0
      LEFT JOIN "OHEM" T1 ON T0."U_EmpId" = CAST(T1."empID" AS VARCHAR)
      LEFT JOIN "@BREAKREASON" T2 ON T0."U_BreakCode" = T2."Code"
      WHERE T0."U_WorkOrder" = ?
      ORDER BY T0."U_Start" DESC
    `;

    return this.hanaService.query<ActivityWithDetails>(sql, [String(docEntry)]);
  }

  /**
   * Find today's activities for a list of workers on a specific machine
   *
   * Used for team view to determine worker status (assigned/paused/available).
   * Returns activities sorted by start time descending so the latest activity
   * for each worker comes first.
   *
   * @param empIds - Array of employee IDs
   * @param resCode - Machine resource code
   * @returns Array of today's activities for the specified workers
   */
  async findTodayActivitiesForWorkers(
    empIds: number[],
    resCode: string
  ): Promise<TodayActivityResult[]> {
    if (empIds.length === 0) {
      return [];
    }

    // Build IN clause for employee IDs
    const empIdStrings = empIds.map((id) => String(id));
    const placeholders = empIdStrings.map(() => '?').join(', ');

    const sql = `
      SELECT
        "U_EmpId",
        "U_ResCode",
        "U_ProcType",
        "U_WorkOrder",
        "U_Start"
      FROM "@ATELIERATTN"
      WHERE "U_ResCode" = ?
        AND "U_EmpId" IN (${placeholders})
        AND "U_Start" >= CURRENT_DATE
      ORDER BY "U_Start" DESC
    `;

    return this.hanaService.query<TodayActivityResult>(sql, [
      resCode,
      ...empIdStrings,
    ]);
  }

  /**
   * Find ALL today's activities across ALL machines in a single query (batch operation)
   *
   * Used for efficient team view loading - fetches all activities at once
   * instead of per-machine queries.
   *
   * @returns Array of today's activities for all workers
   */
  async findAllTodayActivities(): Promise<TodayActivityResult[]> {
    const sql = `
      SELECT
        "U_EmpId",
        "U_ResCode",
        "U_ProcType",
        "U_WorkOrder",
        "U_Start"
      FROM "@ATELIERATTN"
      WHERE "U_Start" >= CURRENT_DATE
      ORDER BY "U_Start" DESC
    `;

    return this.hanaService.query<TodayActivityResult>(sql);
  }

  /**
   * Build worker state from the latest activity record
   */
  private buildStateFromActivity(
    activity: LatestActivityResult
  ): WorkerActivityState {
    const { Code, U_ProcType, U_Start, U_BreakCode } = activity;

    const baseState: WorkerActivityState = {
      activityCode: Code,
      processType: U_ProcType,
      lastActivityTime: U_Start,
      breakCode: U_BreakCode,
      canStart: false,
      canStop: false,
      canResume: false,
      canFinish: false,
    };

    switch (U_ProcType) {
      case 'BIT':
        // After finish, can start new session
        return { ...baseState, canStart: true };

      case 'BAS':
      case 'DEV':
        // Currently working, can stop or finish
        return { ...baseState, canStop: true, canFinish: true };

      case 'DUR':
        // Currently paused, can resume or finish
        return { ...baseState, canResume: true, canFinish: true };

      default:
        // Unknown state, allow start
        return { ...baseState, canStart: true };
    }
  }
}
