/**
 * Enhanced Error Recovery Hooks
 * Provides bulletproof error handling with exponential backoff and advanced retry mechanisms
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryCondition?: (error: Error, attempt: number) => boolean;
}

export interface ErrorRecoveryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: Error | null;
  canRetry: boolean;
  nextRetryDelay: number;
}

export interface ErrorRecoveryOptions {
  retryConfig?: Partial<RetryConfig>;
  onError?: (error: Error, attempt: number) => void;
  onRetrySuccess?: (attempt: number) => void;
  onMaxRetriesReached?: (error: Error) => void;
  silentRetries?: boolean;
  showToast?: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryCondition: (error: Error, attempt: number) => {
    // Retry on network errors, timeouts, and 5xx server errors
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') return true;
    if (error.message.includes('fetch')) return true;
    if (error.message.includes('timeout')) return true;
    if (error.message.includes('5')) return true;
    return attempt === 1; // Always retry at least once
  },
};

// ============================================================================
// RETRY UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  backoffMultiplier: number,
  jitter: boolean
): number {
  const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
  const delayWithCap = Math.min(exponentialDelay, maxDelay);

  if (!jitter) return delayWithCap;

  // Add random jitter (±25%)
  const jitterAmount = delayWithCap * 0.25;
  return delayWithCap + (Math.random() - 0.5) * 2 * jitterAmount;
}

/**
 * Sleep utility with cancellation support
 */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
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

// ============================================================================
// MAIN ERROR RECOVERY HOOK
// ============================================================================

export function useErrorRecovery(options: ErrorRecoveryOptions = {}) {
  const {
    retryConfig: userRetryConfig = {},
    onError,
    onRetrySuccess,
    onMaxRetriesReached,
    silentRetries = false,
    showToast = true,
  } = options;

  const retryConfig = useMemo(
    () => ({
      ...DEFAULT_RETRY_CONFIG,
      ...userRetryConfig,
    }),
    [userRetryConfig]
  );
  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<ErrorRecoveryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    canRetry: true,
    nextRetryDelay: retryConfig.baseDelay,
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /**
   * Execute function with automatic retry and error recovery
   */
  const executeWithRetry = useCallback(
    async <T>(operation: () => Promise<T>, customConfig?: Partial<RetryConfig>): Promise<T> => {
      const config = { ...retryConfig, ...customConfig };
      let lastError: Error;

      // Cancel any existing retry operations
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setState(prev => ({
        ...prev,
        isRetrying: false,
        retryCount: 0,
        lastError: null,
        canRetry: true,
      }));

      for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
        try {
          // Update state for retry attempts
          if (attempt > 1) {
            setState(prev => ({
              ...prev,
              isRetrying: true,
              retryCount: attempt - 1,
              nextRetryDelay: calculateDelay(
                attempt,
                config.baseDelay,
                config.maxDelay,
                config.backoffMultiplier,
                config.jitter
              ),
            }));

            // Wait before retry
            const delay = calculateDelay(
              attempt - 1,
              config.baseDelay,
              config.maxDelay,
              config.backoffMultiplier,
              config.jitter
            );

            await sleep(delay, abortControllerRef.current?.signal);

            if (!silentRetries && showToast) {
              toast.info(`Retrying... (Attempt ${attempt - 1}/${config.maxRetries})`);
            }
          }

          const result = await operation();

          // Success - reset state
          setState(prev => ({
            ...prev,
            isRetrying: false,
            retryCount: 0,
            lastError: null,
            canRetry: true,
            nextRetryDelay: config.baseDelay,
          }));

          if (attempt > 1) {
            onRetrySuccess?.(attempt - 1);
            if (showToast) {
              toast.success(`Operation succeeded after ${attempt - 1} retries`);
            }
          }

          return result;
        } catch (error) {
          lastError = error as Error;

          // Update state with error
          setState(prev => ({
            ...prev,
            lastError: lastError,
            canRetry:
              attempt <= config.maxRetries && (config.retryCondition?.(lastError, attempt) ?? true),
          }));

          onError?.(lastError, attempt);

          // Check if we should retry
          const shouldRetry =
            attempt <= config.maxRetries && (config.retryCondition?.(lastError, attempt) ?? true);

          if (!shouldRetry) {
            setState(prev => ({ ...prev, isRetrying: false, canRetry: false }));

            if (attempt > config.maxRetries) {
              onMaxRetriesReached?.(lastError);
              if (showToast) {
                toast.error(`Failed after ${config.maxRetries} retries: ${lastError.message}`);
              }
            }

            throw lastError;
          }
        }
      }

      throw lastError!;
    },
    [retryConfig, onError, onRetrySuccess, onMaxRetriesReached, silentRetries, showToast]
  );

  /**
   * Manual retry function
   */
  const retry = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      if (!state.canRetry) {
        throw new Error('Cannot retry: maximum retries reached');
      }

      return executeWithRetry(operation);
    },
    [state.canRetry, executeWithRetry]
  );

  /**
   * Cancel ongoing retry operations
   */
  const cancelRetries = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({
      ...prev,
      isRetrying: false,
      canRetry: false,
    }));
  }, []);

  /**
   * Reset error recovery state
   */
  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      canRetry: true,
      nextRetryDelay: retryConfig.baseDelay,
    });
  }, [retryConfig.baseDelay]);

  return {
    ...state,
    executeWithRetry,
    retry,
    cancelRetries,
    reset,
  };
}

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

