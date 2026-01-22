import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type {
  MESSession,
  LoginRequest,
  LoginResponse,
  AuthorizedStationsResponse,
  StationSelectRequest,
  StationSelectResponse,
  SessionInfoResponse,
  LogoutResponse,
} from '@org/shared-types';

/**
 * AuthController handles authentication endpoints.
 *
 * Endpoints:
 * - POST /auth/login - Authenticate with empId + PIN
 * - GET /auth/stations - List authorized stations
 * - POST /auth/select-station - Select working station
 * - POST /auth/logout - End session
 * - GET /auth/session - Get current session info
 *
 * @see specs/user-permission-model.md
 */
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService
  ) {}

  /**
   * Login with employee ID and PIN
   *
   * @param body - Login credentials
   * @returns Login response with temporary token
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginRequest): Promise<LoginResponse & { token: string }> {
    const result = await this.authService.login(body.empId, body.pin);

    // Create a temporary session (without station selected)
    const tempSession: MESSession = {
      empID: result.empId,
      empName: result.empName,
      stationCode: '',
      stationName: '',
      isDefaultWorker: false,
      loginTime: new Date().toISOString(),
    };

    const token = this.sessionService.createSession(tempSession);

    return {
      ...result,
      token,
    };
  }

  /**
   * Get list of authorized stations for the logged-in user
   *
   * Requires authentication (via AuthGuard)
   */
  @Get('stations')
  async getStations(
    @CurrentUser() user: MESSession
  ): Promise<AuthorizedStationsResponse> {
    return this.authService.getAuthorizedStations(user.empID);
  }

  /**
   * Select a working station
   *
   * Creates a new session with the selected station and returns a new token.
   *
   * @param body - Station selection request
   * @param user - Current user session
   * @param authHeader - Authorization header to extract old token
   */
  @Post('select-station')
  @HttpCode(HttpStatus.OK)
  async selectStation(
    @Body() body: StationSelectRequest,
    @CurrentUser() user: MESSession,
    @Headers('authorization') authHeader: string
  ): Promise<StationSelectResponse & { token: string }> {
    const result = await this.authService.selectStation(
      user.empID,
      body.stationCode
    );

    // Delete old session
    const oldToken = this.extractToken(authHeader);
    if (oldToken) {
      this.sessionService.deleteSession(oldToken);
    }

    // Create new session with station selected
    const token = this.sessionService.createSession(result.session);

    return {
      ...result,
      token,
    };
  }

  /**
   * Logout and invalidate session
   *
   * This endpoint is public to allow logout even if session is corrupted
   */
  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Headers('authorization') authHeader: string
  ): Promise<LogoutResponse> {
    const token = this.extractToken(authHeader);
    if (token) {
      this.sessionService.deleteSession(token);
    }

    return { success: true };
  }

  /**
   * Get current session information
   *
   * Useful for the frontend to check authentication state on page load
   */
  @Get('session')
  async getSessionInfo(
    @CurrentUser() user: MESSession
  ): Promise<SessionInfoResponse> {
    const isStationSelected = Boolean(user.stationCode && user.stationCode !== '');

    return {
      isAuthenticated: true,
      isStationSelected,
      session: user,
    };
  }

  /**
   * Extract token from Authorization header
   */
  private extractToken(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
      return parts[1];
    }

    return authHeader; // Assume it's just the token
  }
}
