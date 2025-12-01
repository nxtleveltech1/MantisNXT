import type { PoolClient, PoolConfig, QueryResultRow } from 'pg';
import { Pool } from 'pg';

type PoolStatus = {
  total: number;
  idle: number;
  waiting: number;
};

const DEFAULTS = {
  max: 10,
  min: 1,
  idleTimeout: 30_000,
  connectionTimeout: 120_000,
};

function parseIntEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function shouldUseSsl(dsn: string): boolean {
  return (
    dsn.includes('sslmode=require') ||
    process.env.DB_SSL === 'true' ||
    process.env.NODE_ENV === 'production'
  );
}

function buildSppPoolConfig(): PoolConfig {
  const connectionString =
    process.env.NEON_SPP_DATABASE_URL ||
    process.env.SUPPLIER_DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'NEON_SPP_DATABASE_URL (or SUPPLIER_DATABASE_URL) must be set for SPP operations'
    );
  }

  return {
    connectionString,
    max: parseIntEnv('SPP_DB_POOL_MAX', parseIntEnv('DB_POOL_MAX', DEFAULTS.max)),
    min: parseIntEnv('SPP_DB_POOL_MIN', parseIntEnv('DB_POOL_MIN', DEFAULTS.min)),
    idleTimeoutMillis: parseIntEnv(
      'SPP_DB_IDLE_TIMEOUT',
      parseIntEnv('DB_POOL_IDLE_TIMEOUT', DEFAULTS.idleTimeout)
    ),
    connectionTimeoutMillis: parseIntEnv(
      'SPP_DB_CONNECTION_TIMEOUT',
      parseIntEnv('DB_POOL_CONNECTION_TIMEOUT', DEFAULTS.connectionTimeout)
    ),
    keepAlive: true,
    keepAliveInitialDelayMillis: 30_000,
    ssl: shouldUseSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
  };
}

class SppConnectionManager {
  private pool: Pool;

  constructor(config?: PoolConfig) {
    this.pool = new Pool(config ?? buildSppPoolConfig());
    this.registerEvents();
  }

  private registerEvents(): void {
    this.pool.on('error', err => {
      console.error('❌ SPP pool error:', err);
    });
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number }> {
    const result = await this.pool.query<T>(text, params);
    return result;
  }

  public async withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const response = await callback(client);
      await client.query('COMMIT');
      return response;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public getStatus(): PoolStatus {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

const sppManager = new SppConnectionManager();

export const sppQuery = <T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) => sppManager.query<T>(text, params);

export const sppWithTransaction = <T>(callback: (client: PoolClient) => Promise<T>) =>
  sppManager.withTransaction(callback);

export const sppGetStatus = () => sppManager.getStatus();
export const sppClosePool = () => sppManager.close();

export const sppDb = {
  query: sppQuery,
  transaction: sppWithTransaction,
  getStatus: sppGetStatus,
};

export default sppManager;
