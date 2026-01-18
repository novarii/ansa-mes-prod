import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from './session.service';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

/**
 * AuthGuard validates session tokens and injects user context.
 *
 * Usage:
 * - Apply globally or per-controller/route
 * - Use @Public() decorator to skip authentication for specific routes
 *
 * Token can be provided via:
 * - Authorization header: "Bearer <token>"
 * - X-Session-Token header: "<token>"
 *
 * @see specs/user-permission-model.md
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Oturum bilgisi bulunamadi');
    }

    const session = this.sessionService.getSession(token);

    if (!session) {
      throw new UnauthorizedException('Gecersiz veya suresi dolmus oturum');
    }

    // Inject user session into request for downstream use
    request.user = session;

    return true;
  }

  /**
   * Extract token from request headers
   *
   * Supports:
   * - Authorization: Bearer <token>
   * - X-Session-Token: <token>
   */
  private extractToken(request: {
    headers: Record<string, string | undefined>;
  }): string | null {
    // Try Authorization header first
    const authHeader = request.headers['authorization'];
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
        return parts[1];
      }
      // Invalid format
      throw new UnauthorizedException('Gecersiz yetkilendirme formati');
    }

    // Fall back to X-Session-Token header
    const sessionToken = request.headers['x-session-token'];
    if (sessionToken) {
      return sessionToken;
    }

    return null;
  }
}
