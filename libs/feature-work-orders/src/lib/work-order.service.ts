import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  WorkOrderRepository,
  PickListRepository,
  StockRepository,
} from '@org/data-access';
import type {
  WorkOrderListResponse,
  WorkOrderListItem,
  WorkOrderDetailResponse,
  CustomerFilterOption,
  PickListResponse,
  PickListItem,
} from '@org/shared-types';

/**
 * Convert a date to ISO string format
 * Handles both Date objects and string values
 */
function toISOString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

/**
 * Convert a nullable date to ISO string format or null
 */
function toISOStringOrNull(value: Date | string | null): string | null {
  if (value === null) {
    return null;
  }
  return toISOString(value);
}

/**
 * Filters for work order list query
 */
export interface WorkOrderQueryFilters {
  /** Customer code filter */
  customerCode?: string;
  /** Text search across DocNum, ItemCode, ProdName, CustomerName */
  search?: string;
  /** Page number (1-based) */
  page?: number;
  /** Items per page (default 20) */
  limit?: number;
}

/**
 * WorkOrderService handles work order retrieval and filtering.
 *
 * Only returns work orders with Status='R' (Released) as per MES requirements.
 * Work orders are filtered by station/machine code.
 *
 * @see specs/feature-production.md
 */
@Injectable()
export class WorkOrderService {
  constructor(
    private readonly workOrderRepository: WorkOrderRepository,
    private readonly pickListRepository: PickListRepository,
    private readonly stockRepository: StockRepository
  ) {}

  /**
   * Get paginated list of work orders for a station
   *
   * @param stationCode - Machine/station code (required)
   * @param filters - Optional filters for customer, search, and pagination
   * @returns Paginated work order list
   * @throws BadRequestException when stationCode is empty
   */
  async getWorkOrders(
    stationCode: string,
    filters: WorkOrderQueryFilters
  ): Promise<WorkOrderListResponse> {
    // Input validation
    if (!stationCode || stationCode.trim() === '') {
      throw new BadRequestException('Istasyon kodu gereklidir');
    }

    const { customerCode, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    // Query repository
    const workOrders = await this.workOrderRepository.findAll([stationCode], {
      customerCode,
      searchText: search,
      limit,
      offset,
    });

    // Transform to DTOs
    const items: WorkOrderListItem[] = workOrders.map((wo) => ({
      docEntry: wo.DocEntry,
      docNum: wo.DocNum,
      itemCode: wo.ItemCode,
      prodName: wo.ProdName,
      plannedQty: wo.PlannedQty,
      completedQty: wo.CmpltQty,
      rejectedQty: wo.RjctQty,
      remainingQty: wo.RemainingQty,
      progressPercent: wo.ProgressPercent,
      dueDate: toISOString(wo.DueDate),
      customerName: wo.CustomerName,
      machineCode: wo.MachineCode ?? '',
      machineName: wo.MachineName ?? '',
    }));

    // Calculate pagination
    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get detailed work order by DocEntry
   *
   * @param docEntry - Work order DocEntry (primary key)
   * @returns Work order detail
   * @throws NotFoundException when work order not found
   * @throws BadRequestException when docEntry is invalid
   */
  async getWorkOrderDetail(docEntry: number): Promise<WorkOrderDetailResponse> {
    // Input validation
    if (!docEntry || docEntry <= 0) {
      throw new BadRequestException('Gecersiz is emri numarasi');
    }

    const workOrder = await this.workOrderRepository.findByDocEntry(docEntry);

    if (!workOrder) {
      throw new NotFoundException('Is emri bulunamadi');
    }

    return {
      docEntry: workOrder.DocEntry,
      docNum: workOrder.DocNum,
      itemCode: workOrder.ItemCode,
      prodName: workOrder.ProdName,
      plannedQty: workOrder.PlannedQty,
      completedQty: workOrder.CmpltQty,
      rejectedQty: workOrder.RjctQty,
      remainingQty: workOrder.RemainingQty,
      progressPercent: workOrder.ProgressPercent,
      startDate: toISOString(workOrder.StartDate),
      dueDate: toISOString(workOrder.DueDate),
      releaseDate: toISOStringOrNull(workOrder.RlsDate),
      customerCode: workOrder.CardCode,
      customerName: workOrder.CustomerName,
      warehouse: workOrder.Warehouse,
      comments: workOrder.Comments,
      sortOrder: workOrder.U_StationSortOrder,
    };
  }

  /**
   * Get customer options for filter dropdown
   *
   * Returns distinct customers that have active (released) work orders.
   *
   * @returns Array of customer options
   */
  async getCustomerFilterOptions(): Promise<CustomerFilterOption[]> {
    const customers =
      await this.workOrderRepository.findCustomersWithActiveOrders();

    return customers.map((c) => ({
      code: c.CardCode,
      name: c.CardName,
    }));
  }

  /**
   * Get pick list (BOM materials) for a work order
   *
   * Includes stock availability status for each material to show
   * warnings when stock is insufficient.
   *
   * @param docEntry - Work order DocEntry
   * @returns Pick list with materials and stock status
   * @throws NotFoundException when work order not found
   * @throws BadRequestException when docEntry is invalid
   */
  async getPickList(docEntry: number): Promise<PickListResponse> {
    // Input validation
    if (!docEntry || docEntry <= 0) {
      throw new BadRequestException('Gecersiz is emri numarasi');
    }

    // Verify work order exists
    const workOrder = await this.workOrderRepository.findByDocEntry(docEntry);
    if (!workOrder) {
      throw new NotFoundException('Is emri bulunamadi');
    }

    // Get materials and stock availability
    const materials = await this.pickListRepository.findByWorkOrder(docEntry);
    const stockAvailability =
      await this.stockRepository.getStockAvailabilityForWorkOrder(docEntry);

    // Create a map for quick stock status lookup
    const stockMap = new Map(
      stockAvailability.map((s) => [s.ItemCode, s])
    );

    let hasStockWarning = false;

    const items: PickListItem[] = materials.map((m) => {
      const stock = stockMap.get(m.ItemCode);
      const stockStatus = stock?.StockStatus ?? 'OK';
      const availableQty = stock?.AvailableInWarehouse ?? 0;
      const shortage = stock?.Shortage ?? 0;

      if (stockStatus === 'INSUFFICIENT') {
        hasStockWarning = true;
      }

      return {
        itemCode: m.ItemCode,
        itemName: m.ItemName,
        plannedQty: m.PlannedQty,
        issuedQty: m.IssuedQty,
        remainingQty: m.RemainingQty,
        warehouse: m.Warehouse,
        uom: m.UoM,
        availableQty,
        stockStatus,
        shortage,
      };
    });

    return {
      docEntry,
      items,
      hasStockWarning,
    };
  }

  /**
   * Check stock status for a work order
   *
   * Used for quick stock availability checks on work order cards.
   *
   * @param docEntry - Work order DocEntry
   * @returns Whether any material has insufficient stock
   */
  async checkStockStatus(docEntry: number): Promise<boolean> {
    const stockAvailability =
      await this.stockRepository.getStockAvailabilityForWorkOrder(docEntry);

    return stockAvailability.some((s) => s.StockStatus === 'INSUFFICIENT');
  }
}
