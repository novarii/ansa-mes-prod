import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { MESSession } from '@org/shared-types';

/**
 * Decorator to extract the current user session from the request
 *
 * The session is injected by the AuthGuard after validation.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * getProfile(@CurrentUser() user: MESSession) {
 *   return { empId: user.empID, name: user.empName };
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): MESSession => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  }
);
