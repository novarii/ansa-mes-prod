import { Injectable, BadRequestException } from '@nestjs/common';
import {
  StockRepository,
  ServiceLayerService,
  MaterialRequirement,
} from '@org/data-access';

/**
 * Batch allocation for a single batch
 */
export interface BatchAllocationItem {
  BatchNumber: string;
  Quantity: number;
}

/**
 * Result of LIFO batch selection for a material
 */
export interface BatchAllocation {
  /** Selected batches with quantities */
  batches: BatchAllocationItem[];
  /** Whether total allocation meets required quantity */
  isSufficient: boolean;
  /** Total quantity allocated */
  allocatedQty: number;
  /** Shortage quantity (0 if sufficient) */
  shortageQty: number;
}

/**
 * Material issue line for OIGE creation
 */
export interface MaterialIssue {
  /** Material code */
  itemCode: string;
  /** Source warehouse */
  warehouse: string;
  /** Quantity to issue */
  quantity: number;
  /** WOR1 line number */
  lineNum: number;
  /** Allocated batches (empty for non-batch-managed items) */
  batches: BatchAllocationItem[];
}

/**
 * Backflush execution result
 */
export interface BackflushResult {
  /** Whether backflush completed successfully */
  success: boolean;
  /** OIGE document entry (null if no materials to issue) */
  oigeDocEntry: number | null;
  /** Materials issued with batch details */
  materialsIssued: MaterialIssue[];
}

/**
 * Stock validation result
 */
export interface StockValidationResult {
  /** Whether all materials have sufficient stock */
  isValid: boolean;
  /** Materials with insufficient stock */
  shortages: MaterialRequirement[];
}

/**
 * Custom error for insufficient stock
 */
export class InsufficientStockError extends BadRequestException {
  constructor(
    public readonly shortages: MaterialRequirement[]
  ) {
    const message = 'Yetersiz hammadde stogu';
    super({
      error: 'INSUFFICIENT_STOCK',
      message,
      details: shortages.map((s) => ({
        itemCode: s.ItemCode,
        itemName: s.ItemName,
        required: s.RequiredQty,
        available: s.AvailableQty,
        shortage: s.Shortage,
        warehouse: s.Warehouse,
      })),
    });
  }
}

/**
 * Backflush Service
 *
 * Handles automatic material consumption (backflushing) when production entry is recorded.
 * Uses LIFO (Last In, First Out) batch selection for batch-managed materials.
 *
 * Flow:
 * 1. Validate stock availability for all materials
 * 2. Calculate material requirements based on BaseQty ratios
 * 3. Select batches using LIFO for batch-managed items
 * 4. Create Goods Issue (OIGE) via Service Layer
 *
 * @see specs/material-backflush.md
 * @see specs/feature-production.md
 */
@Injectable()
export class BackflushService {
  /** SAP base type for Production Order */
  private readonly BASE_TYPE_PRODUCTION_ORDER = 202;

  constructor(
    private readonly stockRepository: StockRepository,
    private readonly serviceLayerService: ServiceLayerService
  ) {}

  /**
   * Validate stock availability for a production entry
   *
   * Checks if sufficient stock exists for all materials at the given entry quantity.
   *
   * @param docEntry - Work order DocEntry
   * @param entryQty - Total production quantity (accepted + rejected)
   * @returns Validation result with shortage details
   */
  async validateStockAvailability(
    docEntry: number,
    entryQty: number
  ): Promise<StockValidationResult> {
    const shortages = await this.stockRepository.validateStockForEntry(
      docEntry,
      entryQty
    );

    return {
      isValid: shortages.length === 0,
      shortages,
    };
  }

  /**
   * Calculate material requirements for a production entry
   *
   * @param docEntry - Work order DocEntry
   * @param entryQty - Total production quantity (accepted + rejected)
   * @returns Material requirements with quantities and availability
   */
  async calculateMaterialRequirements(
    docEntry: number,
    entryQty: number
  ): Promise<MaterialRequirement[]> {
    return this.stockRepository.getMaterialRequirements(docEntry, entryQty);
  }

  /**
   * Select batches using LIFO (Last In, First Out) algorithm
   *
   * Batches are selected in order of InDate DESC, AbsEntry DESC.
   * Multiple batches may be selected if a single batch is insufficient.
   *
   * @param itemCode - Material code
   * @param warehouse - Source warehouse
   * @param requiredQty - Quantity needed
   * @returns Batch allocation result
   */
  async selectBatchesLIFO(
    itemCode: string,
    warehouse: string,
    requiredQty: number
  ): Promise<BatchAllocation> {
    const batches = await this.stockRepository.getAvailableBatches(
      itemCode,
      warehouse
    );

    const selectedBatches: BatchAllocationItem[] = [];
    let remainingQty = requiredQty;

    for (const batch of batches) {
      if (remainingQty <= 0) break;

      const takeQty = Math.min(batch.AvailableQty, remainingQty);
      selectedBatches.push({
        BatchNumber: batch.BatchNumber,
        Quantity: takeQty,
      });
      remainingQty -= takeQty;
    }

    const allocatedQty = requiredQty - remainingQty;

    return {
      batches: selectedBatches,
      isSufficient: remainingQty <= 0,
      allocatedQty,
      shortageQty: Math.max(0, remainingQty),
    };
  }

