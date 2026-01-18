/**
 * Resource Entity
 *
 * Represents a machine/resource from SAP B1 (ORSC table).
 * Used for machine authorization and work order assignment.
 *
 * @see specs/user-permission-model.md
 * @see specs/feature-production.md
 */

/**
 * Resource type codes
 * M = Machine, L = Labor
 */
export type ResourceType = 'M' | 'L';

/**
 * Resource entity interface matching ORSC table structure
 */
export interface Resource {
  /** Resource code (e.g., "1001 - BARMAG 1") */
  ResCode: string;
  /** Resource display name */
  ResName: string;
  /** Resource type: 'M' for Machine, 'L' for Labor */
  ResType: ResourceType;
  /** Primary/default worker empID */
  U_defaultEmp: string | null;
  /** Comma-separated list of ALL authorized empIDs */
  U_secondEmp: string | null;
}

/**
 * Machine resource (filtered to ResType='M')
 */
export interface Machine extends Resource {
  ResType: 'M';
}

/**
 * Labor resource (filtered to ResType='L')
 */
export interface Labor extends Resource {
  ResType: 'L';
}

/**
 * Machine with authorization status for a specific worker
 */
export interface MachineWithAuthStatus extends Machine {
  /** Whether this is the worker's default machine */
  IsDefault: boolean;
  /** Whether the worker is authorized for this machine */
  IsAuthorized: boolean;
}

/**
 * Machine with worker status for team view
 */
export interface MachineWithWorkerStatus extends Machine {
  /** List of workers currently assigned (BAS/DEV status) */
  AssignedWorkers: WorkerStatus[];
  /** List of workers currently paused (DUR status) */
  PausedWorkers: WorkerStatus[];
  /** List of available workers (no active record or BIT) */
  AvailableWorkers: WorkerStatus[];
}

/**
 * Worker status for team view
 */
export interface WorkerStatus {
  /** Employee ID */
  empId: number;
  /** Full name (firstName + lastName) */
  fullName: string;
  /** Current activity status */
  status: 'assigned' | 'paused' | 'available';
  /** Work order they're working on (if assigned/paused) */
  currentWorkOrder: number | null;
}
