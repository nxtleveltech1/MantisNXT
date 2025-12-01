import { AIError, AIErrorCode, ErrorCodeSeverity } from './types';
import { errorHandler } from './handler';

/**
 * Recovery strategies and circuit breaker for AI operations
 * Provides automatic retry, timeout, and fallback mechanisms
 */

export interface RetryStrategy {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface CircuitBreakerStats {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  successCount: number;
  totalRequests: number;
  errorRate: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number; // failures before opening
  recoveryTimeout: number; // ms before trying half-open
  successThreshold: number; // successes needed to close from half-open
  monitoringPeriod: number; // ms to track error rate
}

/**
 * Circuit Breaker implementation
 * Prevents cascading failures by temporarily stopping requests to failing services
 */
export class CircuitBreaker {
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime?: Date;
  private nextAttemptTime?: Date;
  private totalRequests = 0;

  constructor(
    private name: string,
    private config: CircuitBreakerConfig
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.state = 'half-open';
      } else {
        throw new AIError(
          AIErrorCode.PROVIDER_UNAVAILABLE,
          `Circuit breaker '${this.name}' is open`,
          'transient',
          { metadata: { circuitBreaker: this.name, state: this.state } },
          true,
          'Service is temporarily unavailable, try again later'
        );
      }
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error instanceof AIError ? error : errorHandler.handle(error));
      throw error;
    }
  }

  /**
   * Record successful operation
   */
  recordSuccess(): void {
    this.successCount++;

    if (this.state === 'half-open') {
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
      }
    } else if (this.state === 'closed') {
      // Reset failure count on success in closed state
      this.failureCount = 0;
    }
  }

  /**
   * Record failed operation
   */
  recordFailure(error: AIError): void {
    this.failureCount++;
    this.lastFailureTime = new Date();

    if (this.state === 'half-open') {
      this.state = 'open';
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    } else if (this.state === 'closed' && this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      this.nextAttemptTime = new Date(Date.now() + this.config.recoveryTimeout);
    }
  }

  /**
   * Check if circuit breaker is open
   */
  isOpen(): boolean {
    return this.state === 'open';
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      successCount: this.successCount,
      totalRequests: this.totalRequests,
      errorRate: this.totalRequests > 0 ? this.failureCount / this.totalRequests : 0,
    };
  }

  /**
   * Check if we should attempt to reset from open to half-open
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime ? Date.now() >= this.nextAttemptTime.getTime() : false;
  }

  /**
   * Reset circuit breaker to closed state
   */
  private reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
  }
}

/**
 * Recovery Manager - Orchestrates various recovery strategies
 */
export class RecoveryManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();

  /**
   * Execute with retry strategy
   */
  async withRetry<T>(
    fn: () => Promise<T>,
    strategy: RetryStrategy = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    }
  ): Promise<T> {
    let lastError: Error | AIError;

    for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof AIError ? error : errorHandler.handle(error);

        const aiError = lastError as AIError;
        if (!errorHandler.isRetryable(aiError) || attempt === strategy.maxAttempts) {
          throw lastError;
        }

        const delay = Math.min(
          strategy.baseDelay * Math.pow(strategy.backoffMultiplier, attempt - 1),
          strategy.maxDelay
        );

        await this.delay(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Execute with circuit breaker protection
   */
  async withCircuitBreaker<T>(
    name: string,
    fn: () => Promise<T>,
    config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      successThreshold: 3,
      monitoringPeriod: 60000,
    }
  ): Promise<T> {
    if (!this.circuitBreakers.has(name)) {
      this.circuitBreakers.set(name, new CircuitBreaker(name, config));
    }

    const breaker = this.circuitBreakers.get(name)!;
    return breaker.execute(fn);
  }

  /**
   * Execute with timeout
   */
  async withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new AIError(
              AIErrorCode.TOOL_TIMEOUT,
              `Operation timed out after ${timeoutMs}ms`,
              'transient',
              { metadata: { timeout: timeoutMs } },
              true,
              'Operation took too long, please try again'
            )
          );
        }, timeoutMs);
      }),
    ]);
  }

  /**
   * Execute with fallback
   */
  async withFallback<T>(fn: () => Promise<T>, fallback: T | (() => T)): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const aiError = error instanceof AIError ? error : errorHandler.handle(error);

      // Only fallback for non-fatal errors
      if (aiError.severity === 'fatal') {
        throw error;
      }

      return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
    }
  }

  /**
   * Combine multiple recovery strategies
   */
  async combineStrategies<T>(
    fn: () => Promise<T>,
    strategies: {
      retry?: RetryStrategy;
      circuitBreaker?: { name: string; config?: CircuitBreakerConfig };
      timeout?: number;
      fallback?: T | (() => T);
    }
  ): Promise<T> {
    let wrappedFn = fn;

    // Apply timeout first (innermost)
    if (strategies.timeout) {
      wrappedFn = () => this.withTimeout(wrappedFn, strategies.timeout!);
    }

    // Apply circuit breaker
    if (strategies.circuitBreaker) {
      const { name, config } = strategies.circuitBreaker;
      wrappedFn = () => this.withCircuitBreaker(name, wrappedFn, config);
    }

    // Apply retry
    if (strategies.retry) {
      wrappedFn = () => this.withRetry(wrappedFn, strategies.retry);
    }

    // Apply fallback (outermost)
    if (strategies.fallback !== undefined) {
      wrappedFn = () => this.withFallback(wrappedFn, strategies.fallback!);
    }

    return wrappedFn();
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats(name: string): CircuitBreakerStats | undefined {
    const breaker = this.circuitBreakers.get(name);
    return breaker?.getStats();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(name: string): void {
    this.circuitBreakers.delete(name);
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Default strategies for different error types
export const DefaultStrategies = {
  // Tool operations - quick retries
  tool: {
    retry: {
      maxAttempts: 3,
      baseDelay: 500,
      maxDelay: 5000,
      backoffMultiplier: 2,
    },
    circuitBreaker: {
      failureThreshold: 3,
      recoveryTimeout: 30000,
      successThreshold: 2,
      monitoringPeriod: 60000,
    },
    timeout: 10000, // 10 seconds
  },

  // Provider operations - longer timeouts, more retries
  provider: {
    retry: {
      maxAttempts: 5,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeout: 120000, // 2 minutes
      successThreshold: 3,
      monitoringPeriod: 300000, // 5 minutes
    },
    timeout: 30000, // 30 seconds
  },

  // Database operations - conservative approach
  database: {
    retry: {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 1.5,
    },
    circuitBreaker: {
      failureThreshold: 3,
      recoveryTimeout: 60000,
      successThreshold: 2,
      monitoringPeriod: 120000,
    },
    timeout: 15000, // 15 seconds
  },

  // Network operations - aggressive retries
  network: {
    retry: {
      maxAttempts: 5,
      baseDelay: 500,
      maxDelay: 10000,
      backoffMultiplier: 2,
    },
    circuitBreaker: {
      failureThreshold: 10,
      recoveryTimeout: 30000,
      successThreshold: 5,
      monitoringPeriod: 60000,
    },
    timeout: 10000, // 10 seconds
  },
};

// Singleton instance
export const recoveryManager = new RecoveryManager();
