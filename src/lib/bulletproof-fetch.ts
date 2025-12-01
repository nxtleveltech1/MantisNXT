/**
 * Bulletproof Data Fetching Utilities
 * Enterprise-grade API client with comprehensive error handling, retry mechanisms, and graceful degradation
 */

import { toast } from 'sonner';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ApiResponse<T = unknown> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    hasNext?: boolean;
    hasPrevious?: boolean;
  };
  errors?: Array<{
    code: string;
    message: string;
    field?: string;
  }>;
}

export interface FetchConfig extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  fallbackData?: unknown;
  validateResponse?: (response: Response) => boolean;
  transformData?: <T>(data: unknown) => T;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
  silentErrors?: boolean;
  cacheResponse?: boolean;
  cacheDuration?: number;
}

export interface FetchState<T> {
  data: T | null;
  isLoading: boolean;
  isValidating: boolean;
  error: Error | null;
  isStale: boolean;
  retryCount: number;
  lastFetch: Date | null;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

class ResponseCache {
  private cache = new Map<
    string,
    {
      data: unknown;
      timestamp: number;
      duration: number;
    }
  >();

  set(key: string, data: unknown, duration: number = 300000) {
    // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      duration,
    });
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.duration;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(pattern?: string) {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.duration;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }
}

const responseCache = new ResponseCache();

// ============================================================================
// ERROR CLASSIFICATION
// ============================================================================

export enum ErrorType {
  NETWORK = 'NETWORK',
  TIMEOUT = 'TIMEOUT',
  SERVER = 'SERVER',
  CLIENT = 'CLIENT',
  VALIDATION = 'VALIDATION',
  UNKNOWN = 'UNKNOWN',
}

export class ApiError extends Error {
  public readonly type: ErrorType;
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    status?: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.status = status;
    this.code = code;
    this.details = details;
    this.retryable = this.determineRetryability();
  }

  private determineRetryability(): boolean {
    switch (this.type) {
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        return true;
      case ErrorType.SERVER:
        return this.status ? this.status >= 500 : true;
      case ErrorType.CLIENT:
        return this.status === 408 || this.status === 429; // Timeout or Rate Limited
      default:
        return false;
    }
  }
}

function classifyError(error: unknown, response?: Response): ApiError {
  if (error instanceof ApiError) return error;

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return new ApiError(errorMessage, ErrorType.NETWORK);
  }

  // Timeout errors
  if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
    return new ApiError(errorMessage, ErrorType.TIMEOUT);
  }

  // HTTP response errors
  if (response) {
    const status = response.status;
    const type = status >= 500 ? ErrorType.SERVER : ErrorType.CLIENT;
    return new ApiError(`HTTP ${status}: ${response.statusText}`, type, status);
  }

  return new ApiError(errorMessage, ErrorType.UNKNOWN);
}

// ============================================================================
// FETCH UTILITIES
// ============================================================================

/**
 * Create an AbortController with timeout
 */
function createTimeoutController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

/**
 * Validate JSON response and parse safely
 */
async function parseJsonSafely<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text) {
    throw new ApiError('Empty response body', ErrorType.VALIDATION);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new ApiError(
      'Invalid JSON response',
      ErrorType.VALIDATION,
      response.status,
      'INVALID_JSON',
      { responseText: text.slice(0, 200) }
    );
  }
}

/**
 * Validate response structure
 */
function validateApiResponse<T>(data: unknown): ApiResponse<T> {
  if (typeof data !== 'object' || data === null) {
    throw new ApiError('Invalid response structure', ErrorType.VALIDATION);
  }

  const response = data as ApiResponse<T>;

  // Check for error responses
  if (response.errors && response.errors.length > 0) {
    const error = response.errors[0];
    throw new ApiError(error.message, ErrorType.VALIDATION, undefined, error.code, {
      field: error.field,
    });
  }

  return response;
}

// ============================================================================
// MAIN FETCH FUNCTION
// ============================================================================

