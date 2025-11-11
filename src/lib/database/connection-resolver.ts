// @ts-nocheck

/**
 * Database Connection Resolver
 * Emergency simplified version to prevent circular dependencies
 */

import { pool } from './connection';

/**
 * Simple database interface using the stable pool directly
 */
export const connectionResolver = {
  /**
   * Execute a database query
   */
  query: async <T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }> => {
    try {
      console.log('🔍 Connection Resolver executing query');
      const result = await pool.query(text, params);
      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      console.error('❌ Connection Resolver query error:', error);
      throw error;
    }
  },

  /**
   * Test connection
   */
  testConnection: async (): Promise<void> => {
    console.log('🧪 Testing connection resolver...');
    const result = await pool.query('SELECT NOW() as current_time');
    console.log('✅ Connection resolver test successful');
  },

  /**
   * Get pool status
   */
  getStatus: () => {
    return {
      status: 'connected',
      totalCount: pool.totalCount,
      idleCount: pool.idleCount,
      waitingCount: pool.waitingCount,
    };
  }
};

// Export for legacy compatibility
export default connectionResolver;