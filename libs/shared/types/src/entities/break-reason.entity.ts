/**
 * Break Reason Entity
 *
 * Represents a break reason code from @BREAKREASON table.
 * Used when workers pause (DUR) their activity.
 *
 * CRITICAL: Always store the Code field, NOT the Name/description text.
 *
 * @see specs/feature-production.md
 */

/**
 * Break reason entity interface matching @BREAKREASON table structure
 */
export interface BreakReason {
  /** Break reason code (e.g., "1", "4", "73") - PK required by SAP UDT */
  Code: string;
  /** Break reason description in Turkish */
  Name: string;
}

/**
 * Common break reason codes for reference
 */
export const CommonBreakCodes = {
  /** Mola - Break */
  BREAK: '1',
  /** Yemek - Meal */
  MEAL: '2',
  /** Urun Degisikligi - Product Change */
  PRODUCT_CHANGE: '4',
  /** Malzeme Bekleme - Waiting for Material */
  WAITING_MATERIAL: '10',
  /** Ariza - Machine Breakdown */
  BREAKDOWN: '20',
  /** Kalite Kontrol - Quality Check */
  QUALITY_CHECK: '30',
  /** Personel Degisimi - Personnel Change */
  PERSONNEL_CHANGE: '73',
} as const;

/**
 * Break reason category for grouping in UI
 */
export interface BreakReasonCategory {
  /** Category name */
  category: string;
  /** Break reasons in this category */
  reasons: BreakReason[];
}
