import { z } from 'zod';

/**
 * AI Error Handling Types and Classes
 * Comprehensive error system for AI operations with typed errors, severity levels, and context
 */

// Error codes enum
export enum AIErrorCode {
  // Tool errors
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',

  // Provider errors
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  PROVIDER_RATE_LIMITED = 'PROVIDER_RATE_LIMITED',
  PROVIDER_AUTH_FAILED = 'PROVIDER_AUTH_FAILED',

  // Access errors
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_INSUFFICIENT = 'PERMISSION_INSUFFICIENT',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Session errors
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  CONTEXT_OVERFLOW = 'CONTEXT_OVERFLOW',

  // Validation errors
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  SCHEMA_MISMATCH = 'SCHEMA_MISMATCH',
  INVALID_INPUT = 'INVALID_INPUT',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

// Error severity levels
export type AIErrorSeverity = 'recoverable' | 'transient' | 'fatal';

// Error context schema
export const ErrorContextSchema = z.object({
  sessionId: z.string().optional(),
  userId: z.string().optional(),
  orgId: z.string().optional(),
  toolName: z.string().optional(),
  operation: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type ErrorContext = z.infer<typeof ErrorContextSchema>;

// Main AIError class
export class AIError extends Error {
  public readonly code: AIErrorCode;
  public readonly severity: AIErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: Date;
  public readonly retryable: boolean;
  public readonly suggestedAction: string;

  constructor(
    code: AIErrorCode,
    message: string,
    severity: AIErrorSeverity,
    context: ErrorContext = {},
    retryable: boolean = false,
    suggestedAction: string = 'Please try again later'
  ) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.retryable = retryable;
    this.suggestedAction = suggestedAction;
  }

  // Convert to plain object for serialization
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      retryable: this.retryable,
      suggestedAction: this.suggestedAction,
      stack: this.stack,
    };
  }
}

// Specialized error classes
export class ToolError extends AIError {
  constructor(
    code: AIErrorCode,
    message: string,
    context: ErrorContext,
    retryable: boolean = true
  ) {
    super(
      code,
      message,
      code === AIErrorCode.TOOL_TIMEOUT ? 'transient' : 'recoverable',
      context,
      retryable,
      'Check tool configuration and try again'
    );
    this.name = 'ToolError';
  }
}

export class ProviderError extends AIError {
  constructor(
    code: AIErrorCode,
    message: string,
    context: ErrorContext,
    retryable: boolean = true
  ) {
    super(
      code,
      message,
      code === AIErrorCode.PROVIDER_RATE_LIMITED ? 'transient' : 'recoverable',
      context,
      retryable,
      'Check provider status and credentials'
    );
    this.name = 'ProviderError';
  }
}

export class AccessError extends AIError {
  constructor(code: AIErrorCode, message: string, context: ErrorContext) {
    super(code, message, 'fatal', context, false, 'Contact administrator for access permissions');
    this.name = 'AccessError';
  }
}

export class SessionError extends AIError {
  constructor(
    code: AIErrorCode,
    message: string,
    context: ErrorContext,
    retryable: boolean = false
  ) {
    super(code, message, 'recoverable', context, retryable, 'Reinitialize session and try again');
    this.name = 'SessionError';
  }
}

export class ValidationError extends AIError {
  constructor(code: AIErrorCode, message: string, context: ErrorContext) {
    super(code, message, 'fatal', context, false, 'Fix input data and try again');
    this.name = 'ValidationError';
  }
}

// Error mapping utilities
export const ErrorCodeSeverity: Record<AIErrorCode, AIErrorSeverity> = {
  [AIErrorCode.TOOL_EXECUTION_FAILED]: 'recoverable',
  [AIErrorCode.TOOL_NOT_FOUND]: 'fatal',
  [AIErrorCode.TOOL_TIMEOUT]: 'transient',

  [AIErrorCode.PROVIDER_UNAVAILABLE]: 'transient',
  [AIErrorCode.PROVIDER_RATE_LIMITED]: 'transient',
  [AIErrorCode.PROVIDER_AUTH_FAILED]: 'recoverable',

  [AIErrorCode.ACCESS_DENIED]: 'fatal',
  [AIErrorCode.PERMISSION_INSUFFICIENT]: 'fatal',
  [AIErrorCode.RESOURCE_NOT_FOUND]: 'recoverable',

  [AIErrorCode.SESSION_EXPIRED]: 'recoverable',
  [AIErrorCode.SESSION_INVALID]: 'recoverable',
  [AIErrorCode.CONTEXT_OVERFLOW]: 'recoverable',

  [AIErrorCode.VALIDATION_FAILED]: 'fatal',
  [AIErrorCode.SCHEMA_MISMATCH]: 'fatal',
  [AIErrorCode.INVALID_INPUT]: 'fatal',

  [AIErrorCode.INTERNAL_ERROR]: 'fatal',
  [AIErrorCode.DATABASE_ERROR]: 'transient',
  [AIErrorCode.NETWORK_ERROR]: 'transient',
};

export const ErrorCodeRetryable: Record<AIErrorCode, boolean> = {
  [AIErrorCode.TOOL_EXECUTION_FAILED]: true,
  [AIErrorCode.TOOL_NOT_FOUND]: false,
  [AIErrorCode.TOOL_TIMEOUT]: true,

  [AIErrorCode.PROVIDER_UNAVAILABLE]: true,
  [AIErrorCode.PROVIDER_RATE_LIMITED]: true,
  [AIErrorCode.PROVIDER_AUTH_FAILED]: false,

  [AIErrorCode.ACCESS_DENIED]: false,
  [AIErrorCode.PERMISSION_INSUFFICIENT]: false,
  [AIErrorCode.RESOURCE_NOT_FOUND]: true,

  [AIErrorCode.SESSION_EXPIRED]: true,
  [AIErrorCode.SESSION_INVALID]: true,
  [AIErrorCode.CONTEXT_OVERFLOW]: true,

  [AIErrorCode.VALIDATION_FAILED]: false,
  [AIErrorCode.SCHEMA_MISMATCH]: false,
  [AIErrorCode.INVALID_INPUT]: false,

  [AIErrorCode.INTERNAL_ERROR]: false,
  [AIErrorCode.DATABASE_ERROR]: true,
  [AIErrorCode.NETWORK_ERROR]: true,
};
