/**
 * useApi Hooks Tests
 *
 * Tests for React Query integration hooks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useApiQuery, useApiPost } from './useApi';
import * as apiModule from '../services/api';

// Mock the API module
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  ApiRequestError: class ApiRequestError extends Error {
    statusCode: number;
    errorType: string;
    timestamp: string;
    path: string;
    correlationId: string;
    constructor(data: {
      statusCode: number;
      message: string;
      error: string;
      timestamp: string;
      path: string;
      correlationId: string;
    }) {
      super(data.message);
      this.statusCode = data.statusCode;
      this.errorType = data.error;
      this.timestamp = data.timestamp;
      this.path = data.path;
      this.correlationId = data.correlationId;
    }
  },
}));

describe('useApi hooks', () => {
  let queryClient: QueryClient;

  function wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
  });

  describe('useApiQuery', () => {
    it('should fetch data successfully', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      vi.mocked(apiModule.api.get).mockResolvedValueOnce(mockData);

      const { result } = renderHook(
        () =>
          useApiQuery<typeof mockData>(['test'], '/test'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockData);
      expect(apiModule.api.get).toHaveBeenCalledWith('/test', undefined);
    });

    it('should pass query parameters', async () => {
      vi.mocked(apiModule.api.get).mockResolvedValueOnce([]);

      renderHook(
        () =>
          useApiQuery(['test', { status: 'R' }], '/test', { status: 'R' }),
        { wrapper }
      );

      await waitFor(() => {
        expect(apiModule.api.get).toHaveBeenCalled();
      });

      expect(apiModule.api.get).toHaveBeenCalledWith('/test', { status: 'R' });
    });

    it('should handle errors', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 404,
        message: 'Not found',
        error: 'NOT_FOUND',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/test',
        correlationId: 'abc-123',
      });
      vi.mocked(apiModule.api.get).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useApiQuery(['test'], '/test'),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
    });
  });

  describe('useApiPost', () => {
    it('should post data successfully', async () => {
      const mockResponse = { success: true, id: 123 };
      vi.mocked(apiModule.api.post).mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(
        () =>
          useApiPost<typeof mockResponse, { name: string }>('/test'),
        { wrapper }
      );

      result.current.mutate({ name: 'Test' });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockResponse);
      expect(apiModule.api.post).toHaveBeenCalledWith('/test', { name: 'Test' });
    });

    it('should handle mutation errors', async () => {
      const mockError = new apiModule.ApiRequestError({
        statusCode: 400,
        message: 'Bad request',
        error: 'BAD_REQUEST',
        timestamp: '2026-01-19T10:00:00Z',
        path: '/api/test',
        correlationId: 'abc-123',
      });
      vi.mocked(apiModule.api.post).mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useApiPost<unknown, { name: string }>('/test'),
        { wrapper }
      );

      result.current.mutate({ name: 'Test' });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBe(mockError);
    });
  });
});
