import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HanaService } from '../hana.service';
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
  constructor(private readonly hanaService: HanaService) {}

  /**
   * Create a new activity record
   *
   * IMPORTANT: This inserts directly to @ATELIERATTN (UDT).
   *
   * @param data - Activity data without Code/Name (auto-generated)
   * @returns Created activity with generated Code
   */
  async create(data: CreateActivity): Promise<Activity> {
    const code = randomUUID();
    const activity: Activity = {
      Code: code,
      Name: code, // SAP UDT requirement: Name = Code
      ...data,
    };

    const sql = `
      INSERT INTO "@ATELIERATTN" (
        "Code",
        "Name",
        "U_WorkOrder",
        "U_ResCode",
        "U_EmpId",
        "U_ProcType",
        "U_Start",
        "U_BreakCode",
        "U_Aciklama"
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.hanaService.execute(sql, [
      activity.Code,
      activity.Name,
      activity.U_WorkOrder,
      activity.U_ResCode,
      activity.U_EmpId,
      activity.U_ProcType,
      activity.U_Start,
      activity.U_BreakCode,
      activity.U_Aciklama,
    ]);

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
