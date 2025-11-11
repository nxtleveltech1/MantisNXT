/**
 * MantisNXT Database Layer - Centralized Exports
 *
 * This module provides a unified database interface for the application,
 * exposing pg-compatible pool, query, and transaction helpers.
 */

import type { PoolClient, QueryResultRow } from 'pg';
import { Pool } from 'pg';
import {
  query as enterpriseQuery,
  withTransaction as enterpriseWithTransaction,
  testConnection as enterpriseTestConnection,
  getPoolStatus as enterpriseGetPoolStatus,
  closePool as enterpriseClosePool,
  dbManager,
  enterpriseDb as enterpriseDbFromManager
} from '../../../lib/database/enterprise-connection-manager';

/**
 * Type-safe query helper function
 *
 * @template T - The expected row type
 * @param text - SQL query string with $1, $2, etc. placeholders
 * @param params - Array of query parameters
 * @returns Promise with rows and rowCount
 *
 * @example
 * ```typescript
 * const result = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
 * const users: User[] = result.rows;
 * ```
 */
export async function query<T extends QueryResultRow = unknown>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  return enterpriseQuery<T>(text, params || []);
}

/**
 * Transaction helper with automatic rollback on error
 *
 * @template T - The return type of the callback
 * @param callback - Async function that receives a PoolClient
 * @returns Promise with the callback result
 *
 * @example
 * ```typescript
 * const result = await withTransaction(async (client) => {
 *   await client.query('INSERT INTO users (name) VALUES ($1)', ['John']);
 *   await client.query('INSERT INTO logs (action) VALUES ($1)', ['user_created']);
 *   return { success: true };
 * });
 * ```
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  return enterpriseWithTransaction(callback);
}

/**
 * Test database connection
 *
 * @returns Promise with connection test result
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  return enterpriseTestConnection();
}

/**
 * Get current pool status
 *
 * @returns Pool status with connection counts and metrics
 */
export function getPoolStatus() {
  return enterpriseGetPoolStatus();
}

/**
 * Close the database pool
 *
 * @returns Promise that resolves when pool is closed
 */
export async function closePool(): Promise<void> {
  return enterpriseClosePool();
}

/**
 * Pool-compatible interface for backwards compatibility
 *
 * This provides a pg.Pool-like interface that delegates to the enterprise
 * connection manager. Use query() or withTransaction() for new code.
 */
export const pool = {
  /**
   * Execute a query using the pool
   *
   * @template T - Expected row type
   */
  query: async <T extends QueryResultRow = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }> => {
    return query<T>(text, params);
  },

  /**
   * Get pool statistics
   */
  get totalCount(): number {
    return dbManager.getPoolStatus().total;
  },

  get idleCount(): number {
    return dbManager.getPoolStatus().idle;
  },

  get waitingCount(): number {
    return dbManager.getPoolStatus().waiting;
  },

  /**
   * Connect method (deprecated - use withTransaction instead)
   *
   * @throws Error indicating the method is deprecated
   */
  connect: async (): Promise<PoolClient> => {
    throw new Error(
      'Direct pool.connect() is deprecated. Use withTransaction() for transactional operations or query() for simple queries.'
    );
  },

  /**
   * End the pool connection
   */
  end: closePool
};

/**
 * DatabaseManager class for object-oriented API
 */
export class DatabaseManager {
  async query<T extends QueryResultRow = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> {
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

/**
 * Singleton database manager instance
 */
export const db = new DatabaseManager();

/**
 * Export dbManager and enterpriseDb from enterprise connection manager for backwards compatibility
 */
export { dbManager, enterpriseDbFromManager as enterpriseDb };

/**
 * Default export is the pool-compatible interface
 */
export default pool;

console.log('✅ Database layer initialized with enterprise connection manager');
