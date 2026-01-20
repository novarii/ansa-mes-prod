import { Injectable } from '@nestjs/common';
import { HanaService } from '../hana.service';
import { Machine, MachineWithAuthStatus } from '@org/shared-types';

/**
 * Worker info with authorization status
 */
export interface WorkerForMachine {
  empID: number;
  firstName: string;
  lastName: string;
  IsDefault: boolean;
}

/**
 * Resource Repository
 *
 * Provides data access for machine/resource records from ORSC table.
 * Handles machine-centric authorization queries.
 *
 * @see specs/user-permission-model.md
 * @see specs/data-access-layer.md
 */
@Injectable()
export class ResourceRepository {
  constructor(private readonly hanaService: HanaService) {}

  /**
   * Find all machines that a worker is authorized to access
   *
   * Uses the CSV membership pattern to check U_secondEmp field:
   * ',' || "U_secondEmp" || ',' LIKE '%,' || :empID || ',%'
   *
   * @param empId - Employee ID
   * @returns Array of machines with authorization status
   *
   * @example
   * const machines = await resourceRepo.findAuthorizedMachinesForWorker(200);
   * // Returns machines where empId 200 is in U_secondEmp or U_defaultEmp
   */
  async findAuthorizedMachinesForWorker(
    empId: number
  ): Promise<MachineWithAuthStatus[]> {
    const empIdStr = String(empId);

    const sql = `
      SELECT
        "ResCode",
        "ResName",
        "ResType",
        "U_defaultEmp",
        "U_secondEmp",
        CASE
          WHEN "U_defaultEmp" = ? THEN TRUE
          ELSE FALSE
        END AS "IsDefault",
        TRUE AS "IsAuthorized"
      FROM "ORSC"
      WHERE "ResType" = 'M'
        AND (
          ',' || "U_secondEmp" || ',' LIKE '%,' || ? || ',%'
          OR "U_defaultEmp" = ?
        )
      ORDER BY "ResName"
    `;

    return this.hanaService.query<MachineWithAuthStatus>(sql, [
      empIdStr,
      empIdStr,
      empIdStr,
    ]);
  }

  /**
   * Find all workers authorized for a specific machine
   *
   * @param resCode - Machine resource code
   * @returns Array of workers with their authorization status
   */
  async findWorkersForMachine(resCode: string): Promise<WorkerForMachine[]> {
    const sql = `
      SELECT
        e."empID",
        e."firstName",
        e."lastName",
        CASE
          WHEN r."U_defaultEmp" = CAST(e."empID" AS VARCHAR) THEN TRUE
          ELSE FALSE
        END AS "IsDefault"
      FROM "OHEM" e
      INNER JOIN "ORSC" r ON r."ResType" = 'M' AND r."ResCode" = ?
      WHERE ',' || r."U_secondEmp" || ',' LIKE '%,' || CAST(e."empID" AS VARCHAR) || ',%'
         OR r."U_defaultEmp" = CAST(e."empID" AS VARCHAR)
      ORDER BY "IsDefault" DESC, e."lastName", e."firstName"
    `;

    return this.hanaService.query<WorkerForMachine>(sql, [resCode]);
  }

  /**
   * Check if a worker is authorized for a specific machine
   *
   * @param empId - Employee ID
   * @param resCode - Machine resource code
   * @returns True if authorized, false otherwise
   */
  async isWorkerAuthorizedForMachine(
    empId: number,
    resCode: string
  ): Promise<boolean> {
    const empIdStr = String(empId);

    const sql = `
      SELECT COUNT(*) AS "count"
      FROM "ORSC"
      WHERE "ResType" = 'M'
        AND "ResCode" = ?
        AND (
          ',' || "U_secondEmp" || ',' LIKE '%,' || ? || ',%'
          OR "U_defaultEmp" = ?
        )
    `;

    const result = await this.hanaService.queryOne<{ count: number }>(sql, [
      resCode,
      empIdStr,
      empIdStr,
    ]);

    return (result?.count ?? 0) > 0;
  }

  /**
   * Find all machines (for dropdowns, team view, etc.)
   *
   * @returns Array of all machine resources
   */
  async findAllMachines(): Promise<Machine[]> {
    const sql = `
      SELECT
        "ResCode",
        "ResName",
        "ResType",
        "U_defaultEmp",
        "U_secondEmp"
      FROM "ORSC"
      WHERE "ResType" = 'M'
      ORDER BY "ResName"
    `;

    return this.hanaService.query<Machine>(sql);
  }

  /**
   * Find all workers for ALL machines in a single query (batch operation)
   *
   * DEPRECATED: This uses ORSC.U_secondEmp which shows WHO CAN work on a machine.
   * For team view, use findAllAssignedWorkers() which uses OHEM.U_mainStation
   * to show WHO IS CURRENTLY assigned to a machine.
   *
   * @returns Array of workers with their machine capability
   */
  async findAllWorkersForAllMachines(): Promise<
    Array<WorkerForMachine & { ResCode: string }>
  > {
    const sql = `
      SELECT
        r."ResCode",
        e."empID",
        e."firstName",
        e."lastName",
        CASE
          WHEN r."U_defaultEmp" = CAST(e."empID" AS VARCHAR) THEN TRUE
          ELSE FALSE
        END AS "IsDefault"
      FROM "OHEM" e
      INNER JOIN "ORSC" r ON r."ResType" = 'M'
      WHERE ',' || r."U_secondEmp" || ',' LIKE '%,' || CAST(e."empID" AS VARCHAR) || ',%'
         OR r."U_defaultEmp" = CAST(e."empID" AS VARCHAR)
      ORDER BY r."ResCode", "IsDefault" DESC, e."lastName", e."firstName"
    `;

    return this.hanaService.query<WorkerForMachine & { ResCode: string }>(sql);
  }

  /**
   * Find all workers with their CURRENT machine assignment from OHEM.U_mainStation
   *
   * This is the correct source for team view:
   * - U_mainStation = machine they're currently assigned to
   * - NULL U_mainStation = "Bosta" (idle/unassigned)
   *
   * @returns Array of all active employees with their assignment
   */
  async findAllAssignedWorkers(): Promise<
    Array<{
      empID: number;
      firstName: string;
      lastName: string;
      jobTitle: string | null;
      mainStation: string | null;
    }>
  > {
    const sql = `
      SELECT
        "empID",
        "firstName",
        "lastName",
        "jobTitle",
        "U_mainStation" AS "mainStation"
      FROM "OHEM"
      WHERE "Active" = 'Y'
      ORDER BY "lastName", "firstName"
    `;

    return this.hanaService.query<{
      empID: number;
      firstName: string;
      lastName: string;
      jobTitle: string | null;
      mainStation: string | null;
    }>(sql);
  }

  /**
   * Find a single machine by code
   *
   * @param resCode - Machine resource code
   * @returns Machine or null if not found
   */
  async findByResCode(resCode: string): Promise<Machine | null> {
    const sql = `
      SELECT
        "ResCode",
        "ResName",
        "ResType",
        "U_defaultEmp",
        "U_secondEmp"
      FROM "ORSC"
      WHERE "ResType" = 'M'
        AND "ResCode" = ?
    `;

    return this.hanaService.queryOne<Machine>(sql, [resCode]);
  }
}
