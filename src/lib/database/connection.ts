// Re-export database connection from main database module
export { DatabaseManager, type DatabaseConfig } from '../database'

// Create default database instance for API routes
import { DatabaseManager } from '../database'

const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'mantisnxt',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production',
  poolMin: 2,
  poolMax: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  acquireTimeoutMillis: 60000,
}

export const db = new DatabaseManager(dbConfig)

// Initialize connection
export const initializeDatabase = async () => {
  try {
    await db.connect()
    console.log('Database connection initialized successfully')
  } catch (error) {
    console.error('Failed to initialize database connection:', error)
    throw error
  }
}

export default db