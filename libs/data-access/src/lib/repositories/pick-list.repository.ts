import { Injectable } from '@nestjs/common';
import { HanaService } from '../hana.service';

/**
 * Pick list item representing a material in work order BOM
 */
export interface PickListItem {
  /** Material code */
  ItemCode: string;
  /** Material description */
  ItemName: string;
  /** Required quantity */
  PlannedQty: number;
  /** Already issued quantity */
  IssuedQty: number;
  /** Remaining quantity to issue */
  RemainingQty: number;
  /** Source warehouse */
  Warehouse: string;
  /** Unit of measure */
  UoM: string;
}

/**
 * Pick List Repository
 *
 * Provides data access for work order material lists from WOR1 table.
 * The pick list is READ-ONLY in MES - material issues are done in SAP B1.
 *
 * @see specs/feature-production.md
 * @see specs/data-access-layer.md
 */
@Injectable()
export class PickListRepository {
  constructor(private readonly hanaService: HanaService) {}

  /**
   * Find all materials for a work order
   *
   * Returns BOM components with planned, issued, and remaining quantities.
   * Only includes material items (ItemType = 4), not resources.
   *
   * @param docEntry - Work order DocEntry
   * @returns Array of pick list items ordered by line number
   */
  async findByWorkOrder(docEntry: number): Promise<PickListItem[]> {
    const sql = `
      SELECT
        T1."ItemCode",
        T2."ItemName",
        T1."PlannedQty",
        T1."IssuedQty",
        (T1."PlannedQty" - T1."IssuedQty") AS "RemainingQty",
        T1."wareHouse" AS "Warehouse",
        T2."InvntryUom" AS "UoM"
      FROM "OWOR" T0
      INNER JOIN "WOR1" T1 ON T0."DocEntry" = T1."DocEntry"
      INNER JOIN "OITM" T2 ON T1."ItemCode" = T2."ItemCode"
      WHERE T0."DocEntry" = ?
        AND T1."ItemType" = 4
      ORDER BY T1."LineNum"
    `;

    return this.hanaService.query<PickListItem>(sql, [docEntry]);
  }

  /**
   * Get materials that still need to be issued (RemainingQty > 0)
   *
   * Used to highlight pending materials in the UI.
   *
   * @param docEntry - Work order DocEntry
   * @returns Array of pending materials
   */
  async getPendingMaterials(docEntry: number): Promise<PickListItem[]> {
    const sql = `
      SELECT
        T1."ItemCode",
        T2."ItemName",
        T1."PlannedQty",
        T1."IssuedQty",
        (T1."PlannedQty" - T1."IssuedQty") AS "RemainingQty",
        T1."wareHouse" AS "Warehouse",
        T2."InvntryUom" AS "UoM"
      FROM "OWOR" T0
      INNER JOIN "WOR1" T1 ON T0."DocEntry" = T1."DocEntry"
      INNER JOIN "OITM" T2 ON T1."ItemCode" = T2."ItemCode"
      WHERE T0."DocEntry" = ?
        AND T1."ItemType" = 4
        AND T1."PlannedQty" > T1."IssuedQty"
      ORDER BY T1."LineNum"
    `;

    return this.hanaService.query<PickListItem>(sql, [docEntry]);
  }
}
