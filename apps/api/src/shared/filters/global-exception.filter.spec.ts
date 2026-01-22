import { Test, TestingModule } from '@nestjs/testing';
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

// Mock uuid since it's ESM-only
let mockUuidCounter = 0;
jest.mock('uuid', () => ({
  v4: () => {
    mockUuidCounter++;
    return `550e8400-e29b-41d4-a716-44665544000${mockUuidCounter}`;
  },
}));

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockRequest: {
    url: string;
  };
  let mockHost: ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      url: '/api/test-endpoint',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('HTTP exceptions', () => {
    it('should handle HttpException with correct status code', () => {
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Not Found',
          error: 'NOT_FOUND',
          path: '/api/test-endpoint',
        })
      );
    });

    it('should handle BadRequestException (400)', () => {
      const exception = new HttpException('Bad Request', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Bad Request',
          error: 'BAD_REQUEST',
        })
      );
    });

    it('should handle UnauthorizedException (401)', () => {
      const exception = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Unauthorized',
          error: 'UNAUTHORIZED',
        })
      );
    });

    it('should handle ForbiddenException (403)', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.FORBIDDEN,
          message: 'Forbidden',
          error: 'FORBIDDEN',
        })
      );
    });

    it('should handle ConflictException (409)', () => {
      const exception = new HttpException('Conflict', HttpStatus.CONFLICT);

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'Conflict',
          error: 'CONFLICT',
        })
      );
    });

    it('should handle HttpException with object response', () => {
      const exception = new HttpException(
        { message: 'Custom error message', customField: 'value' },
        HttpStatus.BAD_REQUEST
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Custom error message',
        })
      );
    });
  });

  describe('non-HTTP exceptions', () => {
    it('should handle generic Error with 500 status', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'INTERNAL_SERVER_ERROR',
        })
      );
    });

    it('should handle unknown exception types', () => {
      const exception = 'string exception';

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: 'INTERNAL_SERVER_ERROR',
        })
      );
    });

    it('should handle null exception', () => {
      filter.catch(null, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
        })
      );
    });
  });

  describe('correlation ID', () => {
    it('should include a correlation ID in the response', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          correlationId: expect.stringContaining('550e8400-e29b-41d4-a716'),
        })
      );
    });

    it('should generate unique correlation IDs for each exception', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);
      const firstCorrelationId =
        mockResponse.json.mock.calls[0][0].correlationId;

      filter.catch(exception, mockHost);
      const secondCorrelationId =
        mockResponse.json.mock.calls[1][0].correlationId;

      expect(firstCorrelationId).not.toBe(secondCorrelationId);
    });
  });

  describe('timestamp', () => {
    it('should include a valid ISO timestamp', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      const beforeCall = new Date();
      filter.catch(exception, mockHost);
      const afterCall = new Date();

      const responseBody = mockResponse.json.mock.calls[0][0];
      const timestamp = new Date(responseBody.timestamp);

      expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
    });

    it('should include timestamp in ISO format', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const responseBody = mockResponse.json.mock.calls[0][0];
      expect(responseBody.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/
      );
    });
  });

  describe('request path', () => {
    it('should include the request path in the response', () => {
      mockRequest.url = '/api/work-orders/123';
      const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/work-orders/123',
        })
      );
    });

    it('should handle paths with query parameters', () => {
      mockRequest.url = '/api/work-orders?status=active&page=1';
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/work-orders?status=active&page=1',
        })
      );
    });
  });

  describe('error response format', () => {
    it('should return complete ApiError structure', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);

      filter.catch(exception, mockHost);

      const responseBody = mockResponse.json.mock.calls[0][0];

      expect(responseBody).toHaveProperty('statusCode');
      expect(responseBody).toHaveProperty('message');
      expect(responseBody).toHaveProperty('error');
      expect(responseBody).toHaveProperty('timestamp');
      expect(responseBody).toHaveProperty('path');
      expect(responseBody).toHaveProperty('correlationId');
    });

    it('should not expose stack traces in production responses', () => {
      const exception = new Error('Sensitive error');

      filter.catch(exception, mockHost);

      const responseBody = mockResponse.json.mock.calls[0][0];
      expect(responseBody).not.toHaveProperty('stack');
    });
  });
});
