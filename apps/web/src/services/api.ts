/**
 * API Client for MES Frontend
 *
 * Base fetch wrapper with /api prefix, JSON handling,
 * error handling with ApiError types, and auth header injection.
 *
 * @see specs/operational-standards.md
 */

import type { ApiError, ApiErrorWithKey } from '@org/shared-types';

/**
 * API error that extends the standard Error class
 * with structured API error information.
 */
export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly errorType: string;
  readonly timestamp: string;
  readonly path: string;
  readonly correlationId: string;
  readonly messageKey?: string;

  constructor(apiError: ApiError | ApiErrorWithKey) {
    super(apiError.message);
    this.name = 'ApiRequestError';
    this.statusCode = apiError.statusCode;
    this.errorType = apiError.error;
    this.timestamp = apiError.timestamp;
    this.path = apiError.path;
    this.correlationId = apiError.correlationId;
    if ('messageKey' in apiError) {
      this.messageKey = apiError.messageKey;
    }
  }
}

/**
 * HTTP method types
 */
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Request options for API calls
 */
interface RequestOptions {
  /** HTTP method */
  method?: HttpMethod;
  /** Request body (will be JSON-stringified) */
  body?: unknown;
  /** Additional headers */
  headers?: Record<string, string>;
  /** Query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Build URL with query parameters
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  const url = new URL(endpoint, window.location.origin);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Parse error response from API
 */
async function parseErrorResponse(response: Response): Promise<ApiError> {
  try {
    const errorData = await response.json();
    // Check if it matches our ApiError structure
    if (
      errorData &&
      typeof errorData.statusCode === 'number' &&
      typeof errorData.message === 'string'
    ) {
      return errorData as ApiError;
    }
  } catch {
    // Response is not JSON or doesn't match structure
  }

  // Create a generic ApiError from HTTP response
  return {
    statusCode: response.status,
    message: response.statusText || 'An error occurred',
    error: response.statusText || 'UNKNOWN_ERROR',
    timestamp: new Date().toISOString(),
    path: response.url,
    correlationId: 'N/A',
  };
}

/**
 * Core API request function
 */
async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, params, timeout = 30000 } = options;

  const url = buildUrl(`/api${endpoint}`, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...headers,
  };

  // Don't include Content-Type for GET requests without body
  if (method === 'GET' && !body) {
    delete requestHeaders['Content-Type'];
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include', // Include cookies for session
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const apiError = await parseErrorResponse(response);
      throw new ApiRequestError(apiError);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    // Parse JSON response
    const data: T = await response.json();
    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    // Re-throw ApiRequestError as-is
    if (error instanceof ApiRequestError) {
      throw error;
    }

    // Handle abort/timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiRequestError({
        statusCode: 408,
        message: 'Request timeout',
        error: 'REQUEST_TIMEOUT',
        timestamp: new Date().toISOString(),
        path: url,
        correlationId: 'N/A',
      });
    }

    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new ApiRequestError({
        statusCode: 0,
        message: 'Network error - please check your connection',
        error: 'NETWORK_ERROR',
        timestamp: new Date().toISOString(),
        path: url,
        correlationId: 'N/A',
      });
    }

    // Re-throw unknown errors
    throw error;
  }
}

/**
 * API client with convenience methods for different HTTP verbs
 */
export const api = {
  /**
   * GET request
   */
  get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return request<T>(endpoint, { method: 'GET', params });
  },

  /**
   * POST request
   */
  post<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'POST', body });
  },

  /**
   * PUT request
   */
  put<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'PUT', body });
  },

  /**
   * PATCH request
   */
  patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return request<T>(endpoint, { method: 'PATCH', body });
  },

  /**
   * DELETE request
   */
  delete<T>(endpoint: string): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE' });
  },
};

export default api;
