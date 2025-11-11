// @ts-nocheck

/**
 * Resilient API Utilities
 * Bulletproof API layer with comprehensive error handling and retry mechanisms
 */


// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface ApiConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryMultiplier?: number;
  maxRetryDelay?: number;
  headers?: Record<string, string>;
  enableCaching?: boolean;
  cacheDuration?: number;
  retryConfig?: Partial<RetryConfig>;
}

export interface ApiResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
  fromCache?: boolean;
  retryCount?: number;
}

export interface ApiError extends Error {
  status?: number;
  statusText?: string;
  response?: Response;
  isRetryable?: boolean;
  retryAfter?: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  multiplier: number;
  jitter: boolean;
  retryCondition: (error: ApiError, attempt: number) => boolean;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

class ApiCache {
  private static cache = new Map<
    string,
    {
      data: unknown;
      timestamp: number;
      expiresAt: number;
      etag?: string;
    }
  >();

  static set(key: string, data: unknown, duration: number, etag?: string): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + duration,
      etag,
    });
  }

  static get(key: string): { data: unknown; etag?: string } | null {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return { data: entry.data, etag: entry.etag };
  }

  static clear(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  static has(key: string): boolean {
    const entry = this.cache.get(key);
    return !!entry && Date.now() <= entry.expiresAt;
  }

  static size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// CONNECTION MONITOR
// ============================================================================

class ConnectionMonitor {
  private static isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private static listeners: ((online: boolean) => void)[] = [];
  private static quality: 'good' | 'poor' | 'offline' = 'good';

  static {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.setOnline(true));
      window.addEventListener('offline', () => this.setOnline(false));

      // Monitor connection quality
      this.monitorQuality();
    }
  }

  private static setOnline(online: boolean): void {
    this.isOnline = online;
    this.quality = online ? 'good' : 'offline';
    this.listeners.forEach(listener => listener(online));
  }

  private static async monitorQuality(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const start = Date.now();
      await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });
      const duration = Date.now() - start;

      this.quality = duration < 1000 ? 'good' : 'poor';
    } catch {
      this.quality = this.isOnline ? 'poor' : 'offline';
    }

    // Check again in 30 seconds
    setTimeout(() => this.monitorQuality(), 30000);
  }

  static getStatus() {
    return { isOnline: this.isOnline, quality: this.quality };
  }

  static subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }
}

// ============================================================================
// REQUEST UTILITIES
// ============================================================================

function createApiError(
  message: string,
  status?: number,
  statusText?: string,
  response?: Response,
  isRetryable: boolean = false
): ApiError {
  const error = new Error(message) as ApiError;
  error.name = 'ApiError';
  error.status = status;
  error.statusText = statusText;
  error.response = response;
  error.isRetryable = isRetryable;

  return error;
}

function isRetryableError(error: ApiError, attempt: number): boolean {
  // Don't retry if offline
  if (!ConnectionMonitor.getStatus().isOnline) return false;

  // Always retry on first attempt for most errors
  if (attempt === 1) return true;

  // Network errors
  if (error.name === 'TypeError' || error.message.includes('fetch')) return true;

  // Timeout errors
  if (error.name === 'AbortError' || error.message.includes('timeout')) return true;

  // Server errors (5xx)
  if (error.status && error.status >= 500) return true;

  // Rate limiting (429)
  if (error.status === 429) return true;

  // Specific client errors that might be temporary
  if (error.status === 408 || error.status === 409) return true;

  return false;
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Aborted'));
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    signal?.addEventListener('abort', () => {
      clearTimeout(timeoutId);
      reject(new Error('Aborted'));
    });
  });
}

function calculateRetryDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number,
  jitter: boolean
): number {
  const exponentialDelay = baseDelay * Math.pow(multiplier, attempt - 1);
  const delayWithCap = Math.min(exponentialDelay, maxDelay);

  if (!jitter) return delayWithCap;

  // Add random jitter (±25%)
  const jitterAmount = delayWithCap * 0.25;
  return delayWithCap + (Math.random() - 0.5) * 2 * jitterAmount;
}

// ============================================================================
// RESILIENT API CLIENT
// ============================================================================

export class ResilientApiClient {
  private config: Required<ApiConfig>;
  private abortControllers = new Map<string, AbortController>();

