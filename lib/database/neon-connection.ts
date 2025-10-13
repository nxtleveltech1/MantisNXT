/**
 * Neon Database Connection for NXT-SPP-Supplier Inventory Portfolio
 *
 * This module manages the connection to the new Neon PostgreSQL database
 * using the Neon serverless client with proper error handling and performance monitoring.
 */

import { neon } from '@neondatabase/serverless';

// Validate Neon connection URL
function validateNeonConnectionString(connectionString: string | undefined) {
  if (!connectionString) {
    throw new Error('NEON_SPP_DATABASE_URL environment variable is not set');
  }

  try {
    new URL(connectionString);
    return connectionString;
  } catch (error) {
    throw new Error(
      `Invalid Neon connection string: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

// Get validated connection string
const connectionString = validateNeonConnectionString(process.env.NEON_SPP_DATABASE_URL);

/**
 * Neon serverless SQL client
 */
const sql = neon(connectionString);

/**
 * Augmented Neon client that also provides a simple `.query()` helper
 * for parameterized queries returning `{ rows, rowCount }`.
 */
type NeonDb = typeof sql & {
  query: <T = any>(queryText: string, params?: any[]) => Promise<{ rows: T[]; rowCount: number }>;
  withTransaction: <T>(
    fn: (client: {
      query: <U = any>(
        queryText: string,
        params?: any[]
      ) => Promise<{ rows: U[]; rowCount: number }>;
    }) => Promise<T>
  ) => Promise<T>;
};

const neonDbInternal: NeonDb = sql as unknown as NeonDb;

neonDbInternal.query = async function <T = any>(
  queryText: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    // Use the unsafe string interface for dynamic SQL with parameters
    // This method is provided by the Neon client and supports parameter arrays
    const result: any[] = await (sql as any).unsafe(queryText, params);

    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`⚠️ Slow query (${duration}ms):`, queryText.substring(0, 100));
    }

    return { rows: (result as T[]) ?? [], rowCount: Array.isArray(result) ? result.length : 0 };
  } catch (error) {
    console.error('🔴 Neon query error:', error);
    throw error;
  }
};

export const neonDb = neonDbInternal;

neonDbInternal.withTransaction = async function <T>(
  fn: (client: {
    query: <U = any>(queryText: string, params?: any[]) => Promise<{ rows: U[]; rowCount: number }>;
  }) => Promise<T>
): Promise<T> {
  // Use Neon built-in transaction and adapt its query function to our `.query()` shape
  const result = await (sql as any).transaction(async (tx: any) => {
    const client = {
      query: async <U = any>(
        queryText: string,
        params?: any[]
      ): Promise<{ rows: U[]; rowCount: number }> => {
        const res: any[] = await tx.unsafe(queryText, params);
        return {
          rows: (res as U[]) ?? [],
          rowCount: Array.isArray(res) ? res.length : 0,
        };
      },
    };

    return await fn(client);
  });

  return result as T;
};

/**
 * Test the database connection
 */
export async function testConnection(): Promise<{
  success: boolean;
  latency: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    await neonDb`SELECT NOW()`;
    const latency = Date.now() - start;

    return {
      success: true,
      latency,
    };
  } catch (error) {
    return {
      success: false,
      latency: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

console.log('🚀 Neon serverless database connection module initialized');
