/**
 * User-Friendly Error Messages Catalog
 * Maps technical errors to user-friendly messages
 * NEVER expose SQL errors, stack traces, or internal details to users
 */

export enum ErrorType {
  // Database Errors
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  DATABASE_QUERY = 'DATABASE_QUERY',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT',
  COLUMN_NOT_FOUND = 'COLUMN_NOT_FOUND',
  TABLE_NOT_FOUND = 'TABLE_NOT_FOUND',
  CONSTRAINT_VIOLATION = 'CONSTRAINT_VIOLATION',
  DATA_TYPE_MISMATCH = 'DATA_TYPE_MISMATCH',

  // API Errors
  API_NETWORK = 'API_NETWORK',
  API_TIMEOUT = 'API_TIMEOUT',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_FORBIDDEN = 'API_FORBIDDEN',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',

  // Data Errors
  EMPTY_RESULT = 'EMPTY_RESULT',
  INVALID_DATA = 'INVALID_DATA',
  PARSING_ERROR = 'PARSING_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Timestamp/Date Errors
  TIMESTAMP_ERROR = 'TIMESTAMP_ERROR',
  DATE_FORMAT_ERROR = 'DATE_FORMAT_ERROR',

  // Generic Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
}

export interface ErrorMessage {
  title: string;
  description: string;
  userAction: string;
  retryable: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export const ERROR_MESSAGES: Record<ErrorType, ErrorMessage> = {
  // Database Errors
  [ErrorType.DATABASE_CONNECTION]: {
    title: 'Unable to connect to database',
    description: 'We are having trouble connecting to the database. This is usually temporary.',
    userAction: 'Please wait a moment and try again. If the problem persists, contact support.',
    retryable: true,
    severity: 'high'
  },
  [ErrorType.DATABASE_QUERY]: {
    title: 'Data retrieval error',
    description: 'We encountered an issue while retrieving your data.',
    userAction: 'Please try refreshing the page. If the error continues, contact support.',
    retryable: true,
    severity: 'medium'
  },
  [ErrorType.DATABASE_TIMEOUT]: {
    title: 'Request timed out',
    description: 'The request took too long to complete. The system may be experiencing high load.',
    userAction: 'Please try again in a few moments. Consider using filters to narrow your search.',
    retryable: true,
    severity: 'medium'
  },
  [ErrorType.COLUMN_NOT_FOUND]: {
    title: 'Data structure issue',
    description: 'We encountered an unexpected data structure. This may be due to a recent system update.',
    userAction: 'Please refresh the page. If the issue persists, contact support.',
    retryable: true,
    severity: 'medium'
  },
  [ErrorType.TABLE_NOT_FOUND]: {
    title: 'Data source unavailable',
    description: 'We cannot locate the requested data source. This may be a configuration issue.',
    userAction: 'Please contact support for assistance.',
    retryable: false,
    severity: 'high'
  },
  [ErrorType.CONSTRAINT_VIOLATION]: {
    title: 'Data validation failed',
    description: 'The data you entered conflicts with existing records or system rules.',
    userAction: 'Please check your input and try again. Ensure all required fields are filled correctly.',
    retryable: true,
    severity: 'low'
  },
  [ErrorType.DATA_TYPE_MISMATCH]: {
    title: 'Invalid data format',
    description: 'The data format does not match what the system expects.',
    userAction: 'Please check your input values and ensure they are in the correct format.',
    retryable: true,
    severity: 'low'
  },

  // API Errors
  [ErrorType.API_NETWORK]: {
    title: 'Network connection error',
    description: 'Unable to connect to the server. Please check your internet connection.',
    userAction: 'Verify your internet connection and try again.',
    retryable: true,
    severity: 'high'
  },
  [ErrorType.API_TIMEOUT]: {
    title: 'Request timed out',
    description: 'The server is taking too long to respond. This may be due to network issues.',
    userAction: 'Please try again. If the problem persists, check your connection or contact support.',
    retryable: true,
    severity: 'medium'
  },
  [ErrorType.API_UNAUTHORIZED]: {
    title: 'Authentication required',
    description: 'You need to be logged in to access this resource.',
    userAction: 'Please log in and try again.',
    retryable: false,
    severity: 'medium'
  },
  [ErrorType.API_FORBIDDEN]: {
    title: 'Access denied',
    description: 'You do not have permission to access this resource.',
    userAction: 'If you believe this is an error, please contact your administrator.',
    retryable: false,
    severity: 'medium'
  },
  [ErrorType.API_NOT_FOUND]: {
    title: 'Resource not found',
    description: 'The requested resource could not be found. It may have been moved or deleted.',
    userAction: 'Please check the URL or navigate back to the previous page.',
    retryable: false,
    severity: 'low'
  },
  [ErrorType.API_SERVER_ERROR]: {
    title: 'Server error',
    description: 'The server encountered an unexpected error while processing your request.',
    userAction: 'Please try again. If the problem persists, contact support.',
    retryable: true,
    severity: 'high'
  },

  // Data Errors
  [ErrorType.EMPTY_RESULT]: {
    title: 'No data found',
    description: 'Your search or filter did not return any results.',
    userAction: 'Try adjusting your filters or search criteria.',
    retryable: false,
    severity: 'low'
  },
  [ErrorType.INVALID_DATA]: {
    title: 'Invalid data received',
    description: 'The data received from the server is not in the expected format.',
    userAction: 'Please refresh the page. If the error continues, contact support.',
    retryable: true,
    severity: 'medium'
  },
  [ErrorType.PARSING_ERROR]: {
    title: 'Data processing error',
    description: 'We encountered an issue while processing the data.',
    userAction: 'Please try again. If the problem persists, contact support.',
    retryable: true,
    severity: 'medium'
  },
  [ErrorType.VALIDATION_ERROR]: {
    title: 'Validation failed',
    description: 'The data you entered does not meet the required criteria.',
    userAction: 'Please review your input and correct any errors.',
    retryable: true,
    severity: 'low'
  },

  // Timestamp/Date Errors
  [ErrorType.TIMESTAMP_ERROR]: {
    title: 'Date/time error',
    description: 'We encountered an issue processing date or time information.',
    userAction: 'Please refresh the page. If the error continues, contact support.',
    retryable: true,
    severity: 'medium'
  },
  [ErrorType.DATE_FORMAT_ERROR]: {
    title: 'Invalid date format',
    description: 'The date format is not recognized or is invalid.',
    userAction: 'Please enter the date in the correct format (e.g., YYYY-MM-DD).',
    retryable: true,
    severity: 'low'
  },

  // Generic Errors
  [ErrorType.UNKNOWN_ERROR]: {
    title: 'Unexpected error',
    description: 'An unexpected error occurred. Our team has been notified.',
    userAction: 'Please try again. If the problem persists, contact support.',
    retryable: true,
    severity: 'medium'
  },
  [ErrorType.RATE_LIMIT]: {
    title: 'Too many requests',
    description: 'You have made too many requests in a short period. Please slow down.',
    userAction: 'Wait a few moments before trying again.',
    retryable: true,
    severity: 'low'
  }
};

/**
 * Classify error based on error object or message
 */
export function classifyError(error: Error | string): ErrorType {
  const errorMessage = typeof error === 'string' ? error : error.message.toLowerCase();

  // Database connection errors
  if (errorMessage.includes('econnrefused') ||
      errorMessage.includes('connection refused') ||
      errorMessage.includes('connect timeout')) {
    return ErrorType.DATABASE_CONNECTION;
  }

  // Database timeout
  if (errorMessage.includes('timeout') ||
      errorMessage.includes('query timeout')) {
    return ErrorType.DATABASE_TIMEOUT;
  }

  // Column not found
  if (errorMessage.includes('column') &&
      (errorMessage.includes('not found') || errorMessage.includes('does not exist'))) {
    return ErrorType.COLUMN_NOT_FOUND;
  }

  // Table not found
  if (errorMessage.includes('table') &&
      (errorMessage.includes('not found') || errorMessage.includes('does not exist'))) {
    return ErrorType.TABLE_NOT_FOUND;
  }

  // Constraint violation
  if (errorMessage.includes('constraint') ||
      errorMessage.includes('unique violation') ||
      errorMessage.includes('foreign key')) {
    return ErrorType.CONSTRAINT_VIOLATION;
  }

  // Data type mismatch
  if (errorMessage.includes('type') && errorMessage.includes('invalid')) {
    return ErrorType.DATA_TYPE_MISMATCH;
  }

  // Network errors
  if (errorMessage.includes('network') ||
      errorMessage.includes('fetch failed')) {
    return ErrorType.API_NETWORK;
  }

  // HTTP status codes
  if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
    return ErrorType.API_UNAUTHORIZED;
  }
  if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
    return ErrorType.API_FORBIDDEN;
  }
  if (errorMessage.includes('404') || errorMessage.includes('not found')) {
    return ErrorType.API_NOT_FOUND;
  }
  if (errorMessage.includes('500') || errorMessage.includes('server error')) {
    return ErrorType.API_SERVER_ERROR;
  }

  // Timestamp errors
  if (errorMessage.includes('timestamp') ||
      errorMessage.includes('gettime') ||
      errorMessage.includes('invalid date')) {
    return ErrorType.TIMESTAMP_ERROR;
  }

  // JSON/Parsing errors
  if (errorMessage.includes('json') ||
      errorMessage.includes('parse') ||
      errorMessage.includes('syntax error')) {
    return ErrorType.PARSING_ERROR;
  }

  // Rate limiting
  if (errorMessage.includes('rate limit') || errorMessage.includes('too many requests')) {
    return ErrorType.RATE_LIMIT;
  }

  return ErrorType.UNKNOWN_ERROR;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error: Error | string): ErrorMessage {
  const errorType = classifyError(error);
  return ERROR_MESSAGES[errorType];
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: Error | string): boolean {
  const errorInfo = getUserFriendlyError(error);
  return errorInfo.retryable;
}

/**
 * Get error severity
 */
export function getErrorSeverity(error: Error | string): 'low' | 'medium' | 'high' | 'critical' {
  const errorInfo = getUserFriendlyError(error);
  return errorInfo.severity;
}

/**
 * Sanitize error for logging (remove sensitive data)
 */
export function sanitizeError(error: Error): Record<string, any> {
  return {
    name: error.name,
    message: error.message,
    type: classifyError(error),
    severity: getErrorSeverity(error),
    retryable: isRetryableError(error),
    timestamp: new Date().toISOString()
  };
}
