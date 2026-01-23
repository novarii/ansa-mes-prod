/**
 * API Client Tests
 *
 * Tests for the base API client functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api, ApiRequestError } from './api';
import { getAuthToken } from '../context/AuthContext';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the AuthContext module
vi.mock('../context/AuthContext', () => ({
  getAuthToken: vi.fn(() => null),
}));

describe('api', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    vi.mocked(getAuthToken).mockReturnValue(null);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('ApiRequestError', () => {
    it('should create error with all properties', () => {
      const error = new ApiRequestError({
        statusCode: 404,
        message: 'Not found',
        error: 'NOT_FOUND',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/test',
        correlationId: 'abc-123',
      });

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ApiRequestError');
      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.errorType).toBe('NOT_FOUND');
      expect(error.correlationId).toBe('abc-123');
    });

    it('should include messageKey for i18n errors', () => {
      const error = new ApiRequestError({
        statusCode: 400,
        message: 'Invalid input',
        error: 'BAD_REQUEST',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/test',
        correlationId: 'abc-123',
        messageKey: 'errors.validation.required',
      });

      expect(error.messageKey).toBe('errors.validation.required');
    });
  });

  describe('api.get', () => {
    it('should make GET request with correct headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      const result = await api.get<{ data: string }>('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
          headers: expect.objectContaining({
            Accept: 'application/json',
          }),
        })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('should append query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await api.get('/work-orders', { station: 'M001', status: 'R' });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('station=M001');
      expect(calledUrl).toContain('status=R');
    });

    it('should skip undefined query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await api.get('/work-orders', { station: 'M001', status: undefined });

      const calledUrl = mockFetch.mock.calls[0][0];
      expect(calledUrl).toContain('station=M001');
      expect(calledUrl).not.toContain('status');
    });

    it('should include Authorization header when token exists', async () => {
      vi.mocked(getAuthToken).mockReturnValue('test-token-123');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await api.get('/auth/stations');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token-123',
          }),
        })
      );
    });

    it('should not include Authorization header when no token exists', async () => {
      vi.mocked(getAuthToken).mockReturnValue(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'test' }),
      });

      await api.get('/test');

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty('Authorization');
    });
  });

  describe('api.post', () => {
    it('should make POST request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await api.post('/auth/login', { empId: 123, pin: '1234' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ empId: 123, pin: '1234' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('api.put', () => {
    it('should make PUT request with JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ updated: true }),
      });

      await api.put('/resource/1', { name: 'Updated' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/resource/1'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated' }),
        })
      );
    });
  });

  describe('api.patch', () => {
    it('should make PATCH request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ patched: true }),
      });

      await api.patch('/resource/1', { field: 'value' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/resource/1'),
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('api.delete', () => {
    it('should make DELETE request', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: () => Promise.reject(new Error('No content')),
      });

      const result = await api.delete('/resource/1');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/resource/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw ApiRequestError for non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: '/api/test',
        json: () =>
          Promise.resolve({
            statusCode: 404,
            message: 'Resource not found',
            error: 'NOT_FOUND',
            timestamp: '2026-01-19T10:00:00Z',
            path: '/api/test',
            correlationId: 'xyz-789',
          }),
      });

      await expect(api.get('/test')).rejects.toThrow(ApiRequestError);

      try {
        await api.get('/test');
      } catch {
        // Reset mock for second call
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          url: '/api/test',
          json: () =>
            Promise.resolve({
              statusCode: 404,
              message: 'Resource not found',
              error: 'NOT_FOUND',
              timestamp: '2026-01-19T10:00:00Z',
              path: '/api/test',
              correlationId: 'xyz-789',
            }),
        });
      }
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/test',
        json: () => Promise.reject(new Error('Not JSON')),
      });

      await expect(api.get('/test')).rejects.toThrow(ApiRequestError);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(api.get('/test')).rejects.toThrow(ApiRequestError);

      try {
        mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));
        await api.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiRequestError);
        expect((error as ApiRequestError).statusCode).toBe(0);
        expect((error as ApiRequestError).errorType).toBe('NETWORK_ERROR');
      }
    });
  });
});
