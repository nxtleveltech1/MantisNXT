/**
 * Legacy Database Connection Module - Direct Implementation
 * This maintains compatibility while avoiding circular imports
 */

// Import everything we need from the unified connection
import {
  pool as unifiedPool,
  query as unifiedQuery,
  withTransaction as unifiedTransaction,
  testConnection as unifiedTestConnection,
  getPoolStatus as unifiedGetPoolStatus,
  closePool as unifiedClosePool,
  DatabaseManager as UnifiedDatabaseManager,
  db as unifiedDb
} from './unified-connection';

// Re-export everything with the same interface
export const pool = unifiedPool;
export const query = unifiedQuery;
export const withTransaction = unifiedTransaction;
export const transaction = unifiedTransaction; // Alias for compatibility
export const testConnection = unifiedTestConnection;
export const getPoolStatus = unifiedGetPoolStatus;
export const closePool = unifiedClosePool;
export const DatabaseManager = UnifiedDatabaseManager;
export const db = unifiedDb;

// Default export
export default pool;