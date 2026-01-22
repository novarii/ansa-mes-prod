/**
 * Root Application Module
 *
 * Imports all feature modules and configures global settings.
 *
 * @see specs/project-structure.md
 */
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FeatureAuthModule, AuthGuard } from '@org/feature-auth';
import { FeatureWorkOrdersModule } from '@org/feature-work-orders';
import { FeatureProductionModule } from '@org/feature-production';
import { FeatureTeamModule } from '@org/feature-team';
import { FeatureCalendarModule } from '@org/feature-calendar';

@Module({
  imports: [
    // Load environment variables from .env.local
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Feature modules (each imports DataAccessModule internally)
    FeatureAuthModule,
    FeatureWorkOrdersModule,
    FeatureProductionModule,
    FeatureTeamModule,
    FeatureCalendarModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global auth guard - uses @Public() decorator to skip auth on specific routes
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
