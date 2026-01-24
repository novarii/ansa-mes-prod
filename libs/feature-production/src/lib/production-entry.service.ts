import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  WorkOrderRepository,
  ServiceLayerService,
  HanaService,
} from '@org/data-access';
import {
  ProductionEntryResponse,
  ProductionEntryValidation,
  BatchNumberResult,
} from '@org/shared-types';
import { BackflushService, InsufficientStockError } from './backflush.service';

/**
 * Result from batch sequence query
 */
interface BatchSequenceResult {
  maxSeq: number | null;
}

/**
 * Production Entry Service
 *
 * Handles production quantity reporting (accepted/rejected goods).
 * Creates goods receipts in SAP via Service Layer.
 *
 * Warehouse routing:
 * - Accepted goods → WorkOrder.Warehouse (typically '03' or 'SD')
 * - Rejected goods → 'FRD' (Fire Depo / scrap warehouse)
 *
 * Batch numbering: ANS{YYYYMMDD}{Sequence} (e.g., ANS20261218042)
 *
 * @see specs/feature-production.md
 * @see specs/b1-integration-workflows.md
 */
@Injectable()
export class ProductionEntryService {
  private readonly logger = new Logger(ProductionEntryService.name);

  /** Warehouse code for rejected/scrap goods */
  private readonly REJECT_WAREHOUSE = 'FRD';

  /** SAP base type for Production Order */
  private readonly BASE_TYPE_PRODUCTION_ORDER = 202;

  constructor(
    private readonly workOrderRepository: WorkOrderRepository,
    private readonly serviceLayerService: ServiceLayerService,
    private readonly hanaService: HanaService,
    private readonly backflushService: BackflushService
  ) {}

  /**
   * Validate production entry quantities
   *
   * @param docEntry - Work order DocEntry
   * @param acceptedQty - Quantity of good products
   * @param rejectedQty - Quantity of defective products
   * @returns Validation result with any errors or confirmation requirements
   */
  async validateEntry(
    docEntry: number,
    acceptedQty: number,
    rejectedQty: number
  ): Promise<ProductionEntryValidation> {
    this.validateDocEntry(docEntry);

    const workOrder = await this.workOrderRepository.findByDocEntry(docEntry);
    if (!workOrder) {
      throw new BadRequestException(`Work order not found: ${docEntry}`);
    }

    if (workOrder.Status !== 'R') {
      throw new BadRequestException(
        'Work order must be released to enter production quantities'
      );
    }

    const errors: string[] = [];

    // Check for negative quantities
    if (acceptedQty < 0) {
      errors.push('Accepted quantity cannot be negative');
    }
    if (rejectedQty < 0) {
      errors.push('Rejected quantity cannot be negative');
    }

    // Check that at least one quantity is positive
    if (acceptedQty === 0 && rejectedQty === 0) {
      errors.push('Accepted or rejected quantity must be greater than zero');
    }

    // Check total doesn't exceed remaining
    const totalQty = acceptedQty + rejectedQty;
    const remainingQty = workOrder.RemainingQty ?? 0;

    if (totalQty > remainingQty) {
      errors.push(
        `Total quantity (${totalQty}) exceeds remaining quantity (${remainingQty})`
      );
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        errors,
      };
    }

    // Calculate new remaining quantity
    const newRemainingQty = remainingQty - totalQty;

    // Check if confirmation is needed (> 50% of remaining)
    const halfRemaining = remainingQty / 2;
    const requiresConfirmation = acceptedQty > halfRemaining;

