import { Injectable } from '@nestjs/common';
import { HanaService, QueryParam } from '../hana.service';
import { WorkOrderWithDetails, WorkOrderStatusCode } from '@org/shared-types';

/**
 * Filter options for work order queries
 */
export interface WorkOrderFilters {
  /** Filter by customer code */
  customerCode?: string;
  /** Text search across DocNum, ItemCode, ProdName, CustomerName */
  searchText?: string;
  /** Limit for pagination */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Customer with active orders for filter dropdown
 */
export interface CustomerOption {
  CardCode: string;
  CardName: string;
}

/**
 * Filter options for calendar work order queries
 */
export interface CalendarWorkOrderFilters {
  /** Start date (ISO format, required) */
  startDate: string;
  /** End date (ISO format, required) */
  endDate: string;
  /** Station/machine filter (optional) */
  stationCode?: string;
  /** Status filter (optional, default excludes cancelled) */
  status?: WorkOrderStatusCode | 'all';
}

/**
 * Work order data for calendar view
 */
export interface CalendarWorkOrder {
  DocEntry: number;
  DocNum: number;
  ItemCode: string;
  ItemName: string;
  StartDate: string | Date;
  DueDate: string | Date;
  Status: WorkOrderStatusCode;
  CardCode: string | null;
  CustomerName: string | null;
  MachineCode: string | null;
  MachineName: string | null;
}

/**
 * Work Order Repository
 *
 * Provides data access for work orders from SAP HANA.
 * Only returns orders with Status='R' (Released) as per MES requirements.
 *
 * @see specs/feature-production.md
 * @see specs/data-access-layer.md
 */
@Injectable()
export class WorkOrderRepository {
  constructor(private readonly hanaService: HanaService) {}

