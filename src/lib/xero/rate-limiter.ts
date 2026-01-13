/**
 * Xero API Rate Limiter
 * 
 * Implements rate limiting for Xero API calls to comply with:
 * - 60 calls per minute per tenant
 * - 5000 calls per day per tenant
 * 
 * Uses a token bucket algorithm with automatic retry on 429 errors.
 */

import { XeroRateLimitError } from './errors';

// ============================================================================
// CONFIGURATION
// ============================================================================

const MINUTE_LIMIT = 60;  // Xero limit: 60 calls/minute
const MINUTE_HEADROOM = 10; // Leave headroom for other processes
const EFFECTIVE_MINUTE_LIMIT = MINUTE_LIMIT - MINUTE_HEADROOM;

const DAILY_LIMIT = 5000; // Xero limit: 5000 calls/day
const DAILY_HEADROOM = 500;
const EFFECTIVE_DAILY_LIMIT = DAILY_LIMIT - DAILY_HEADROOM;

// ============================================================================
// RATE LIMITER CLASS
// ============================================================================

interface RateLimiterState {
  minuteTokens: number;
  dailyTokens: number;
  lastMinuteRefill: number;
  lastDailyRefill: number;
}

/**
 * Token bucket rate limiter for Xero API
 */
export class XeroRateLimiter {
  private state: Map<string, RateLimiterState> = new Map();

  /**
   * Get or create state for a tenant
   */
  private getState(tenantId: string): RateLimiterState {
    let state = this.state.get(tenantId);
    
    if (!state) {
      state = {
        minuteTokens: EFFECTIVE_MINUTE_LIMIT,
        dailyTokens: EFFECTIVE_DAILY_LIMIT,
        lastMinuteRefill: Date.now(),
        lastDailyRefill: Date.now(),
      };
      this.state.set(tenantId, state);
    }
    
    return state;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(tenantId: string): void {
    const state = this.getState(tenantId);
    const now = Date.now();
    
    // Refill minute tokens
    const minuteElapsed = now - state.lastMinuteRefill;
    if (minuteElapsed >= 60000) {
      state.minuteTokens = EFFECTIVE_MINUTE_LIMIT;
      state.lastMinuteRefill = now;
    } else {
      // Partial refill based on time elapsed
      const tokensToAdd = Math.floor((minuteElapsed / 60000) * EFFECTIVE_MINUTE_LIMIT);
      state.minuteTokens = Math.min(EFFECTIVE_MINUTE_LIMIT, state.minuteTokens + tokensToAdd);
    }
    
    // Refill daily tokens at midnight UTC
    const todayStart = new Date().setUTCHours(0, 0, 0, 0);
    if (state.lastDailyRefill < todayStart) {
      state.dailyTokens = EFFECTIVE_DAILY_LIMIT;
      state.lastDailyRefill = now;
    }
  }

  /**
   * Acquire a token for making an API call
   * 
   * @param tenantId - Xero tenant ID
   * @returns Promise that resolves when a token is available
   * @throws XeroRateLimitError if daily limit is exhausted
   */
  async acquire(tenantId: string): Promise<void> {
    this.refillTokens(tenantId);
    const state = this.getState(tenantId);
    
    // Check daily limit
    if (state.dailyTokens <= 0) {
      const midnightUtc = new Date();
      midnightUtc.setUTCHours(24, 0, 0, 0);
      const secondsUntilReset = Math.ceil((midnightUtc.getTime() - Date.now()) / 1000);
      
      throw new XeroRateLimitError(
        secondsUntilReset,
        new Error('Daily rate limit exhausted')
      );
    }
    
    // Check minute limit - wait if necessary
    if (state.minuteTokens <= 0) {
      const waitTime = 60000 - (Date.now() - state.lastMinuteRefill);
      if (waitTime > 0) {
        await this.sleep(waitTime);
        this.refillTokens(tenantId);
      }
    }
    
    // Consume tokens
    state.minuteTokens--;
    state.dailyTokens--;
  }

  /**
   * Get current rate limit status
   */
  getStatus(tenantId: string): {
    minuteRemaining: number;
    dailyRemaining: number;
    minuteLimit: number;
    dailyLimit: number;
  } {
    this.refillTokens(tenantId);
    const state = this.getState(tenantId);
    
    return {
      minuteRemaining: state.minuteTokens,
      dailyRemaining: state.dailyTokens,
      minuteLimit: EFFECTIVE_MINUTE_LIMIT,
      dailyLimit: EFFECTIVE_DAILY_LIMIT,
    };
  }

  /**
   * Record a 429 response to pause requests
   */
  recordRateLimitHit(tenantId: string, retryAfterSeconds: number): void {
    const state = this.getState(tenantId);
    state.minuteTokens = 0;
    state.lastMinuteRefill = Date.now() + (retryAfterSeconds * 1000) - 60000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const rateLimiter = new XeroRateLimiter();

// ============================================================================
// API WRAPPER
// ============================================================================

/**
 * Execute a Xero API call with rate limiting and retry logic
 * 
 * @param tenantId - Xero tenant ID
 * @param apiCall - Async function that makes the API call
 * @param maxRetries - Maximum number of retries on rate limit
 * @returns Result of the API call
 */
export async function callXeroApi<T>(
  tenantId: string,
  apiCall: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Acquire rate limit token
      await rateLimiter.acquire(tenantId);
      
      // Make the API call
      const result = await apiCall();
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Check if it's a rate limit error
      if (isRateLimitResponse(error)) {
        const retryAfter = getRetryAfterSeconds(error);
        
        console.warn(
          `[Xero Rate Limit] Hit rate limit for tenant ${tenantId}. ` +
          `Retry after ${retryAfter}s. Attempt ${attempt + 1}/${maxRetries + 1}`
        );
        
        rateLimiter.recordRateLimitHit(tenantId, retryAfter);
        
        if (attempt < maxRetries) {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          continue;
        }
        
        throw new XeroRateLimitError(retryAfter, error);
      }
      
      // Not a rate limit error - rethrow immediately
      throw error;
    }
  }
  
  throw lastError;
}

/**
 * Check if error is a rate limit (429) response
 */
function isRateLimitResponse(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  // Check axios-style response
  if ('response' in error) {
    const response = (error as { response?: { status?: number } }).response;
    return response?.status === 429;
  }
  
  // Check status directly
  if ('status' in error) {
    return (error as { status: number }).status === 429;
  }
  
  return false;
}

/**
 * Extract retry-after seconds from error response
 */
function getRetryAfterSeconds(error: unknown): number {
  if (!error || typeof error !== 'object') return 60;
  
  if ('response' in error) {
    const response = (error as { response?: { headers?: Record<string, string> } }).response;
    const retryAfter = response?.headers?.['retry-after'];
    if (retryAfter) {
      return parseInt(retryAfter, 10) || 60;
    }
  }
  
  return 60; // Default to 60 seconds
}

// ============================================================================
// EXPORTS
// ============================================================================

export { rateLimiter };
