import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import {
  MESSession,
  LoginResponse,
  AuthorizedStationsResponse,
  StationSelectResponse,
} from '@org/shared-types';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let sessionService: jest.Mocked<SessionService>;

  const mockSession: MESSession = {
    empID: 200,
    empName: 'Bulent Ozguneyli',
    stationCode: 'M001',
    stationName: 'BARMAG 1',
    isDefaultWorker: true,
    loginTime: new Date().toISOString(),
  };

  const mockAuthService = {
    login: jest.fn(),
    getAuthorizedStations: jest.fn(),
    selectStation: jest.fn(),
  };

  const mockSessionService = {
    createSession: jest.fn(),
    getSession: jest.fn(),
    deleteSession: jest.fn(),
    isValidSession: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
        {
          provide: SessionService,
          useValue: mockSessionService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    sessionService = module.get(SessionService);
  });

  describe('login', () => {
    const loginRequest = { empId: 200, pin: '1234' };
    const loginResponse: LoginResponse = {
      success: true,
      empId: 200,
      empName: 'Bulent Ozguneyli',
      stationCount: 2,
    };

    it('should successfully login with valid credentials', async () => {
      authService.login.mockResolvedValue(loginResponse);
      sessionService.createSession.mockReturnValue('generated-token');

      const result = await controller.login(loginRequest);

      expect(result.success).toBe(true);
      expect(result.empId).toBe(200);
      expect(result.empName).toBe('Bulent Ozguneyli');
      expect(result.token).toBe('generated-token');
    });

    it('should call AuthService.login with correct parameters', async () => {
      authService.login.mockResolvedValue(loginResponse);
      sessionService.createSession.mockReturnValue('token');

      await controller.login(loginRequest);

      expect(authService.login).toHaveBeenCalledWith(200, '1234');
    });

    it('should create a temporary session after login', async () => {
      authService.login.mockResolvedValue(loginResponse);
      sessionService.createSession.mockReturnValue('token');

      await controller.login(loginRequest);

      expect(sessionService.createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          empID: 200,
          empName: 'Bulent Ozguneyli',
          stationCode: '',
          stationName: '',
          isDefaultWorker: false,
        })
      );
    });

    it('should propagate UnauthorizedException from AuthService', async () => {
      authService.login.mockRejectedValue(
        new UnauthorizedException('Gecersiz kimlik bilgileri')
      );

      await expect(controller.login(loginRequest)).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe('getStations', () => {
    const stationsResponse: AuthorizedStationsResponse = {
      empId: 200,
      stations: [
        { code: 'M001', name: 'BARMAG 1', isDefault: true },
        { code: 'M002', name: 'BARMAG 2', isDefault: false },
      ],
    };

    it('should return authorized stations for logged-in user', async () => {
      authService.getAuthorizedStations.mockResolvedValue(stationsResponse);

      const result = await controller.getStations(mockSession);

      expect(result.empId).toBe(200);
      expect(result.stations).toHaveLength(2);
    });

    it('should call AuthService with empID from session', async () => {
      authService.getAuthorizedStations.mockResolvedValue(stationsResponse);

      await controller.getStations(mockSession);

      expect(authService.getAuthorizedStations).toHaveBeenCalledWith(200);
    });
  });

  describe('selectStation', () => {
    const selectRequest = { stationCode: 'M001' };
    const selectResponse: StationSelectResponse = {
      success: true,
      session: mockSession,
    };

    it('should successfully select a station', async () => {
      authService.selectStation.mockResolvedValue(selectResponse);
      sessionService.createSession.mockReturnValue('new-token');

      const result = await controller.selectStation(
        selectRequest,
        mockSession,
        'old-token'
      );

      expect(result.success).toBe(true);
      expect(result.session).toEqual(mockSession);
      expect(result.token).toBe('new-token');
    });

    it('should delete old session and create new one', async () => {
      authService.selectStation.mockResolvedValue(selectResponse);
      sessionService.createSession.mockReturnValue('new-token');

      await controller.selectStation(selectRequest, mockSession, 'old-token');

      expect(sessionService.deleteSession).toHaveBeenCalledWith('old-token');
      expect(sessionService.createSession).toHaveBeenCalledWith(mockSession);
    });

    it('should propagate UnauthorizedException for unauthorized station', async () => {
      authService.selectStation.mockRejectedValue(
        new UnauthorizedException('Bu istasyon icin yetkiniz bulunmamaktadir')
      );

      await expect(
        controller.selectStation(selectRequest, mockSession, 'token')
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout and delete session', async () => {
      sessionService.deleteSession.mockReturnValue(true);

      const result = await controller.logout('valid-token');

      expect(result.success).toBe(true);
      expect(sessionService.deleteSession).toHaveBeenCalledWith('valid-token');
    });

    it('should return success even if session not found', async () => {
      sessionService.deleteSession.mockReturnValue(false);

      const result = await controller.logout('invalid-token');

      expect(result.success).toBe(true);
    });
  });

  describe('getSessionInfo', () => {
    it('should return session info when authenticated', async () => {
      const result = await controller.getSessionInfo(mockSession);

      expect(result.isAuthenticated).toBe(true);
      expect(result.isStationSelected).toBe(true);
      expect(result.session).toEqual(mockSession);
    });

    it('should indicate station not selected when stationCode is empty', async () => {
      const sessionWithoutStation: MESSession = {
        ...mockSession,
        stationCode: '',
        stationName: '',
      };

      const result = await controller.getSessionInfo(sessionWithoutStation);

      expect(result.isAuthenticated).toBe(true);
      expect(result.isStationSelected).toBe(false);
    });
  });
});
