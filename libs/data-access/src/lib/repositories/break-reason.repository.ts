import { Injectable } from '@nestjs/common';
import { HanaService } from '../hana.service';
import { BreakReason } from '@org/shared-types';

/**
 * Break Reason Repository
 *
 * Provides data access for break reason codes from @BREAKREASON table.
 * Used when workers pause (DUR) their activity - must select a reason.
 *
 * CRITICAL: Always store the Code field, NOT the Name/description text.
 *
 * @see specs/feature-production.md
 * @see specs/data-access-layer.md
 */
@Injectable()
export class BreakReasonRepository {
  constructor(private readonly hanaService: HanaService) {}

  /**
   * Find all break reasons
   *
   * Returns all 78 predefined break codes from @BREAKREASON table.
   *
   * @returns Array of break reasons ordered by Name
   */
  async findAll(): Promise<BreakReason[]> {
    const sql = `
      SELECT
        "Code",
        "Name"
      FROM "@BREAKREASON"
      ORDER BY "Name"
    `;

    return this.hanaService.query<BreakReason>(sql);
  }

  /**
   * Find a break reason by code
   *
   * @param code - Break reason code (e.g., "1", "73")
   * @returns Break reason or null if not found
   */
  async findByCode(code: string): Promise<BreakReason | null> {
    const sql = `
      SELECT
        "Code",
        "Name"
      FROM "@BREAKREASON"
      WHERE "Code" = ?
    `;

    return this.hanaService.queryOne<BreakReason>(sql, [code]);
  }

  /**
   * Search break reasons by name
   *
   * Used for filtering in the break reason selection modal.
   *
   * @param searchText - Text to search in break reason names
   * @returns Array of matching break reasons
   */
  async search(searchText: string): Promise<BreakReason[]> {
    const sql = `
      SELECT
        "Code",
        "Name"
      FROM "@BREAKREASON"
      WHERE LOWER("Name") LIKE ?
      ORDER BY "Name"
    `;

    const pattern = `%${searchText.toLowerCase()}%`;
    return this.hanaService.query<BreakReason>(sql, [pattern]);
  }
}
