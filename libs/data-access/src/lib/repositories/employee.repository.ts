import { Injectable } from '@nestjs/common';
import { HanaService, QueryParam } from '../hana.service';
import { Employee, EmployeeWithAuth, EmployeeInfo } from '@org/shared-types';

/**
 * Employee Repository
 *
 * Provides data access for employee records from OHEM table.
 * Used for authentication and worker identification.
 *
 * @see specs/user-permission-model.md
 * @see specs/data-access-layer.md
 */
@Injectable()
export class EmployeeRepository {
  constructor(private readonly hanaService: HanaService) {}

  /**
   * Find employee by ID with password for authentication
   *
   * @param empId - Employee ID
   * @returns Employee with password or null if not found
   */
  async findByIdWithPassword(empId: number): Promise<EmployeeWithAuth | null> {
    const sql = `
      SELECT
        "empID",
        "firstName",
        "lastName",
        "U_mainStation",
        "U_password"
      FROM "OHEM"
      WHERE "empID" = ?
    `;

    return this.hanaService.queryOne<EmployeeWithAuth>(sql, [empId]);
  }

  /**
   * Find employee by ID without password (safe for client)
   *
   * @param empId - Employee ID
   * @returns Employee or null if not found
   */
  async findById(empId: number): Promise<Employee | null> {
    const sql = `
      SELECT
        "empID",
        "firstName",
        "lastName",
        "U_mainStation"
      FROM "OHEM"
      WHERE "empID" = ?
    `;

    return this.hanaService.queryOne<Employee>(sql, [empId]);
  }

  /**
   * Find multiple employees by IDs with full name
   *
   * Used for displaying worker details in team view.
   *
   * @param empIds - Array of employee IDs
   * @returns Array of employee info with full names
   */
  async findByIds(empIds: number[]): Promise<EmployeeInfo[]> {
    if (empIds.length === 0) {
      return [];
    }

    const placeholders = empIds.map(() => '?').join(', ');
    const params: QueryParam[] = [...empIds];

    const sql = `
      SELECT
        "empID",
        ("firstName" || ' ' || "lastName") AS "fullName",
        "U_mainStation" AS "mainStation"
      FROM "OHEM"
      WHERE "empID" IN (${placeholders})
      ORDER BY "lastName", "firstName"
    `;

    return this.hanaService.query<EmployeeInfo>(sql, params);
  }

  /**
   * Find all employees
   *
   * @returns Array of all employees
   */
  async findAll(): Promise<Employee[]> {
    const sql = `
      SELECT
        "empID",
        "firstName",
        "lastName",
        "U_mainStation"
      FROM "OHEM"
      ORDER BY "lastName", "firstName"
    `;

    return this.hanaService.query<Employee>(sql);
  }

  /**
   * Validate employee password/PIN
   *
   * NOTE: This is a simple string comparison. In production, consider
   * using proper password hashing (bcrypt, argon2, etc.).
   *
   * @param empId - Employee ID
   * @param password - Password/PIN to validate
   * @returns True if password matches, false otherwise
   */
  async validatePassword(empId: number, password: string): Promise<boolean> {
    const employee = await this.findByIdWithPassword(empId);

    if (!employee || !employee.U_password) {
      return false;
    }

    // Simple comparison - in production, use proper password hashing
    return employee.U_password === password;
  }
}