  /**
   * Create a Goods Issue (OIGE) document via Service Layer
   *
   * @param docEntry - Work order DocEntry (used as BaseEntry)
   * @param materials - Materials to issue with batch allocations
   * @param empId - Employee ID performing the entry
   * @returns Service Layer response with DocEntry
   */
  async createGoodsIssue(
    docEntry: number,
    materials: MaterialIssue[],
    empId: number
  ): Promise<{ DocEntry: number }> {
    const today = new Date().toISOString().split('T')[0];

    const documentLines = materials.map((material) => {
      // When referencing a Production Order (BaseType=202), SAP B1 derives
      // ItemCode from the production order line - do NOT include it
      const line: Record<string, unknown> = {
        Quantity: material.quantity,
        WarehouseCode: material.warehouse,
        BaseType: this.BASE_TYPE_PRODUCTION_ORDER,
        BaseEntry: docEntry,
        BaseLine: material.lineNum,
      };

      // Only include BatchNumbers for batch-managed items
      if (material.batches.length > 0) {
        line.BatchNumbers = material.batches;
      }

      return line;
    });

    const payload = {
      DocDate: today,
      Comments: `MES Backflush - WO ${docEntry} - Emp ${empId}`,
      DocumentLines: documentLines,
    };

    try {
      const result = await this.serviceLayerService.createGoodsIssue(payload);
      return { DocEntry: result.DocEntry ?? 0 };
    } catch (error) {
      throw this.handleServiceLayerError(error);
    }
  }

  /**
   * Execute complete backflush process
   *
   * Validates stock, calculates requirements, selects batches, and creates OIGE.
   * Throws InsufficientStockError if any material has insufficient stock.
   *
   * @param docEntry - Work order DocEntry
   * @param entryQty - Total production quantity (accepted + rejected)
   * @param empId - Employee ID performing the entry
   * @returns Backflush result with OIGE DocEntry and material details
   */
  async executeBackflush(
    docEntry: number,
    entryQty: number,
    empId: number
  ): Promise<BackflushResult> {
    // Step 1: Validate stock availability
    const validation = await this.validateStockAvailability(docEntry, entryQty);
    if (!validation.isValid) {
      throw new InsufficientStockError(validation.shortages);
    }

    // Step 2: Get material requirements
    const requirements = await this.calculateMaterialRequirements(
      docEntry,
      entryQty
    );

    // If no materials, nothing to backflush
    if (requirements.length === 0) {
      return {
        success: true,
        oigeDocEntry: null,
        materialsIssued: [],
      };
    }

    // Step 3: Build material issues with batch selection
    const materialsIssued: MaterialIssue[] = [];

    for (const req of requirements) {
      let batches: BatchAllocationItem[] = [];

      if (req.IsBatchManaged) {
        // Select batches using LIFO
        const allocation = await this.selectBatchesLIFO(
          req.ItemCode,
          req.Warehouse,
          req.RequiredQty
        );

        if (!allocation.isSufficient) {
          // This should not happen if validateStockAvailability passed,
          // but handle it defensively
          throw new InsufficientStockError([
            {
              ...req,
              AvailableQty: allocation.allocatedQty,
              Shortage: allocation.shortageQty,
            },
          ]);
        }

        batches = allocation.batches;
      } else {
        // Non-batch-managed: verify stock exists (already validated)
        const availableQty = await this.stockRepository.getTotalAvailableQty(
          req.ItemCode,
          req.Warehouse
        );

        if (availableQty < req.RequiredQty) {
          throw new InsufficientStockError([
            {
              ...req,
              AvailableQty: availableQty,
              Shortage: req.RequiredQty - availableQty,
            },
          ]);
        }
        // No batch selection needed
      }

      materialsIssued.push({
        itemCode: req.ItemCode,
        warehouse: req.Warehouse,
        quantity: req.RequiredQty,
        lineNum: req.LineNum ?? 0,
        batches,
      });
    }

    // Step 4: Create Goods Issue
    const oigeResult = await this.createGoodsIssue(
      docEntry,
      materialsIssued,
      empId
    );

    return {
      success: true,
      oigeDocEntry: oigeResult.DocEntry,
      materialsIssued,
    };
  }

  /**
   * Handle Service Layer errors and convert to user-friendly messages
   */
  private handleServiceLayerError(error: unknown): BadRequestException {
    const message = error instanceof Error ? error.message : String(error);

    // Map known errors to Turkish messages
    if (message.includes('insufficient quantity')) {
      return new BadRequestException(
        'Yetersiz stok miktari. Lutfen depo sorumlusu ile iletisime gecin.'
      );
    }

    if (message.includes('batch number')) {
      return new BadRequestException(
        'Parti numarasi hatasi. Lutfen tekrar deneyin.'
      );
    }

    // Default error
    return new BadRequestException(
      `Malzeme cikisi olusturulamadi: ${message}`
    );
  }
}
