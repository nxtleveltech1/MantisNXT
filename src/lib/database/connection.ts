// @ts-nocheck

/**
 * Database Connection Re-export
 * Provides a consistent import path for database operations
 */

export {
  pool,
  query,
  withTransaction,
  testConnection,
  getPoolStatus,
  closePool,
  DatabaseManager,
  db,
  enterpriseDb
} from '../database';

export { PoolClient } from 'pg';