/**
 * Hook for API requests with smart retry logic
 */
export function useApiRetry(baseUrl?: string) {
  const errorRecovery = useErrorRecovery({
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryCondition: (error: Error, attempt: number) => {
        // Don't retry on 4xx client errors (except 408, 429)
        if (
          error.message.includes('400') ||
          error.message.includes('401') ||
          error.message.includes('403') ||
          error.message.includes('404')
        ) {
          return false;
        }

        // Retry on network errors, timeouts, and 5xx errors
        return true;
      },
    },
    showToast: true,
  });

  const fetchWithRetry = useCallback(
    async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const url = baseUrl ? `${baseUrl}${endpoint}` : endpoint;

      return errorRecovery.executeWithRetry(async () => {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
      });
    },
    [baseUrl, errorRecovery]
  );

  return {
    ...errorRecovery,
    fetchWithRetry,
  };
}

/**
 * Hook for database operations with transaction retry
 */
export function useDatabaseRetry() {
  return useErrorRecovery({
    retryConfig: {
      maxRetries: 5,
      baseDelay: 500,
      maxDelay: 5000,
      retryCondition: (error: Error) => {
        // Retry on connection errors, timeouts, deadlocks
        const retryableErrors = [
          'connection',
          'timeout',
          'deadlock',
          'lock',
          'busy',
          'ECONNRESET',
          'ECONNREFUSED',
        ];

        return retryableErrors.some(keyword =>
          error.message.toLowerCase().includes(keyword.toLowerCase())
        );
      },
    },
    silentRetries: true,
    showToast: false,
  });
}

/**
 * Hook for form submission with validation retry
 */
export function useFormRetry() {
  return useErrorRecovery({
    retryConfig: {
      maxRetries: 2,
      baseDelay: 2000,
      jitter: false,
      retryCondition: (error: Error, attempt: number) => {
        // Only retry once on network errors
        return (
          attempt === 1 &&
          (error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('fetch'))
        );
      },
    },
    showToast: true,
  });
}

// ============================================================================
// ERROR RECOVERY CONTEXT
// ============================================================================

export interface ErrorRecoveryContextValue {
  globalRetryConfig: RetryConfig;
  updateGlobalConfig: (config: Partial<RetryConfig>) => void;
  reportError: (error: Error, context: string) => void;
}

import { createContext, useContext } from 'react';

const ErrorRecoveryContext = createContext<ErrorRecoveryContextValue | null>(null);

export function useErrorRecoveryContext() {
  const context = useContext(ErrorRecoveryContext);
  if (!context) {
    throw new Error('useErrorRecoveryContext must be used within ErrorRecoveryProvider');
  }
  return context;
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for handling async operations with error boundaries
 */
export function useSafeAsync<T>() {
  const [state, setState] = useState<{
    data: T | null;
    error: Error | null;
    isLoading: boolean;
  }>({
    data: null,
    error: null,
    isLoading: false,
  });

  const errorRecovery = useErrorRecovery();

  const execute = useCallback(
    async (operation: () => Promise<T>, options?: { showLoading?: boolean }) => {
      const { showLoading = true } = options || {};

      if (showLoading) {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
      }

      try {
        const result = await errorRecovery.executeWithRetry(operation);
        setState({ data: result, error: null, isLoading: false });
        return result;
      } catch (error) {
        setState({ data: null, error: error as Error, isLoading: false });
        throw error;
      }
    },
    [errorRecovery]
  );

  const reset = useCallback(() => {
    setState({ data: null, error: null, isLoading: false });
    errorRecovery.reset();
  }, [errorRecovery]);

  return {
    ...state,
    execute,
    reset,
    retry: errorRecovery.retry,
    isRetrying: errorRecovery.isRetrying,
    retryCount: errorRecovery.retryCount,
  };
}

export default useErrorRecovery;
