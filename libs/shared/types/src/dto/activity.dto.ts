/**
 * Activity DTOs
 *
 * Data Transfer Objects for activity tracking (BAS/DUR/DEV/BIT).
 *
 * @see specs/feature-production.md
 */

import type { ActivityProcessType, WorkerActivityState } from '../entities/activity.entity.js';

/**
 * Start activity request (BAS)
 */
export interface StartActivityRequest {
  /** Work order DocEntry */
  docEntry: number;
}

/**
 * Stop activity request (DUR) - requires break code
 */
export interface StopActivityRequest {
  /** Break reason code (required) */
  breakCode: string;
  /** Optional notes/comments */
  notes?: string;
}

/**
 * Resume activity request (DEV)
 */
export interface ResumeActivityRequest {
  /** Optional notes/comments */
  notes?: string;
}

/**
 * Finish activity request (BIT)
 */
export interface FinishActivityRequest {
  /** Optional notes/comments */
  notes?: string;
}

/**
 * Activity action response
 */
export interface ActivityActionResponse {
  /** Whether the action was successful */
  success: boolean;
  /** Created activity code */
  activityCode: string;
  /** Process type of the created activity */
  processType: ActivityProcessType;
  /** Timestamp of the action */
  timestamp: string;
  /** Updated worker state */
  state: WorkerActivityState;
}

/**
 * Activity state response
 */
export interface ActivityStateResponse {
  /** Worker's current state */
  state: WorkerActivityState;
  /** Work order doc entry */
  docEntry: number;
  /** Employee ID */
  empId: number;
}

/**
 * Activity log entry for history
 */
export interface ActivityLogEntry {
  /** Activity code */
  code: string;
  /** Process type */
  processType: ActivityProcessType;
  /** Process type label in Turkish */
  processTypeLabel: string;
  /** Timestamp (ISO format) */
  timestamp: string;
  /** Employee ID */
  empId: string;
  /** Employee name */
  empName: string;
  /** Break reason code (if DUR) */
  breakCode: string | null;
  /** Break reason text (if DUR) */
  breakReasonText: string | null;
  /** Notes/comments */
  notes: string | null;
}

/**
 * Activity history response
 */
export interface ActivityHistoryResponse {
  /** Work order doc entry */
  docEntry: number;
  /** List of activity entries */
  entries: ActivityLogEntry[];
}

// ==================== Multi-Employee Activity DTOs ====================

/**
 * Start activity request for multiple employees (BAS)
 */
export interface StartActivityMultiRequest {
  /** Array of employee IDs to start work */
  empIds: number[];
}

/**
 * Stop activity request for multiple employees (DUR) - requires break code
 */
export interface StopActivityMultiRequest {
  /** Array of employee IDs to stop work */
  empIds: number[];
  /** Break reason code (required) */
  breakCode: string;
  /** Optional notes/comments */
  notes?: string;
}

/**
 * Result for a single employee in a multi-employee action
 */
export interface ActivityActionResult {
  /** Employee ID */
  empId: number;
  /** Employee name */
  empName: string;
  /** Created activity code */
  activityCode: string;
  /** Whether the action was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Response for multi-employee activity actions
 */
export interface ActivityActionMultiResponse {
  /** Whether all actions were successful */
  success: boolean;
  /** Process type of the created activities */
  processType: ActivityProcessType;
  /** Timestamp of the action */
  timestamp: string;
  /** Results for each employee */
  results: ActivityActionResult[];
}

/**
 * Worker info for employee selection (from ORSC authorization)
 */
export interface WorkerForSelection {
  /** Employee ID */
  empID: number;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Whether this is the default/primary worker for the machine */
  IsDefault: boolean;
  /** Current activity state (if any) - for stop modal filtering */
  currentState?: ActivityProcessType | null;
}
