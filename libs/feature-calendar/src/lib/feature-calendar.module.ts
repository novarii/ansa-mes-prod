import { Module } from '@nestjs/common';
import { DataAccessModule } from '@org/data-access';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';

/**
 * Feature module for calendar view.
 *
 * Provides endpoints for:
 * - Getting work orders for calendar view
 * - Getting station list for filter dropdown
 *
 * @see specs/feature-team-calendar.md
 */
@Module({
  imports: [DataAccessModule],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class FeatureCalendarModule {}
