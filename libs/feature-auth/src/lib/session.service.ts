import { Injectable } from '@nestjs/common';
import type { MESSession } from '@org/shared-types';

/**
 * SessionService manages user sessions.
 *
 * For MVP, uses in-memory storage. In production, consider:
 * - Redis for distributed session storage
 * - JWT tokens for stateless authentication
 *
 * @see specs/user-permission-model.md
 */
@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, MESSession>();

  /**
   * Generate a unique session token
   */
  private generateToken(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 15);
    return `${timestamp}-${random}`;
  }

  /**
   * Create a new session
   *
   * @param session - Session data
   * @returns Session token
   */
  createSession(session: MESSession): string {
    const token = this.generateToken();
    this.sessions.set(token, session);
    return token;
  }

  /**
   * Get session by token
   *
   * @param token - Session token
   * @returns Session or null if not found/expired
   */
  getSession(token: string): MESSession | null {
    return this.sessions.get(token) ?? null;
  }

  /**
   * Update session data
   *
   * @param token - Session token
   * @param session - Updated session data
   * @returns True if updated, false if session not found
   */
  updateSession(token: string, session: MESSession): boolean {
    if (!this.sessions.has(token)) {
      return false;
    }
    this.sessions.set(token, session);
    return true;
  }

  /**
   * Delete session (logout)
   *
   * @param token - Session token
   * @returns True if deleted, false if not found
   */
  deleteSession(token: string): boolean {
    return this.sessions.delete(token);
  }

  /**
   * Check if session exists and is valid
   *
   * @param token - Session token
   * @returns True if valid session exists
   */
  isValidSession(token: string): boolean {
    return this.sessions.has(token);
  }

  /**
   * Get all active sessions for an employee
   * Useful for admin/debugging purposes
   *
   * @param empId - Employee ID
   * @returns Array of sessions for the employee
   */
  getSessionsByEmployee(empId: number): MESSession[] {
    const sessions: MESSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.empID === empId) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  /**
   * Clear all sessions for an employee
   * Useful when employee is deactivated or password changed
   *
   * @param empId - Employee ID
   * @returns Number of sessions cleared
   */
  clearSessionsForEmployee(empId: number): number {
    let count = 0;
    for (const [token, session] of this.sessions.entries()) {
      if (session.empID === empId) {
        this.sessions.delete(token);
        count++;
      }
    }
    return count;
  }
}
