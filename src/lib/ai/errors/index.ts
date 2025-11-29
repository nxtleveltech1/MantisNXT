/**
 * AI Error Handling and Resilience System
 * Main exports for the comprehensive error handling system
 */

import { errorHandler } from './handler';
import { recoveryManager } from './recovery';

// Core types and error classes
export {
  AIErrorCode,
  AIError,
  ToolError,
  ProviderError,
  AccessError,
  SessionError,
  ValidationError,
  ErrorCodeSeverity,
  ErrorCodeRetryable,
} from './types';

export type { AIErrorSeverity, ErrorContext } from './types';

// Error handler and processing
export { ErrorHandler, errorHandler } from './handler';

// Recovery strategies and circuit breaker
export {
  CircuitBreaker,
  RecoveryManager,
  recoveryManager,
  DefaultStrategies,
  type RetryStrategy,
  type CircuitBreakerStats,
  type CircuitBreakerConfig,
} from './recovery';

// Re-export commonly used functions for convenience
export const {
  handle: handleError,
  isRetryable,
  getRetryDelay,
  logError,
  notifyIfCritical,
  formatForUser,
  formatForDeveloper,
  processError,
} = errorHandler;

export const {
  withRetry,
  withCircuitBreaker,
  withTimeout,
  withFallback,
  combineStrategies,
  getCircuitBreakerStats,
  resetCircuitBreaker,
} = recoveryManager;