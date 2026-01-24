import { Injectable } from '@nestjs/common';
import { HanaService } from '../hana.service';

/**
 * Batch information for LIFO selection
 */
export interface BatchInfo {
  /** Material code */
  ItemCode: string;
  /** Batch/lot number */
  BatchNumber: string;
  /** Internal batch ID (AbsEntry) */
  BatchAbsEntry: number;
  /** Date batch was received into inventory */
  InDate: Date;
  /** Warehouse code */
  Warehouse: string;
  /** Available quantity in this batch */
  AvailableQty: number;
}

/**
 * Stock availability status for a material line in a work order
 */
export interface StockAvailability {
  /** WOR1 line number */
  LineNum: number;
  /** Material code */
  ItemCode: string;
  /** Material description */
  ItemName: string;
  /** Source warehouse from BOM */
  SourceWarehouse: string;
  /** Ratio of material per unit of output */
  BaseQty: number;
  /** Total planned quantity for this material */
  PlannedQty: number;
  /** Already issued quantity */
  IssuedQty: number;
  /** Remaining quantity to issue */
  RemainingToIssue: number;
  /** Available quantity in warehouse */
  AvailableInWarehouse: number;
  /** Status: 'OK' or 'INSUFFICIENT' */
  StockStatus: 'OK' | 'INSUFFICIENT';
  /** Shortage amount (0 if OK) */
  Shortage: number;
}

/**
 * Material requirement for a specific production entry
 */
export interface MaterialRequirement {
  /** WOR1 line number */
  LineNum?: number;
  /** Material code */
  ItemCode: string;
  /** Material description */
  ItemName: string;
  /** Source warehouse */
  Warehouse: string;
  /** Ratio of material per unit of output */
  BaseQty: number;
  /** Required quantity for this entry */
  RequiredQty: number;
  /** Available quantity in warehouse */
  AvailableQty: number;
  /** Shortage amount (0 if sufficient) */
  Shortage: number;
  /** Whether item requires batch selection */
  IsBatchManaged: boolean;
}

/**
 * Stock Repository
 *
 * Provides data access for stock/inventory queries supporting material backflush.
 * Implements LIFO (Last In, First Out) batch selection for automatic material consumption.
 *
 * @see specs/material-backflush.md
 * @see specs/data-access-layer.md
 */
@Injectable()
export class StockRepository {
  constructor(private readonly hanaService: HanaService) {}

  /**
   * Get available batches for an item in LIFO order
   *
   * Returns batches sorted by InDate DESC, AbsEntry DESC (newest first).
   * Used for LIFO batch selection during backflush.
   *
   * @param itemCode - Material code
   * @param warehouse - Warehouse code
   * @returns Batches ordered for LIFO consumption
   */
  async getAvailableBatches(
    itemCode: string,
    warehouse: string
  ): Promise<BatchInfo[]> {
    const sql = `
      SELECT
        b."ItemCode",
        b."DistNumber" AS "BatchNumber",
        b."AbsEntry" AS "BatchAbsEntry",
        b."InDate",
        bq."WhsCode" AS "Warehouse",
        bq."Quantity" AS "AvailableQty"
      FROM "OBTN" b
      INNER JOIN "OBTQ" bq
        ON b."AbsEntry" = bq."MdAbsEntry"
        AND b."ItemCode" = bq."ItemCode"
      WHERE b."ItemCode" = ?
        AND bq."WhsCode" = ?
        AND bq."Quantity" > 0
      ORDER BY b."InDate" DESC, b."AbsEntry" DESC
    `;

    return this.hanaService.query<BatchInfo>(sql, [itemCode, warehouse]);
  }

  /**
   * Get total available quantity for an item in a warehouse
   *
   * Sums all batch quantities. Used for quick stock checks.
   *
   * @param itemCode - Material code
   * @param warehouse - Warehouse code
   * @returns Total available quantity (0 if no stock)
   */
  async getTotalAvailableQty(
    itemCode: string,
    warehouse: string
  ): Promise<number> {
    const sql = `
      SELECT
        SUM(bq."Quantity") AS "TotalQty"
      FROM "OBTQ" bq
      WHERE bq."ItemCode" = ?
        AND bq."WhsCode" = ?
        AND bq."Quantity" > 0
    `;

    const result = await this.hanaService.queryOne<{ TotalQty: number | null }>(
      sql,
      [itemCode, warehouse]
    );

    return result?.TotalQty ?? 0;
  }

