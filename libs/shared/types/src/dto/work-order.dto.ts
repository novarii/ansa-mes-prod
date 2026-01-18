/**
 * Work Order DTOs
 *
 * Data Transfer Objects for work order API requests and responses.
 * These are pure TypeScript interfaces for the shared types library.
 * Validation decorators are added in the API feature library.
 *
 * @see specs/feature-production.md
 * @see specs/entity-repository-patterns.md
 */

/**
 * Work order list request filters
 */
export interface WorkOrderListFilters {
  /** Station/machine code (required) */
  stationCode: string;
  /** Customer code filter (optional) */
  customerCode?: string;
  /** Text search across DocNum, ItemCode, ProdName, CustomerName */
  search?: string;
  /** Page number (1-based) */
  page?: number;
  /** Items per page (default 20) */
  limit?: number;
}

/**
 * Work order list response item
 */
export interface WorkOrderListItem {
  /** Internal document entry ID */
  docEntry: number;
  /** User-facing order number */
  docNum: number;
  /** Product code */
  itemCode: string;
  /** Product name */
  prodName: string;
  /** Target quantity */
  plannedQty: number;
  /** Completed quantity */
  completedQty: number;
  /** Rejected quantity */
  rejectedQty: number;
  /** Remaining quantity */
  remainingQty: number;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** Due date (ISO format) */
  dueDate: string;
  /** Customer name */
  customerName: string | null;
  /** Machine code */
  machineCode: string;
  /** Machine name */
  machineName: string;
}

/**
 * Paginated work order list response
 */
export interface WorkOrderListResponse {
  /** List of work orders */
  items: WorkOrderListItem[];
  /** Total count for pagination */
  total: number;
  /** Current page (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total pages */
  totalPages: number;
}

/**
 * Work order detail response
 */
export interface WorkOrderDetailResponse {
  /** Internal document entry ID */
  docEntry: number;
  /** User-facing order number */
  docNum: number;
  /** Product code */
  itemCode: string;
  /** Product name */
  prodName: string;
  /** Target quantity */
  plannedQty: number;
  /** Completed quantity */
  completedQty: number;
  /** Rejected quantity */
  rejectedQty: number;
  /** Remaining quantity */
  remainingQty: number;
  /** Progress percentage */
  progressPercent: number;
  /** Start date (ISO format) */
  startDate: string;
  /** Due date (ISO format) */
  dueDate: string;
  /** Release date (ISO format or null) */
  releaseDate: string | null;
  /** Customer code */
  customerCode: string | null;
  /** Customer name */
  customerName: string | null;
  /** Target warehouse */
  warehouse: string;
  /** Comments/notes */
  comments: string | null;
  /** Sorting priority */
  sortOrder: number | null;
}

/**
 * Customer filter option for dropdown
 */
export interface CustomerFilterOption {
  /** Customer code */
  code: string;
  /** Customer name */
  name: string;
}

/**
 * Pick list item (BOM component)
 */
export interface PickListItem {
  /** Material code */
  itemCode: string;
  /** Material name */
  itemName: string;
  /** Required quantity */
  plannedQty: number;
  /** Already issued quantity */
  issuedQty: number;
  /** Remaining to issue */
  remainingQty: number;
  /** Source warehouse */
  warehouse: string;
  /** Unit of measure */
  uom: string;
}

/**
 * Pick list response
 */
export interface PickListResponse {
  /** Work order doc entry */
  docEntry: number;
  /** List of materials */
  items: PickListItem[];
}
