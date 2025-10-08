/**
 * MantisNXT Database Interface
 * Unified database interface using the production-ready connection
 */

// Import directly from the unified connection to avoid circular imports
import {
  pool,
  query,
  withTransaction,
  testConnection,
  getPoolStatus,
  closePool,
  DatabaseManager,
  db
} from '../../lib/database/unified-connection';

// Import enterpriseDb from the enterprise connection manager
import { enterpriseDb } from '../../lib/database/enterprise-connection-manager';

// Re-export everything for the application
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
};

// Export the db instance as default for backwards compatibility
export default db;