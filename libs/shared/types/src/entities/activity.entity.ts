/**
 * Activity Entity
 *
 * Represents activity tracking records from @ATELIERATTN table.
 * Tracks worker start/stop/resume/finish events on work orders.
 *
 * @see specs/feature-production.md
 * @see specs/entity-repository-patterns.md
 */

/**
 * Process type codes for activity tracking
 * BAS = Start, DUR = Stop/Pause, DEV = Resume, BIT = Finish
 */
export type ActivityProcessType = 'BAS' | 'DUR' | 'DEV' | 'BIT';

/**
 * Activity process type mapping to readable names
 */
export const ActivityProcessTypeMap = {
  BAS: { tr: 'Basla', en: 'Start' },
  DUR: { tr: 'Dur', en: 'Stop' },
  DEV: { tr: 'Devam', en: 'Resume' },
  BIT: { tr: 'Bitir', en: 'Finish' },
} as const;

/**
 * Activity entity interface matching @ATELIERATTN table structure
 */
export interface Activity {
  /** Unique identifier (UUID recommended) - PK required by SAP UDT */
  Code: string;
  /** Same as Code (SAP UDT requirement) */
  Name: string;
  /** OWOR.DocEntry as string */
  U_WorkOrder: string;
  /** Machine code (ORSC.ResCode) */
  U_ResCode: string;
  /** Employee ID */
  U_EmpId: string;
  /** Process type: BAS/DUR/DEV/BIT */
  U_ProcType: ActivityProcessType;
  /** Timestamp of action */
  U_Start: Date | string;
  /** Break reason code (required for DUR) */
  U_BreakCode: string | null;
  /** Notes/comments */
  U_Aciklama: string | null;
}

/**
 * Extended activity with joined employee and break reason details
 */
export interface ActivityWithDetails extends Activity {
  /** Joined from employee record */
  EmployeeName: string | null;
  /** Joined from @BREAKREASON.Name */
  BreakReasonText: string | null;
}

/**
 * Type for creating a new activity (omit auto-generated fields)
 */
export type CreateActivity = Omit<Activity, 'Code' | 'Name'>;

/**
 * Current worker state on a work order
 */
export interface WorkerActivityState {
  /** Latest activity code if exists */
  activityCode: string | null;
  /** Current process type (null if no activity) */
  processType: ActivityProcessType | null;
  /** Timestamp of last activity */
  lastActivityTime: Date | string | null;
  /** Break code if currently stopped */
  breakCode: string | null;
  /** Whether worker can start (no activity or last was BIT) */
  canStart: boolean;
  /** Whether worker can stop (last was BAS or DEV) */
  canStop: boolean;
  /** Whether worker can resume (last was DUR) */
  canResume: boolean;
  /** Whether worker can finish (last was BAS, DEV, or DUR) */
  canFinish: boolean;
}
