// @ts-nocheck
/**
 * Enhanced API Client with Retry Logic, Error Handling, and Offline Support
 * Provides resilient API communication with automatic retries and fallback mechanisms
 */


export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  retryDelayType?: 'fixed' | 'exponential';
  maxRetryDelay?: number;
  onlineCheck?: boolean;
  offlineStorage?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: number;
  timestamp?: string;
  requestId?: string;
}

export interface RetryConfig {
  attempts: number;
  delay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: unknown) => boolean;
}

class ApiClient {
  private config: Required<ApiClientConfig>;
  private retryConfig: RetryConfig;
  private abortControllers: Map<string, AbortController> = new Map();
  private offlineQueue: Array<{ key: string; request: () => Promise<unknown> }> = [];
  private isOnline: boolean = true;

  constructor(config: ApiClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      retryDelayType: config.retryDelayType || 'exponential',
      maxRetryDelay: config.maxRetryDelay || 30000,
      onlineCheck: config.onlineCheck ?? true,
      offlineStorage: config.offlineStorage ?? true,
    };

    this.retryConfig = {
      attempts: this.config.retries,
      delay: this.config.retryDelay,
      maxDelay: this.config.maxRetryDelay,
      backoffFactor: 2,
      retryCondition: this.shouldRetry,
    };

