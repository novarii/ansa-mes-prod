/**
 * Work Order Entity
 *
 * Represents a production order from SAP B1 (OWOR table).
 * Only orders with Status='R' (Released) are shown in MES.
 *
 * @see specs/feature-production.md
 * @see specs/entity-repository-patterns.md
 */

/**
 * Work order status codes as defined in SAP B1
 */
export type WorkOrderStatusCode = 'P' | 'R' | 'L' | 'C';

/**
 * Work order status mapping
 */
export const WorkOrderStatusMap = {
  P: 'planned',
  R: 'released',
  L: 'closed',
  C: 'cancelled',
} as const;

export type WorkOrderStatus = (typeof WorkOrderStatusMap)[WorkOrderStatusCode];

/**
 * Work Order entity interface matching OWOR table structure
 */
export interface WorkOrder {
  /** Primary key (internal) */
  DocEntry: number;
  /** User-facing order number */
  DocNum: number;
  /** Product code */
  ItemCode: string;
  /** Product name/description */
  ProdName: string;
  /** Target quantity to produce */
  PlannedQty: number;
  /** Completed (accepted) quantity */
  CmpltQty: number;
  /** Rejected quantity */
  RjctQty: number;
  /** Planned start date */
  StartDate: Date | string;
  /** Due date */
  DueDate: Date | string;
  /** Release date */
  RlsDate: Date | string | null;
  /** Work order status code */
  Status: WorkOrderStatusCode;
  /** Customer code (FK to OCRD) */
  CardCode: string | null;
  /** Sorting priority (UDF) */
  U_StationSortOrder: number | null;
  /** Target warehouse */
  Warehouse: string;
  /** Comments/notes */
  Comments: string | null;
}

/**
 * Extended work order with calculated and joined fields
 */
export interface WorkOrderWithDetails extends WorkOrder {
  /** Calculated: PlannedQty - CmpltQty */
  RemainingQty: number;
  /** Calculated: (CmpltQty / PlannedQty) * 100 */
  ProgressPercent: number;
  /** Joined from OCRD.CardName */
  CustomerName: string | null;
  /** Joined from ORSC.ResCode */
  MachineCode: string | null;
  /** Joined from ORSC.ResName */
  MachineName: string | null;
}

/**
 * Type for creating a new work order (omit auto-generated fields)
 */
export type CreateWorkOrder = Omit<WorkOrder, 'DocEntry'>;

/**
 * Type for updating a work order (partial, omit immutable fields)
 */
export type UpdateWorkOrder = Partial<Omit<WorkOrder, 'DocEntry' | 'DocNum'>>;
