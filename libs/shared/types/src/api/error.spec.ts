import { describe, it, expect } from 'vitest';
import {
  HttpStatus,
  HttpStatusText,
  MESErrorCodes,
  MESErrorMessages,
  type ApiError,
  type ApiErrorWithKey,
  type ApiValidationError,
  type ValidationErrorDetail,
  type ApiResponse,
} from './error.js';

describe('API Error Types', () => {
  describe('HttpStatus', () => {
    it('should have correct status codes', () => {
      expect(HttpStatus.OK).toBe(200);
      expect(HttpStatus.CREATED).toBe(201);
      expect(HttpStatus.BAD_REQUEST).toBe(400);
      expect(HttpStatus.UNAUTHORIZED).toBe(401);
      expect(HttpStatus.FORBIDDEN).toBe(403);
      expect(HttpStatus.NOT_FOUND).toBe(404);
      expect(HttpStatus.CONFLICT).toBe(409);
      expect(HttpStatus.UNPROCESSABLE_ENTITY).toBe(422);
      expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
    });
  });

  describe('HttpStatusText', () => {
    it('should map status codes to text', () => {
      expect(HttpStatusText[200]).toBe('OK');
      expect(HttpStatusText[404]).toBe('NOT_FOUND');
      expect(HttpStatusText[500]).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('MESErrorCodes', () => {
    it('should have production error codes', () => {
      expect(MESErrorCodes.PROD_001).toBe('PROD_001');
      expect(MESErrorCodes.PROD_002).toBe('PROD_002');
      expect(MESErrorCodes.PROD_003).toBe('PROD_003');
      expect(MESErrorCodes.PROD_004).toBe('PROD_004');
    });

    it('should have activity error codes', () => {
      expect(MESErrorCodes.ACT_001).toBe('ACT_001');
      expect(MESErrorCodes.ACT_002).toBe('ACT_002');
      expect(MESErrorCodes.ACT_003).toBe('ACT_003');
    });

    it('should have auth error codes', () => {
      expect(MESErrorCodes.AUTH_001).toBe('AUTH_001');
      expect(MESErrorCodes.AUTH_002).toBe('AUTH_002');
      expect(MESErrorCodes.AUTH_003).toBe('AUTH_003');
    });
  });

  describe('MESErrorMessages', () => {
    it('should have Turkish messages for production errors', () => {
      expect(MESErrorMessages.PROD_001).toBe('Girilen miktar kalan miktari asamaz');
      expect(MESErrorMessages.PROD_002).toBe('Is emri serbest birakilmamis');
    });

    it('should have Turkish messages for activity errors', () => {
      expect(MESErrorMessages.ACT_001).toBe('Bu islem su an yapilamaz');
      expect(MESErrorMessages.ACT_002).toBe('Mola nedeni secmeniz gerekiyor');
    });

    it('should have Turkish messages for auth errors', () => {
      expect(MESErrorMessages.AUTH_001).toBe('Gecersiz kimlik bilgileri');
      expect(MESErrorMessages.AUTH_003).toBe('Bu istasyon icin yetkiniz yok');
    });
  });

  describe('ApiError interface', () => {
    it('should represent a standard error', () => {
      const error: ApiError = {
        statusCode: 404,
        message: 'Work order not found',
        error: 'NOT_FOUND',
        timestamp: '2026-01-18T10:00:00.000Z',
        path: '/api/work-orders/999',
        correlationId: '550e8400-e29b-41d4-a716-446655440000',
      };

      expect(error.statusCode).toBe(404);
      expect(error.correlationId).toBeDefined();
    });
  });

  describe('ApiErrorWithKey interface', () => {
    it('should include translation key', () => {
      const error: ApiErrorWithKey = {
        statusCode: 422,
        message: 'Quantity exceeds remaining',
        error: 'UNPROCESSABLE_ENTITY',
        timestamp: '2026-01-18T10:00:00.000Z',
        path: '/api/production-entry',
        correlationId: 'uuid-123',
        messageKey: 'errors.production.quantityExceeds',
      };

      expect(error.messageKey).toBe('errors.production.quantityExceeds');
    });
  });

  describe('ApiValidationError interface', () => {
    it('should include validation details', () => {
      const validationDetail: ValidationErrorDetail = {
        field: 'acceptedQty',
        message: 'must be a positive number',
        value: -5,
        constraint: 'min',
      };

      const error: ApiValidationError = {
        statusCode: 400,
        message: 'Validation failed',
        error: 'BAD_REQUEST',
        timestamp: '2026-01-18T10:00:00.000Z',
        path: '/api/production-entry',
        correlationId: 'uuid-456',
        validationErrors: [validationDetail],
      };

      expect(error.validationErrors.length).toBe(1);
      expect(error.validationErrors[0].field).toBe('acceptedQty');
    });
  });

  describe('ApiResponse interface', () => {
    it('should represent a successful response', () => {
      const response: ApiResponse<{ id: number }> = {
        success: true,
        data: { id: 123 },
      };

      expect(response.success).toBe(true);
      expect(response.data?.id).toBe(123);
    });

    it('should represent an error response', () => {
      const response: ApiResponse<{ id: number }> = {
        success: false,
        error: {
          statusCode: 500,
          message: 'Server error',
          error: 'INTERNAL_SERVER_ERROR',
          timestamp: '2026-01-18T10:00:00.000Z',
          path: '/api/test',
          correlationId: 'uuid-789',
        },
      };

      expect(response.success).toBe(false);
      expect(response.error?.statusCode).toBe(500);
    });
  });
});
