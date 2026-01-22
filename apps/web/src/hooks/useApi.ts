/**
 * API Hooks for React Query integration
 *
 * Custom hooks that wrap the API client with React Query
 * for data fetching, caching, and error handling.
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { api, ApiRequestError } from '../services/api';

/**
 * Generic GET request hook with React Query
 */
export function useApiQuery<T>(
  queryKey: readonly unknown[],
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: Omit<UseQueryOptions<T, ApiRequestError>, 'queryKey' | 'queryFn'>
) {
  return useQuery<T, ApiRequestError>({
    queryKey,
    queryFn: () => api.get<T>(endpoint, params),
    ...options,
  });
}

/**
 * POST mutation hook
 */
export function useApiPost<TData, TVariables>(
  endpoint: string,
  options?: UseMutationOptions<TData, ApiRequestError, TVariables>
) {
  return useMutation<TData, ApiRequestError, TVariables>({
    mutationFn: (variables) => api.post<TData>(endpoint, variables),
    ...options,
  });
}

/**
 * PUT mutation hook
 */
export function useApiPut<TData, TVariables>(
  endpoint: string,
  options?: UseMutationOptions<TData, ApiRequestError, TVariables>
) {
  return useMutation<TData, ApiRequestError, TVariables>({
    mutationFn: (variables) => api.put<TData>(endpoint, variables),
    ...options,
  });
}

/**
 * PATCH mutation hook
 */
export function useApiPatch<TData, TVariables>(
  endpoint: string,
  options?: UseMutationOptions<TData, ApiRequestError, TVariables>
) {
  return useMutation<TData, ApiRequestError, TVariables>({
    mutationFn: (variables) => api.patch<TData>(endpoint, variables),
    ...options,
  });
}

/**
 * DELETE mutation hook
 */
export function useApiDelete<TData>(
  endpoint: string,
  options?: UseMutationOptions<TData, ApiRequestError, void>
) {
  return useMutation<TData, ApiRequestError, void>({
    mutationFn: () => api.delete<TData>(endpoint),
    ...options,
  });
}

/**
 * Hook to get the query client for manual cache operations
 */
export function useApiQueryClient() {
  return useQueryClient();
}

/**
 * Re-export error type for convenience
 */
export { ApiRequestError };