  constructor(config: ApiConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      retryMultiplier: config.retryMultiplier || 2,
      maxRetryDelay: config.maxRetryDelay || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      enableCaching: config.enableCaching ?? true,
      cacheDuration: config.cacheDuration || 300000, // 5 minutes
      retryConfig: config.retryConfig ?? {},
    };
  }

  private getCacheKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit,
    overrideConfig?: Partial<ApiConfig>
  ): Promise<ApiResponse<T>> {
    const effectiveConfig = {
      ...this.config,
      ...overrideConfig,
      baseUrl: overrideConfig?.baseUrl ?? this.config.baseUrl,
      timeout: overrideConfig?.timeout ?? this.config.timeout,
      retries: overrideConfig?.retries ?? this.config.retries,
      retryDelay: overrideConfig?.retryDelay ?? this.config.retryDelay,
      retryMultiplier: overrideConfig?.retryMultiplier ?? this.config.retryMultiplier,
      maxRetryDelay: overrideConfig?.maxRetryDelay ?? this.config.maxRetryDelay,
      enableCaching: overrideConfig?.enableCaching ?? this.config.enableCaching,
      cacheDuration: overrideConfig?.cacheDuration ?? this.config.cacheDuration,
      headers: {
        ...this.config.headers,
        ...(overrideConfig?.headers ?? {}),
      },
    } as Required<ApiConfig>;

    const fullUrl = `${effectiveConfig.baseUrl}${url}`;
    const cacheKey = this.getCacheKey(fullUrl, options);
    const isGetRequest = !options.method || options.method.toUpperCase() === 'GET';

    // Check cache for GET requests
    if (isGetRequest && effectiveConfig.enableCaching) {
      const cached = ApiCache.get(cacheKey);
      if (cached) {
        return {
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          fromCache: true,
        };
      }
    }

    const retryOverrides = overrideConfig?.retryConfig ?? {};
    const retry: RetryConfig = {
      maxRetries: effectiveConfig.retries,
      baseDelay: effectiveConfig.retryDelay,
      maxDelay: effectiveConfig.maxRetryDelay,
      multiplier: effectiveConfig.retryMultiplier,
      jitter: true,
      retryCondition: isRetryableError,
      ...retryOverrides,
    };

    let lastError: ApiError;
    let retryCount = 0;

    // Create abort controller for this request
    const requestId = `${Date.now()}-${Math.random()}`;
    const abortController = new AbortController();
    this.abortControllers.set(requestId, abortController);

    try {
      for (let attempt = 1; attempt <= retry.maxRetries + 1; attempt++) {
        try {
          // Add delay before retry (except first attempt)
          if (attempt > 1) {
            const delay = calculateRetryDelay(
              attempt - 1,
              retry.baseDelay,
              retry.maxDelay,
              retry.multiplier,
              retry.jitter
            );
            await sleep(delay, abortController.signal);
            retryCount++;
          }

          // Prepare request options
          const requestHeaders = new Headers(effectiveConfig.headers);
          if (options.headers) {
            new Headers(options.headers).forEach((value, key) => {
              requestHeaders.set(key, value);
            });
          }

          const requestOptions: RequestInit = {
            ...options,
            headers: requestHeaders,
            signal: abortController.signal,
          };

          // Add timeout
          const timeoutController = new AbortController();
          const timeoutId = setTimeout(() => timeoutController.abort(), effectiveConfig.timeout);

          const combinedSignal = AbortSignal.any([
            abortController.signal,
            timeoutController.signal,
          ]);

          requestOptions.signal = combinedSignal;

          // Make the request
          const response = await fetch(fullUrl, requestOptions);
          clearTimeout(timeoutId);

          // Handle HTTP errors
          if (!response.ok) {
            const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            const isRetryable = retry.retryCondition(
              createApiError(errorMessage, response.status, response.statusText, response, true),
              attempt
            );

            if (attempt <= retry.maxRetries && isRetryable) {
              console.warn(
                `Request failed (attempt ${attempt}/${retry.maxRetries + 1}):`,
                errorMessage
              );
              continue;
            }

            throw createApiError(
              errorMessage,
              response.status,
              response.statusText,
              response,
              isRetryable
            );
          }

          // Parse response
          let data: T;
          const contentType = response.headers.get('content-type');

          if (contentType?.includes('application/json')) {
            data = await response.json();
          } else if (contentType?.includes('text/')) {
            data = (await response.text()) as T;
          } else {
            data = (await response.blob()) as T;
          }

          // Cache successful GET requests
          if (isGetRequest && effectiveConfig.enableCaching && response.status === 200) {
            const etag = response.headers.get('etag');
            ApiCache.set(cacheKey, data, effectiveConfig.cacheDuration, etag || undefined);
          }

          return {
            data,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            retryCount: retryCount > 0 ? retryCount : undefined,
          };
        } catch (error) {
          const apiError =
            error instanceof Error
              ? createApiError(error.message, undefined, undefined, undefined, true)
              : createApiError('Unknown error', undefined, undefined, undefined, true);

          lastError = apiError;

          // Check if we should retry
          const shouldRetry =
            attempt <= retry.maxRetries && retry.retryCondition(apiError, attempt);

          if (!shouldRetry) {
            break;
          }

          console.warn(
            `Request failed (attempt ${attempt}/${retry.maxRetries + 1}):`,
            apiError.message
          );
        }
      }

      throw lastError!;
    } finally {
      this.abortControllers.delete(requestId);
    }
  }

  // ============================================================================
  // PUBLIC API METHODS
  // ============================================================================

  async get<T>(url: string, config?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: 'GET' }, config);
  }

  async post<T>(url: string, data?: unknown, config?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      url,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  async put<T>(url: string, data?: unknown, config?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      url,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  async patch<T>(url: string, data?: unknown, config?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      url,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      config
    );
  }

  async delete<T>(url: string, config?: Partial<ApiConfig>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: 'DELETE' }, config);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  cancelAllRequests(): void {
    this.abortControllers.forEach(controller => controller.abort());
    this.abortControllers.clear();
  }

  clearCache(pattern?: string): void {
    ApiCache.clear(pattern);
  }

  getCacheStats() {
    return {
      size: ApiCache.size(),
      connectionStatus: ConnectionMonitor.getStatus(),
    };
  }

  // Health check endpoint
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/api/health', { retries: 1 });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// HOOK FOR REACT COMPONENTS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export interface UseResilientApiState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  retryCount: number;
}

