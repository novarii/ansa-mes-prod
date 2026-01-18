import { Injectable } from '@nestjs/common';
import { HanaService, QueryParam } from '../hana.service';
import { WorkOrderWithDetails } from '@org/shared-types';

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
}