    this.setupOnlineDetection();
    this.setupOfflineQueue();
  }

  private setupOnlineDetection() {
    if (typeof window === 'undefined' || !this.config.onlineCheck) return;

    this.isOnline = navigator.onLine;

    window.addEventListener('online', () => {
      console.log('🌐 Connection restored');
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('📡 Connection lost - entering offline mode');
      this.isOnline = false;
    });
  }

  private setupOfflineQueue() {
    if (typeof window === 'undefined' || !this.config.offlineStorage) return;

    // Load queued requests from localStorage
    try {
      const stored = localStorage.getItem('api_offline_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }

  private saveOfflineQueue() {
    if (typeof window === 'undefined' || !this.config.offlineStorage) return;

    try {
      localStorage.setItem('api_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('Failed to save offline queue:', error);
    }
  }

  private async processOfflineQueue() {
    if (this.offlineQueue.length === 0) return;

    console.log(`📦 Processing ${this.offlineQueue.length} queued requests`);

    const queue = [...this.offlineQueue];
    this.offlineQueue = [];
    this.saveOfflineQueue();

    for (const item of queue) {
      try {
        await item.request();
        console.log(`✅ Processed queued request: ${item.key}`);
      } catch (error) {
        console.error(`❌ Failed to process queued request: ${item.key}`, error);
        // Re-queue if it's a retryable error
        if (this.shouldRetry(error)) {
          this.offlineQueue.push(item);
        }
      }
    }

    this.saveOfflineQueue();
  }

  private shouldRetry = (error: unknown): boolean => {
    // Don't retry on successful responses
    if (error?.response?.status < 400) return false;

    // Always retry on network errors
    if (!error?.response) return true;

    // Retry on server errors (5xx)
    if (error.response.status >= 500) return true;

    // Retry on specific client errors
    const retryableClientErrors = [408, 429]; // Timeout, Too Many Requests
    if (retryableClientErrors.includes(error.response.status)) return true;

    // Don't retry on authentication/authorization errors
    if ([401, 403].includes(error.response.status)) return false;

    // Don't retry on client errors (4xx) except above
    if (error.response.status >= 400 && error.response.status < 500) return false;

    return false;
  };

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateRetryDelay(attempt: number): number {
    if (this.config.retryDelayType === 'fixed') {
      return this.config.retryDelay;
    }

    // Exponential backoff with jitter
    const exponentialDelay = this.config.retryDelay * Math.pow(this.retryConfig.backoffFactor, attempt - 1);
    const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
    return Math.min(exponentialDelay + jitter, this.config.maxRetryDelay);
  }

  private createAbortController(requestId: string): AbortController {
    // Cancel any existing request with the same ID
    const existing = this.abortControllers.get(requestId);
    if (existing) {
      existing.abort();
    }

    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);

    // Auto-cleanup after timeout
    setTimeout(() => {
      this.abortControllers.delete(requestId);
    }, this.config.timeout + 5000);

    return controller;
  }

  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    requestId: string = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.retryConfig.attempts + 1; attempt++) {
      try {
        const result = await requestFn();

        // Clear any queued retries for this request on success
        this.offlineQueue = this.offlineQueue.filter(item => item.key !== requestId);
        this.saveOfflineQueue();

        return result;
      } catch (error) {
        lastError = error;

        console.warn(`❌ API request failed (attempt ${attempt}/${this.retryConfig.attempts + 1}):`, {
          requestId,
          error: error.message,
          status: error?.response?.status,
          willRetry: attempt <= this.retryConfig.attempts && this.retryConfig.retryCondition?.(error)
        });

        // Don't retry if we've exhausted attempts
        if (attempt > this.retryConfig.attempts) break;

        // Don't retry if the error is not retryable
        if (!this.retryConfig.retryCondition?.(error)) break;

        // If offline, queue the request instead of retrying immediately
        if (!this.isOnline && this.config.offlineStorage) {
          this.offlineQueue.push({
            key: requestId,
            request: requestFn,
          });
          this.saveOfflineQueue();
          throw new Error('Request queued for when connection is restored');
        }

        // Wait before retrying
        const delayMs = this.calculateRetryDelay(attempt);
        await this.delay(delayMs);
      }
    }

    throw lastError;
  }

  async request<T = unknown>(
    endpoint: string,
    options: RequestInit & {
      requestId?: string;
      timeout?: number;
      skipRetry?: boolean;
    } = {}
  ): Promise<ApiResponse<T>> {
    const requestId = options.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timeout = options.timeout || this.config.timeout;

    // Remove custom options from fetch options
    const { requestId: _, timeout: __, skipRetry, ...fetchOptions } = options;

    const controller = this.createAbortController(requestId);

    const requestFn = async (): Promise<ApiResponse<T>> => {
      // Add timeout
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);

      try {
        const url = endpoint.startsWith('http') ? endpoint : `${this.config.baseURL}${endpoint}`;

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'X-Request-ID': requestId,
            'X-Timestamp': new Date().toISOString(),
            ...fetchOptions.headers,
          },
        });

        clearTimeout(timeoutId);

        let data: unknown;
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }

        // Handle different response formats
        if (!response.ok) {
          const error = new Error(data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`);
          (error as unknown).response = response;
          (error as unknown).data = data;
          throw error;
        }

        // Normalize response format
        if (typeof data === 'object' && data !== null) {
          if ('success' in data || 'data' in data || 'error' in data) {
            return data as ApiResponse<T>;
          } else {
            return {
              success: true,
              data: data as T,
              timestamp: new Date().toISOString(),
              requestId,
            };
          }
        }

        return {
          success: true,
          data: data as T,
          timestamp: new Date().toISOString(),
          requestId,
        };

      } catch (error) {
        clearTimeout(timeoutId);

        if (controller.signal.aborted) {
          const timeoutError = new Error(`Request timeout after ${timeout}ms`);
          (timeoutError as unknown).code = 'TIMEOUT';
          throw timeoutError;
        }

        throw error;
      } finally {
        this.abortControllers.delete(requestId);
      }
    };

    if (skipRetry) {
      return requestFn();
    }

    return this.executeWithRetry(requestFn, requestId);
  }

  // Convenience methods
  async get<T = unknown>(endpoint: string, options?: RequestInit & { requestId?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit & { requestId?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit & { requestId?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = unknown>(endpoint: string, data?: unknown, options?: RequestInit & { requestId?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = unknown>(endpoint: string, options?: RequestInit & { requestId?: string }): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Cancel specific request
  cancelRequest(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    for (const [requestId, controller] of this.abortControllers) {
      controller.abort();
    }
    this.abortControllers.clear();
  }

  // Get offline queue status
  getOfflineQueueStatus() {
    return {
      isOnline: this.isOnline,
      queuedRequests: this.offlineQueue.length,
      queue: this.offlineQueue.map(item => ({ key: item.key })),
    };
  }

  // Clear offline queue
  clearOfflineQueue(): void {
    this.offlineQueue = [];
    this.saveOfflineQueue();
  }
}

// Create default instance
export const apiClient = new ApiClient();

// Export factory function for custom instances
export const createApiClient = (config: ApiClientConfig) => new ApiClient(config);

// Enhanced React Query error retry logic
export const queryRetryFn = (failureCount: number, error: unknown) => {
  // Don't retry authentication errors
  if (error?.response?.status === 401 || error?.response?.status === 403) {
    return false;
  }

  // Don't retry client errors (except timeout and rate limit)
  if (error?.response?.status >= 400 && error?.response?.status < 500) {
    const retryableClientErrors = [408, 429];
    if (!retryableClientErrors.includes(error?.response?.status)) {
      return false;
    }
  }

  // Retry up to 3 times with exponential backoff
  return failureCount < 3;
};

// Enhanced React Query error retry delay
export const queryRetryDelay = (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000);

export default apiClient;