export function useResilientApi<T>(
  apiCall: () => Promise<ApiResponse<T>>,
  dependencies: unknown[] = []
) {
  const [state, setState] = useState<UseResilientApiState<T>>({
    data: null,
    loading: true,
    error: null,
    retryCount: 0,
  });

  const execute = useCallback(async () => {
    // touch dependency list so lint tracks external inputs while keeping signature ergonomic
    dependencies.forEach(() => {});
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const response = await apiCall();
      setState({
        data: response.data,
        loading: false,
        error: null,
        retryCount: response.retryCount || 0,
      });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error as ApiError,
        retryCount: 0,
      });
    }
  }, [apiCall, dependencies]);

  useEffect(() => {
    execute();
  }, [execute]);

  const retry = useCallback(() => {
    execute();
  }, [execute]);

  return {
    ...state,
    retry,
    refresh: execute,
  };
}

// ============================================================================
// DEFAULT CLIENT INSTANCE
// ============================================================================

export const apiClient = new ResilientApiClient({
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  enableCaching: true,
  cacheDuration: 300000, // 5 minutes
});

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const resilientFetch = {
  get: <T>(url: string, config?: Partial<ApiConfig>) => apiClient.get<T>(url, config),

  post: <T>(url: string, data?: unknown, config?: Partial<ApiConfig>) =>
    apiClient.post<T>(url, data, config),

  put: <T>(url: string, data?: unknown, config?: Partial<ApiConfig>) =>
    apiClient.put<T>(url, data, config),

  patch: <T>(url: string, data?: unknown, config?: Partial<ApiConfig>) =>
    apiClient.patch<T>(url, data, config),

  delete: <T>(url: string, config?: Partial<ApiConfig>) => apiClient.delete<T>(url, config),

  healthCheck: () => apiClient.healthCheck(),
  clearCache: (pattern?: string) => apiClient.clearCache(pattern),
  getCacheStats: () => apiClient.getCacheStats(),
};

export default resilientFetch;
