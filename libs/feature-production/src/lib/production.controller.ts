import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { CurrentUser } from '@org/feature-auth';
import type {
  MESSession,
  ActivityStateResponse,
  ActivityActionResponse,
  ActivityHistoryResponse,
  StopActivityRequest,
  ResumeActivityRequest,
  FinishActivityRequest,
  ProductionEntryRequest,
  ProductionEntryResponse,
} from '@org/shared-types';
import { ActivityService } from './activity.service';
import { ProductionEntryService } from './production-entry.service';
import { BreakReasonService, BreakReasonDto } from './break-reason.service';

/**
 * ProductionController handles production activity and entry endpoints.
 *
 * Activity Endpoints:
 * - GET /work-orders/:docEntry/activity-state - Current worker state
 * - POST /work-orders/:docEntry/activity/start - Start work (BAS)
 * - POST /work-orders/:docEntry/activity/stop - Stop work (DUR)
 * - POST /work-orders/:docEntry/activity/resume - Resume work (DEV)
 * - POST /work-orders/:docEntry/activity/finish - Finish work (BIT)
 * - GET /work-orders/:docEntry/activity-history - Activity log
 *
 * Production Entry Endpoints:
 * - POST /work-orders/:docEntry/production-entry - Report quantities
 *
 * Break Reason Endpoints:
 * - GET /break-reasons - List all break codes
 *
 * All endpoints require authentication (station selected).
 *
 * @see specs/feature-production.md
 */
@Controller()
export class ProductionController {
  constructor(
    private readonly activityService: ActivityService,
    private readonly productionEntryService: ProductionEntryService,
    private readonly breakReasonService: BreakReasonService
  ) {}

  // ==================== Activity Endpoints ====================

  /**
   * Get current activity state for the worker on a work order
   *
   * Used to determine which action buttons to show.
   *
   * @param user - Current user session
   * @param docEntry - Work order DocEntry
   */
  @Get('work-orders/:docEntry/activity-state')
  async getActivityState(
    @CurrentUser() user: MESSession,
    @Param('docEntry', ParseIntPipe) docEntry: number
  ): Promise<ActivityStateResponse> {
    return this.activityService.getWorkerState(docEntry, user.empID);
  }

  /**
   * Start work on a work order (BAS)
   *
   * @param user - Current user session
   * @param docEntry - Work order DocEntry
   */
  @Post('work-orders/:docEntry/activity/start')
  async startActivity(
    @CurrentUser() user: MESSession,
    @Param('docEntry', ParseIntPipe) docEntry: number
  ): Promise<ActivityActionResponse> {
    this.validateStationSelected(user);
    return this.activityService.startWork(docEntry, user.empID, user.stationCode);
  }

  /**
   * Stop work on a work order (DUR)
   *
   * Requires a break reason code.
   *
   * @param user - Current user session
   * @param docEntry - Work order DocEntry
   * @param body - Stop request with breakCode and optional notes
   */
  @Post('work-orders/:docEntry/activity/stop')
  async stopActivity(
    @CurrentUser() user: MESSession,
    @Param('docEntry', ParseIntPipe) docEntry: number,
    @Body() body: StopActivityRequest
  ): Promise<ActivityActionResponse> {
    this.validateStationSelected(user);

    if (!body.breakCode || body.breakCode.trim() === '') {
      throw new BadRequestException('Mola nedeni secimi gereklidir');
    }

    return this.activityService.stopWork(
      docEntry,
      user.empID,
      user.stationCode,
      body.breakCode,
      body.notes
    );
  }

  /**
   * Resume work on a work order (DEV)
   *
   * @param user - Current user session
   * @param docEntry - Work order DocEntry
   * @param body - Resume request with optional notes
   */
  @Post('work-orders/:docEntry/activity/resume')
  async resumeActivity(
    @CurrentUser() user: MESSession,
    @Param('docEntry', ParseIntPipe) docEntry: number,
    @Body() body: ResumeActivityRequest
  ): Promise<ActivityActionResponse> {
    this.validateStationSelected(user);
    return this.activityService.resumeWork(
      docEntry,
      user.empID,
      user.stationCode,
      body.notes
    );
  }

  /**
   * Finish work on a work order (BIT)
   *
   * @param user - Current user session
   * @param docEntry - Work order DocEntry
   * @param body - Finish request with optional notes
   */
  @Post('work-orders/:docEntry/activity/finish')
  async finishActivity(
    @CurrentUser() user: MESSession,
    @Param('docEntry', ParseIntPipe) docEntry: number,
    @Body() body: FinishActivityRequest
  ): Promise<ActivityActionResponse> {
    this.validateStationSelected(user);
    return this.activityService.finishWork(
      docEntry,
      user.empID,
      user.stationCode,
      body.notes
    );
  }

  /**
   * Get activity history for a work order
   *
   * @param docEntry - Work order DocEntry
   */
  @Get('work-orders/:docEntry/activity-history')
  async getActivityHistory(
    @Param('docEntry', ParseIntPipe) docEntry: number
  ): Promise<ActivityHistoryResponse> {
    return this.activityService.getActivityHistory(docEntry);
  }

  // ==================== Production Entry Endpoints ====================

  /**
   * Create production entry (report quantities)
   *
   * @param user - Current user session
   * @param docEntry - Work order DocEntry
   * @param body - Production entry with accepted and rejected quantities
   */
  @Post('work-orders/:docEntry/production-entry')
  async createProductionEntry(
    @CurrentUser() user: MESSession,
    @Param('docEntry', ParseIntPipe) docEntry: number,
    @Body() body: ProductionEntryRequest
  ): Promise<ProductionEntryResponse> {
    // Validate quantities first
    const validation = await this.productionEntryService.validateEntry(
      docEntry,
      body.acceptedQty,
      body.rejectedQty
    );

    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join('. '));
    }

    return this.productionEntryService.reportQuantity(
      docEntry,
      body.acceptedQty,
      body.rejectedQty,
      user.empID
    );
  }

  // ==================== Break Reason Endpoints ====================

  /**
   * Get all break reasons
   *
   * Used to populate the break reason selection modal.
   */
  @Get('break-reasons')
  async getBreakReasons(): Promise<BreakReasonDto[]> {
    return this.breakReasonService.getAllBreakReasons();
  }

  // ==================== Private Helpers ====================

  /**
   * Validate that a station has been selected
   */
  private validateStationSelected(user: MESSession): void {
    if (!user.stationCode || user.stationCode.trim() === '') {
      throw new BadRequestException('Istasyon secimi gereklidir');
    }
  }
}
