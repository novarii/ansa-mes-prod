import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard';
import { SessionService } from './session.service';
import { MESSession } from '@org/shared-types';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let sessionService: jest.Mocked<SessionService>;
  let reflector: jest.Mocked<Reflector>;

  const mockSession: MESSession = {
    empID: 200,
    empName: 'Bulent Ozguneyli',
    stationCode: 'M001',
    stationName: 'BARMAG 1',
    isDefaultWorker: true,
    loginTime: new Date().toISOString(),
  };

  const mockSessionService = {
    getSession: jest.fn(),
    isValidSession: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  const createMockExecutionContext = (
    headers: Record<string, string> = {}
  ): ExecutionContext => {
    const mockRequest = {
      headers,
      user: undefined as MESSession | undefined,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
    sessionService = module.get(SessionService);
    reflector = module.get(Reflector);
  });

  describe('canActivate', () => {
    it('should return true for valid session token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false); // Not public
      sessionService.getSession.mockReturnValue(mockSession);

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(sessionService.getSession).toHaveBeenCalledWith('valid-token');
    });

    it('should inject user session into request', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      sessionService.getSession.mockReturnValue(mockSession);

      const context = createMockExecutionContext({
        authorization: 'Bearer valid-token',
      });

      await guard.canActivate(context);

      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual(mockSession);
    });

    it('should throw UnauthorizedException for missing authorization header', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockExecutionContext({});

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for invalid token format', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);

      const context = createMockExecutionContext({
        authorization: 'InvalidFormat',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should throw UnauthorizedException for invalid session', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      sessionService.getSession.mockReturnValue(null);

      const context = createMockExecutionContext({
        authorization: 'Bearer invalid-token',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it('should allow access to public routes without authentication', async () => {
      reflector.getAllAndOverride.mockReturnValue(true); // Is public

      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(sessionService.getSession).not.toHaveBeenCalled();
    });

    it('should handle x-session-token header as alternative', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      sessionService.getSession.mockReturnValue(mockSession);

      const context = createMockExecutionContext({
        'x-session-token': 'valid-token',
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(sessionService.getSession).toHaveBeenCalledWith('valid-token');
    });

    it('should prefer Authorization header over x-session-token', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      sessionService.getSession.mockReturnValue(mockSession);

      const context = createMockExecutionContext({
        authorization: 'Bearer auth-token',
        'x-session-token': 'session-token',
      });

      await guard.canActivate(context);

      expect(sessionService.getSession).toHaveBeenCalledWith('auth-token');
    });
  });
});