    return {
      isValid: true,
      errors: [],
      newRemainingQty,
      requiresConfirmation,
      confirmationMessage: requiresConfirmation
        ? `You are about to report ${acceptedQty} accepted units, which is more than half of the remaining quantity (${remainingQty}). Are you sure?`
        : undefined,
    };
  }

  /**
   * Generate a new batch number
   *
   * Format: ANS{YYYYMMDD}{Sequence}
   * Example: ANS20261218042 (42nd batch on Jan 18, 2026)
   *
   * @returns Batch number result with date and sequence
   */
  async generateBatchNumber(): Promise<BatchNumberResult> {
    const today = new Date();
    const dateStr = this.formatDateForBatch(today);

    // Get today's max sequence from OBTN
    const sql = `
      SELECT MAX(CAST(RIGHT("DistNumber", 3) AS INT)) AS "maxSeq"
      FROM "OBTN"
      WHERE "DistNumber" LIKE ?
    `;
    const pattern = `ANS${dateStr}%`;

    const result = await this.hanaService.queryOne<BatchSequenceResult>(sql, [
      pattern,
    ]);

    const nextSeq = (result?.maxSeq ?? 0) + 1;
    const seqStr = String(nextSeq).padStart(3, '0');
    const batchNumber = `ANS${dateStr}${seqStr}`;

    return {
      batchNumber,
      date: dateStr,
      sequence: nextSeq,
    };
  }

  /**
   * Report production quantities
   *
   * Creates goods receipts in SAP for accepted and/or rejected quantities.
   * If backflush is enabled, issues raw materials (OIGE) before creating
   * goods receipts (OIGN) for finished products.
   *
   * Flow:
   * 1. Validate production quantities
   * 2. Execute backflush (OIGE) - issues raw materials with LIFO batch selection
   * 3. Create goods receipt (OIGN) - receives finished product
   *
   * @param docEntry - Work order DocEntry
   * @param acceptedQty - Quantity of good products (to standard warehouse)
   * @param rejectedQty - Quantity of defective products (to FRD warehouse)
   * @param empId - Employee ID performing the entry
   * @returns Production entry response with created document references
   */
  async reportQuantity(
    docEntry: number,
    acceptedQty: number,
    rejectedQty: number,
    empId: number
  ): Promise<ProductionEntryResponse> {
    this.validateDocEntry(docEntry);
    this.validateEmpId(empId);

    // Validate quantities
    const validation = await this.validateEntry(docEntry, acceptedQty, rejectedQty);
    if (!validation.isValid) {
      throw new BadRequestException(validation.errors.join('. '));
    }

    const workOrder = await this.workOrderRepository.findByDocEntry(docEntry);
    if (!workOrder) {
      throw new BadRequestException(`Work order not found: ${docEntry}`);
    }

    const totalEntryQty = acceptedQty + rejectedQty;
    let oigeDocEntry: number | null = null;
    let acceptedDocEntry: number | null = null;
    let rejectedDocEntry: number | null = null;
    let batchNumber: string | null = null;

    // Generate batch number if any quantity will be reported
    // Note: Same batch number is used for both accepted and rejected quantities
    // for traceability. See specs/feature-production.md for details.
    if (totalEntryQty > 0) {
      const batchResult = await this.generateBatchNumber();
      batchNumber = batchResult.batchNumber;
    }

    // Step 1: Execute backflush (issue raw materials)
    // This creates OIGE documents before OIGN for proper material tracking
    try {
      const backflushResult = await this.backflushService.executeBackflush(
        docEntry,
        totalEntryQty,
        empId
      );
      oigeDocEntry = backflushResult.oigeDocEntry;

      if (oigeDocEntry) {
        this.logger.log(
          `Backflush completed: OIGE DocEntry=${oigeDocEntry} for WO ${docEntry}`
        );
      }
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        // Re-throw insufficient stock errors - they have structured details
        throw error;
      }
      // Log and wrap other backflush errors
      this.logger.error(
        `Backflush failed for WO ${docEntry}: ${error instanceof Error ? error.message : error}`
      );
      throw new BadRequestException(
        'Malzeme cikisi basarisiz oldu. Lutfen tekrar deneyin.'
      );
    }

    // Step 2: Create goods receipt for accepted quantity (OIGN)
    if (acceptedQty > 0) {
      const acceptedResult = await this.createGoodsReceipt(
        workOrder.DocEntry,
        acceptedQty,
        workOrder.Warehouse ?? '03',
        batchNumber,
        'C' // Complete transaction - updates OWOR.CmpltQty
      );
      acceptedDocEntry = acceptedResult.DocEntry ?? null;
    }

    // Step 3: Create goods receipt for rejected quantity (uses same batch number)
    if (rejectedQty > 0) {
      const rejectedResult = await this.createGoodsReceipt(
        workOrder.DocEntry,
        rejectedQty,
        this.REJECT_WAREHOUSE,
        batchNumber,
        'R' // Reject transaction - updates OWOR.RjctQty
      );
      rejectedDocEntry = rejectedResult.DocEntry ?? null;
    }

    // Calculate updated quantities
    const currentCompleted = workOrder.CmpltQty ?? 0;
    const currentRejected = workOrder.RjctQty ?? 0;
    const newCompletedQty = currentCompleted + acceptedQty;
    const newRejectedQty = currentRejected + rejectedQty;
    const plannedQty = workOrder.PlannedQty ?? 0;
    const newRemainingQty = plannedQty - newCompletedQty;
    const progressPercent =
      plannedQty > 0 ? Math.round((newCompletedQty / plannedQty) * 100) : 0;

    return {
      success: true,
      batchNumber,
      acceptedDocEntry,
      rejectedDocEntry,
      oigeDocEntry,
      workOrder: {
        docEntry,
        completedQty: newCompletedQty,
        rejectedQty: newRejectedQty,
        remainingQty: newRemainingQty,
        progressPercent,
      },
    };
  }

  /**
   * Create a goods receipt via Service Layer
   *
   * Creates a goods receipt for the finished product from a production order.
   * SAP infers ItemCode from the production order - do NOT include it explicitly.
   * Do NOT include BaseLine - it references WOR1 (raw materials) instead of the finished product.
   *
   * @param baseDocEntry - Production order DocEntry
   * @param quantity - Quantity to receive
   * @param warehouseCode - Target warehouse ('03'/'SD' for accepted, 'FRD' for rejected)
   * @param batchNumber - Batch number for tracking
   * @param transactionType - 'C' for Complete (updates CmpltQty), 'R' for Reject (updates RjctQty)
   */
  private async createGoodsReceipt(
    baseDocEntry: number,
    quantity: number,
    warehouseCode: string,
    batchNumber: string | null,
    transactionType: 'C' | 'R' = 'C'
  ): Promise<{ DocEntry?: number }> {
    const today = new Date().toISOString().split('T')[0];

    // Link to production order - SAP infers ItemCode from OWOR
    // TransactionType: 'C' (Complete) updates OWOR.CmpltQty, 'R' (Reject) updates OWOR.RjctQty
    // Property name is "TransactionType" (not "TranType" which is the DB field name)
    // Do NOT include BaseLine - it references WOR1 lines (raw materials)
    // Do NOT include ItemCode - SAP requires it empty when referencing production order
    const documentLine: Record<string, unknown> = {
      Quantity: quantity,
      WarehouseCode: warehouseCode,
      BaseEntry: baseDocEntry,
      BaseType: this.BASE_TYPE_PRODUCTION_ORDER,
      TransactionType: transactionType, // Service Layer property name (DB field: TranType)
    };

    // Add batch number if provided
    if (batchNumber) {
      documentLine.BatchNumbers = [
        {
          BatchNumber: batchNumber,
          Quantity: quantity,
        },
      ];
    }

    const goodsReceiptData = {
      DocDate: today,
      DocumentLines: [documentLine],
    };

    try {
      return await this.serviceLayerService.createGoodsReceipt(goodsReceiptData);
    } catch (error) {
      throw this.handleServiceLayerError(error);
    }
  }

  /**
   * Handle Service Layer errors and convert to user-friendly messages
   */
  private handleServiceLayerError(error: unknown): BadRequestException {
    const message = error instanceof Error ? error.message : String(error);

    // Try to parse SAP error JSON
    try {
      const parsed = JSON.parse(message);
      const sapMessage = parsed?.error?.message || message;
      const sapCode = parsed?.error?.code || '';

      // Map known SAP errors to Turkish user-friendly messages
      const userMessage = this.mapSapErrorToTurkish(sapCode, sapMessage);
      return new BadRequestException(userMessage);
    } catch {
      // If not JSON, check for known error patterns
      const userMessage = this.mapSapErrorToTurkish('', message);
      return new BadRequestException(userMessage);
    }
  }

  /**
   * Map SAP error codes/messages to Turkish user-friendly messages
   */
  private mapSapErrorToTurkish(code: string, message: string): string {
    // Check for known error patterns
    if (message.includes('Item Issued Qty in work order should be larger than zero')) {
      return 'Bu iş emri için henüz hammadde çıkışı yapılmamış. Üretim girişi yapabilmek için önce malzeme çıkışı gereklidir.';
    }

    if (message.includes('Update the exchange rate')) {
      const currency = message.match(/'(\w+)'/)?.[1] || 'döviz';
      return `${currency} için güncel döviz kuru tanımlı değil. Lütfen sistem yöneticinize başvurun.`;
    }

    if (message.includes('field should be empty if the document is referenced')) {
      return 'SAP belge referans hatası. Lütfen sistem yöneticinize başvurun.';
    }

    if (code === '-10') {
      return 'Döviz kuru hatası. Lütfen sistem yöneticinize başvurun.';
    }

    if (code === '-5002') {
      return `SAP doğrulama hatası: ${message}`;
    }

    // Default: return original message with prefix
    return `SAP hatası: ${message}`;
  }

  /**
   * Format date for batch number (YYYYMMDD)
   */
  private formatDateForBatch(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Validate docEntry is a positive number
   */
  private validateDocEntry(docEntry: number): void {
    if (!docEntry || docEntry <= 0) {
      throw new BadRequestException('Invalid work order DocEntry');
    }
  }

  /**
   * Validate empId is a positive number
   */
  private validateEmpId(empId: number): void {
    if (!empId || empId <= 0) {
      throw new BadRequestException('Invalid employee ID');
    }
  }
}
