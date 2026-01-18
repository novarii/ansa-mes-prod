import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { WorkOrderService, WorkOrderQueryFilters } from './work-order.service';
import { CurrentUser } from '@org/feature-auth';
import type {
  MESSession,
  WorkOrderListResponse,
  WorkOrderDetailResponse,
  CustomerFilterOption,
  PickListResponse,
} from '@org/shared-types';

/**
 * Query parameters for work order list endpoint
 */
interface WorkOrderListQuery {
  customerCode?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * WorkOrderController handles work order API endpoints.
 *
 * Endpoints:
 * - GET /work-orders - Paginated list with filters
 * - GET /work-orders/filters/customers - Customer dropdown data
 * - GET /work-orders/:docEntry - Detail view
 * - GET /work-orders/:docEntry/pick-list - Read-only BOM materials
 *
 * All endpoints require authentication (station selected).
 *
 * @see specs/feature-production.md
 */
@Controller('work-orders')
export class WorkOrderController {
  constructor(private readonly workOrderService: WorkOrderService) {}

  /**
   * Get paginated list of work orders for the current station
   *
   * Station is determined from the authenticated user's session.
   *
   * @param user - Current user session (injected by AuthGuard)
   * @param query - Filter and pagination parameters
   */
  @Get()
  async getWorkOrders(
    @CurrentUser() user: MESSession,
    @Query() query: WorkOrderListQuery
  ): Promise<WorkOrderListResponse> {
    // Verify station is selected
    if (!user.stationCode || user.stationCode.trim() === '') {
      throw new BadRequestException('Istasyon secimi gereklidir');
    }

    const filters: WorkOrderQueryFilters = {
      customerCode: query.customerCode,
      search: query.search,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    };

    return this.workOrderService.getWorkOrders(user.stationCode, filters);
  }

  /**
   * Get customer filter options for dropdown
   *
   * Returns distinct customers with active work orders.
   */
  @Get('filters/customers')
  async getCustomerFilterOptions(): Promise<CustomerFilterOption[]> {
    return this.workOrderService.getCustomerFilterOptions();
  }

  /**
   * Get work order detail by DocEntry
   *
   * @param docEntry - Work order DocEntry (primary key)
   */
  @Get(':docEntry')
  async getWorkOrderDetail(
    @Param('docEntry', ParseIntPipe) docEntry: number
  ): Promise<WorkOrderDetailResponse> {
    return this.workOrderService.getWorkOrderDetail(docEntry);
  }

  /**
   * Get pick list (BOM materials) for a work order
   *
   * The pick list is READ-ONLY in MES - material issues are done in SAP B1.
   *
   * @param docEntry - Work order DocEntry
   */
  @Get(':docEntry/pick-list')
  async getPickList(
    @Param('docEntry', ParseIntPipe) docEntry: number
  ): Promise<PickListResponse> {
    return this.workOrderService.getPickList(docEntry);
  }
}
