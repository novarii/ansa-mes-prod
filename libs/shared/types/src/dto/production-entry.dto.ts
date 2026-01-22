/**
 * Production Entry DTOs
 *
 * Data Transfer Objects for production entry (quantity reporting).
 *
 * @see specs/feature-production.md
 */

/**
 * Production entry request
 */
export interface ProductionEntryRequest {
  /** Accepted (good) quantity */
  acceptedQty: number;
  /** Rejected (defective) quantity */
  rejectedQty: number;
}

/**
 * Production entry response
 */
export interface ProductionEntryResponse {
  /** Whether the entry was successful */
  success: boolean;
  /** Generated batch number for accepted goods */
  batchNumber: string | null;
  /** SAP document entry for accepted goods (OIGN) */
  acceptedDocEntry: number | null;
  /** SAP document entry for rejected goods (OIGN) */
  rejectedDocEntry: number | null;
  /** Updated work order quantities */
  workOrder: {
    docEntry: number;
    completedQty: number;
    rejectedQty: number;
    remainingQty: number;
    progressPercent: number;
  };
}

/**
 * Production entry validation result
 */
export interface ProductionEntryValidation {
  /** Is the entry valid? */
  isValid: boolean;
  /** Validation errors (empty if valid) */
  errors: string[];
  /** Remaining quantity after entry (if valid) */
  newRemainingQty?: number;
  /** Whether confirmation is needed (e.g., > 50% of remaining) */
  requiresConfirmation?: boolean;
  /** Confirmation message if needed */
  confirmationMessage?: string;
}

/**
 * Batch number generation result
 */
export interface BatchNumberResult {
  /** Generated batch number (e.g., ANS20261218042) */
  batchNumber: string;
  /** Date portion of the batch number */
  date: string;
  /** Sequence number for the day */
  sequence: number;
}
