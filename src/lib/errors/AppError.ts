/**
 * Application error utility with standardized error codes for extraction flows.
 */
export enum ErrorCode {
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_TYPE_NOT_SUPPORTED = 'FILE_TYPE_NOT_SUPPORTED',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  CANCELLED = 'CANCELLED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

interface AppErrorOptions {
  status?: number;
  details?: unknown;
  cause?: unknown;
}

/**
 * Lightweight AppError implementation that carries HTTP status, code, and details.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, options: AppErrorOptions = {}) {
    super(message, options);
    this.name = 'AppError';
    this.code = code;
    this.status = options.status ?? status;
    this.details = options.details;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
