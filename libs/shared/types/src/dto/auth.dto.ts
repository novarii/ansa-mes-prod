/**
 * Authentication DTOs
 *
 * Data Transfer Objects for login and session management.
 *
 * @see specs/user-permission-model.md
 */

import type { MESSession } from '../entities/employee.entity.js';

/**
 * Login request
 */
export interface LoginRequest {
  /** Employee ID */
  empId: number;
  /** PIN or password */
  pin: string;
}

/**
 * Login response (before station selection)
 */
export interface LoginResponse {
  /** Whether login was successful */
  success: boolean;
  /** Employee ID */
  empId: number;
  /** Employee full name */
  empName: string;
  /** Session token (if using JWT) */
  token?: string;
  /** Number of authorized stations */
  stationCount: number;
}

/**
 * Station option for selection dropdown
 */
export interface StationOption {
  /** Machine code (ResCode) */
  code: string;
  /** Machine name (ResName) */
  name: string;
  /** Whether this is the worker's default station */
  isDefault: boolean;
}

/**
 * Authorized stations response
 */
export interface AuthorizedStationsResponse {
  /** Employee ID */
  empId: number;
  /** List of authorized stations */
  stations: StationOption[];
}

/**
 * Station selection request
 */
export interface StationSelectRequest {
  /** Machine code to select */
  stationCode: string;
}

/**
 * Station selection response
 */
export interface StationSelectResponse {
  /** Whether selection was successful */
  success: boolean;
  /** Complete session information */
  session: MESSession;
}

/**
 * Session info response (for checking current session)
 */
export interface SessionInfoResponse {
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Whether station is selected */
  isStationSelected: boolean;
  /** Session details (if authenticated) */
  session: MESSession | null;
}

/**
 * Logout response
 */
export interface LogoutResponse {
  /** Whether logout was successful */
  success: boolean;
}
