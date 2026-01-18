import { Module } from '@nestjs/common';
import { DataAccessModule } from '@org/data-access';
import { WorkOrderService } from './work-order.service';
import { WorkOrderController } from './work-order.controller';

/**
 * Feature module for work order management.
 *
 * Provides endpoints for:
 * - Listing work orders for a station
 * - Getting work order details
 * - Viewing pick list (BOM materials)
 * - Getting customer filter options
 *
 * @see specs/feature-production.md
 */
@Module({
  imports: [DataAccessModule],
  controllers: [WorkOrderController],
  providers: [WorkOrderService],
  exports: [WorkOrderService],
})
export class FeatureWorkOrdersModule {}