  /**
   * Find all work orders for specified station/machine codes
   *
   * @param stationCodes - Array of ResCode values (machine codes)
   * @param filters - Optional filters for customer, search, and pagination
   * @returns Array of work orders with details
   *
   * @example
   * const orders = await workOrderRepo.findAll(
   *   ['1001 - BARMAG 1', '1002 - BARMAG 2'],
   *   { customerCode: 'C001', searchText: 'widget', limit: 20, offset: 0 }
   * );
   */
  async findAll(
    stationCodes: string[],
    filters: WorkOrderFilters = {}
  ): Promise<WorkOrderWithDetails[]> {
    const { customerCode, searchText, limit = 50, offset = 0 } = filters;
    const params: QueryParam[] = [];

    // Build station placeholders
    const stationPlaceholders = stationCodes.map(() => '?').join(', ');
    params.push(...stationCodes);

    // Build WHERE conditions
    const conditions: string[] = [
      'T0."Status" = \'R\'',
      `T2."ResCode" IN (${stationPlaceholders})`,
    ];

    if (customerCode) {
      conditions.push('T0."CardCode" = ?');
      params.push(customerCode);
    }

    if (searchText) {
      const searchLower = searchText.toLowerCase();
      conditions.push(`(
        LOWER(CAST(T0."DocNum" AS VARCHAR)) LIKE ?
        OR LOWER(T0."ItemCode") LIKE ?
        OR LOWER(T0."ProdName") LIKE ?
        OR LOWER(T3."CardName") LIKE ?
      )`);
      const searchPattern = `%${searchLower}%`;
      params.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    // Add pagination params
    params.push(limit, offset);

    const sql = `
      SELECT
        T0."DocEntry",
        T0."DocNum",
        T0."ItemCode",
        T0."ProdName",
        T0."PlannedQty",
        T0."CmpltQty",
        T0."RjctQty",
        (T0."PlannedQty" - T0."CmpltQty") AS "RemainingQty",
        CASE
          WHEN T0."PlannedQty" > 0
          THEN ROUND((T0."CmpltQty" / T0."PlannedQty") * 100, 1)
          ELSE 0
        END AS "ProgressPercent",
        T0."StartDate",
        T0."DueDate",
        T0."RlsDate",
        T0."Status",
        T0."CardCode",
        T3."CardName" AS "CustomerName",
        T0."U_StationSortOrder",
        T0."Warehouse",
        T0."Comments",
        T2."ResCode" AS "MachineCode",
        T2."ResName" AS "MachineName"
      FROM "OWOR" T0
      INNER JOIN "ITT1" T1 ON T0."ItemCode" = T1."Father" AND T1."Type" = 290
      INNER JOIN "ORSC" T2 ON T1."Code" = T2."ResCode"
      LEFT JOIN "OCRD" T3 ON T0."CardCode" = T3."CardCode"
      WHERE ${conditions.join(' AND ')}
      ORDER BY
        T2."ResCode" ASC,
        COALESCE(T0."U_StationSortOrder", 9999) ASC,
        T0."DueDate" ASC
      LIMIT ? OFFSET ?
    `;

    return this.hanaService.query<WorkOrderWithDetails>(sql, params);
  }

  /**
   * Find a single work order by DocEntry with full details
   *
   * @param docEntry - Work order DocEntry (primary key)
   * @returns Work order with details or null if not found
   */
  async findByDocEntry(docEntry: number): Promise<WorkOrderWithDetails | null> {
    const sql = `
      SELECT
        T0."DocEntry",
        T0."DocNum",
        T0."ItemCode",
        T0."ProdName",
        T0."PlannedQty",
        T0."CmpltQty",
        T0."RjctQty",
        (T0."PlannedQty" - T0."CmpltQty") AS "RemainingQty",
        CASE
          WHEN T0."PlannedQty" > 0
          THEN ROUND((T0."CmpltQty" / T0."PlannedQty") * 100, 1)
          ELSE 0
        END AS "ProgressPercent",
        T0."StartDate",
        T0."DueDate",
        T0."RlsDate",
        T0."Status",
        T0."CardCode",
        T3."CardName" AS "CustomerName",
        T0."U_StationSortOrder",
        T0."Warehouse",
        T0."Comments",
        T2."ResCode" AS "MachineCode",
        T2."ResName" AS "MachineName"
      FROM "OWOR" T0
      LEFT JOIN "ITT1" T1 ON T0."ItemCode" = T1."Father" AND T1."Type" = 290
      LEFT JOIN "ORSC" T2 ON T1."Code" = T2."ResCode"
      LEFT JOIN "OCRD" T3 ON T0."CardCode" = T3."CardCode"
      WHERE T0."DocEntry" = ?
    `;

    return this.hanaService.queryOne<WorkOrderWithDetails>(sql, [docEntry]);
  }

  /**
   * Find distinct customers that have active (released) work orders
   *
   * Used to populate the customer filter dropdown in the work order list.
   *
   * @returns Array of customer options with CardCode and CardName
   */
  async findCustomersWithActiveOrders(): Promise<CustomerOption[]> {
    const sql = `
      SELECT DISTINCT
        T0."CardCode",
        T1."CardName"
      FROM "OWOR" T0
      INNER JOIN "OCRD" T1 ON T0."CardCode" = T1."CardCode"
      WHERE T0."Status" = 'R'
        AND T0."CardCode" IS NOT NULL
      ORDER BY T1."CardName"
    `;

    return this.hanaService.query<CustomerOption>(sql);
  }

  /**
   * Find work orders for calendar view within a date range
   *
   * Returns work orders that fall within the specified date range,
   * optionally filtered by station and status.
   *
   * @param filters - Calendar filters (startDate, endDate, stationCode, status)
   * @returns Array of work orders for calendar display
   *
   * @see specs/feature-team-calendar.md
   */
  async findForCalendar(
    filters: CalendarWorkOrderFilters
  ): Promise<CalendarWorkOrder[]> {
    const { startDate, endDate, stationCode, status } = filters;
    const params: QueryParam[] = [endDate, startDate];

    // Build WHERE conditions for date range overlap:
    // Work order overlaps if it starts before filter ends AND ends after filter starts
    const conditions: string[] = [
      'T0."StartDate" <= ?',  // starts before or on filter end date
      'T0."DueDate" >= ?',    // ends on or after filter start date
    ];

    // Filter by status (default: exclude cancelled)
    if (status && status !== 'all') {
      conditions.push('T0."Status" = ?');
      params.push(status);
    } else if (!status) {
      // By default, exclude cancelled orders
      conditions.push('T0."Status" != \'C\'');
    }

    // Optional station filter
    if (stationCode) {
      conditions.push('T2."ResCode" = ?');
      params.push(stationCode);
    }

    const sql = `
      SELECT
        T0."DocEntry",
        T0."DocNum",
        T0."ItemCode",
        T4."ItemName",
        T0."StartDate",
        T0."DueDate",
        T0."Status",
        T0."CardCode",
        T3."CardName" AS "CustomerName",
        T2."ResCode" AS "MachineCode",
        T2."ResName" AS "MachineName"
      FROM "OWOR" T0
      LEFT JOIN "ITT1" T1 ON T0."ItemCode" = T1."Father" AND T1."Type" = 290
      LEFT JOIN "ORSC" T2 ON T1."Code" = T2."ResCode"
      LEFT JOIN "OCRD" T3 ON T0."CardCode" = T3."CardCode"
      LEFT JOIN "OITM" T4 ON T0."ItemCode" = T4."ItemCode"
      WHERE ${conditions.join(' AND ')}
      ORDER BY T0."StartDate" ASC, T0."DueDate" ASC
    `;

    return this.hanaService.query<CalendarWorkOrder>(sql, params);
  }
}
