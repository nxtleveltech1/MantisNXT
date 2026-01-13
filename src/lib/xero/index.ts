/**
 * Xero Integration Module
 * 
 * Exports all Xero integration functionality for MantisNXT
 */

// Client
export { 
  getXeroClient, 
  buildConsentUrl, 
  isXeroConfigured,
  getCallbackUrl,
  getAppUrl,
  XERO_SCOPES,
  XeroClient 
} from './client';

// Token Management
export { 
  getValidTokenSet,
  saveTokenSet,
  updateTokenSet,
  revokeConnection,
  getXeroConnection,
  hasActiveConnection,
  updateLastSyncAt,
  getAllActiveConnections,
  getTenantId,
  getTenantName,
} from './token-manager';

// Types
export * from './types';

// Mappers
export * from './mappers';

// Rate Limiter
export { 
  callXeroApi, 
  XeroRateLimiter,
  rateLimiter,
} from './rate-limiter';

// Webhooks
export { 
  validateWebhookSignature,
  processWebhookEvent,
  storeWebhookEvent,
  markEventProcessed,
  getPendingWebhookEvents,
  processAllPendingEvents,
} from './webhooks';

// Sync Logger
export {
  logSyncOperation,
  logSyncSuccess,
  logSyncError,
  logBatchSync,
  getRecentSyncLogs,
  getSyncErrorSummary,
  getSyncStats,
} from './sync-logger';

// Sync Functions
export * from './sync';

// Errors
export { 
  XeroError,
  XeroSyncError, 
  XeroAuthError, 
  XeroRateLimitError,
  XeroValidationError,
  XeroNotFoundError,
  XeroWebhookError,
  XeroConfigError,
  parseXeroApiError,
  isRateLimitError,
  isAuthError,
  getUserFriendlyMessage,
} from './errors';
