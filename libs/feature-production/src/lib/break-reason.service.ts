import { Injectable } from '@nestjs/common';
import { BreakReasonRepository } from '@org/data-access';

/**
 * Break reason DTO for API response
 */
export interface BreakReasonDto {
  /** Break reason code (e.g., "1", "73") */
  code: string;
  /** Break reason description */
  name: string;
}

/**
 * Break Reason Service
 *
 * Provides access to break reason codes for activity tracking.
 * Workers must select a break reason when stopping (DUR) work.
 *
 * CRITICAL: Store the Code field, NOT the Name/description text.
 *
 * @see specs/feature-production.md
 */
@Injectable()
export class BreakReasonService {
  constructor(private readonly breakReasonRepository: BreakReasonRepository) {}

  /**
   * Get all break reasons
   *
   * Returns all predefined break codes from @BREAKREASON table.
   *
   * @returns Array of break reason DTOs
   */
  async getAllBreakReasons(): Promise<BreakReasonDto[]> {
    const breakReasons = await this.breakReasonRepository.findAll();

    return breakReasons.map((br) => ({
      code: br.Code,
      name: br.Name,
    }));
  }

  /**
   * Search break reasons by name
   *
   * @param searchText - Text to search in break reason names
   * @returns Array of matching break reason DTOs
   */
  async searchBreakReasons(searchText: string): Promise<BreakReasonDto[]> {
    const breakReasons = await this.breakReasonRepository.search(searchText);

    return breakReasons.map((br) => ({
      code: br.Code,
      name: br.Name,
    }));
  }
}
