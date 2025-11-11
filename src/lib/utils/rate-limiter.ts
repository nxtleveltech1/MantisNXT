// @ts-nocheck

/**
 * Rate Limiter Utility
 *
 * Implements token bucket algorithm for rate limiting API requests
 * Prevents overwhelming external APIs with too many requests
 *
 * Author: Claude Code
 * Date: 2025-11-04
 */

export interface RateLimiterConfig {
  maxTokens: number;      // Maximum tokens (requests) allowed
  refillRate: number;     // Tokens per second
  identifier: string;     // Unique identifier for this limiter
}

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private maxTokens: number;
  private refillRate: number;
  private identifier: string;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.tokens = config.maxTokens;
    this.refillRate = config.refillRate;
    this.identifier = config.identifier;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on time elapsed
   */
  private refill(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // Convert to seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Try to consume a token
   * Returns true if successful, false if rate limited
   */
  tryConsume(cost: number = 1): boolean {
    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }

    return false;
  }

  /**
   * Wait until a token is available and consume it
   * Returns a promise that resolves when token is acquired
   */
  async consume(cost: number = 1): Promise<void> {
    while (!this.tryConsume(cost)) {
      // Calculate wait time until next token
      const waitTime = (cost - this.tokens) / this.refillRate * 1000;
      await new Promise(resolve => setTimeout(resolve, Math.max(100, waitTime)));
    }
  }

  /**
   * Get current token count
   */
  getAvailableTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
}

/**
 * Global rate limiter instances for different services
 */
const rateLimiters = new Map<string, RateLimiter>();

/**
 * Get or create a rate limiter for a service
 */
export function getRateLimiter(
  identifier: string,
  maxTokens: number = 10,
  refillRate: number = 0.16 // ~10 requests per minute
): RateLimiter {
  if (!rateLimiters.has(identifier)) {
    rateLimiters.set(identifier, new RateLimiter({
      identifier,
      maxTokens,
      refillRate,
    }));
  }

  return rateLimiters.get(identifier)!;
}

/**
 * Exponential backoff utility for retries
 */
export async function exponentialBackoff(
  fn: () => Promise<unknown>,
  maxRetries: number = 5,
  baseDelay: number = 1000,
  maxDelay: number = 32000
): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check if error is rate limit (429)
      const isRateLimit = error.status === 429 ||
                         error.code === 'RATE_LIMITED' ||
                         error.message?.includes('too many requests');

      // If not rate limit error and not last attempt, retry with backoff
      if (!isRateLimit && attempt < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // If rate limit error, use longer backoff
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt + 2), maxDelay * 2);
        console.log(`Rate limited. Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Last attempt or non-retryable error
      throw error;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Circuit breaker to prevent cascading failures
 */
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private threshold: number;
  private timeout: number;
  private identifier: string;

  constructor(
    identifier: string,
    threshold: number = 5,
    timeout: number = 60000 // 1 minute
  ) {
    this.identifier = identifier;
    this.threshold = threshold;
    this.timeout = timeout;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === 'open') {
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;

      if (timeSinceLastFailure > this.timeout) {
        // Try half-open state
        this.state = 'half-open';
        console.log(`[${this.identifier}] Circuit breaker entering half-open state`);
      } else {
        throw new Error(`Circuit breaker is open. Service unavailable. Try again in ${Math.ceil((this.timeout - timeSinceLastFailure) / 1000)}s`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    if (this.state === 'half-open') {
      this.state = 'closed';
      console.log(`[${this.identifier}] Circuit breaker closed`);
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
      console.log(`[${this.identifier}] Circuit breaker opened after ${this.failures} failures`);
    }
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = 0;
  }

  /**
   * Get current state
   */
  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }
}

/**
 * Global circuit breakers for different services
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a service
 */
export function getCircuitBreaker(
  identifier: string,
  threshold: number = 5,
  timeout: number = 60000
): CircuitBreaker {
  if (!circuitBreakers.has(identifier)) {
    circuitBreakers.set(identifier, new CircuitBreaker(identifier, threshold, timeout));
  }

  return circuitBreakers.get(identifier)!;
}
