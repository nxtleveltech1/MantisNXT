/**
 * MantisNXT Unified Database Connection
 * Updated to use Enterprise Connection Manager for stability
 */

import { PoolClient, QueryResultRow } from 'pg';
import {
  dbManager,
  query as enterpriseQuery,
  withTransaction as enterpriseWithTransaction,
  testConnection as enterpriseTestConnection,
  getPoolStatus as enterpriseGetPoolStatus,
  closePool as enterpriseClosePool
} from './enterprise-connection-manager';

// Re-export enterprise functions with original API
export const query = enterpriseQuery;
export const withTransaction = enterpriseWithTransaction;
export const testConnection = enterpriseTestConnection;
export const getPoolStatus = enterpriseGetPoolStatus;
export const closePool = enterpriseClosePool;

// Backward compatibility aliases
export const transaction = withTransaction;

// Pool access (for compatibility)
export const pool = {
  get totalCount() { return dbManager.getPoolStatus().total; },
  get idleCount() { return dbManager.getPoolStatus().idle; },
  get waitingCount() { return dbManager.getPoolStatus().waiting; },

  // Delegate query method
  query: query,

  // Delegate connect method
  connect: async (): Promise<PoolClient> => {
    // This is a simplified wrapper - in practice, direct pool access should be avoided
    // Instead, use the query() or withTransaction() methods
    throw new Error('Direct pool.connect() access deprecated. Use query() or withTransaction() instead.');
  },

  end: closePool
};

/**
 * DatabaseManager class for backwards compatibility
 */
export class DatabaseManager {
  async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    return query<T>(text, params);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return withTransaction(callback);
  }

  async testConnection(): Promise<boolean> {
    const result = await testConnection();
    return result.success;
  }

  getPool() {
    return pool;
  }

  getStatus() {
    return getPoolStatus();
  }
}

// Create singleton instance for compatibility
export const db = new DatabaseManager();

// Default export
export default pool;

console.log('🚀 Unified database connection updated with enterprise manager');