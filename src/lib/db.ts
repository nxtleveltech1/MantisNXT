import { Pool, PoolClient } from 'pg'

// Create a singleton pool instance
let pool: Pool | null = null

function createPool(): Pool {
  return new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://nxtdb_admin:P@33w0rd-1@62.169.20.53:6600/nxtprod-db_001',
    host: process.env.DB_HOST || '62.169.20.53',
    port: parseInt(process.env.DB_PORT || '6600'),
    database: process.env.DB_NAME || 'nxtprod-db_001',
    user: process.env.DB_USER || 'nxtdb_admin',
    password: process.env.DB_PASSWORD || 'P@33w0rd-1',
    ssl: false, // Live database doesn't support SSL
    max: parseInt(process.env.DB_POOL_MAX || '50'),
    min: parseInt(process.env.DB_POOL_MIN || '10'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '5000'),
    acquireTimeoutMillis: parseInt(process.env.DB_POOL_ACQUIRE_TIMEOUT || '30000'),
  })
}

export const db = {
  query: async (text: string, params?: any[]) => {
    if (!pool) {
      pool = createPool()
    }

    try {
      const result = await pool.query(text, params)
      return result
    } catch (error) {
      console.error('Database query error:', error)
      throw error
    }
  },

  getClient: async () => {
    if (!pool) {
      pool = createPool()
    }
    return pool.connect()
  },

  end: async () => {
    if (pool) {
      await pool.end()
      pool = null
    }
  }
}

// Helper functions for common operations
export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await db.getClient()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export default db