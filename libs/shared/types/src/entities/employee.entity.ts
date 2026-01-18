/**
 * Employee Entity
 *
 * Represents an employee from SAP B1 (OHEM table).
 * Used for authentication and worker identification.
 *
 * @see specs/user-permission-model.md
 */

/**
 * Employee entity interface matching OHEM table structure
 */
export interface Employee {
  /** Employee ID (primary key) */
  empID: number;
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Main workstation (INFORMATIONAL ONLY - not used for auth) */
  U_mainStation: string | null;
}

/**
 * Employee with password for authentication
 * Note: Password should be hashed, never stored in plain text
 */
export interface EmployeeWithAuth extends Employee {
  /** Hashed password or PIN */
  U_password: string | null;
}

/**
 * Employee display information (safe for client)
 */
export interface EmployeeInfo {
  /** Employee ID */
  empID: number;
  /** Full name (firstName + lastName) */
  fullName: string;
  /** Main workstation name (informational) */
  mainStation: string | null;
}

/**
 * MES Session stored after authentication and station selection
 */
export interface MESSession {
  /** Authenticated worker ID */
  empID: number;
  /** Display name (firstName + lastName) */
  empName: string;
  /** Selected machine ResCode */
  stationCode: string;
  /** Selected machine ResName */
  stationName: string;
  /** Whether this is their default machine */
  isDefaultWorker: boolean;
  /** Login timestamp */
  loginTime: Date | string;
  /** Shift ID if shift tracking is implemented */
  shiftId?: string;
}
