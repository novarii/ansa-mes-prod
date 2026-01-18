import { Module } from '@nestjs/common';
import { DataAccessModule } from '@org/data-access';
import { ActivityService } from './activity.service';
import { ProductionEntryService } from './production-entry.service';
import { BreakReasonService } from './break-reason.service';
import { ProductionController } from './production.controller';

/**
 * FeatureProductionModule provides production activity tracking and entry services.
 *
 * Features:
 * - Activity tracking (BAS/DUR/DEV/BIT state transitions)
 * - Production entry (quantity reporting with goods receipts)
 * - Break reason management
 *
 * @see specs/feature-production.md
 */
@Module({
  imports: [DataAccessModule],
  controllers: [ProductionController],
  providers: [ActivityService, ProductionEntryService, BreakReasonService],
  exports: [ActivityService, ProductionEntryService, BreakReasonService],
})
export class FeatureProductionModule {}