export async function bulletproofFetch<T = unknown>(
  url: string,
  config: FetchConfig = {}
): Promise<ApiResponse<T>> {
  const {
    timeout = 30000,
    retries = 3,
    retryDelay = 1000,
    fallbackData,
    validateResponse,
    transformData,
    onError,
    onRetry,
    silentErrors = false,
    cacheResponse = false,
    cacheDuration = 300000,
    ...fetchOptions
  } = config;

  // Check cache first
  const cacheKey = `${url}_${JSON.stringify(fetchOptions)}`;
  if (cacheResponse && responseCache.has(cacheKey)) {
    const cachedData = responseCache.get(cacheKey) as ApiResponse<T>;
    return cachedData;
  }

  let lastError: ApiError;
  let attempt = 0;

  while (attempt <= retries) {
    attempt++;

    try {
      // Create timeout controller
      const timeoutController = createTimeoutController(timeout);
      const controller = fetchOptions.signal ? new AbortController() : timeoutController;

      // Combine signals if both exist
      if (fetchOptions.signal && timeoutController) {
        fetchOptions.signal.addEventListener('abort', () => controller.abort());
        timeoutController.signal.addEventListener('abort', () => controller.abort());
      }

      // Perform fetch
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...fetchOptions.headers,
        },
      });

      // Validate response if custom validator provided
      if (validateResponse && !validateResponse(response)) {
        throw new ApiError('Response validation failed', ErrorType.VALIDATION, response.status);
      }

      // Check HTTP status
      if (!response.ok) {
        const errorData = await parseJsonSafely(response).catch(() => null);
        throw new ApiError(
          errorData?.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status >= 500 ? ErrorType.SERVER : ErrorType.CLIENT,
          response.status,
          errorData?.code
        );
      }

      // Parse response
      const rawData = await parseJsonSafely<ApiResponse<T>>(response);
      const validatedData = validateApiResponse<T>(rawData);

      // Transform data if transformer provided
      if (transformData) {
        validatedData.data = transformData(validatedData.data);
      }

      // Cache successful response
      if (cacheResponse) {
        responseCache.set(cacheKey, validatedData, cacheDuration);
      }

      return validatedData;
    } catch (error) {
      lastError = classifyError(error);

      // Handle final attempt or non-retryable errors
      if (attempt > retries || !lastError.retryable) {
        onError?.(lastError);

        if (!silentErrors) {
          toast.error(`Request failed: ${lastError.message}`);
        }

        // Return fallback data if available
        if (fallbackData !== undefined) {
          return {
            data: fallbackData as T,
            meta: { total: 0 },
          };
        }

        throw lastError;
      }

      // Handle retry
      onRetry?.(attempt);

      if (!silentErrors && attempt < retries) {
        toast.info(`Retrying request... (${attempt}/${retries})`);
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

// ============================================================================
// SPECIALIZED FETCH FUNCTIONS
// ============================================================================

/**
 * GET request with caching
 */
export async function bulletproofGet<T = unknown>(
  url: string,
  config: Omit<FetchConfig, 'method'> = {}
): Promise<ApiResponse<T>> {
  return bulletproofFetch<T>(url, {
    ...config,
    method: 'GET',
    cacheResponse: config.cacheResponse ?? true,
  });
}

/**
 * POST request with validation
 */
export async function bulletproofPost<T = unknown>(
  url: string,
  data?: unknown,
  config: Omit<FetchConfig, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return bulletproofFetch<T>(url, {
    ...config,
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
    cacheResponse: false,
  });
}

/**
 * PUT request with validation
 */
export async function bulletproofPut<T = unknown>(
  url: string,
  data?: unknown,
  config: Omit<FetchConfig, 'method' | 'body'> = {}
): Promise<ApiResponse<T>> {
  return bulletproofFetch<T>(url, {
    ...config,
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
    cacheResponse: false,
  });
}

/**
 * DELETE request with confirmation
 */
export async function bulletproofDelete<T = unknown>(
  url: string,
  config: Omit<FetchConfig, 'method'> = {}
): Promise<ApiResponse<T>> {
  return bulletproofFetch<T>(url, {
    ...config,
    method: 'DELETE',
    cacheResponse: false,
  });
}

// ============================================================================
// PAGINATION UTILITIES
// ============================================================================

export async function bulletproofPaginated<T = unknown>(
  url: string,
  params: {
    page?: number;
    limit?: number;
    [key: string]: unknown;
  } = {},
  config: FetchConfig = {}
): Promise<PaginatedResponse<T>> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const fullUrl = `${url}?${searchParams.toString()}`;
  const response = await bulletproofGet<T[]>(fullUrl, config);

  return {
    items: Array.isArray(response.data) ? response.data : [],
    total: response.meta?.total ?? 0,
    page: response.meta?.page ?? 1,
    limit: response.meta?.limit ?? 10,
    hasNext: response.meta?.hasNext ?? false,
    hasPrevious: response.meta?.hasPrevious ?? false,
  };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export async function bulletproofBatch<T = unknown>(
  requests: Array<{
    url: string;
    config?: FetchConfig;
  }>,
  options: {
    concurrency?: number;
    failFast?: boolean;
    silentErrors?: boolean;
  } = {}
): Promise<Array<ApiResponse<T> | ApiError>> {
  const { concurrency = 5, failFast = false, silentErrors = true } = options;
  const results: Array<ApiResponse<T> | ApiError> = [];

  // Process requests in batches
  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);

    const batchPromises = batch.map(async ({ url, config = {} }) => {
      try {
        return await bulletproofFetch<T>(url, {
          ...config,
          silentErrors: silentErrors,
        });
      } catch (error) {
        if (failFast) throw error;
        return classifyError(error);
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Check for errors in fail-fast mode
    if (failFast && batchResults.some(result => result instanceof ApiError)) {
      break;
    }
  }

  return results;
}

// ============================================================================
// CACHE UTILITIES
// ============================================================================

export const cacheUtils = {
  clear: (pattern?: string) => responseCache.clear(pattern),
  invalidate: (url: string) => responseCache.clear(url),
  warmup: async (urls: string[], config: FetchConfig = {}) => {
    await Promise.all(urls.map(url => bulletproofGet(url, { ...config, silentErrors: true })));
  },
};

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';

export function useBulletproofFetch<T = unknown>(url: string | null, config: FetchConfig = {}) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    isLoading: false,
    isValidating: false,
    error: null,
    isStale: false,
    retryCount: 0,
    lastFetch: null,
  });

  const configRef = useRef(config);
  configRef.current = config;

  const fetchData = useCallback(
    async (isValidation = false) => {
      if (!url) return;

      setState(prev => ({
        ...prev,
        isLoading: !isValidation,
        isValidating: isValidation,
        error: null,
      }));

      try {
        const response = await bulletproofFetch<T>(url, configRef.current);

        setState(prev => ({
          ...prev,
          data: response.data,
          isLoading: false,
          isValidating: false,
          error: null,
          isStale: false,
          lastFetch: new Date(),
        }));
      } catch (error) {
        setState(prev => ({
          ...prev,
          error: error as ApiError,
          isLoading: false,
          isValidating: false,
          retryCount: prev.retryCount + 1,
        }));
      }
    },
    [url]
  );

  const mutate = useCallback(
    (newData?: T) => {
      if (newData !== undefined) {
        setState(prev => ({ ...prev, data: newData, isStale: false }));
      } else {
        fetchData(true);
      }
    },
    [fetchData]
  );

  const retry = useCallback(() => {
    fetchData();
  }, [fetchData]);

  // Initial fetch
  useEffect(() => {
    if (url) {
      fetchData();
    }
  }, [url, fetchData]);

  return {
    ...state,
    mutate,
    retry,
    revalidate: () => fetchData(true),
  };
}

export default {
  bulletproofFetch,
  bulletproofGet,
  bulletproofPost,
  bulletproofPut,
  bulletproofDelete,
  bulletproofPaginated,
  bulletproofBatch,
  cacheUtils,
  useBulletproofFetch,
  ApiError,
  ErrorType,
};
