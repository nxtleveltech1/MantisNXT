/**
 * Neon Database Connection for NXT-SPP-Supplier Inventory Portfolio
 *
 * This module manages the connection to the new Neon PostgreSQL database
 * with proper pooling, error handling, and performance monitoring.
 */

import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';

// Parse Neon connection URL to extract components
function parseNeonConnectionString(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error('NEON_SPP_DATABASE_URL environment variable is not set');
  }

  try {
    const url = new URL(connectionString);

    // Extract SSL mode from query parameters
    const sslMode = url.searchParams.get('sslmode');

    return {
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      host: url.hostname,
      port: parseInt(url.port || '5432'),
      database: url.pathname.slice(1), // Remove leading slash
      sslMode: sslMode || 'require' // Default to 'require' for Neon
    };
  } catch (error) {
    throw new Error(`Failed to parse Neon connection string: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Neon database configuration
// Neon REQUIRES SSL with sslmode=require in connection string
const connectionDetails = parseNeonConnectionString(process.env.NEON_SPP_DATABASE_URL);

const NEON_CONFIG: PoolConfig = {
  user: connectionDetails.user,
  password: connectionDetails.password,
  host: connectionDetails.host,
  port: connectionDetails.port,
  database: connectionDetails.database,

  // Neon requires SSL - pooler endpoint handles SSL termination
  // Use rejectUnauthorized: false for pooler endpoints
  ssl: connectionDetails.sslMode === 'require' ? {
    rejectUnauthorized: false
  } : false,

  // Connection pool settings optimized for Neon serverless
  min: parseInt(process.env.NEON_POOL_MIN || '1', 10),
  max: parseInt(process.env.NEON_POOL_MAX || '10', 10),
  idleTimeoutMillis: parseInt(process.env.NEON_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.NEON_POOL_CONNECTION_TIMEOUT || '10000', 10),

  // Application name for monitoring
  application_name: 'MantisNXT-SPP',
};

/**
 * Neon connection pool singleton
 */
class NeonConnectionManager {
  private pool: Pool | null = null;
  private isConnected: boolean = false;

  /**
   * Get or create the connection pool
   */
  public getPool(): Pool {
    if (!this.pool) {
      this.pool = new Pool(NEON_CONFIG);

      // Handle pool errors
      this.pool.on('error', (err) => {
        console.error('🔴 Unexpected error on Neon pool client:', err);
      });

      // Log successful connections
      this.pool.on('connect', () => {
        console.log('✅ New client connected to Neon database');
        this.isConnected = true;
      });

      // Log disconnections
      this.pool.on('remove', () => {
        console.log('⚠️ Client removed from Neon pool');
      });
    }

    return this.pool;
  }

  /**
   * Execute a query with automatic connection management
   */
  public async query<T = any>(
    text: string,
    params?: any[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    const pool = this.getPool();
    const start = Date.now();

    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      // Log slow queries
      if (duration > 1000) {
        console.warn(`⚠️ Slow query (${duration}ms):`, text.substring(0, 100));
      }

      return {
        rows: result.rows,
        rowCount: result.rowCount || 0
      };
    } catch (error) {
      console.error('🔴 Neon query error:', error);
      throw error;
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  public async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const pool = this.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('🔴 Neon transaction error, rolled back:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Test the database connection
   */
  public async testConnection(): Promise<{
    success: boolean;
    latency: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      await this.query('SELECT NOW()');
      const latency = Date.now() - start;

      return {
        success: true,
        latency
      };
    } catch (error) {
      return {
        success: false,
        latency: Date.now() - start,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get pool status for monitoring
   */
  public getPoolStatus() {
    if (!this.pool) {
      return {
        total: 0,
        idle: 0,
        waiting: 0,
        connected: false
      };
    }

    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
      connected: this.isConnected
    };
  }

  /**
   * Gracefully close the connection pool
   */
  public async closePool(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('✅ Neon connection pool closed');
    }
  }
}

// Export singleton instance
export const neonDb = new NeonConnectionManager();

// Export convenience functions
export const query = neonDb.query.bind(neonDb);
export const withTransaction = neonDb.withTransaction.bind(neonDb);
export const testConnection = neonDb.testConnection.bind(neonDb);
export const getPoolStatus = neonDb.getPoolStatus.bind(neonDb);
export const closePool = neonDb.closePool.bind(neonDb);

// Export types
export type { PoolClient, QueryResult };

console.log('🚀 Neon database connection module initialized');
