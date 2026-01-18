/**
 * Team View DTOs
 *
 * Data Transfer Objects for team management view.
 *
 * @see specs/feature-team-calendar.md
 */

import type { WorkerStatus } from '../entities/resource.entity.js';

/**
 * Shift code type
 */
export type ShiftCode = 'A' | 'B' | 'C';

/**
 * Shift definition
 */
export interface ShiftDefinition {
  /** Shift code */
  code: ShiftCode;
  /** Shift name in Turkish */
  name: string;
  /** Start time (HH:mm format) */
  startTime: string;
  /** End time (HH:mm format) */
  endTime: string;
}

/**
 * Default shift definitions
 */
export const DefaultShifts: Record<ShiftCode, ShiftDefinition> = {
  A: { code: 'A', name: 'A Vardiyasi', startTime: '08:00', endTime: '16:00' },
  B: { code: 'B', name: 'B Vardiyasi', startTime: '16:00', endTime: '00:00' },
  C: { code: 'C', name: 'C Vardiyasi', startTime: '00:00', endTime: '08:00' },
};

/**
 * Team view request filters
 */
export interface TeamViewFilters {
  /** Filter by shift (optional, defaults to current shift) */
  shift?: ShiftCode | 'all';
}

/**
 * Machine with workers for team view
 */
export interface TeamMachineCard {
  /** Machine code */
  machineCode: string;
  /** Machine name */
  machineName: string;
  /** Workers currently assigned (BAS/DEV status) */
  assignedWorkers: TeamWorker[];
  /** Workers currently paused (DUR status) */
  pausedWorkers: TeamWorker[];
  /** Workers available (no active record or BIT) */
  availableWorkers: TeamWorker[];
}

/**
 * Worker info for team view
 */
export interface TeamWorker {
  /** Employee ID */
  empId: number;
  /** Full name */
  fullName: string;
  /** Current status */
  status: 'assigned' | 'paused' | 'available';
  /** Current work order (if assigned/paused) */
  currentWorkOrder?: {
    docEntry: number;
    docNum: number;
    itemCode: string;
  };
}

/**
 * Team view response
 */
export interface TeamViewResponse {
  /** Current shift */
  currentShift: ShiftCode;
  /** Applied shift filter */
  shiftFilter: ShiftCode | 'all';
  /** List of machines with worker status */
  machines: TeamMachineCard[];
}

/**
 * Shift list response
 */
export interface ShiftListResponse {
  /** Available shifts */
  shifts: ShiftDefinition[];
  /** Current shift based on time */
  currentShift: ShiftCode;
}
