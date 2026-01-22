/**
 * Global Exception Filter
 *
 * Catches all exceptions and returns a consistent error response format.
 * Includes correlation IDs for tracing errors across logs.
 *
 * @see specs/operational-standards.md
 */
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { Response, Request } from 'express';
import type { ApiError } from '@org/shared-types';

/**
 * HTTP status code to status text mapping
 */
const HTTP_STATUS_TEXT: Record<number, string> = {
  [HttpStatus.OK]: 'OK',
  [HttpStatus.CREATED]: 'CREATED',
  [HttpStatus.NO_CONTENT]: 'NO_CONTENT',
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

/**
 * Gets the HTTP status text for a given status code
 */
function getHttpStatusText(status: number): string {
  return HTTP_STATUS_TEXT[status] ?? `HTTP_${status}`;
}

/**
 * Extracts the error message from an exception response
 */
function extractMessage(exception: unknown): string {
  if (exception instanceof HttpException) {
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return response;
    }
    if (typeof response === 'object' && response !== null) {
      const responseObj = response as Record<string, unknown>;
      if (typeof responseObj['message'] === 'string') {
        return responseObj['message'];
      }
      if (Array.isArray(responseObj['message'])) {
        return responseObj['message'].join(', ');
      }
    }
    return exception.message;
  }
  return 'Internal server error';
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const correlationId = uuidv4();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = extractMessage(exception);

    // Log with correlation ID for tracing
    this.logger.error({
      correlationId,
      status,
      message,
      path: request.url,
      stack: exception instanceof Error ? exception.stack : undefined,
    });

    const errorResponse: ApiError = {
      statusCode: status,
      message,
      error: getHttpStatusText(status),
      timestamp: new Date().toISOString(),
      path: request.url,
      correlationId,
    };

    response.status(status).json(errorResponse);
  }
}
