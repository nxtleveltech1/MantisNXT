// @ts-nocheck

/**
 * Database Connection Pool Manager
 *
 * Production-ready connection pooling with:
 * - Neon serverless with pooling
 * - Connection health checks
 * - Automatic reconnection
 * - Query timeout handling
 * - Performance monitoring
 */

import type { PoolClient, PoolConfig } from 'pg';
import { Pool } from 'pg';
import { neonConfig } from '@neondatabase/serverless';

interface PoolMetrics {
  totalConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalQueries: number;
  slowQueries: number;
  errors: number;
  averageQueryTime: number;
}

class DatabaseConnectionPool {
  private static instance: DatabaseConnectionPool;
  private pool: Pool | null = null;
  private metrics: PoolMetrics = {
    totalConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalQueries: 0,
    slowQueries: 0,
    errors: 0,
    averageQueryTime: 0,
  };
  private queryTimes: number[] = [];
  private readonly MAX_QUERY_TIMES = 1000;

  private constructor() {}

  public static getInstance(): DatabaseConnectionPool {
    if (!DatabaseConnectionPool.instance) {
      DatabaseConnectionPool.instance = new DatabaseConnectionPool();
    }
    return DatabaseConnectionPool.instance;
  }

  /**
   * Initialize connection pool
   */
  public async initialize(): Promise<void> {
    if (this.pool) {
      console.log('Database pool already initialized');
      return;
    }

    const databaseUrl = process.env.DATABASE_URL || process.env.NEON_SPP_DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL or NEON_SPP_DATABASE_URL is required');
    }

    // Configure Neon serverless
    neonConfig.fetchConnectionCache = true;

    const poolConfig: PoolConfig = {
      connectionString: databaseUrl,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      min: parseInt(process.env.DB_POOL_MIN || '5', 10),
      idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
      connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '120000', 10),
      allowExitOnIdle: false,
      // Enable keep-alive for long-running connections
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    this.pool = new Pool(poolConfig);

    // Event handlers
    this.pool.on('connect', client => {
      console.log('Database: New client connected');
      this.metrics.totalConnections++;

      // Set statement timeout for this client
      client.query('SET statement_timeout = 30000'); // 30 seconds
    });

    this.pool.on('acquire', () => {
      this.metrics.idleConnections = this.pool?.idleCount || 0;
    });

    this.pool.on('remove', () => {
      this.metrics.totalConnections--;
      console.log('Database: Client removed from pool');
    });

    this.pool.on('error', (err, client) => {
      console.error('Database pool error:', err);
      this.metrics.errors++;
    });

    // Test the connection
    try {
      await this.healthCheck();
      console.log('Database pool initialized successfully');
    } catch (error) {
      console.error('Database pool initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get pool instance
   */
  public async getPool(): Promise<Pool> {
    if (!this.pool) {
      await this.initialize();
    }
    return this.pool!;
  }

  /**
   * Execute query with metrics
   */
  public async query<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    const pool = await this.getPool();
    const startTime = Date.now();

    try {
      this.metrics.totalQueries++;
      const result = await pool.query(text, params);

      const queryTime = Date.now() - startTime;
      this.recordQueryTime(queryTime);

      // Log slow queries
      const slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000', 10);

      if (queryTime > slowQueryThreshold) {
        this.metrics.slowQueries++;
        console.warn(`Slow query detected (${queryTime}ms):`, {
          query: text.substring(0, 100),
          time: queryTime,
        });
      }

      return result;
    } catch (error) {
      this.metrics.errors++;
      console.error('Query error:', error);
      throw error;
    }
  }

  /**
   * Get a client from the pool for transactions
   */
  public async getClient(): Promise<PoolClient> {
    const pool = await this.getPool();
    return pool.connect();
  }

  /**
   * Record query time for metrics
   */
  private recordQueryTime(time: number): void {
    this.queryTimes.push(time);

    // Keep only recent query times
    if (this.queryTimes.length > this.MAX_QUERY_TIMES) {
      this.queryTimes.shift();
    }

    // Update average
    this.metrics.averageQueryTime =
      this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    poolInfo?: unknown;
    error?: string;
  }> {
    try {
      if (!this.pool) {
        return { healthy: false, error: 'Pool not initialized' };
      }

      const startTime = Date.now();
      const result = await this.pool.query('SELECT NOW()');
      const latency = Date.now() - startTime;

      const poolInfo = {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount,
      };

      return {
        healthy: true,
        latency,
        poolInfo,
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get pool metrics
   */
  public getMetrics(): PoolMetrics & { poolInfo?: unknown } {
    return {
      ...this.metrics,
      poolInfo: this.pool
        ? {
            total: this.pool.totalCount,
            idle: this.pool.idleCount,
            waiting: this.pool.waitingCount,
          }
        : undefined,
    };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = {
      totalConnections: this.pool?.totalCount || 0,
      idleConnections: this.pool?.idleCount || 0,
      waitingRequests: this.pool?.waitingCount || 0,
      totalQueries: 0,
      slowQueries: 0,
      errors: 0,
      averageQueryTime: 0,
    };
    this.queryTimes = [];
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    if (this.pool) {
      console.log('Shutting down database pool...');
      await this.pool.end();
      this.pool = null;
      console.log('Database pool shut down successfully');
    }
  }

  /**
   * Check if pool is initialized
   */
  public isInitialized(): boolean {
    return this.pool !== null;
  }
}

// Export singleton
export const dbPool = DatabaseConnectionPool.getInstance();

// Helper functions
export async function query<T = unknown>(text: string, params?: unknown[]) {
  return dbPool.query<T>(text, params);
}

export async function getClient() {
  return dbPool.getClient();
}

export async function dbHealthCheck() {
  return dbPool.healthCheck();
}

export async function getDbMetrics() {
  return dbPool.getMetrics();
}

// Transaction helper
export async function transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGTERM', async () => {
    await dbPool.shutdown();
  });

  process.on('SIGINT', async () => {
    await dbPool.shutdown();
  });
}
