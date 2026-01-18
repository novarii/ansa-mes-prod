import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { MESSession } from '@org/shared-types';

describe('SessionService', () => {
  let service: SessionService;

  const mockSession: MESSession = {
    empID: 200,
    empName: 'Bulent Ozguneyli',
    stationCode: 'M001',
    stationName: 'BARMAG 1',
    isDefaultWorker: true,
    loginTime: new Date().toISOString(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService],
    }).compile();

    service = module.get<SessionService>(SessionService);
  });

  describe('createSession', () => {
    it('should create a session and return a token', () => {
      const token = service.createSession(mockSession);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
    });

    it('should store the session data', () => {
      const token = service.createSession(mockSession);
      const session = service.getSession(token);

      expect(session).toEqual(mockSession);
    });

    it('should generate unique tokens', () => {
      const token1 = service.createSession(mockSession);
      const token2 = service.createSession(mockSession);

      expect(token1).not.toBe(token2);
    });
  });

  describe('getSession', () => {
    it('should return session for valid token', () => {
      const token = service.createSession(mockSession);
      const session = service.getSession(token);

      expect(session).toEqual(mockSession);
    });

    it('should return null for invalid token', () => {
      const session = service.getSession('invalid-token');

      expect(session).toBeNull();
    });

    it('should return null for empty token', () => {
      const session = service.getSession('');

      expect(session).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update existing session', () => {
      const token = service.createSession(mockSession);
      const updatedSession: MESSession = {
        ...mockSession,
        stationCode: 'M002',
        stationName: 'BARMAG 2',
      };

      const result = service.updateSession(token, updatedSession);
      const session = service.getSession(token);

      expect(result).toBe(true);
      expect(session?.stationCode).toBe('M002');
      expect(session?.stationName).toBe('BARMAG 2');
    });

    it('should return false for non-existent token', () => {
      const result = service.updateSession('invalid-token', mockSession);

      expect(result).toBe(false);
    });
  });

  describe('deleteSession', () => {
    it('should delete existing session', () => {
      const token = service.createSession(mockSession);

      const result = service.deleteSession(token);
      const session = service.getSession(token);

      expect(result).toBe(true);
      expect(session).toBeNull();
    });

    it('should return false for non-existent token', () => {
      const result = service.deleteSession('invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('isValidSession', () => {
    it('should return true for valid session', () => {
      const token = service.createSession(mockSession);

      expect(service.isValidSession(token)).toBe(true);
    });

    it('should return false for invalid session', () => {
      expect(service.isValidSession('invalid-token')).toBe(false);
    });

    it('should return false after session is deleted', () => {
      const token = service.createSession(mockSession);
      service.deleteSession(token);

      expect(service.isValidSession(token)).toBe(false);
    });
  });

  describe('getSessionsByEmployee', () => {
    it('should return all sessions for an employee', () => {
      service.createSession(mockSession);
      service.createSession({ ...mockSession, stationCode: 'M002' });

      const sessions = service.getSessionsByEmployee(200);

      expect(sessions).toHaveLength(2);
    });

    it('should return empty array when no sessions exist', () => {
      const sessions = service.getSessionsByEmployee(999);

      expect(sessions).toHaveLength(0);
    });

    it('should not return sessions for other employees', () => {
      service.createSession(mockSession);
      service.createSession({ ...mockSession, empID: 310, empName: 'Other' });

      const sessions = service.getSessionsByEmployee(200);

      expect(sessions).toHaveLength(1);
      expect(sessions[0].empID).toBe(200);
    });
  });

  describe('clearSessionsForEmployee', () => {
    it('should clear all sessions for an employee', () => {
      service.createSession(mockSession);
      service.createSession({ ...mockSession, stationCode: 'M002' });

      const count = service.clearSessionsForEmployee(200);
      const sessions = service.getSessionsByEmployee(200);

      expect(count).toBe(2);
      expect(sessions).toHaveLength(0);
    });

    it('should return 0 when no sessions exist', () => {
      const count = service.clearSessionsForEmployee(999);

      expect(count).toBe(0);
    });

    it('should not affect other employees sessions', () => {
      service.createSession(mockSession);
      const otherSession: MESSession = {
        ...mockSession,
        empID: 310,
        empName: 'Other Worker',
      };
      const otherToken = service.createSession(otherSession);

      service.clearSessionsForEmployee(200);

      expect(service.isValidSession(otherToken)).toBe(true);
    });
  });
});
