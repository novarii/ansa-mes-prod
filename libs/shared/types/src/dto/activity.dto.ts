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
