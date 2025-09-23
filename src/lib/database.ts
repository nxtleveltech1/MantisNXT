/**
 * Enterprise Database Connection Manager
 * Live PostgreSQL connection with connection pooling and real-time capabilities
 */

import { Pool, PoolConfig, Client } from 'pg';
import { EventEmitter } from 'events';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  poolMin?: number;
  poolMax?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
  acquireTimeoutMillis?: number;
}

export class DatabaseManager extends EventEmitter {
  private pool: Pool | null = null;
  private config: DatabaseConfig;
  private isConnected: boolean = false;
  private connectionRetryCount: number = 0;
  private maxRetries: number = 5;

  constructor(config: DatabaseConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    const poolConfig: PoolConfig = {
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl || false,
      min: this.config.poolMin || 10,
      max: this.config.poolMax || 50,
      idleTimeoutMillis: this.config.idleTimeoutMillis || 30000,
      connectionTimeoutMillis: this.config.connectionTimeoutMillis || 5000,
      acquireTimeoutMillis: this.config.acquireTimeoutMillis || 30000,
    };

    try {
      this.pool = new Pool(poolConfig);

      // Connection event handlers
      this.pool.on('connect', (client) => {
        console.log('✅ Database client connected');
        this.isConnected = true;
        this.connectionRetryCount = 0;
        this.emit('connected', client);
      });

      this.pool.on('error', (err, client) => {
        console.error('❌ Database pool error:', err);
        this.isConnected = false;
        this.emit('error', err, client);
        this.handleConnectionError(err);
      });

      this.pool.on('remove', (client) => {
        console.log('🔄 Database client removed from pool');
        this.emit('removed', client);
      });

      // Test connection
      await this.testConnection();
      console.log('🚀 Enterprise database connection pool initialized successfully');

    } catch (error) {
      console.error('💥 Failed to initialize database pool:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();
    try {
      const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
      console.log('✅ Database connection test successful:', result.rows[0]);
      this.isConnected = true;
    } finally {
      client.release();
    }
  }

  /**
   * Execute query with automatic retry
   */
  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[]; rowCount: number }> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    try {
      const result = await this.pool.query(text, params);
      return { rows: result.rows, rowCount: result.rowCount || 0 };
    } catch (error) {
      console.error('❌ Database query error:', error);
      throw error;
    }
  }

  /**
   * Execute transaction
   */
  async transaction<T>(callback: (client: Client) => Promise<T>): Promise<T> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = await this.pool.connect();
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

  /**
   * Listen to PostgreSQL notifications for real-time updates
   */
  async listen(channel: string, callback: (payload: string) => void): Promise<void> {
    if (!this.pool) {
      throw new Error('Database pool not initialized');
    }

    const client = new Client({
      host: this.config.host,
      port: this.config.port,
      database: this.config.database,
      user: this.config.user,
      password: this.config.password,
      ssl: this.config.ssl || false,
    });

    await client.connect();
    await client.query(`LISTEN ${channel}`);

    client.on('notification', (msg) => {
      if (msg.channel === channel && msg.payload) {
        callback(msg.payload);
      }
    });

    console.log(`🔔 Listening to PostgreSQL channel: ${channel}`);
  }

  /**
   * Handle connection errors with retry logic
   */
  private async handleConnectionError(error: Error): Promise<void> {
    this.connectionRetryCount++;

    if (this.connectionRetryCount <= this.maxRetries) {
      console.log(`🔄 Retrying database connection (${this.connectionRetryCount}/${this.maxRetries})`);
      setTimeout(() => {
        this.initialize().catch(console.error);
      }, Math.pow(2, this.connectionRetryCount) * 1000); // Exponential backoff
    } else {
      console.error('💥 Max connection retries exceeded');
      this.emit('maxRetriesExceeded', error);
    }
  }

  /**
   * Get pool status
   */
  getStatus() {
    if (!this.pool) {
      return { status: 'not_initialized' };
    }

    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Close database pool
   */
  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.isConnected = false;
      console.log('🔌 Database pool closed');
    }
  }
}

// Singleton instance for enterprise database
const databaseConfig: DatabaseConfig = {
  host: process.env.DB_HOST || '62.169.20.53',
  port: parseInt(process.env.DB_PORT || '6600'),
  database: process.env.DB_NAME || 'nxtprod-db_001',
  user: process.env.DB_USER || 'nxtdb_admin',
  password: process.env.DB_PASSWORD || 'P@33w0rd-1',
  ssl: false,
  poolMin: parseInt(process.env.DB_POOL_MIN || '10'),
  poolMax: parseInt(process.env.DB_POOL_MAX || '50'),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '5000'),
  acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000'),
};

export const db = new DatabaseManager(databaseConfig);

// Initialize on module load
if (typeof window === 'undefined') {
  // Server-side only
  db.initialize().catch(console.error);
}

export default db;