// Direct re-export from the main database module to avoid circular references
import { db, DatabaseManager, type DatabaseConfig } from '../database'

// Export db as pool for backwards compatibility
export const pool = db
export { db, DatabaseManager, type DatabaseConfig }
export default db