  /**
   * Get stock availability status for all materials in a work order
   *
   * Calculates remaining requirements and compares against available stock.
   * Used for pre-entry warnings on work order cards and pick list.
   *
   * @param docEntry - Work order DocEntry
   * @returns Stock availability for each material line
   */
  async getStockAvailabilityForWorkOrder(
    docEntry: number
  ): Promise<StockAvailability[]> {
    const sql = `
      SELECT
        wl."LineNum",
        wl."ItemCode",
        i."ItemName",
        wl."wareHouse" AS "SourceWarehouse",
        wl."BaseQty",
        wl."PlannedQty",
        wl."IssuedQty",
        (wl."PlannedQty" - wl."IssuedQty") AS "RemainingToIssue",
        COALESCE(stock."AvailableQty", 0) AS "AvailableInWarehouse",
        CASE
          WHEN COALESCE(stock."AvailableQty", 0) < (wl."PlannedQty" - wl."IssuedQty")
          THEN 'INSUFFICIENT'
          ELSE 'OK'
        END AS "StockStatus",
        CASE
          WHEN COALESCE(stock."AvailableQty", 0) < (wl."PlannedQty" - wl."IssuedQty")
          THEN (wl."PlannedQty" - wl."IssuedQty") - COALESCE(stock."AvailableQty", 0)
          ELSE 0
        END AS "Shortage"
      FROM "WOR1" wl
      INNER JOIN "OITM" i ON wl."ItemCode" = i."ItemCode"
      LEFT JOIN (
        SELECT
          bq."ItemCode",
          bq."WhsCode",
          SUM(bq."Quantity") AS "AvailableQty"
        FROM "OBTQ" bq
        WHERE bq."Quantity" > 0
        GROUP BY bq."ItemCode", bq."WhsCode"
      ) stock ON wl."ItemCode" = stock."ItemCode"
             AND wl."wareHouse" = stock."WhsCode"
      WHERE wl."DocEntry" = ?
        AND wl."ItemType" = 4
        AND i."InvntItem" = 'Y'
      ORDER BY wl."LineNum"
    `;

    return this.hanaService.query<StockAvailability>(sql, [docEntry]);
  }

  /**
   * Validate stock availability for a specific production entry quantity
   *
   * Returns only materials with insufficient stock (shortage > 0).
   * Empty result means all stock is sufficient.
   *
   * @param docEntry - Work order DocEntry
   * @param entryQty - Production quantity being entered (accepted + rejected)
   * @returns Materials with shortage (empty if all sufficient)
   */
  async validateStockForEntry(
    docEntry: number,
    entryQty: number
  ): Promise<MaterialRequirement[]> {
    const sql = `
      SELECT
        wl."LineNum",
        wl."ItemCode",
        i."ItemName",
        wl."wareHouse" AS "Warehouse",
        wl."BaseQty",
        (? * wl."BaseQty") AS "RequiredQty",
        COALESCE(stock."AvailableQty", 0) AS "AvailableQty",
        CASE
          WHEN COALESCE(stock."AvailableQty", 0) < (? * wl."BaseQty")
          THEN (? * wl."BaseQty") - COALESCE(stock."AvailableQty", 0)
          ELSE 0
        END AS "Shortage",
        CASE WHEN i."ManBtchNum" = 'Y' THEN true ELSE false END AS "IsBatchManaged"
      FROM "WOR1" wl
      INNER JOIN "OITM" i ON wl."ItemCode" = i."ItemCode"
      LEFT JOIN (
        SELECT
          bq."ItemCode",
          bq."WhsCode",
          SUM(bq."Quantity") AS "AvailableQty"
        FROM "OBTQ" bq
        WHERE bq."Quantity" > 0
        GROUP BY bq."ItemCode", bq."WhsCode"
      ) stock ON wl."ItemCode" = stock."ItemCode"
             AND wl."wareHouse" = stock."WhsCode"
      WHERE wl."DocEntry" = ?
        AND wl."ItemType" = 4
        AND i."InvntItem" = 'Y'
        AND COALESCE(stock."AvailableQty", 0) < (? * wl."BaseQty")
      ORDER BY wl."LineNum"
    `;

    return this.hanaService.query<MaterialRequirement>(sql, [
      entryQty,
      entryQty,
      entryQty,
      docEntry,
      entryQty,
    ]);
  }

  /**
   * Get all material requirements for a production entry
   *
   * Returns all materials with their required quantities for the given entry.
   * Used for building OIGE document lines during backflush.
   *
   * @param docEntry - Work order DocEntry
   * @param entryQty - Production quantity being entered (accepted + rejected)
   * @returns All material requirements with availability info
   */
  async getMaterialRequirements(
    docEntry: number,
    entryQty: number
  ): Promise<MaterialRequirement[]> {
    const sql = `
      SELECT
        wl."LineNum",
        wl."ItemCode",
        i."ItemName",
        wl."wareHouse" AS "Warehouse",
        wl."BaseQty",
        (? * wl."BaseQty") AS "RequiredQty",
        COALESCE(stock."AvailableQty", 0) AS "AvailableQty",
        CASE
          WHEN COALESCE(stock."AvailableQty", 0) < (? * wl."BaseQty")
          THEN (? * wl."BaseQty") - COALESCE(stock."AvailableQty", 0)
          ELSE 0
        END AS "Shortage",
        CASE WHEN i."ManBtchNum" = 'Y' THEN true ELSE false END AS "IsBatchManaged"
      FROM "WOR1" wl
      INNER JOIN "OITM" i ON wl."ItemCode" = i."ItemCode"
      LEFT JOIN (
        SELECT
          bq."ItemCode",
          bq."WhsCode",
          SUM(bq."Quantity") AS "AvailableQty"
        FROM "OBTQ" bq
        WHERE bq."Quantity" > 0
        GROUP BY bq."ItemCode", bq."WhsCode"
      ) stock ON wl."ItemCode" = stock."ItemCode"
             AND wl."wareHouse" = stock."WhsCode"
      WHERE wl."DocEntry" = ?
        AND wl."ItemType" = 4
        AND i."InvntItem" = 'Y'
      ORDER BY wl."LineNum"
    `;

    return this.hanaService.query<MaterialRequirement>(sql, [
      entryQty,
      entryQty,
      entryQty,
      docEntry,
    ]);
  }
}
