/**
 * Root Application Module
 *
 * Imports all feature modules and configures global settings.
 *
 * @see specs/project-structure.md
 */
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Load environment variables from .env.local
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Feature modules will be imported here as they are integrated
    // DataAccessModule, FeatureAuthModule, etc.
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
