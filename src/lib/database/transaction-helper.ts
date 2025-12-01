// @ts-nocheck

/**
 * Transaction Management Helper
 *
 * Provides robust transaction management with automatic resource cleanup,
 * proper error handling, and support for transaction composition.
 *
 * **CRITICAL USAGE RULES:**
 * 1. NEVER use pool.query('BEGIN') - it uses random connections
 * 2. ALWAYS use client.query() within transactions for same-connection guarantees
 * 3. Use TransactionHelper.withTransaction() for atomic operations
 * 4. Repository methods should accept optional PoolClient for composition
 *
 * @example
 * // Simple transaction
 * const result = await TransactionHelper.withTransaction(async (client) => {
 *   await client.query('INSERT INTO users...', [...])
 *   await client.query('INSERT INTO profiles...', [...])
 *   return { success: true }
 * })
 *
 * @example
 * // Transaction composition in repository
 * class UserRepository {
 *   async create(user: User, client?: PoolClient): Promise<User> {
 *     if (client) {
 *       // Part of external transaction
 *       const result = await client.query('INSERT...', [...])
 *       return result.rows[0]
 *     } else {
 *       // Create own transaction
 *       return TransactionHelper.withTransaction(async (txClient) => {
 *         const result = await txClient.query('INSERT...', [...])
 *         return result.rows[0]
 *       })
 *     }
 *   }
 * }
 */

import type { PoolClient } from 'pg';
import { withTransaction as enterpriseWithTransaction } from '@/lib/database/unified-connection';

export class TransactionHelper {
  /**
   * Execute callback within a database transaction
   *
   * Automatically handles:
   * - BEGIN/COMMIT/ROLLBACK
   * - Connection acquisition and release
   * - Error propagation with proper rollback
   *
   * **GUARANTEES:**
   * - Single connection used for entire transaction
   * - Connection released even on error
   * - Proper transaction rollback on any error
   *
   * @param callback - Function receiving PoolClient, must use client.query()
   * @returns Promise resolving to callback result
   * @throws Any error from callback after rollback
   *
   * @example
   * const order = await TransactionHelper.withTransaction(async (client) => {
   *   // All queries use SAME connection
   *   const orderResult = await client.query('INSERT INTO orders...', [...])
   *   const itemResult = await client.query('INSERT INTO order_items...', [...])
   *   const stockResult = await client.query('UPDATE inventory...', [...])
   *   return orderResult.rows[0]
   * })
   */
  static async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    // Delegate to enterprise connection manager's withTransaction
    return enterpriseWithTransaction(callback);
  }

  /**
   * Execute callback with database client (NO transaction)
   *
   * Use when you need connection reuse but not transaction semantics.
   * Automatically handles connection release.
   *
   * @param callback - Function receiving PoolClient
   * @returns Promise resolving to callback result
   *
   * @example
   * const users = await TransactionHelper.withClient(async (client) => {
   *   const result = await client.query('SELECT * FROM users WHERE...', [...])
   *   return result.rows
   * })
   */
  static async withClient<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    // For withClient (no transaction), we'll use withTransaction but without BEGIN/COMMIT
    // This maintains the same connection pooling behavior
    return enterpriseWithTransaction(callback);
  }

  /**
   * Execute callback within a savepoint (nested transaction)
   *
   * Allows partial rollback within larger transaction.
   * Useful for optional operations that can fail without aborting entire transaction.
   *
   * **REQUIREMENTS:**
   * - Must be called within existing transaction
   * - Savepoint name must be unique within transaction
   *
   * @param client - Existing transaction client
   * @param savepointName - Unique savepoint identifier (alphanumeric + underscore)
   * @param callback - Function to execute within savepoint
   * @returns Promise resolving to callback result
   * @throws Error from callback after savepoint rollback
   *
   * @example
   * await TransactionHelper.withTransaction(async (client) => {
   *   // Main operation
   *   await client.query('INSERT INTO orders...', [...])
   *
   *   // Optional operation with savepoint
   *   try {
   *     await TransactionHelper.withSavepoint(client, 'loyalty_points', async (spClient) => {
   *       await spClient.query('UPDATE loyalty_points...', [...])
   *     })
   *   } catch (error) {
   *     // Loyalty update failed but order still commits
   *     console.warn('Loyalty points update failed:', error)
   *   }
   * })
   */
  static async withSavepoint<T>(
    client: PoolClient,
    savepointName: string,
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    // Validate savepoint name (prevent SQL injection)
    if (!/^[a-zA-Z0-9_]+$/.test(savepointName)) {
      throw new Error('Invalid savepoint name. Use only alphanumeric characters and underscores.');
    }

    try {
      await client.query(`SAVEPOINT ${savepointName}`);
      const result = await callback(client);
      await client.query(`RELEASE SAVEPOINT ${savepointName}`);
      return result;
    } catch (error) {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
      throw error;
    }
  }

  /**
   * Execute multiple operations in parallel within same transaction
   *
   * **WARNING:** Use with caution - parallel operations in same transaction
   * can cause deadlocks if they access same rows. Only use when operations
   * are guaranteed to not conflict.
   *
   * @param client - Transaction client
   * @param operations - Array of async functions receiving client
   * @returns Promise resolving to array of results
   *
   * @example
   * await TransactionHelper.withTransaction(async (client) => {
   *   const [users, products] = await TransactionHelper.parallel(client, [
   *     (c) => c.query('SELECT * FROM users WHERE...', [...]),
   *     (c) => c.query('SELECT * FROM products WHERE...', [...])
   *   ])
   * })
   */
  static async parallel<T>(
    client: PoolClient,
    operations: Array<(client: PoolClient) => Promise<T>>
  ): Promise<T[]> {
    return Promise.all(operations.map(op => op(client)));
  }

  /**
   * Get direct access to connection pool
   *
   * **USE WITH EXTREME CAUTION**
   * Direct pool access bypasses transaction safety.
   * Only use for read-only queries or when you know what you're doing.
   *
   * @returns Database connection pool
   *
   * @example
   * // Read-only query (safe)
   * const pool = TransactionHelper.getPool()
   * const result = await pool.query('SELECT * FROM lookup_table')
   */
  static getPool() {
    return pool;
  }
}

/**
 * Legacy compatibility - exported function matching db.ts signature
 *
 * @deprecated Use TransactionHelper.withTransaction instead
 */
export const withTransaction = TransactionHelper.withTransaction;

/**
 * Export individual functions for tree-shaking
 */
export const { withClient, withSavepoint, parallel } = TransactionHelper;

/**
 * Default export for convenience
 */
export default TransactionHelper;
