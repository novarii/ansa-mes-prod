import { Module } from '@nestjs/common';
import { DataAccessModule } from '@org/data-access';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AuthGuard } from './auth.guard';

/**
 * FeatureAuthModule provides authentication functionality.
 *
 * Exports:
 * - AuthService - Login and station selection logic
 * - SessionService - Session management
 * - AuthGuard - Route protection guard
 *
 * @see specs/user-permission-model.md
 */
@Module({
  imports: [DataAccessModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService, AuthGuard],
  exports: [AuthService, SessionService, AuthGuard],
})
export class FeatureAuthModule {}
