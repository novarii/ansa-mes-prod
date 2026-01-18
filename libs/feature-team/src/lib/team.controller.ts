import { Controller, Get, Query } from '@nestjs/common';
import { TeamService } from './team.service';
import type {
  ShiftCode,
  TeamViewFilters,
  TeamViewResponse,
  ShiftListResponse,
} from '@org/shared-types';

/**
 * Query parameters for team view endpoint
 */
interface TeamViewQuery {
  shift?: ShiftCode | 'all';
}

/**
 * Team Controller handles team management API endpoints.
 *
 * Endpoints:
 * - GET /team - List machines with worker status
 * - GET /team/shifts - Get shift definitions
 *
 * All endpoints require authentication.
 *
 * @see specs/feature-team-calendar.md
 */
@Controller('team')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  /**
   * Get machines with worker status for team view
   *
   * Workers are classified as:
   * - Assigned: Currently working (BAS/DEV activity)
   * - Paused: On break (DUR activity)
   * - Available: Idle or finished (no activity or BIT)
   *
   * @param query - Filter parameters (shift)
   * @returns Team view response with machines and workers
   */
  @Get()
  async getTeamView(@Query() query: TeamViewQuery): Promise<TeamViewResponse> {
    const filters: TeamViewFilters = {
      shift: query.shift,
    };

    return this.teamService.getMachinesWithWorkerStatus(filters);
  }

  /**
   * Get shift definitions with current shift
   *
   * Returns all three shift definitions (A, B, C) with their time ranges
   * and indicates which shift is currently active.
   *
   * @returns Shift list with current shift indicator
   */
  @Get('shifts')
  getShifts(): ShiftListResponse {
    return this.teamService.getShifts();
  }
}
