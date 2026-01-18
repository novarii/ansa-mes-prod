import { Module } from '@nestjs/common';
import { DataAccessModule } from '@org/data-access';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';

/**
 * Feature module for team management view.
 *
 * Provides endpoints for:
 * - Getting machines with worker status
 * - Getting shift definitions
 *
 * @see specs/feature-team-calendar.md
 */
@Module({
  imports: [DataAccessModule],
  controllers: [TeamController],
  providers: [TeamService],
  exports: [TeamService],
})
export class FeatureTeamModule {}
